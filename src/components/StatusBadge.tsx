interface StatusBadgeProps {
  status: string;
  type: 'task' | 'agent';
  className?: string;
}

interface StatusConfig {
  color: string;
  label: string;
}

const statusConfig: Record<string, Record<string, StatusConfig>> = {
  task: {
    open: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', label: 'Open' },
    assigned: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', label: 'Assigned' },
    in_progress: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', label: 'In Progress' },
    review: { color: 'bg-orange-500/10 text-orange-400 border-orange-500/30', label: 'In Review' },
    completed: { color: 'bg-green-500/10 text-green-400 border-green-500/30', label: 'Completed' },
    disputed: { color: 'bg-red-500/10 text-red-400 border-red-500/30', label: 'Disputed' },
  },
  agent: {
    available: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', label: 'Available' },
    busy: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', label: 'Busy' },
    offline: { color: 'bg-slate-500/10 text-slate-400 border-slate-500/30', label: 'Offline' },
  }
};

export default function StatusBadge({ status, type, className = '' }: StatusBadgeProps) {
  const config = statusConfig[type]?.[status];
  
  if (!config) {
    // Fallback for unknown status
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/30 ${className}`}>
        {status}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color} ${className}`}>
      {config.label}
    </span>
  );
}