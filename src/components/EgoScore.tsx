'use client';

import { useState, useEffect } from 'react';
import { getEgoTier, getScoreToNextTier } from '@/lib/ego';
import { Gem, Sparkles } from 'lucide-react';

interface EgoScoreProps {
  score: number;
  previousScore?: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  showProgress?: boolean;
  sparklineData?: number[];
  animated?: boolean;
}

export default function EgoScore({ 
  score, 
  previousScore,
  size = 'md',
  showTooltip = false,
  showProgress = false,
  sparklineData = [],
  animated = true
}: EgoScoreProps) {
  const [displayScore, setDisplayScore] = useState(animated && previousScore !== undefined ? previousScore : score);
  const [showTooltipState, setShowTooltipState] = useState(false);

  const tier = getEgoTier(score);
  const { nextTier, pointsNeeded } = getScoreToNextTier(score);
  
  // Animate score changes
  useEffect(() => {
    if (!animated || previousScore === undefined) {
      setDisplayScore(score);
      return;
    }

    const startScore = previousScore;
    const endScore = score;
    const duration = 1000; // 1 second
    const steps = 30;
    const stepDuration = duration / steps;
    const scoreStep = (endScore - startScore) / steps;
    
    let currentStep = 0;
    
    const interval = setInterval(() => {
      currentStep++;
      const newScore = startScore + (scoreStep * currentStep);
      
      if (currentStep >= steps) {
        setDisplayScore(endScore);
        clearInterval(interval);
      } else {
        setDisplayScore(Math.round(newScore));
      }
    }, stepDuration);
    
    return () => clearInterval(interval);
  }, [score, previousScore, animated]);

  const pct = Math.min(displayScore, 100);
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (pct / 100) * circumference;

  // Progress to next tier
  const progressPct = nextTier ? ((displayScore - tier.minScore) / (nextTier.minScore - tier.minScore)) * 100 : 100;

  if (size === 'sm') {
    return (
      <div className="relative group">
        <div 
          className="flex items-center gap-1.5 cursor-pointer"
          onMouseEnter={() => showTooltip && setShowTooltipState(true)}
          onMouseLeave={() => showTooltip && setShowTooltipState(false)}
        >
          <div className="relative">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 hover:scale-110" 
              style={{ 
                borderColor: tier.color, 
                color: tier.color,
                backgroundColor: `${tier.color}10`
              }}
            >
              {displayScore}
            </div>
            
            {/* Mini sparkline */}
            {sparklineData.length > 1 && (
              <div className="absolute -bottom-1 -right-1 w-4 h-2">
                <svg viewBox="0 0 20 10" className="w-full h-full">
                  <polyline
                    fill="none"
                    stroke={tier.color}
                    strokeWidth="1"
                    points={sparklineData.map((value, index) => 
                      `${(index / (sparklineData.length - 1)) * 20},${10 - (value / 100) * 10}`
                    ).join(' ')}
                  />
                </svg>
              </div>
            )}
          </div>
          <span className="text-[var(--text-muted)] text-xs">EGO</span>
        </div>

        {/* Tooltip */}
        {showTooltip && showTooltipState && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg whitespace-nowrap z-50">
            <div className="font-medium">{tier.name} Tier</div>
            <div>Score: {displayScore}/100</div>
            {nextTier && (
              <div>{pointsNeeded} points to {nextTier.name}</div>
            )}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/90"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative group">
      <div 
        className={`flex flex-col items-center ${size === 'lg' ? 'gap-3' : 'gap-2'} cursor-pointer`}
        onMouseEnter={() => showTooltip && setShowTooltipState(true)}
        onMouseLeave={() => showTooltip && setShowTooltipState(false)}
      >
        <div className="relative">
          {/* Main circular progress */}
          <svg width={size === 'lg' ? 120 : 88} height={size === 'lg' ? 120 : 88} viewBox="0 0 88 88" className="transform hover:scale-105 transition-transform duration-300">
            {/* Background circle */}
            <circle cx="44" cy="44" r="36" fill="none" stroke="var(--border-color)" strokeWidth="4" />
            
            {/* Progress circle with smooth spring animation */}
            <circle 
              cx="44" 
              cy="44" 
              r="36" 
              fill="none" 
              stroke={tier.color} 
              strokeWidth="4"
              strokeLinecap="round" 
              strokeDasharray={circumference} 
              strokeDashoffset={dashOffset}
              transform="rotate(-90 44 44)"
              style={{ 
                transition: 'stroke-dashoffset 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                filter: 'drop-shadow(0 0 8px ' + tier.color + '40)'
              }} 
            />
            
            {/* Glow effect for high scores */}
            {displayScore >= 76 && (
              <circle 
                cx="44" 
                cy="44" 
                r="36" 
                fill="none" 
                stroke={tier.color} 
                strokeWidth="2"
                strokeLinecap="round" 
                strokeDasharray={circumference} 
                strokeDashoffset={dashOffset}
                transform="rotate(-90 44 44)"
                opacity="0.3"
                style={{ 
                  transition: 'stroke-dashoffset 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  filter: 'blur(2px)'
                }} 
              />
            )}
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span 
              className={`font-bold ${size === 'lg' ? 'text-3xl' : 'text-2xl'} transition-all duration-500`} 
              style={{ 
                color: tier.color,
                textShadow: displayScore >= 76 ? `0 0 10px ${tier.color}40` : 'none'
              }}
            >
              {displayScore}
            </span>
            
            {/* Sparkline in center for lg size */}
            {size === 'lg' && sparklineData.length > 1 && (
              <div className="mt-1 w-12 h-3">
                <svg viewBox="0 0 48 12" className="w-full h-full">
                  <polyline
                    fill="none"
                    stroke={tier.color}
                    strokeWidth="1"
                    opacity="0.6"
                    points={sparklineData.map((value, index) => 
                      `${(index / (sparklineData.length - 1)) * 48},${12 - (value / 100) * 12}`
                    ).join(' ')}
                  />
                </svg>
              </div>
            )}
          </div>
          
          {/* Enhanced tier effects for legendary */}
          {displayScore >= 91 && (
            <>
              {/* Legendary pulse effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--accent-purple)]/20 via-transparent to-[var(--accent-cyan)]/20 animate-pulse" />
              
              {/* Legendary icon with custom pulse */}
              <div className="absolute -top-3 -right-3 text-3xl animate-bounce" style={{ animationDuration: '2s' }}>
                <Gem className="w-4 h-4 text-purple-400 inline" />
              </div>
              
              {/* Orbital glow effect */}
              <div 
                className="absolute inset-0 rounded-full opacity-30"
                style={{
                  background: `conic-gradient(from 0deg, ${tier.color}00, ${tier.color}80, ${tier.color}00)`,
                  animation: 'spin 4s linear infinite'
                }}
              />
            </>
          )}
          
          {/* Mythic tier effects */}
          {displayScore >= 76 && displayScore < 91 && (
            <div className="absolute -top-1 -right-1 text-lg">
              <Sparkles className="w-4 h-4 text-yellow-400 inline" />
            </div>
          )}
        </div>
        
        <div className="text-center">
          <div className="text-[var(--text-muted)] text-xs uppercase tracking-wider">EGO Score</div>
          <div className={`text-sm mt-0.5 transition-colors duration-300`} style={{ color: tier.color }}>
            {tier.icon} {tier.name}
          </div>
          
          {/* Progress to next tier */}
          {showProgress && nextTier && (
            <div className="mt-2 w-24">
              <div className="text-xs text-[var(--text-muted)] mb-1">
                {pointsNeeded} to {nextTier.name}
              </div>
              <div className="w-full bg-[var(--border-color)] rounded-full h-1">
                <div 
                  className="h-1 rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${Math.min(progressPct, 100)}%`,
                    backgroundColor: nextTier.color 
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Tooltip */}
      {showTooltip && showTooltipState && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 p-4 bg-black/95 text-white text-xs rounded-xl whitespace-nowrap z-50 border border-white/10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <span className="text-lg">{tier.icon}</span>
              <span>{tier.name} Tier</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-white/60">Current Score</div>
                <div className="font-mono text-sm" style={{ color: tier.color }}>{displayScore}</div>
              </div>
              
              <div>
                <div className="text-white/60">Tier Range</div>
                <div className="font-mono text-sm">{tier.minScore}-{tier.maxScore}</div>
              </div>
              
              {nextTier && (
                <>
                  <div>
                    <div className="text-white/60">Next Tier</div>
                    <div className="font-medium">{nextTier.name}</div>
                  </div>
                  
                  <div>
                    <div className="text-white/60">Points Needed</div>
                    <div className="font-mono text-sm text-[var(--accent-cyan)]">+{pointsNeeded}</div>
                  </div>
                </>
              )}
            </div>
            
            {tier.governanceWeight > 0 && (
              <div className="pt-2 border-t border-white/20">
                <div className="text-white/60">Governance Weight: </div>
                <span className="text-[var(--accent-purple)]">{tier.governanceWeight}x voting power</span>
              </div>
            )}
          </div>
          
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/95"></div>
        </div>
      )}
    </div>
  );
}
