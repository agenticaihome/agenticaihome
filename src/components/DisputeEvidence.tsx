'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/contexts/ToastContext';
import { uploadTaskFile } from '@/lib/supabaseStore';

interface EvidenceItem {
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

interface DisputeEvidenceProps {
  taskId: string;
  disputeId: string;
  evidence: EvidenceItem[];
  userRole: 'creator' | 'agent' | 'mediator';
  canSubmit: boolean;
  clientAddress: string;
  agentAddress: string;
  onEvidenceSubmitted?: () => void;
}

export default function DisputeEvidence({
  taskId,
  disputeId,
  evidence,
  userRole,
  canSubmit,
  clientAddress,
  agentAddress,
  onEvidenceSubmitted,
}: DisputeEvidenceProps) {
  const { userAddress } = useWallet();
  const { success: showSuccess, error: showError } = useToast();
  const [evidenceText, setEvidenceText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; fileName: string; fileSize: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clientEvidence = evidence.filter(e => e.submitterAddress === clientAddress);
  const agentEvidence = evidence.filter(e => e.submitterAddress === agentAddress);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress || !evidenceText.trim()) return;

    setSubmitting(true);
    try {
      const role = userAddress === clientAddress ? 'creator' : 'agent';
      const { error } = await supabase.from('dispute_evidence').insert([{
        task_id: taskId,
        submitter_address: userAddress,
        submitter_role: role,
        evidence_text: evidenceText.trim(),
        file_url: uploadedFile?.url || linkUrl || null,
        file_name: uploadedFile?.fileName || (linkUrl ? 'Link' : null),
        file_size: uploadedFile?.fileSize || null,
      }]);
      if (error) throw error;

      setEvidenceText('');
      setLinkUrl('');
      setUploadedFile(null);
      showSuccess('Evidence submitted');
      onEvidenceSubmitted?.();
    } catch (err) {
      showError('Failed to submit evidence');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setSubmitting(true);
      const result = await uploadTaskFile(taskId, file);
      if (result) {
        setUploadedFile(result);
        showSuccess('File uploaded');
      }
    } catch {
      showError('Failed to upload file');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleString();
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const renderEvidenceList = (items: EvidenceItem[], label: string, color: string) => (
    <div className="flex-1 min-w-0">
      <h5 className={`text-sm font-semibold ${color} mb-3`}>{label}</h5>
      {items.length === 0 ? (
        <p className="text-gray-500 text-sm italic">No evidence submitted yet</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="border border-gray-700 rounded-lg p-3 bg-gray-800/50">
              <p className="text-gray-300 text-sm whitespace-pre-wrap mb-2">{item.evidenceText}</p>
              {item.fileUrl && (
                <a href={item.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                  📎 {item.fileName || 'Attachment'} {item.fileSize ? `(${formatSize(item.fileSize)})` : ''}
                </a>
              )}
              <div className="text-gray-500 text-xs mt-2">{formatTime(item.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Evidence Timeline - Side by Side */}
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        {renderEvidenceList(clientEvidence, "Client's Case", 'text-cyan-400')}
        <div className="hidden md:block w-px bg-gray-700" />
        {renderEvidenceList(agentEvidence, "Agent's Case", 'text-green-400')}
      </div>

      {/* Submit Form */}
      {canSubmit && userRole !== 'mediator' && (
        <form onSubmit={handleSubmit} className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
          <h5 className="text-white font-semibold text-sm mb-3">Submit Evidence</h5>
          <textarea
            value={evidenceText}
            onChange={e => setEvidenceText(e.target.value)}
            placeholder="Describe your position with supporting details..."
            rows={3}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-vertical mb-3"
            required
          />
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <input
              type="url"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="Link URL (optional)"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <input type="file" ref={fileInputRef} className="hidden"
              accept="image/*,.pdf,.txt,.csv,.json,.docx,.md,.zip"
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 text-sm border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors">
              📎 Upload File
            </button>
          </div>
          {uploadedFile && (
            <div className="flex items-center gap-2 text-sm text-green-400 mb-3">
              ✓ {uploadedFile.fileName} ({formatSize(uploadedFile.fileSize)})
              <button type="button" onClick={() => setUploadedFile(null)} className="text-red-400 hover:text-red-300">✕</button>
            </div>
          )}
          <button type="submit" disabled={submitting || !evidenceText.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors">
            {submitting ? 'Submitting...' : 'Submit Evidence'}
          </button>
        </form>
      )}
    </div>
  );
}
