'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle, Scale, Loader2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWallet } from '@/contexts/WalletContext';
import { 
  Dispute, 
  DisputeResolution,
  getDispute, 
  proposeResolution, 
  acceptResolution,
  getActiveResolution,
  getAcceptedResolution,
  getTimeUntilExpiry
} from '@/lib/disputes';
import { 
  createDisputeTx, 
  resolveDisputeTx, 
  refundDisputeTx,
  DisputeParams
} from '@/lib/ergo/dispute';

interface DisputePanelProps {
  taskId: string;
  taskStatus: string;
  posterAddress: string;
  agentAddress?: string;
  escrowBoxId?: string;
  budgetErg: number;
  className?: string;
}

interface DisputeState {
  dispute: Dispute | null;
  activeResolution: DisputeResolution | null;
  acceptedResolution: DisputeResolution | null;
  timeUntilExpiry: string;
  loading: boolean;
  error: string | null;
}

export function DisputePanel({ 
  taskId, 
  taskStatus, 
  posterAddress, 
  agentAddress, 
  escrowBoxId,
  budgetErg,
  className = ''
}: DisputePanelProps) {
  const { wallet, address: walletAddress } = useWallet();
  
  const [disputeState, setDisputeState] = useState<DisputeState>({
    dispute: null,
    activeResolution: null,
    acceptedResolution: null,
    timeUntilExpiry: '',
    loading: true,
    error: null
  });

  const [proposedSplit, setProposedSplit] = useState({ 
    posterPercent: 50, 
    agentPercent: 50 
  });
  
  const [isCreatingDispute, setIsCreatingDispute] = useState(false);
  const [isProposingSplit, setIsProposingSplit] = useState(false);
  const [isAcceptingSplit, setIsAcceptingSplit] = useState(false);
  const [isResolvingDispute, setIsResolvingDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  // Load dispute data
  useEffect(() => {
    loadDisputeData();
  }, [taskId]);

  // Update time until expiry every 30 seconds
  useEffect(() => {
    if (!disputeState.dispute) return;

    const updateTimer = () => {
      getTimeUntilExpiry(disputeState.dispute!)
        .then(timeStr => {
          setDisputeState(prev => ({ ...prev, timeUntilExpiry: timeStr }));
        })
        .catch(console.error);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, [disputeState.dispute]);

  const loadDisputeData = async () => {
    try {
      setDisputeState(prev => ({ ...prev, loading: true, error: null }));

      const dispute = await getDispute(taskId);
      let activeResolution = null;
      let acceptedResolution = null;
      let timeUntilExpiry = '';

      if (dispute) {
        activeResolution = await getActiveResolution(dispute.id);
        acceptedResolution = await getAcceptedResolution(dispute.id);
        timeUntilExpiry = await getTimeUntilExpiry(dispute);
      }

      setDisputeState({
        dispute,
        activeResolution,
        acceptedResolution,
        timeUntilExpiry,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to load dispute data:', error);
      setDisputeState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load dispute data'
      }));
    }
  };

  const handleCreateDispute = async () => {
    if (!wallet || !walletAddress || !escrowBoxId) return;

    if (!disputeReason.trim()) {
      setDisputeState(prev => ({ ...prev, error: 'Please provide a reason for the dispute' }));
      return;
    }

    try {
      setIsCreatingDispute(true);
      setDisputeState(prev => ({ ...prev, error: null }));

      const disputeParams: DisputeParams = {
        posterAddress,
        agentAddress: agentAddress || '',
        amountNanoErg: BigInt(Math.floor(budgetErg * 1e9)), // Convert ERG to nanoERG
        deadlineHeight: 0, // Will be calculated in createDisputeTx
        posterPercent: 100, // Default to full refund
        agentPercent: 0,
        taskId
      };

      // Create the on-chain dispute transaction
      const unsignedTx = await createDisputeTx(
        escrowBoxId,
        disputeParams,
        [], // TODO: Get wallet UTXOs
        walletAddress
      );

      // Sign and submit transaction
      const signedTx = await wallet.signTx(unsignedTx);
      const txId = await wallet.submitTx(signedTx);

      // TODO: Create database dispute record with txId
      console.log('Dispute transaction submitted:', txId);

      await loadDisputeData();
    } catch (error) {
      console.error('Failed to create dispute:', error);
      setDisputeState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create dispute'
      }));
    } finally {
      setIsCreatingDispute(false);
    }
  };

  const handleProposeSplit = async () => {
    if (!wallet || !walletAddress || !disputeState.dispute) return;

    try {
      setIsProposingSplit(true);
      setDisputeState(prev => ({ ...prev, error: null }));

      await proposeResolution(
        disputeState.dispute.id,
        proposedSplit.posterPercent,
        proposedSplit.agentPercent,
        walletAddress
      );

      await loadDisputeData();
    } catch (error) {
      console.error('Failed to propose resolution:', error);
      setDisputeState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to propose resolution'
      }));
    } finally {
      setIsProposingSplit(false);
    }
  };

  const handleAcceptSplit = async () => {
    if (!wallet || !walletAddress || !disputeState.dispute || !disputeState.activeResolution) return;

    try {
      setIsAcceptingSplit(true);
      setDisputeState(prev => ({ ...prev, error: null }));

      await acceptResolution(disputeState.dispute.id, walletAddress);
      await loadDisputeData();
    } catch (error) {
      console.error('Failed to accept resolution:', error);
      setDisputeState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to accept resolution'
      }));
    } finally {
      setIsAcceptingSplit(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!wallet || !walletAddress || !disputeState.acceptedResolution || !disputeState.dispute) return;

    try {
      setIsResolvingDispute(true);
      setDisputeState(prev => ({ ...prev, error: null }));

      const unsignedTx = await resolveDisputeTx(
        disputeState.dispute.disputeBoxId!,
        posterAddress,
        agentAddress!,
        disputeState.acceptedResolution.posterPercent,
        disputeState.acceptedResolution.agentPercent,
        [], // TODO: Get wallet UTXOs
        walletAddress
      );

      const signedTx = await wallet.signTx(unsignedTx);
      const txId = await wallet.submitTx(signedTx);

      console.log('Dispute resolution transaction submitted:', txId);
      await loadDisputeData();
    } catch (error) {
      console.error('Failed to resolve dispute:', error);
      setDisputeState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to resolve dispute'
      }));
    } finally {
      setIsResolvingDispute(false);
    }
  };

  // Determine user role
  const userRole = walletAddress === posterAddress ? 'poster' : 
                  walletAddress === agentAddress ? 'agent' : 'viewer';

  const canCreateDispute = taskStatus === 'review' && userRole === 'poster' && !disputeState.dispute;
  const canProposeResolution = disputeState.dispute?.status === 'mediation' && 
                              (userRole === 'poster' || userRole === 'agent');
  const canAcceptResolution = disputeState.activeResolution && 
                             disputeState.activeResolution.proposedBy !== walletAddress &&
                             (userRole === 'poster' || userRole === 'agent');
  const canResolveDispute = disputeState.acceptedResolution && 
                           (userRole === 'poster' || userRole === 'agent');

  if (disputeState.loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading dispute data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Dispute Resolution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {disputeState.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-700">
            {disputeState.error}
          </div>
        )}

        {!disputeState.dispute ? (
          // No dispute exists
          <div className="space-y-4">
            <p className="text-gray-600">
              No dispute has been opened for this task.
            </p>
            
            {canCreateDispute && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dispute Reason
                  </label>
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Explain why you are disputing this work..."
                  />
                </div>
                
                <Button 
                  onClick={handleCreateDispute}
                  disabled={isCreatingDispute || !disputeReason.trim()}
                  className="w-full"
                  variant="destructive"
                >
                  {isCreatingDispute ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating Dispute...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Create Dispute
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Dispute exists
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={disputeState.dispute.status} />
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                {disputeState.timeUntilExpiry}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-1">Dispute Reason</h4>
              <p className="text-gray-600">{disputeState.dispute.reason}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Amount:</span>
                <span className="ml-1">{(disputeState.dispute.originalAmount / 1e9).toFixed(3)} ERG</span>
              </div>
              <div>
                <span className="font-medium">Deadline:</span>
                <span className="ml-1">Block {disputeState.dispute.mediationDeadline}</span>
              </div>
            </div>

            {/* Active Resolution Proposal */}
            {disputeState.activeResolution && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <h4 className="font-medium text-blue-900 mb-2">Proposed Resolution</h4>
                <div className="flex justify-between items-center">
                  <div>
                    <div>Poster: {disputeState.activeResolution.posterPercent}%</div>
                    <div>Agent: {disputeState.activeResolution.agentPercent}%</div>
                  </div>
                  <div className="text-xs text-blue-600">
                    Proposed by: {disputeState.activeResolution.proposedBy === posterAddress ? 'Poster' : 'Agent'}
                  </div>
                </div>
                
                {canAcceptResolution && (
                  <Button
                    onClick={handleAcceptSplit}
                    disabled={isAcceptingSplit}
                    className="w-full mt-3"
                    size="sm"
                  >
                    {isAcceptingSplit ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept Resolution
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Accepted Resolution */}
            {disputeState.acceptedResolution && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <h4 className="font-medium text-green-900 mb-2">Accepted Resolution</h4>
                <div className="flex justify-between items-center">
                  <div>
                    <div>Poster: {disputeState.acceptedResolution.posterPercent}%</div>
                    <div>Agent: {disputeState.acceptedResolution.agentPercent}%</div>
                  </div>
                  <div className="text-xs text-green-600">
                    Ready to execute
                  </div>
                </div>

                {canResolveDispute && (
                  <Button
                    onClick={handleResolveDispute}
                    disabled={isResolvingDispute}
                    className="w-full mt-3"
                  >
                    {isResolvingDispute ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Execute Resolution
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Propose New Split */}
            {canProposeResolution && !disputeState.acceptedResolution && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Propose Resolution Split</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Poster %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={proposedSplit.posterPercent}
                      onChange={(e) => {
                        const posterPercent = parseInt(e.target.value) || 0;
                        setProposedSplit({
                          posterPercent,
                          agentPercent: 100 - posterPercent
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agent %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={proposedSplit.agentPercent}
                      onChange={(e) => {
                        const agentPercent = parseInt(e.target.value) || 0;
                        setProposedSplit({
                          posterPercent: 100 - agentPercent,
                          agentPercent
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleProposeSplit}
                  disabled={isProposingSplit || proposedSplit.posterPercent + proposedSplit.agentPercent !== 100}
                  className="w-full"
                >
                  {isProposingSplit ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Proposing...
                    </>
                  ) : (
                    'Propose Split'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}