'use client';

import { useState, useMemo } from 'react';
import { projectEgoGrowth, EgoProjection as EgoProjectionType, EgoFactors } from '@/lib/ego';
import { AlertTriangle, Gem, Star } from 'lucide-react';

interface EgoProjectionProps {
  currentScore: number;
  currentFactors?: Partial<EgoFactors>;
  compact?: boolean;
}

export default function EgoProjection({ currentScore, currentFactors, compact = false }: EgoProjectionProps) {
  const [completionsPerMonth, setCompletionsPerMonth] = useState(5);
  const [avgRating, setAvgRating] = useState(4.2);
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(true);

  // Generate projections based on current inputs
  const projections = useMemo(() => {
    return projectEgoGrowth(currentScore, completionsPerMonth, avgRating, currentFactors);
  }, [currentScore, completionsPerMonth, avgRating, currentFactors]);

  // Calculate insights
  const insights = useMemo(() => {
    const finalProjection = projections[projections.length - 1];
    const totalGrowth = finalProjection.projectedScore - currentScore;
    const monthsToNextTier = projections.findIndex(p => {
      if (currentScore < 21) return p.projectedScore >= 21;
      if (currentScore < 51) return p.projectedScore >= 51;
      if (currentScore < 76) return p.projectedScore >= 76;
      if (currentScore < 91) return p.projectedScore >= 91;
      return false;
    });

    return {
      totalGrowth,
      avgMonthlyGrowth: totalGrowth / 6,
      monthsToNextTier: monthsToNextTier === -1 ? null : monthsToNextTier + 1,
      finalScore: finalProjection.projectedScore,
      reachesElite: finalProjection.projectedScore >= 76,
      reachesLegendary: finalProjection.projectedScore >= 91,
    };
  }, [projections, currentScore]);

  const getTierColor = (score: number) => {
    if (score >= 91) return '#00ff88';
    if (score >= 76) return '#00d4ff';
    if (score >= 51) return '#8b5cf6';
    if (score >= 21) return '#3b82f6';
    return '#6b7280';
  };

  const getTierName = (score: number) => {
    if (score >= 91) return 'Legendary';
    if (score >= 76) return 'Elite';
    if (score >= 51) return 'Established';
    if (score >= 21) return 'Rising';
    return 'Newcomer';
  };

  return (
    <div className={`space-y-${compact ? '4' : '6'}`}>
      {/* Header */}
      {!compact && (
        <div>
          <h3 className="text-xl font-semibold mb-2">EGO Growth Projection</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Simulate your EGO trajectory over the next 6 months based on activity patterns
          </p>
        </div>
      )}

      {/* Input Controls */}
      <div className={`card p-${compact ? '4' : '6'}`}>
        <h4 className={`font-medium mb-${compact ? '3' : '4'} text-${compact ? 'sm' : 'base'}`}>
          Activity Assumptions
        </h4>
        
        <div className={`grid ${compact ? 'grid-cols-1' : 'md:grid-cols-2'} gap-${compact ? '3' : '4'}`}>
          {/* Completions per month */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Tasks Completed per Month
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={completionsPerMonth}
                onChange={(e) => setCompletionsPerMonth(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>0</span>
                <span className="font-medium text-[var(--accent-cyan)]">{completionsPerMonth} tasks/month</span>
                <span>20</span>
              </div>
            </div>
          </div>

          {/* Average rating */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Expected Average Rating
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="1"
                max="5"
                step="0.1"
                value={avgRating}
                onChange={(e) => setAvgRating(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>1<Star className="w-4 h-4 text-yellow-400 inline" /></span>
                <span className="font-medium text-[var(--accent-cyan)]">{avgRating.toFixed(1)}<Star className="w-4 h-4 text-yellow-400 inline" /> average</span>
                <span>5<Star className="w-4 h-4 text-yellow-400 inline" /></span>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle for confidence interval */}
        {!compact && (
          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="showConfidenceInterval"
              checked={showConfidenceInterval}
              onChange={(e) => setShowConfidenceInterval(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="showConfidenceInterval" className="text-sm text-[var(--text-secondary)]">
              Show uncertainty range
            </label>
          </div>
        )}
      </div>

      {/* Projection Chart */}
      <div className={`card p-${compact ? '4' : '6'}`}>
        <h4 className={`font-medium mb-${compact ? '3' : '4'} text-${compact ? 'sm' : 'base'}`}>
          6-Month Projection
        </h4>
        
        <div className="relative">
          {/* Chart container */}
          <div className={`${compact ? 'h-32' : 'h-48'} bg-[var(--bg-secondary)] rounded-lg p-4 relative overflow-hidden`}>
            {/* Y-axis labels */}
            <div className="absolute left-1 top-4 bottom-4 flex flex-col justify-between text-xs text-[var(--text-muted)]">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>
            
            {/* Chart area */}
            <div className="ml-6 mr-2 h-full">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Grid lines */}
                <defs>
                  <pattern id="grid" width="16.67" height="25" patternUnits="userSpaceOnUse">
                    <path d="M 16.67 0 L 0 0 0 25" fill="none" stroke="var(--border-color)" strokeWidth="0.2"/>
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid)" />
                
                {/* Tier zones */}
                <rect x="0" y="0" width="100" height="9" fill="#00ff88" opacity="0.1" />
                <rect x="0" y="9" width="100" height="15" fill="#00d4ff" opacity="0.1" />
                <rect x="0" y="24" width="100" height="25" fill="#8b5cf6" opacity="0.1" />
                <rect x="0" y="49" width="100" height="29" fill="#3b82f6" opacity="0.1" />
                
                {/* Confidence interval */}
                {showConfidenceInterval && (
                  <polygon
                    fill="var(--accent-cyan)"
                    fillOpacity="0.2"
                    stroke="none"
                    points={[
                      // Top line (max confidence)
                      ...projections.map((p, i) => 
                        `${(i / Math.max(projections.length - 1, 1)) * 100},${100 - p.confidenceInterval[1]}`
                      ),
                      // Bottom line (min confidence) - reversed
                      ...projections.slice().reverse().map((p, i) => 
                        `${((projections.length - 1 - i) / Math.max(projections.length - 1, 1)) * 100},${100 - p.confidenceInterval[0]}`
                      )
                    ].join(' ')}
                  />
                )}
                
                {/* Main projection line */}
                <polyline
                  fill="none"
                  stroke="var(--accent-cyan)"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={`0,${100 - currentScore} ${projections.map((p, i) => 
                    `${((i + 1) / Math.max(projections.length, 1)) * 100},${100 - p.projectedScore}`
                  ).join(' ')}`}
                />
                
                {/* Data points */}
                <circle cx="0" cy={100 - currentScore} r="1.5" fill="var(--accent-green)" />
                {projections.map((p, i) => (
                  <circle
                    key={i}
                    cx={((i + 1) / Math.max(projections.length, 1)) * 100}
                    cy={100 - p.projectedScore}
                    r="1"
                    fill="var(--accent-cyan)"
                  />
                ))}
              </svg>
            </div>
            
            {/* X-axis labels */}
            <div className="absolute bottom-0 left-6 right-2 flex justify-between text-xs text-[var(--text-muted)]">
              <span>Now</span>
              <span>Month 3</span>
              <span>Month 6</span>
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-[var(--accent-cyan)]"></div>
              <span>Projected Score</span>
            </div>
            {showConfidenceInterval && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 bg-[var(--accent-cyan)] opacity-20"></div>
                <span>Uncertainty Range</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[var(--accent-green)]"></div>
              <span>Current: {currentScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className={`card p-${compact ? '4' : '6'}`}>
        <h4 className={`font-medium mb-${compact ? '3' : '4'} text-${compact ? 'sm' : 'base'}`}>
          Projection Insights
        </h4>
        
        <div className={`grid ${compact ? 'grid-cols-1' : 'md:grid-cols-2'} gap-${compact ? '3' : '4'}`}>
          {/* Growth metrics */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-secondary)]">6-month growth:</span>
              <span className={`font-mono font-bold ${insights.totalGrowth > 0 ? 'text-[var(--accent-green)]' : 'text-red-400'}`}>
                {insights.totalGrowth > 0 ? '+' : ''}{insights.totalGrowth.toFixed(1)} EGO
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-secondary)]">Projected final score:</span>
              <div className="text-right">
                <span className="font-mono font-bold" style={{ color: getTierColor(insights.finalScore) }}>
                  {insights.finalScore}
                </span>
                <div className="text-xs" style={{ color: getTierColor(insights.finalScore) }}>
                  {getTierName(insights.finalScore)}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-secondary)]">Avg monthly growth:</span>
              <span className="font-mono text-[var(--accent-cyan)]">
                +{insights.avgMonthlyGrowth.toFixed(1)} EGO/month
              </span>
            </div>
          </div>
          
          {/* Milestones */}
          <div className="space-y-3">
            {insights.monthsToNextTier && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-secondary)]">Next tier in:</span>
                <span className="font-bold text-[var(--accent-purple)]">
                  ~{insights.monthsToNextTier} months
                </span>
              </div>
            )}
            
            {insights.reachesElite && (
              <div className="flex items-center gap-2">
                <span className="text-[var(--accent-cyan)]">🟡</span>
                <span className="text-sm">On track to reach Elite tier!</span>
              </div>
            )}
            
            {insights.reachesLegendary && (
              <div className="flex items-center gap-2">
                <span className="text-[var(--accent-green)]"><Gem className="w-4 h-4 text-purple-400 inline" /></span>
                <span className="text-sm">Legendary tier achievable!</span>
              </div>
            )}
            
            {insights.totalGrowth < 5 && (
              <div className="flex items-center gap-2">
                <span className="text-[#f59e0b]"><AlertTriangle className="w-4 h-4 text-yellow-400 inline" /></span>
                <span className="text-sm">Consider increasing activity for faster growth</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Recommendations */}
        {!compact && (
          <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
            <h5 className="text-sm font-medium mb-2 text-[var(--accent-cyan)]">Recommendations:</h5>
            <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
              {avgRating < 4.0 && (
                <li>• Focus on quality: Higher ratings have exponential impact on EGO growth</li>
              )}
              {completionsPerMonth < 3 && (
                <li>• Increase activity: More completions accelerate reputation building</li>
              )}
              {completionsPerMonth > 15 && (
                <li>• Quality over quantity: Ensure you can maintain high ratings at this pace</li>
              )}
              <li>• Consistent activity: Regular completions prevent score decay</li>
            </ul>
          </div>
        )}
      </div>

      {/* Monthly breakdown table */}
      {!compact && (
        <div className="card p-6">
          <h4 className="font-medium mb-4">Month-by-Month Projection</h4>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="text-left py-2 text-[var(--text-muted)]">Month</th>
                  <th className="text-right py-2 text-[var(--text-muted)]">Projected Score</th>
                  <th className="text-right py-2 text-[var(--text-muted)]">Growth</th>
                  <th className="text-right py-2 text-[var(--text-muted)]">Tier</th>
                  {showConfidenceInterval && <th className="text-right py-2 text-[var(--text-muted)]">Range</th>}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--border-color)]/50">
                  <td className="py-2">Current</td>
                  <td className="text-right font-mono">{currentScore}</td>
                  <td className="text-right">—</td>
                  <td className="text-right" style={{ color: getTierColor(currentScore) }}>
                    {getTierName(currentScore)}
                  </td>
                  {showConfidenceInterval && <td className="text-right">—</td>}
                </tr>
                {projections.map((projection, index) => {
                  const growth = index === 0 
                    ? projection.projectedScore - currentScore 
                    : projection.projectedScore - projections[index - 1].projectedScore;
                  
                  return (
                    <tr key={index} className="border-b border-[var(--border-color)]/50">
                      <td className="py-2">Month {projection.month}</td>
                      <td className="text-right font-mono">{projection.projectedScore}</td>
                      <td className={`text-right font-mono ${growth > 0 ? 'text-[var(--accent-green)]' : 'text-red-400'}`}>
                        {growth > 0 ? '+' : ''}{growth.toFixed(1)}
                      </td>
                      <td className="text-right" style={{ color: getTierColor(projection.projectedScore) }}>
                        {getTierName(projection.projectedScore)}
                      </td>
                      {showConfidenceInterval && (
                        <td className="text-right text-xs text-[var(--text-muted)]">
                          {projection.confidenceInterval[0]}—{projection.confidenceInterval[1]}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}