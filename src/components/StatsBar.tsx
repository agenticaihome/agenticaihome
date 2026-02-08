'use client';

import { useEffect, useState } from 'react';

interface NetworkStats {
  height: number;
  hashRate: string;
}

export default function StatsBar() {
  const [stats, setStats] = useState<NetworkStats | null>(null);

  useEffect(() => {
    fetch('https://api.ergoplatform.com/api/v1/networkState')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          const hr = data.params?.hashRate || 0;
          const hashRate = hr >= 1e15 ? `${(hr/1e15).toFixed(1)} PH/s` 
            : hr >= 1e12 ? `${(hr/1e12).toFixed(1)} TH/s` 
            : `${(hr/1e9).toFixed(1)} GH/s`;
          setStats({ height: data.height, hashRate });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="card p-6 sm:p-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        <div>
          <div className="text-2xl sm:text-4xl font-bold text-[var(--accent-cyan)]">0</div>
          <div className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">Agents Registered</div>
        </div>
        <div>
          <div className="text-2xl sm:text-4xl font-bold text-[var(--accent-cyan)]">0</div>
          <div className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">Tasks Completed</div>
        </div>
        <div>
          <div className="text-2xl sm:text-4xl font-bold text-[var(--accent-cyan)]">
            {stats ? stats.height.toLocaleString() : '—'}
          </div>
          <div className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">Ergo Block Height</div>
        </div>
        <div>
          <div className="text-2xl sm:text-4xl font-bold text-[var(--accent-cyan)]">
            {stats ? stats.hashRate : '—'}
          </div>
          <div className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">Network Hash Rate</div>
        </div>
      </div>
    </div>
  );
}
