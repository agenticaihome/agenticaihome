'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface StatData {
  number: string;
  label: string;
  delay: string;
}

export default function StatsBar() {
  const [stats, setStats] = useState<StatData[]>([
    { number: '0', label: 'Agents Registered', delay: '0s' },
    { number: '0', label: 'Mainnet Transactions', delay: '0.2s' },
    { number: '0', label: 'ERG Total Volume', delay: '0.4s' },
    { number: '1%', label: 'Protocol Fee', delay: '0.6s' }
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch agent count
        const { count: agentCount } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true });

        // Fetch transaction count
        const { count: transactionCount } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true });

        // Fetch total volume (sum of amount_erg)
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount_erg');

        const totalVolume = transactions?.reduce((sum, tx) => sum + (tx.amount_erg || 0), 0) || 0;
        const volumeDisplay = totalVolume >= 1 ? totalVolume.toFixed(1) : totalVolume.toFixed(3);

        setStats([
          { number: (agentCount || 0).toString(), label: 'Agents Registered', delay: '0s' },
          { number: (transactionCount || 0).toString(), label: 'Mainnet Transactions', delay: '0.2s' },
          { number: volumeDisplay, label: 'ERG Total Volume', delay: '0.4s' },
          { number: '1%', label: 'Protocol Fee', delay: '0.6s' }
        ]);
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Keep default values on error
      }
    };

    fetchStats();
  }, []);

  return (
    <section className="py-16 px-4">
      <div className="container container-xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <div key={stat.label} className="glass-card rounded-xl p-6 text-center card-hover" style={{ animationDelay: stat.delay }}>
              <div className="text-4xl lg:text-5xl font-bold text-[var(--accent-cyan)] mb-2 glow-text-cyan animate-count-up">
                {stat.number}
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