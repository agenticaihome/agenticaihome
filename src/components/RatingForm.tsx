'use client';

import { useState, useEffect } from 'react';
import { Star, User, CheckCircle, MessageSquare } from 'lucide-react';

interface RatingFormProps {
  taskId: string;
  raterAddress: string;
  rateeAddress: string;
  raterRole: 'creator' | 'agent';
  rateeName: string;
  onSubmit: (rating: {
    taskId: string;
    raterAddress: string;
    rateeAddress: string;
    raterRole: 'creator' | 'agent';
    score: number;
    criteria: Record<string, number>;
    comment: string;
  }) => Promise<void>;
  onSkip: () => void;
  existingRating?: boolean;
}

// Star rating component
function StarRating({ 
  value, 
  onChange, 
  size = 'md',
  readonly = false 
}: { 
  value: number; 
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
}) {
  const [hover, setHover] = useState(0);
  
  const starSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6'
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${starSizes[size]} ${readonly ? 'cursor-default' : 'cursor-pointer'} transition-colors`}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onChange?.(star)}
        >
          <Star
            className={`w-full h-full ${
              star <= (hover || value)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-500 hover:text-gray-400'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// Criteria rating component
function CriteriaRating({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-gray-300 text-sm font-medium">{label}</span>
      <StarRating value={value} onChange={onChange} size="sm" />
    </div>
  );
}

export default function RatingForm({
  taskId,
  raterAddress,
  rateeAddress, 
  raterRole,
  rateeName,
  onSubmit,
  onSkip,
  existingRating = false
}: RatingFormProps) {
  const [score, setScore] = useState(0);
  const [criteria, setCriteria] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Initialize criteria based on rater role
  useEffect(() => {
    if (raterRole === 'creator') {
      setCriteria({
        communication: 0,
        quality: 0,
        timeliness: 0
      });
    } else {
      setCriteria({
        clarity: 0,
        responsiveness: 0,
        fairness: 0
      });
    }
  }, [raterRole]);

  const handleSubmit = async () => {
    if (score === 0) {
      setError('Please select an overall rating');
      return;
    }

    // Check if all criteria are rated
    const unratedCriteria = Object.entries(criteria).filter(([_, value]) => value === 0);
    if (unratedCriteria.length > 0) {
      setError('Please rate all criteria');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const submitPromise = onSubmit({
        taskId,
        raterAddress,
        rateeAddress,
        raterRole,
        score,
        criteria,
        comment: comment.trim()
      });
      
      // Timeout after 15s to prevent infinite hang
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Rating submission timed out. Please try again.')), 15000)
      );
      
      await Promise.race([submitPromise, timeoutPromise]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = score > 0 && Object.values(criteria).every(v => v > 0);

  if (existingRating) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center gap-3 text-emerald-400">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">You've already rated this task</span>
        </div>
        <p className="text-gray-400 mt-2">
          Thank you for providing feedback for this task.
        </p>
      </div>
    );
  }

  const criteriaLabels = raterRole === 'creator' 
    ? { communication: 'Communication', quality: 'Work Quality', timeliness: 'Timeliness' }
    : { clarity: 'Task Clarity', responsiveness: 'Responsiveness', fairness: 'Fairness' };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Star className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            Rate {raterRole === 'creator' ? 'Agent' : 'Task Creator'}
          </h3>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <User className="w-4 h-4" />
            <span>{rateeName}</span>
          </div>
        </div>
      </div>

      {/* Overall Rating */}
      <div className="mb-6">
        <label className="block text-white font-medium mb-3">
          Overall Rating
        </label>
        <div className="flex items-center gap-3">
          <StarRating value={score} onChange={setScore} size="lg" />
          {score > 0 && (
            <span className="text-sm font-medium text-gray-300">
              {score === 5 ? 'Excellent' : 
               score === 4 ? 'Very Good' : 
               score === 3 ? 'Good' : 
               score === 2 ? 'Fair' : 'Poor'}
            </span>
          )}
        </div>
      </div>

      {/* Criteria Breakdown */}
      <div className="mb-6">
        <label className="block text-white font-medium mb-3">
          Rate by Category
        </label>
        <div className="bg-slate-700/30 rounded-lg p-4 space-y-1">
          {Object.entries(criteriaLabels).map(([key, label]) => (
            <CriteriaRating
              key={key}
              label={label}
              value={criteria[key] || 0}
              onChange={(value) => setCriteria(prev => ({ ...prev, [key]: value }))}
            />
          ))}
        </div>
      </div>

      {/* Comment */}
      <div className="mb-6">
        <label className="block text-white font-medium mb-3">
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Comment (Optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={`Share your experience working with this ${raterRole === 'creator' ? 'agent' : 'task creator'}...`}
          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-white placeholder-gray-400 min-h-[100px] resize-none focus:border-purple-500 focus:outline-none transition-colors"
          maxLength={500}
        />
        <div className="text-xs text-gray-400 mt-1 text-right">
          {comment.length}/500
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!isValid || isSubmitting}
        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-xl transition-all duration-200"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Rating'}
      </button>

      {/* Note */}
      <p className="text-xs text-gray-500 mt-4 text-center">
        Ratings are permanent and cannot be changed once submitted
      </p>
    </div>
  );
}