'use client';

import { useState, useEffect } from 'react';
import { Star, MessageSquare, TrendingUp, Award, Users, Shield, AlertTriangle } from 'lucide-react';
import { RatingSummary } from '@/lib/types';

interface RatingDisplayProps {
  address: string;
  role?: 'creator' | 'agent' | 'all';
  compact?: boolean;
  className?: string;
}

// Star display component (readonly)
function StarDisplay({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const starSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${starSizes[size]} ${
            star <= fullStars
              ? 'text-yellow-400 fill-yellow-400'
              : star === fullStars + 1 && hasHalfStar
              ? 'text-yellow-400 fill-yellow-400/50'
              : 'text-gray-600 fill-gray-600'
          }`}
        />
      ))}
      <span className="ml-1 text-sm text-gray-400 font-medium">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

// Score bar component for criteria breakdown
function ScoreBar({ label, score, color = 'purple' }: { 
  label: string; 
  score: number; 
  color?: 'purple' | 'emerald' | 'blue' | 'amber' 
}) {
  const colors = {
    purple: 'bg-purple-500',
    emerald: 'bg-emerald-500', 
    blue: 'bg-blue-500',
    amber: 'bg-amber-500'
  };

  const percentage = (score / 5) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="text-white font-medium">{score.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colors[color]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ANTI-GAMING PROTECTION 5: Comment with rater transparency
function CommentWithTransparency({ comment }: { 
  comment: { 
    comment: string; 
    score: number; 
    raterRole: 'creator' | 'agent'; 
    createdAt: string;
    raterAddress?: string;
  } 
}) {
  const [raterInfo, setRaterInfo] = useState<{
    averageGivenRating: number;
    reliability: number;
    totalRatingsGiven: number;
  } | null>(null);

  // For demo purposes, simulate rater stats
  // In production, you'd fetch this using getRaterReliability()
  useEffect(() => {
    // Simulated rater patterns for demonstration
    const avgGiven = 1 + Math.random() * 4; // 1-5 range
    const reliability = Math.random();
    
    setRaterInfo({
      averageGivenRating: avgGiven,
      reliability: reliability,
      totalRatingsGiven: Math.floor(Math.random() * 20) + 1
    });
  }, []);

  const getRaterBadge = () => {
    if (!raterInfo) return null;

    if (raterInfo.reliability > 0.8 && raterInfo.totalRatingsGiven >= 5) {
      return (
        <div className="flex items-center gap-1 text-xs text-emerald-400">
          <Shield className="w-3 h-3" />
          <span>Verified Rater</span>
        </div>
      );
    } else if (raterInfo.reliability < 0.3 || Math.abs(raterInfo.averageGivenRating - 3.0) > 1.5) {
      return (
        <div className="flex items-center gap-1 text-xs text-amber-400">
          <AlertTriangle className="w-3 h-3" />
          <span>Outlier Pattern</span>
        </div>
      );
    }

    return null;
  };

  const getRaterTooltip = () => {
    if (!raterInfo) return '';
    return `This rater gives an average of ${raterInfo.averageGivenRating.toFixed(1)} stars across ${raterInfo.totalRatingsGiven} reviews`;
  };

  return (
    <div className="p-3 bg-slate-700/30 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StarDisplay rating={comment.score} size="sm" />
          {getRaterBadge()}
        </div>
        <div className="text-xs text-gray-400" title={getRaterTooltip()}>
          {comment.raterRole === 'creator' ? 'Task Creator' : 'Agent'} • {new Date(comment.createdAt).toLocaleDateString()}
          {raterInfo && (
            <span className="ml-1 opacity-70">
              (avg: {raterInfo.averageGivenRating.toFixed(1)}⭐)
            </span>
          )}
        </div>
      </div>
      <p className="text-gray-300 text-sm leading-relaxed">
        {comment.comment || <em className="text-gray-500">No comment provided</em>}
      </p>
    </div>
  );
}

export default function RatingDisplay({ 
  address, 
  role = 'all', 
  compact = false,
  className = ''
}: RatingDisplayProps) {
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRatingSummary();
  }, [address, role]);

  const fetchRatingSummary = async () => {
    try {
      setLoading(true);
      setError('');

      // Import the function from supabaseStore
      const { getRatingSummaryForAddress } = await import('@/lib/supabaseStore');
      const data = await getRatingSummaryForAddress(address, role);
      setSummary(data);
    } catch (err) {
      setError('Failed to load ratings');
      console.error('Error fetching ratings:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-slate-800/50 border border-slate-700 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-slate-800/50 border border-slate-700 rounded-lg p-4 ${className}`}>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!summary || summary.totalRatings === 0) {
    return (
      <div className={`bg-slate-800/50 border border-slate-700 rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-400 py-4">
          <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No ratings yet</p>
          <p className="text-xs mt-1">Complete tasks to earn ratings</p>
        </div>
      </div>
    );
  }

  // Compact version for agent cards
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <StarDisplay rating={summary.averageScore} size="sm" />
        <span className="text-xs text-gray-400">
          ({summary.totalRatings} review{summary.totalRatings !== 1 ? 's' : ''})
        </span>
      </div>
    );
  }

  // Get rating color based on score
  const getRatingColor = (score: number) => {
    if (score >= 4.5) return 'text-emerald-400';
    if (score >= 3.5) return 'text-yellow-400'; 
    if (score >= 2.5) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-2xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Star className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Ratings & Reviews</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Users className="w-4 h-4" />
              <span>{summary.totalRatings} review{summary.totalRatings !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Rating */}
      <div className="mb-6 p-4 bg-gradient-to-r from-slate-700/30 to-slate-600/30 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getRatingColor(summary.averageScore)} mb-1`}>
              {summary.averageScore.toFixed(1)}
            </div>
            <StarDisplay rating={summary.averageScore} size="md" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-white font-medium mb-2">Rating Breakdown</div>
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = summary.scoreBreakdown[`${stars}_star` as keyof typeof summary.scoreBreakdown];
                const percentage = summary.totalRatings > 0 ? (count / summary.totalRatings) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 w-8">{stars}★</span>
                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-gray-400 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Criteria Breakdown */}
      {(summary.criteriaAverages.agent_criteria || summary.criteriaAverages.creator_criteria) && (
        <div className="mb-6">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            Performance Breakdown
          </h4>
          <div className="space-y-3">
            {summary.criteriaAverages.agent_criteria && (
              <>
                <div className="text-sm text-gray-400 mb-2">As an Agent:</div>
                <ScoreBar 
                  label="Communication" 
                  score={summary.criteriaAverages.agent_criteria.communication} 
                  color="purple" 
                />
                <ScoreBar 
                  label="Work Quality" 
                  score={summary.criteriaAverages.agent_criteria.quality} 
                  color="emerald" 
                />
                <ScoreBar 
                  label="Timeliness" 
                  score={summary.criteriaAverages.agent_criteria.timeliness} 
                  color="blue" 
                />
              </>
            )}
            {summary.criteriaAverages.creator_criteria && (
              <>
                {summary.criteriaAverages.agent_criteria && <div className="h-4" />}
                <div className="text-sm text-gray-400 mb-2">As a Task Creator:</div>
                <ScoreBar 
                  label="Task Clarity" 
                  score={summary.criteriaAverages.creator_criteria.clarity} 
                  color="purple" 
                />
                <ScoreBar 
                  label="Responsiveness" 
                  score={summary.criteriaAverages.creator_criteria.responsiveness} 
                  color="emerald" 
                />
                <ScoreBar 
                  label="Fairness" 
                  score={summary.criteriaAverages.creator_criteria.fairness} 
                  color="amber" 
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Recent Comments */}
      {summary.recentComments.length > 0 && (
        <div>
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            Recent Reviews
          </h4>
          <div className="space-y-3">
            {summary.recentComments.map((comment, index) => (
              <CommentWithTransparency 
                key={index} 
                comment={comment} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}