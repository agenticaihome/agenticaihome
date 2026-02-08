'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

interface BidFormProps {
  taskId: string;
  onBidSubmitted?: () => void;
  className?: string;
}

export default function BidForm({ taskId, onBidSubmitted, className = '' }: BidFormProps) {
  const { user } = useAuth();
  const { createBidData } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    proposedRate: '',
    message: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.proposedRate) {
      newErrors.proposedRate = 'Proposed rate is required';
    } else if (isNaN(Number(formData.proposedRate)) || Number(formData.proposedRate) <= 0) {
      newErrors.proposedRate = 'Please enter a valid rate greater than 0';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // TODO: In real implementation, we'd need to find the agent owned by this user
      // For now, we'll use a placeholder agent ID
      const userAgentId = 'agent-demo'; // This should be looked up from user's owned agents
      
      createBidData({
        taskId,
        agentId: userAgentId,
        agentName: user.displayName,
        agentEgoScore: 75, // This should come from the agent's actual score
        proposedRate: Number(formData.proposedRate),
        message: formData.message.trim()
      });

      // Reset form
      setFormData({ proposedRate: '', message: '' });
      onBidSubmitted?.();
    } catch (error) {
      console.error('Error submitting bid:', error);
      setErrors({ submit: 'Failed to submit bid. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className={`bg-slate-800/50 border border-slate-700 rounded-lg p-6 text-center ${className}`}>
        <p className="text-gray-400 mb-4">You need to be logged in to place a bid.</p>
        <a
          href="/auth"
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200"
        >
          Sign In
        </a>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">Place Your Bid</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Proposed Rate */}
        <div>
          <label htmlFor="proposedRate" className="block text-sm font-medium text-gray-300 mb-2">
            Proposed Rate (ERG/hour) *
          </label>
          <input
            id="proposedRate"
            type="number"
            step="0.01"
            min="0"
            value={formData.proposedRate}
            onChange={(e) => setFormData(prev => ({ ...prev, proposedRate: e.target.value }))}
            placeholder="25.00"
            className={`w-full px-4 py-3 bg-slate-900/50 border ${
              errors.proposedRate ? 'border-red-500' : 'border-slate-600'
            } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors`}
          />
          {errors.proposedRate && (
            <p className="mt-1 text-sm text-red-400">{errors.proposedRate}</p>
          )}
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
            Proposal Message *
          </label>
          <textarea
            id="message"
            rows={4}
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            placeholder="Explain why you're the right agent for this task, your approach, timeline, and any relevant experience..."
            className={`w-full px-4 py-3 bg-slate-900/50 border ${
              errors.message ? 'border-red-500' : 'border-slate-600'
            } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors resize-none`}
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-400">{errors.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {formData.message.length} characters (minimum 10)
          </p>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {errors.submit}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Submitting Bid...
            </span>
          ) : (
            'Submit Bid'
          )}
        </button>
      </form>
    </div>
  );
}