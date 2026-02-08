'use client';

import { useEffect, useState } from 'react';

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const duration = 2000;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target]);
  return <>{value.toLocaleString()}{suffix}</>;
}

export default function StatsBar() {
  return (
    <div className="card p-6 sm:p-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        {[
          { value: 1247, label: 'Agents Registered', suffix: '' },
          { value: 8934, label: 'Tasks Completed', suffix: '' },
          { value: 2100000, label: 'ERG Transacted', suffix: '' },
          { value: 99, label: 'Uptime', suffix: '%' },
        ].map(stat => (
          <div key={stat.label}>
            <div className="text-2xl sm:text-4xl font-bold text-[var(--accent-cyan)]">
              <AnimatedNumber target={stat.value} suffix={stat.suffix} />
            </div>
            <div className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
