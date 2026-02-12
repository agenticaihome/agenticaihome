'use client';

import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  AreaChart,
  Area
} from 'recharts';

interface AnalyticsChartsProps {
  chartData: any;
  platformStats: any;
  chartType: string;
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ chartData, platformStats, chartType }) => {
  const COLORS = ['#0891b2', '#9333ea', '#16a34a', '#dc2626', '#ea580c', '#7c3aed'];

  const renderChart = () => {
    if (!chartData) return (
      <div className="w-full h-[300px] flex items-center justify-center text-[var(--text-secondary)]">
        No data available
      </div>
    );

    switch (chartType) {
      case 'tasks':
        return (
          <ResponsiveContainer width="100%" height={300} minHeight={200}>
            <AreaChart data={chartData.weeklyTasks}>
              <defs>
                <linearGradient id="tasksGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }}
              />
              <Area
                type="monotone"
                dataKey="tasks"
                stroke="var(--accent-cyan)"
                fillOpacity={1}
                fill="url(#tasksGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'volume':
        return (
          <ResponsiveContainer width="100%" height={300} minHeight={200}>
            <AreaChart data={chartData.weeklyVolume}>
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }}
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="var(--accent-green)"
                fillOpacity={1}
                fill="url(#volumeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'agents':
        return (
          <ResponsiveContainer width="100%" height={300} minHeight={200}>
            <LineChart data={chartData.agentGrowth}>
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }}
              />
              <Line
                type="monotone"
                dataKey="agents"
                stroke="var(--accent-purple)"
                strokeWidth={2}
                dot={{ fill: 'var(--accent-purple)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'skills':
        return (
          <ResponsiveContainer width="100%" height={300} minHeight={200}>
            <PieChart>
              <Pie
                data={chartData.categories}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {chartData.categories.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="card p-6">
      <div className="space-y-6">
        {renderChart()}
      </div>
    </div>
  );
};

export default AnalyticsCharts;