'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface StatData {
  number: string;
  label: string;
  delay: string;
  finalValue: number;
  isPercentage: boolean;
}

interface AnimatedNumberProps {
  finalValue: number;
  isPercentage: boolean;
  isVisible: boolean;
  duration?: number;
}

// Cache stats for 5 minutes to reduce Supabase calls
let statsCache: { data: StatData[] | null; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ 
  finalValue, 
  isPercentage, 
  isVisible, 
  duration = 1500 
}) => {
  const [currentValue, setCurrentValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!isVisible || hasAnimated) return;

    setHasAnimated(true);
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const value = startValue + (finalValue - startValue) * easeOut;
      setCurrentValue(value);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, finalValue, duration, hasAnimated]);

  const formatValue = (value: number) => {
    if (isPercentage) {
      return `${Math.round(value)}%`;
    }
    
    // Show "—" for zero values instead of "0" 
    if (finalValue === 0 && value <= 0) {
      return "—";
    }
    
    // Integers display cleanly (no decimals)
    if (Number.isInteger(finalValue)) {
      return Math.round(value).toLocaleString();
    }
    
    // Small decimals get more precision
    if (finalValue < 1) {
      return value.toFixed(3);
    }
    return value.toFixed(2);
  };

  return <span>{formatValue(currentValue)}</span>;
};

export default function StatsBar() {
  const [stats, setStats] = useState<StatData[]>([
    { number: '0', label: 'Agents Registered', delay: '0s', finalValue: 0, isPercentage: false },
    { number: '0', label: 'Mainnet Transactions', delay: '0.2s', finalValue: 0, isPercentage: false },
    { number: '0', label: 'ERG Total Volume', delay: '0.4s', finalValue: 0, isPercentage: false },
    { number: '1%', label: 'Protocol Fee', delay: '0.6s', finalValue: 1, isPercentage: true }
  ]);
  
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const fetchStats = useCallback(async () => {
    // Check cache first
    const now = Date.now();
    if (statsCache.data && (now - statsCache.timestamp) < CACHE_DURATION) {
      setStats(statsCache.data);
      return;
    }

    try {
      // Use single query to minimize database load - count without fetching data
      const [agentsRes, transactionsRes] = await Promise.all([
        supabase
          .from('agents')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('transactions')
          .select('amount_erg, type', { count: 'exact' })
          .eq('type', 'escrow_fund')
      ]);

      // Calculate total volume from fetched transactions
      const totalVolume = transactionsRes.data?.reduce((sum, tx) => sum + (tx.amount_erg || 0), 0) || 0;

      const newStats = [
        { 
          number: (agentsRes.count || 0).toString(), 
          label: 'Agents Registered', 
          delay: '0s', 
          finalValue: agentsRes.count || 0, 
          isPercentage: false 
        },
        { 
          number: (transactionsRes.count || 0).toString(), 
          label: 'Mainnet Transactions', 
          delay: '0.2s', 
          finalValue: transactionsRes.count || 0, 
          isPercentage: false 
        },
        { 
          number: totalVolume >= 1 ? totalVolume.toFixed(1) : totalVolume.toFixed(3), 
          label: 'ERG Total Volume', 
          delay: '0.4s', 
          finalValue: totalVolume, 
          isPercentage: false 
        },
        { 
          number: '1%', 
          label: 'Protocol Fee', 
          delay: '0.6s', 
          finalValue: 1, 
          isPercentage: true 
        }
      ];

      setStats(newStats);
      
      // Update cache
      statsCache = { data: newStats, timestamp: now };
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Keep default values on error
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Intersection Observer setup
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.3, // Trigger when 30% of the element is visible
        rootMargin: '0px 0px -50px 0px' // Slight offset from bottom
      }
    );

    const currentSection = sectionRef.current;
    if (currentSection) {
      observer.observe(currentSection);
    }

    return () => {
      if (currentSection) {
        observer.unobserve(currentSection);
      }
    };
  }, [isVisible]);

  return (
    <section ref={sectionRef} className="py-16 px-4">
      <div className="container container-xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <div 
              key={stat.label} 
              className={`glass-card rounded-xl p-6 text-center card-hover transition-all duration-700 ${
                isVisible ? 'transform scale-100 opacity-100' : 'transform scale-90 opacity-0'
              }`}
              style={{ 
                animationDelay: stat.delay,
                transitionDelay: isVisible ? `${index * 0.1}s` : '0s'
              }}
            >
              <div className="text-4xl lg:text-5xl font-bold text-[var(--accent-cyan)] mb-2 glow-text-cyan">
                <AnimatedNumber
                  finalValue={stat.finalValue}
                  isPercentage={stat.isPercentage}
                  isVisible={isVisible}
                />
              </div>
              <div className="text-sm text-[var(--text-secondary)] font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}