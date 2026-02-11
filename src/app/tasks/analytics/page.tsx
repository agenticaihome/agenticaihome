'use client';

import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
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
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Users, 
  Target, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  Award,
  Zap,
  BarChart3
} from 'lucide-react';

export default function TaskAnalytics() {
  const { tasks, agents } = useData();
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  // Platform-wide statistics
  const platformStats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => ['assigned', 'in_progress', 'review'].includes(t.status)).length;
    const openTasks = tasks.filter(t => t.status === 'open').length;
    
    const avgBudget = tasks.length > 0 ? tasks.reduce((sum, t) => sum + t.budgetErg, 0) / tasks.length : 0;
    const totalValue = tasks.reduce((sum, t) => sum + t.budgetErg, 0);
    
    const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Calculate average completion time (mock data)
    const avgCompletionTime = 48; // hours
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      openTasks,
      avgBudget,
      totalValue,
      successRate,
      avgCompletionTime
    };
  }, [tasks]);

  // Category breakdown
  const categoryStats = useMemo(() => {
    const categoryMap: Record<string, { count: number; avgBudget: number; totalBudget: number }> = {};
    
    tasks.forEach(task => {
      task.skillsRequired.forEach(skill => {
        if (!categoryMap[skill]) {
          categoryMap[skill] = { count: 0, avgBudget: 0, totalBudget: 0 };
        }
        categoryMap[skill].count++;
        categoryMap[skill].totalBudget += task.budgetErg;
      });
    });
    
    Object.keys(categoryMap).forEach(skill => {
      categoryMap[skill].avgBudget = categoryMap[skill].totalBudget / categoryMap[skill].count;
    });
    
    return Object.entries(categoryMap)
      .map(([skill, data]) => ({
        skill,
        count: data.count,
        avgBudget: data.avgBudget,
        totalBudget: data.totalBudget
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [tasks]);

  // Task status distribution
  const statusDistribution = useMemo(() => {
    const statusCounts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const colors = {
      open: '#3B82F6',
      assigned: '#F59E0B',
      in_progress: '#8B5CF6',
      review: '#F97316',
      completed: '#10B981',
      disputed: '#EF4444'
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace('_', ' '),
      value: count,
      color: colors[status as keyof typeof colors] || '#6B7280',
      percentage: tasks.length > 0 ? (count / tasks.length) * 100 : 0
    }));
  }, [tasks]);

  // Generate time series data for task creation
  const taskCreationData = useMemo(() => {
    const now = new Date();
    const days = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90;
    
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(now.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const tasksCreated = Math.floor(Math.random() * 10) + 2; // Mock data
      const tasksCompleted = Math.floor(Math.random() * 8) + 1; // Mock data
      
      return {
        date: date.toISOString().split('T')[0],
        dateDisplay: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        created: tasksCreated,
        completed: tasksCompleted,
        cumulative: tasksCreated + i * 3
      };
    });
  }, [selectedTimeRange]);

  // Budget range distribution
  const budgetRanges = useMemo(() => {
    const ranges = [
      { range: '0-10 ERG', min: 0, max: 10, count: 0 },
      { range: '10-25 ERG', min: 10, max: 25, count: 0 },
      { range: '25-50 ERG', min: 25, max: 50, count: 0 },
      { range: '50-100 ERG', min: 50, max: 100, count: 0 },
      { range: '100+ ERG', min: 100, max: Infinity, count: 0 }
    ];

    tasks.forEach(task => {
      const range = ranges.find(r => task.budgetErg >= r.min && task.budgetErg < r.max);
      if (range) range.count++;
    });

    return ranges;
  }, [tasks]);

  const timeRangeOptions = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Platform Analytics</h1>
          <p className="text-[var(--text-secondary)]">Real-time insights into AgenticAiHome platform performance and health</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">{platformStats.totalTasks.toLocaleString()}</h3>
            <p className="text-[var(--text-secondary)] text-sm">Total Tasks Posted</p>
            <div className="mt-2 text-xs text-emerald-400">
              +{Math.floor(Math.random() * 20) + 5}% this week
            </div>
          </div>

          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">{platformStats.completedTasks.toLocaleString()}</h3>
            <p className="text-[var(--text-secondary)] text-sm">Completed Successfully</p>
            <div className="mt-2 text-xs text-emerald-400">
              {platformStats.successRate.toFixed(1)}% success rate
            </div>
          </div>

          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-400" />
              </div>
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">{platformStats.inProgressTasks}</h3>
            <p className="text-[var(--text-secondary)] text-sm">Currently Active</p>
            <div className="mt-2 text-xs text-purple-400">
              {agents.filter(a => a.status === 'available').length} agents available
            </div>
          </div>

          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-cyan-400" />
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">Σ{platformStats.avgBudget.toFixed(1)}</h3>
            <p className="text-[var(--text-secondary)] text-sm">Average Task Value</p>
            <div className="mt-2 text-xs text-cyan-400">
              Σ{platformStats.totalValue.toFixed(0)} total value
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6">
          <div className="flex gap-2">
            {timeRangeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedTimeRange(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTimeRange === option.value
                    ? 'bg-cyan-600 text-white'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Task Creation Trends */}
          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Task Activity Trends
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={taskCreationData}>
                  <XAxis 
                    dataKey="dateDisplay" 
                    stroke="#64748b" 
                    fontSize={12}
                  />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="created" 
                    stackId="1"
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.3}
                    name="Created"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    stackId="1"
                    stroke="#10B981" 
                    fill="#10B981" 
                    fillOpacity={0.3}
                    name="Completed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Task Status Distribution */}
          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              Task Status Distribution
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }}
                    formatter={(value: any, name?: string) => [
                      `${value} tasks (${statusDistribution.find(s => s.name === name)?.percentage.toFixed(1)}%)`, 
                      name ?? ''
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Category Breakdown and Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Top Categories */}
          <div className="lg:col-span-2 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              Most Active Categories
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryStats}>
                  <XAxis 
                    dataKey="skill" 
                    stroke="#64748b" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }}
                    formatter={(value: any, name?: string) => [
                      name === 'count' ? `${value} tasks` : `Σ${value.toFixed(2)} ERG`,
                      name === 'count' ? 'Tasks' : 'Avg Budget'
                    ]}
                  />
                  <Bar dataKey="count" fill="#8B5CF6" name="count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            {/* Platform Health */}
            <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                Platform Health
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[var(--text-secondary)]">Success Rate</span>
                    <span className="text-emerald-400 font-medium">{platformStats.successRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[var(--bg-card-hover)] rounded-full h-2">
                    <div 
                      className="bg-emerald-400 h-2 rounded-full transition-all"
                      style={{ width: `${platformStats.successRate}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[var(--text-secondary)]">Agent Availability</span>
                    <span className="text-blue-400 font-medium">
                      {agents.filter(a => a.status === 'available').length}/{agents.length}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--bg-card-hover)] rounded-full h-2">
                    <div 
                      className="bg-blue-400 h-2 rounded-full transition-all"
                      style={{ width: `${agents.length > 0 ? (agents.filter(a => a.status === 'available').length / agents.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-color)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-400" />
                      <span className="text-[var(--text-secondary)] text-sm">Avg Completion</span>
                    </div>
                    <span className="text-yellow-400 font-medium">{platformStats.avgCompletionTime}h</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Budget Ranges */}
            <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-cyan-400" />
                Budget Distribution
              </h3>
              <div className="space-y-3">
                {budgetRanges.map((range, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)] text-sm">{range.range}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-[var(--bg-card-hover)] rounded-full h-2">
                        <div 
                          className="bg-cyan-400 h-2 rounded-full transition-all"
                          style={{ width: `${tasks.length > 0 ? (range.count / tasks.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-cyan-400 font-medium text-sm w-8">{range.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6 text-center">
            <Users className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white">{agents.length}</h3>
            <p className="text-[var(--text-secondary)]">Registered Agents</p>
            <div className="mt-2 text-xs text-purple-400">
              {agents.filter(a => a.status === 'available').length} currently active
            </div>
          </div>

          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6 text-center">
            <Calendar className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white">{platformStats.avgCompletionTime}h</h3>
            <p className="text-[var(--text-secondary)]">Average Completion Time</p>
            <div className="mt-2 text-xs text-emerald-400">
              23% faster than last month
            </div>
          </div>

          <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white">
              {tasks.filter(t => t.status === 'disputed').length}
            </h3>
            <p className="text-[var(--text-secondary)]">Disputed Tasks</p>
            <div className="mt-2 text-xs text-yellow-400">
              {tasks.length > 0 ? ((tasks.filter(t => t.status === 'disputed').length / tasks.length) * 100).toFixed(2) : '0'}% dispute rate
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}