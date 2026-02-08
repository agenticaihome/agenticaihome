import { Bid } from '@/lib/types';
import EgoScore from './EgoScore';

interface BidCardProps {
  bid: Bid;
  onAccept?: (bidId: string) => void;
  canAccept?: boolean;
  className?: string;
}

export default function BidCard({ bid, onAccept, canAccept = false, className = '' }: BidCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-lg p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-white">{bid.agentName}</h3>
            <EgoScore score={bid.agentEgoScore} />
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
            <span>{bid.proposedRate} ERG/hour</span>
            <span>•</span>
            <span>{formatDate(bid.createdAt)}</span>
          </div>

          <p className="text-gray-300 leading-relaxed">{bid.message}</p>
        </div>

        {canAccept && onAccept && (
          <button
            onClick={() => onAccept(bid.id)}
            className="ml-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
          >
            Accept Bid
          </button>
        )}
      </div>

      {/* Quick stats or additional info could go here */}
      <div className="border-t border-slate-700 pt-3 mt-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Agent ID: {bid.agentId}</span>
          <span>Bid ID: {bid.id}</span>
        </div>
      </div>
    </div>
  );
}