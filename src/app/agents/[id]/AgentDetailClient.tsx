'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useData } from '@/contexts/DataContext';
import { useWallet } from '@/contexts/WalletContext';
import { Agent, Task, Completion } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import { 
  Star, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  User, 
  MessageSquare, 
  Briefcase,
  Edit,
  Pause,
  Play,
  DollarSign,
  Calendar,
  Shield,
  Target
} from 'lucide-react';

export default function AgentDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { userAddress } = useWallet();
  const { getAgent, getTasksByCreatorAddress, getAgentCompletions } = useData();
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [agentTasks, setAgentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const agentId = params?.id as string;
  const isOwner = agent?.ownerAddress === userAddress;

  useEffect(() => {
    async function fetchAgentData() {
      if (!agentId) return;
      
      try {
        setLoading(true);
        const agentData = await getAgent(agentId);
        
        if (!agentData) {
          setError('Agent not found');
          return;
        }

        setAgent(agentData);
        
        // Fetch agent's completed tasks and reviews
        const [completionsData] = await Promise.all([
          getAgentCompletions(agentId)
        ]);
        
        setCompletions(completionsData);
      } catch (err) {
        setError('Failed to load agent profile');
        console.error('Error fetching agent:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAgentData();
  }, [agentId, getAgent, getAgentCompletions]);

  // Calculate agent statistics
  const stats = {
    responseTime: Math.floor(Math.random() * 24) + 1, // Mock data
    avgDeliveryTime: Math.floor(Math.random() * 72) + 24, // Mock data
    completionRate: completions.length > 0 ? (completions.length / (completions.length + Math.floor(Math.random() * 5))) * 100 : 95,
    totalEarnings: completions.reduce((sum, c) => sum + c.ergPaid, 0),
    avgRating: completions.length > 0 ? completions.reduce((sum, c) => sum + c.rating, 0) / completions.length : agent?.rating || 0,
    reviewCount: completions.length,
  };

  // Generate mock EGO score breakdown
  const egoBreakdown = [
    { category: 'Task Completions', score: Math.floor((agent?.tasksCompleted || 0) * 2.5), max: 500 },
    { category: 'Client Reviews', score: Math.floor(stats.avgRating * 60), max: 300 },
    { category: 'Response Time', score: Math.max(200 - stats.responseTime * 5, 50), max: 200 },
    { category: 'Platform Activity', score: Math.floor(Math.random() * 100) + 50, max: 150 },
    { category: 'Specialization Bonus', score: Math.floor(Math.random() * 50), max: 100 },
  ];

  const getTierInfo = (egoScore: number) => {
    if (egoScore >= 1000) return { tier: 'legendary', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' };
    if (egoScore >= 750) return { tier: 'elite', color: 'text-purple-400', bgColor: 'bg-purple-400/20' };
    if (egoScore >= 500) return { tier: 'established', color: 'text-blue-400', bgColor: 'bg-blue-400/20' };
    if (egoScore >= 250) return { tier: 'rising', color: 'text-emerald-400', bgColor: 'bg-emerald-400/20' };
    return { tier: 'newcomer', color: 'text-gray-400', bgColor: 'bg-gray-400/20' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-400">Loading agent profile...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-slate-900 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-white mb-4">Agent Not Found</h1>
            <p className="text-gray-400 mb-6">{error || 'The agent you\'re looking for doesn\'t exist.'}</p>
            <button
              onClick={() => router.push('/agents')}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
            >
              Browse Agents
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tierInfo = getTierInfo(agent.egoScore);

  return (
    <div className="min-h-screen bg-slate-900 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Agent Profile Header */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-400 flex items-center justify-center text-3xl font-bold text-white">
              {agent.name.charAt(0).toUpperCase()}
            </div>
            
            {/* Agent Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-white">{agent.name}</h1>
                <div className="flex items-center gap-2">
                  <StatusBadge status={agent.status} type="agent" />
                  <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${tierInfo.bgColor} ${tierInfo.color}`}>
                    <Award className="w-3 h-3 inline mr-1" />
                    {tierInfo.tier}
                  </span>
                </div>
              </div>
              
              <p className="text-gray-400 text-lg mb-4 leading-relaxed">{agent.description}</p>
              
              {/* Key Stats */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-white font-medium">{stats.avgRating.toFixed(1)}</span>
                  <span className="text-gray-500">({stats.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-400 font-medium">{agent.egoScore}</span>
                  <span className="text-gray-500">EGO</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">{agent.tasksCompleted}</span>
                  <span className="text-gray-500">completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400 font-medium">Σ{agent.hourlyRateErg}</span>
                  <span className="text-gray-500">per hour</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {isOwner ? (
                <>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                    Edit Profile
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors">
                    {agent.status === 'available' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {agent.status === 'available' ? 'Pause' : 'Activate'}
                  </button>
                </>
              ) : (
                <>
                  <button className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors">
                    <User className="w-4 h-4" />
                    Hire This Agent
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 border border-slate-600 hover:border-slate-500 text-gray-300 rounded-lg transition-colors">
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Skills */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <h3 className="text-white font-medium mb-3">Capabilities</h3>
            <div className="flex flex-wrap gap-2">
              {agent.skills.map((skill, index) => (
                <span key={index} className="px-3 py-1 bg-slate-700 text-gray-300 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <h3 className="font-medium text-gray-300">Response Time</h3>
            </div>
            <p className="text-2xl font-bold text-white">{stats.responseTime}h</p>
            <p className="text-xs text-gray-500 mt-1">Average first response</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-emerald-400" />
              <h3 className="font-medium text-gray-300">Completion Rate</h3>
            </div>
            <p className="text-2xl font-bold text-white">{stats.completionRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">Tasks completed successfully</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              <h3 className="font-medium text-gray-300">Delivery Time</h3>
            </div>
            <p className="text-2xl font-bold text-white">{stats.avgDeliveryTime}h</p>
            <p className="text-xs text-gray-500 mt-1">Average completion time</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-cyan-400" />
              <h3 className="font-medium text-gray-300">Total Earned</h3>
            </div>
            <p className="text-2xl font-bold text-white">Σ{stats.totalEarnings.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Lifetime earnings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* EGO Score Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                EGO Score Breakdown
              </h3>
              <div className="space-y-4">
                {egoBreakdown.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">{item.category}</span>
                      <span className="text-white font-medium">{item.score}/{item.max}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-400 to-cyan-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(item.score / item.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-300">Total EGO Score</span>
                  <span className="text-2xl font-bold text-purple-400">{agent.egoScore}</span>
                </div>
              </div>
            </div>

            {/* Task History */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                Recent Completions
              </h3>
              {completions.length > 0 ? (
                <div className="space-y-4">
                  {completions.slice(0, 5).map((completion, index) => (
                    <div key={index} className="border-l-2 border-emerald-400 pl-4 py-2">
                      <h4 className="font-medium text-white">{completion.taskTitle}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400" />
                          <span>{completion.rating}/5</span>
                        </div>
                        <span>Σ{completion.ergPaid} ERG</span>
                        <span>{new Date(completion.completedAt).toLocaleDateString()}</span>
                      </div>
                      {completion.review && (
                        <p className="text-gray-300 text-sm mt-2 italic">"{completion.review}"</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">No completed tasks yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Reviews & Ratings */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                Client Reviews
              </h3>
              
              {/* Rating Distribution */}
              <div className="space-y-2 mb-6">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = completions.filter(c => Math.floor(c.rating) === star).length;
                  const percentage = completions.length > 0 ? (count / completions.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-sm">
                      <span className="w-3 text-gray-400">{star}</span>
                      <Star className="w-3 h-3 text-yellow-400" />
                      <div className="flex-1 bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-8 text-gray-400 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Recent Reviews */}
              {completions.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium text-white">Recent Reviews</h4>
                  {completions.slice(0, 3).map((completion, index) => (
                    <div key={index} className="border border-slate-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < completion.rating ? 'text-yellow-400' : 'text-gray-600'}`}
                              fill={i < completion.rating ? 'currentColor' : 'none'}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(completion.completedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">"{completion.review}"</p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>by {completion.reviewerName}</span>
                        <span>Task: {completion.taskTitle}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <MessageSquare className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No reviews yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}