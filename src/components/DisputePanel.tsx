'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/contexts/ToastContext';
import { uploadTaskFile, sendSystemMessage } from '@/lib/supabaseStore';
import { supabase } from '@/lib/supabase';
import { resolveMultiSigDispute } from '@/lib/ergo/multisig-escrow';
import { getMediatorForTask, getMediatorByAddress } from '@/lib/mediators';
import { connectWallet, getUtxos, getAddress, signTransaction, submitTransaction } from '@/lib/ergo/wallet';
import { PLATFORM_FEE_ADDRESS } from '@/lib/ergo/constants';
import { AlertTriangle, Check, ClipboardList, Shield } from 'lucide-react';

interface DisputeEvidence {
  id: string;
  taskId: string;
  submitterAddress: string;
  submitterRole: 'creator' | 'agent';
  evidenceText: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
}

interface DisputeStatus {
  status: 'disputed' | 'evidence_submitted' | 'under_review' | 'resolved';
  resolvedInFavorOf?: 'creator' | 'agent';
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface DisputePanelProps {
  taskId: string;
  taskCreatorAddress: string;
  taskAgentAddress: string;
  userRole: 'creator' | 'agent';
  escrowBoxId?: string;
  escrowType?: 'simple' | 'multisig';
  className?: string;
}

export default function DisputePanel({
  taskId,
  taskCreatorAddress,
  taskAgentAddress,
  userRole,
  escrowBoxId,
  escrowType = 'simple',
  className = ''
}: DisputePanelProps) {
  const { userAddress, isAuthenticated } = useWallet();
  const { success: showSuccess, error: showError } = useToast();
  const [evidence, setEvidence] = useState<DisputeEvidence[]>([]);
  const [disputeStatus, setDisputeStatus] = useState<DisputeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Multi-sig resolution state
  const [mediatorAddress, setMediatorAddress] = useState<string | null>(null);
  const [isMediator, setIsMediator] = useState(false);
  const [resolutionInProgress, setResolutionInProgress] = useState(false);
  
  // Form state
  const [evidenceText, setEvidenceText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    fileName: string;
    fileSize: number;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load dispute data
  const loadDisputeData = async () => {
    try {
      // Load evidence
      const { data: evidenceData, error: evidenceError } = await supabase
        .from('dispute_evidence')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (evidenceError && evidenceError.code !== 'PGRST116') {
        throw evidenceError;
      }

      if (evidenceData) {
        setEvidence(evidenceData.map((item: any) => ({
          id: item.id,
          taskId: item.task_id,
          submitterAddress: item.submitter_address,
          submitterRole: item.submitter_role,
          evidenceText: item.evidence_text,
          fileUrl: item.file_url,
          fileName: item.file_name,
          fileSize: item.file_size,
          createdAt: item.created_at,
        })));
      }

      // Load dispute status
      const { data: statusData, error: statusError } = await supabase
        .from('dispute_status')
        .select('*')
        .eq('task_id', taskId)
        .single();

      if (statusError && statusError.code !== 'PGRST116') {
        throw statusError;
      }

      if (statusData) {
        setDisputeStatus({
          status: statusData.status,
          resolvedInFavorOf: statusData.resolved_in_favor_of,
          resolutionNotes: statusData.resolution_notes,
          createdAt: statusData.created_at,
          updatedAt: statusData.updated_at,
        });
      } else {
        // Create initial dispute status if it doesn't exist
        const { data: newStatus, error: createError } = await supabase
          .from('dispute_status')
          .insert([{
            task_id: taskId,
            status: 'disputed',
          }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating dispute status:', createError);
        } else if (newStatus) {
          setDisputeStatus({
            status: newStatus.status,
            resolvedInFavorOf: newStatus.resolved_in_favor_of,
            resolutionNotes: newStatus.resolution_notes,
            createdAt: newStatus.created_at,
            updatedAt: newStatus.updated_at,
          });
        }
      }
      // Load mediator info for multi-sig disputes
      if (escrowType === 'multisig') {
        try {
          const taskMediatorAddress = await getMediatorForTask(taskId);
          if (taskMediatorAddress) {
            setMediatorAddress(taskMediatorAddress);
            // Check if current user is the mediator
            if (userAddress && userAddress === taskMediatorAddress) {
              setIsMediator(true);
            }
          }
        } catch (error) {
          console.error('Error loading mediator info:', error);
        }
      }
    } catch (error) {
      console.error('Error loading dispute data:', error);
      // If tables don't exist, that's okay - just show empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputeData();
  }, [taskId]);

  const handleFileUpload = async (file: File) => {
    try {
      setSubmitting(true);
      const result = await uploadTaskFile(taskId, file);
      if (result) {
        setUploadedFile(result);
        showSuccess('File uploaded successfully');
      } else {
        showError('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      showError('Failed to upload file');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !userAddress || !evidenceText.trim()) {
      showError('Please provide evidence text');
      return;
    }

    setSubmitting(true);
    try {
      // Insert evidence
      const { error: evidenceError } = await supabase
        .from('dispute_evidence')
        .insert([{
          task_id: taskId,
          submitter_address: userAddress,
          submitter_role: userRole,
          evidence_text: evidenceText.trim(),
          file_url: uploadedFile?.url,
          file_name: uploadedFile?.fileName,
          file_size: uploadedFile?.fileSize,
        }]);

      if (evidenceError) {
        throw evidenceError;
      }

      // Update dispute status to evidence_submitted if not already
      if (disputeStatus?.status === 'disputed') {
        const { error: statusError } = await supabase
          .from('dispute_status')
          .update({ 
            status: 'evidence_submitted',
            updated_at: new Date().toISOString()
          })
          .eq('task_id', taskId);

        if (statusError) {
          console.error('Error updating dispute status:', statusError);
        }
      }

      // Send system message
      await sendSystemMessage(
        taskId,
        `${userRole === 'creator' ? 'Task creator' : 'Agent'} submitted evidence in dispute`
      );

      // Reset form
      setEvidenceText('');
      setUploadedFile(null);
      
      showSuccess('Evidence submitted successfully');
      await loadDisputeData();
    } catch (error) {
      console.error('Error submitting evidence:', error);
      showError('Failed to submit evidence');
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Handle multi-sig dispute resolution
  const handleResolution = async (resolution: 'agent' | 'client') => {
    if (!isMediator || !escrowBoxId || !mediatorAddress) {
      showError('Only the mediator can resolve multi-sig disputes');
      return;
    }

    setResolutionInProgress(true);
    try {
      // Connect mediator wallet
      const walletState = await connectWallet('nautilus');
      const [utxos, changeAddress] = await Promise.all([
        getUtxos(),
        getAddress()
      ]);

      // Create resolution transaction
      const unsignedTx = await resolveMultiSigDispute(
        escrowBoxId,
        resolution,
        mediatorAddress,
        utxos,
        changeAddress
      );

      // Sign and submit transaction
      const signedTx = await signTransaction(unsignedTx);
      const txId = await submitTransaction(signedTx);

      // Update dispute status
      await supabase
        .from('dispute_status')
        .update({
          status: 'resolved',
          resolved_in_favor_of: resolution === 'agent' ? 'agent' : 'creator',
          resolution_notes: `Multi-sig dispute resolved in favor of ${resolution === 'agent' ? 'agent' : 'client'} via mediator signature. Transaction: ${txId}`,
          updated_at: new Date().toISOString()
        })
        .eq('task_id', taskId);

      // Send system message
      await sendSystemMessage(
        taskId,
        `Dispute resolved in favor of ${resolution === 'agent' ? 'agent' : 'client'} via multi-sig mediation`
      );

      showSuccess(`Dispute resolved in favor of ${resolution === 'agent' ? 'agent' : 'client'}`);
      await loadDisputeData();
    } catch (error) {
      console.error('Error resolving dispute:', error);
      showError('Failed to resolve dispute');
    } finally {
      setResolutionInProgress(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disputed': return 'text-red-400 bg-red-500/10';
      case 'evidence_submitted': return 'text-yellow-400 bg-yellow-500/10';
      case 'under_review': return 'text-blue-400 bg-blue-500/10';
      case 'resolved': return 'text-green-400 bg-green-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'disputed': return '⚠';
      case 'evidence_submitted': return '☰';
      case 'under_review': return '👨‍⚖️';
      case 'resolved': return '✓';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className={`border border-gray-800 rounded-lg bg-gray-900 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-red-800 rounded-lg bg-red-900/10 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-red-800">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">⚠</span>
          <h3 className="text-xl font-semibold text-red-400">Task Dispute</h3>
        </div>
        
        {disputeStatus && (
          <div className="flex items-center gap-2">
            <span className="text-lg">{getStatusIcon(disputeStatus.status)}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(disputeStatus.status)}`}>
              {disputeStatus.status.replace('_', ' ').toUpperCase()}
            </span>
            {disputeStatus.status === 'resolved' && disputeStatus.resolvedInFavorOf && (
              <span className="text-gray-400 text-sm">
                • Resolved in favor of {disputeStatus.resolvedInFavorOf}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status Description */}
      <div className="p-6 border-b border-gray-800">
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
          <h4 className="text-red-400 font-semibold mb-2">Dispute Process</h4>
          <div className="text-gray-300 text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-red-500"></span>
              <span>1. Dispute opened - both parties can submit evidence</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full ${disputeStatus?.status === 'evidence_submitted' || disputeStatus?.status === 'under_review' || disputeStatus?.status === 'resolved' ? 'bg-yellow-500' : 'bg-gray-600'}`}></span>
              <span>2. Evidence submitted - under community review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full ${disputeStatus?.status === 'under_review' || disputeStatus?.status === 'resolved' ? 'bg-blue-500' : 'bg-gray-600'}`}></span>
              <span>3. Under review by mediators</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-4 h-4 rounded-full ${disputeStatus?.status === 'resolved' ? 'bg-green-500' : 'bg-gray-600'}`}></span>
              <span>4. Resolved - funds distributed accordingly</span>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Timeline */}
      {evidence.length > 0 && (
        <div className="p-6 border-b border-gray-800">
          <h4 className="text-white font-semibold mb-4">Evidence Submitted</h4>
          <div className="space-y-4">
            {evidence.map((item) => (
              <div key={item.id} className="border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.submitterRole === 'creator' 
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {item.submitterRole === 'creator' ? 'Task Creator' : 'Agent'}
                    </span>
                    <span className="text-gray-400 text-sm">{formatDateTime(item.createdAt)}</span>
                  </div>
                </div>
                
                <p className="text-gray-300 mb-3 whitespace-pre-wrap">{item.evidenceText}</p>
                
                {item.fileUrl && (
                  <div className="border border-gray-600 rounded p-3 bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📎</span>
                        <div>
                          <div className="text-white text-sm font-medium">{item.fileName}</div>
                          {item.fileSize && (
                            <div className="text-gray-400 text-xs">{formatFileSize(item.fileSize)}</div>
                          )}
                        </div>
                      </div>
                      <a 
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                      >
                        View Evidence
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Sig Resolution Options for Mediator */}
      {escrowType === 'multisig' && isMediator && disputeStatus?.status === 'under_review' && (
        <div className="p-6 border-b border-gray-800">
          <h4 className="text-yellow-400 font-semibold mb-4 flex items-center gap-2">
            <span className="text-xl">👨‍⚖️</span>
            Mediator Resolution Options
          </h4>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
            <p className="text-yellow-200 text-sm mb-3">
              As the assigned mediator, you can resolve this dispute by choosing one of the following options. 
              Your signature combined with either the client or agent will complete the resolution.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleResolution('agent')}
              disabled={resolutionInProgress}
              className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-green-400 font-semibold mb-2">Release to Agent</div>
              <div className="text-sm text-gray-300">
                Agent successfully completed the task. Release escrow funds to agent.
              </div>
            </button>
            
            <button
              onClick={() => handleResolution('client')}
              disabled={resolutionInProgress}
              className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-red-400 font-semibold mb-2">Refund to Client</div>
              <div className="text-sm text-gray-300">
                Task was not completed satisfactorily. Refund escrow to client.
              </div>
            </button>
          </div>
          
          {resolutionInProgress && (
            <div className="mt-4 flex items-center justify-center gap-2 text-yellow-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
              Processing resolution transaction...
            </div>
          )}
        </div>
      )}

      {/* Mediator Information */}
      {escrowType === 'multisig' && mediatorAddress && (
        <div className="p-6 border-b border-gray-800">
          <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400 inline" />
            Multi-Sig Escrow
          </h4>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="text-gray-300 text-sm space-y-1">
              <div><strong>Mediator:</strong> {mediatorAddress === PLATFORM_FEE_ADDRESS ? 'AgenticAiHome Platform' : mediatorAddress}</div>
              <div><strong>Resolution:</strong> Requires 2-of-3 signatures (client + agent + mediator)</div>
              {isMediator && (
                <div className="mt-2 px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded text-xs">
                  You are the assigned mediator for this dispute
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit Evidence Form */}
      {disputeStatus && ['disputed', 'evidence_submitted'].includes(disputeStatus.status) && (
        <div className="p-6">
          <h4 className="text-white font-semibold mb-4">Submit Evidence</h4>
          <form onSubmit={handleSubmitEvidence} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Your Evidence *
                <span className="text-gray-400 font-normal ml-1">(Explain your position with supporting details)</span>
              </label>
              <textarea
                value={evidenceText}
                onChange={(e) => setEvidenceText(e.target.value)}
                placeholder="Provide detailed evidence supporting your position in this dispute. Include relevant communications, deliverables, or other supporting information..."
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-red-400 resize-vertical"
                required
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Supporting Files (Optional)
              </label>
              
              {uploadedFile ? (
                <div className="border border-gray-700 rounded-lg p-4 bg-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📎</span>
                      <div>
                        <div className="text-white font-medium">{uploadedFile.fileName}</div>
                        <div className="text-gray-400 text-sm">{formatFileSize(uploadedFile.fileSize)}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedFile(null)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    className="hidden"
                    accept="image/*,.pdf,.txt,.csv,.json,.docx,.md,.zip"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                    className="w-full border-2 border-dashed border-gray-700 hover:border-red-400 rounded-lg p-4 text-center transition-colors"
                  >
                    <div className="text-2xl mb-2">📎</div>
                    <div className="text-white font-medium">Upload Supporting Evidence</div>
                    <div className="text-gray-400 text-sm">Screenshots, communications, docs, etc.</div>
                  </button>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !evidenceText.trim()}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting Evidence...
                </div>
              ) : (
                'Submit Evidence'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Resolution Notes */}
      {disputeStatus?.status === 'resolved' && disputeStatus.resolutionNotes && (
        <div className="p-6 border-t border-gray-800">
          <h4 className="text-green-400 font-semibold mb-2">Resolution</h4>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-gray-300">{disputeStatus.resolutionNotes}</p>
          </div>
        </div>
      )}
    </div>
  );
}