'use client';

import { useState, useMemo } from 'react';
import { ReputationEvent } from '@/lib/types';

interface EgoTimelineProps {
  events: ReputationEvent[];
  agentId: string;
  showFilters?: boolean;
  compact?: boolean;
  maxEvents?: number;
}

export default function EgoTimeline({ 
  events, 
  agentId, 
  showFilters = true, 
  compact = false,
  maxEvents = 50 
}: EgoTimelineProps) {
  const [filter, setFilter] = useState<'all' | 'completion' | 'dispute_won' | 'dispute_lost' | 'decay'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    if (filter !== 'all') {
      filtered = events.filter(event => {
        if (filter === 'decay') {
          return event.egoDelta < 0 && event.eventType !== 'dispute_lost';
        }
        return event.eventType === filter;
      });
    }
    
    const sorted = [...filtered].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });
    
    return sorted.slice(0, maxEvents);
  }, [events, filter, sortOrder, maxEvents]);

  // Calculate running score for timeline visualization
  const timelineData = useMemo(() => {
    const allEvents = [...events].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    let runningScore = 50; // Starting score
    return allEvents.map(event => {
      runningScore += event.egoDelta;
      return {
        ...event,
        scoreAfter: Math.max(0, Math.min(100, runningScore))
      };
    });
  }, [events]);

  const getEventIcon = (eventType: string, egoDelta: number) => {
    if (eventType === 'completion') return egoDelta > 0 ? '✅' : '📝';
    if (eventType === 'dispute_won') return '🏆';
    if (eventType === 'dispute_lost') return '❌';
    if (egoDelta < 0) return '📉'; // Decay
    return '📊';
  };

  const getEventColor = (eventType: string, egoDelta: number) => {
    if (eventType === 'completion' && egoDelta > 0) return 'var(--accent-green)';
    if (eventType === 'dispute_won') return 'var(--accent-cyan)';
    if (eventType === 'dispute_lost') return '#ef4444';
    if (egoDelta < 0) return '#f59e0b';
    return 'var(--text-muted)';
  };

  const getDeltaDisplay = (delta: number) => {
    if (delta > 0) return `+${delta.toFixed(1)}`;
    if (delta < 0) return delta.toFixed(1);
    return '±0.0';
  };

  const formatEventDescription = (event: ReputationEvent) => {
    if (event.eventType === 'completion') {
      const stars = event.egoDelta > 4 ? '5⭐' : event.egoDelta > 2 ? '4⭐' : event.egoDelta > 0 ? '3⭐' : '≤2⭐';
      return `Task completed (${stars})`;
    }
    return event.description || `${event.eventType.replace('_', ' ')}`;
  };

  return (
    <div className="space-y-4">
      {/* Header and Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Reputation Timeline</h3>
            {!compact && (
              <p className="text-sm text-[var(--text-secondary)]">
                {filteredEvents.length} events{filter !== 'all' && ` (filtered by ${filter.replace('_', ' ')})`}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Filter Dropdown */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-cyan)]"
            >
              <option value="all">All Events</option>
              <option value="completion">Completions</option>
              <option value="dispute_won">Disputes Won</option>
              <option value="dispute_lost">Disputes Lost</option>
              <option value="decay">Score Decay</option>
            </select>
            
            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm hover:border-[var(--accent-cyan)] transition-colors"
            >
              {sortOrder === 'newest' ? '↓ Newest' : '↑ Oldest'}
            </button>
          </div>
        </div>
      )}

      {/* Score Trend Visualization */}
      {!compact && timelineData.length > 0 && (
        <div className="card p-4">
          <h4 className="text-sm font-medium mb-3">Score History</h4>
          <div className="relative h-24">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between text-xs text-[var(--text-muted)]">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>
            
            {/* Score line */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {timelineData.length > 1 && (
                <polyline
                  fill="none"
                  stroke="var(--accent-cyan)"
                  strokeWidth="0.5"
                  points={timelineData.map((event, index) => 
                    `${(index / (timelineData.length - 1)) * 100},${100 - event.scoreAfter}`
                  ).join(' ')}
                />
              )}
              
              {/* Data points */}
              {timelineData.map((event, index) => (
                <circle
                  key={event.id}
                  cx={(index / Math.max(timelineData.length - 1, 1)) * 100}
                  cy={100 - event.scoreAfter}
                  r="0.8"
                  fill={getEventColor(event.eventType, event.egoDelta)}
                />
              ))}
            </svg>
          </div>
          
          <div className="flex justify-between text-xs text-[var(--text-muted)] mt-2">
            <span>{timelineData.length > 0 ? new Date(timelineData[0].createdAt).toLocaleDateString() : ''}</span>
            <span>Current: {timelineData[timelineData.length - 1]?.scoreAfter || 50}</span>
          </div>
        </div>
      )}

      {/* Events Timeline */}
      <div className={`space-y-${compact ? '2' : '3'}`}>
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)]">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-sm">No events found for the selected filter</div>
          </div>
        ) : (
          filteredEvents.map((event, index) => {
            const isFirst = index === 0;
            const isLast = index === filteredEvents.length - 1;
            
            return (
              <div key={event.id} className="flex items-start gap-4">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  {/* Dot */}
                  <div 
                    className={`w-${compact ? '3' : '4'} h-${compact ? '3' : '4'} rounded-full border-2 bg-[var(--bg-primary)] flex items-center justify-center text-xs`}
                    style={{ 
                      borderColor: getEventColor(event.eventType, event.egoDelta),
                      color: getEventColor(event.eventType, event.egoDelta)
                    }}
                  >
                    {getEventIcon(event.eventType, event.egoDelta)}
                  </div>
                  
                  {/* Connecting line */}
                  {!isLast && (
                    <div className={`w-0.5 bg-[var(--border-color)] ${compact ? 'h-8' : 'h-12'} mt-1`} />
                  )}
                </div>
                
                {/* Event content */}
                <div className={`flex-1 ${!isLast && !compact ? 'pb-6' : ''}`}>
                  <div className={`card p-${compact ? '3' : '4'} hover:border-[var(--accent-cyan)]/30 transition-colors`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className={`font-medium text-${compact ? 'sm' : 'base'}`}>
                          {formatEventDescription(event)}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-1">
                          {new Date(event.createdAt).toLocaleDateString()} at {new Date(event.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div 
                          className={`font-mono font-bold text-${compact ? 'sm' : 'base'}`}
                          style={{ color: getEventColor(event.eventType, event.egoDelta) }}
                        >
                          {getDeltaDisplay(event.egoDelta)} EGO
                        </div>
                        {!compact && (
                          <div className="text-xs text-[var(--text-muted)]">
                            {event.eventType.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Event description */}
                    {!compact && event.description && event.description !== formatEventDescription(event) && (
                      <div className="text-sm text-[var(--text-secondary)] mt-2 pl-4 border-l-2 border-[var(--border-color)]">
                        {event.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load more / Show stats */}
      {events.length > maxEvents && (
        <div className="text-center">
          <button className="px-4 py-2 text-sm text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 rounded-lg transition-colors">
            Show {Math.min(events.length - maxEvents, 20)} more events
          </button>
        </div>
      )}

      {/* Summary Stats */}
      {!compact && filteredEvents.length > 0 && (
        <div className="card p-4">
          <h4 className="text-sm font-medium mb-3">Timeline Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-[var(--accent-green)]">
                {events.filter(e => e.eventType === 'completion' && e.egoDelta > 0).length}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Completions</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[var(--accent-cyan)]">
                {events.filter(e => e.eventType === 'dispute_won').length}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Disputes Won</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-400">
                {events.filter(e => e.eventType === 'dispute_lost').length}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Disputes Lost</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[var(--accent-purple)]">
                {events.reduce((sum, e) => sum + Math.max(0, e.egoDelta), 0).toFixed(1)}
              </div>
              <div className="text-xs text-[var(--text-muted)]">Total EGO Earned</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}