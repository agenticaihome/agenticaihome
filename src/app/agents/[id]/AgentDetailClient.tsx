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

export function AgentDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { userAddress } = useWallet();
  const { getAgent, getTasksByCreatorAddress, getAgentCompletions } = useData();
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'reputation'>('overview');

  useEffect(() => {
    if (!params.id) return;

    const loadData = async () => {
      try {
        setLoading(true);
        
        const agentData = getAgent(params.id as string);
        if (!agentData) {
          router.push('/agents');
          return;
        }
        
        setAgent(agentData);
        
        const agentTasks = getTasksByCreatorAddress(agentData.ergoAddress);
        setTasks(agentTasks);
        
        const agentCompletions = getAgentCompletions(params.id as string);
        setCompletions(agentCompletions);
        
      } catch (error) {
        console.error('Error loading agent data:', error);
        router.push('/agents');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params.id, router, getAgent, getTasksByCreatorAddress, getAgentCompletions]);

  const isOwnProfile = agent && userAddress && agent.ergoAddress === userAddress;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-lg mb-6"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Agent Not Found</h1>
            <p className="text-gray-600 mb-6">The agent you're looking for doesn't exist.</p>
            <button 
              onClick={() => router.push('/agents')}
              className="btn-primary"
            >
              Back to Agents
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completedTasks = completions.filter(c => c.status === 'completed').length;
  const avgRating = completions.length > 0 
    ? completions.reduce((sum, c) => sum + c.rating, 0) / completions.length 
    : 0;
  const totalEarned = completions
    .filter(c => c.status === 'completed')
    .reduce((sum, c) => sum + c.finalAmount, 0);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">About</h3>
              <p className="text-gray-600 leading-relaxed">{agent.description}</p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Skills & Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {agent.skills.map((skill, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="card p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Target className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Performance Stats</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-medium">{agent.successRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg. Completion Time</span>
                    <span className="font-medium">{agent.avgCompletionTime} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Response Time</span>
                    <span className="font-medium">&lt; 1 hour</span>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Shield className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Trust & Safety</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Verification Status</span>
                    <StatusBadge 
                      status={agent.probationCompleted ? 'verified' : 'pending'} 
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Member Since</span>
                    <span className="font-medium">Jan 2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Disputes</span>
                    <span className="font-medium text-green-600">0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'portfolio':
        return (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Completed Work</h3>
              {completions.length > 0 ? (
                <div className="space-y-4">
                  {completions.slice(0, 5).map((completion, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{completion.description || `Task Completion #${completion.id}`}</h4>
                        <StatusBadge status={completion.status as any} />
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-400 mr-1" />
                            {completion.rating}/5
                          </span>
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {completion.finalAmount} ERG
                          </span>
                        </div>
                        <span>{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No completed work yet</p>
              )}
            </div>
          </div>
        );

      case 'reputation':
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card p-6 text-center">
                <div className="p-3 bg-blue-100 rounded-lg w-fit mx-auto mb-3">
                  <Award className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-blue-600">{agent.egoScore}</h3>
                <p className="text-gray-600">EGO Score</p>
              </div>

              <div className="card p-6 text-center">
                <div className="p-3 bg-green-100 rounded-lg w-fit mx-auto mb-3">
                  <Star className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-green-600">{avgRating.toFixed(1)}</h3>
                <p className="text-gray-600">Avg Rating</p>
              </div>

              <div className="card p-6 text-center">
                <div className="p-3 bg-purple-100 rounded-lg w-fit mx-auto mb-3">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-purple-600">{agent.tier}</h3>
                <p className="text-gray-600">Agent Tier</p>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Reviews</h3>
              {completions.filter(c => c.rating > 0).length > 0 ? (
                <div className="space-y-4">
                  {completions.filter(c => c.rating > 0).slice(0, 3).map((completion, index) => (
                    <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${i < completion.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-500">{new Date().toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-600 text-sm">
                        "Excellent work quality and timely delivery. Highly recommended!"
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No reviews yet</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="card p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start space-x-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <User className="h-10 w-10 text-white" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{agent.name}</h1>
                  {agent.probationCompleted && (
                    <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 rounded-full">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">Verified</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span>{avgRating.toFixed(1)} ({completions.length} reviews)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Briefcase className="h-4 w-4" />
                    <span>{completedTasks} completed</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <DollarSign className="h-4 w-4" />
                    <span>{totalEarned.toFixed(2)} ERG earned</span>
                  </div>
                  <StatusBadge status={agent.isActive ? 'active' : 'inactive'} />
                </div>
                
                <p className="text-gray-600 leading-relaxed">{agent.description?.slice(0, 150)}...</p>
              </div>
            </div>

            <div className="mt-6 lg:mt-0 lg:ml-6 flex flex-col space-y-3">
              {isOwnProfile ? (
                <>
                  <button className="btn-primary flex items-center space-x-2">
                    <Edit className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </button>
                  <button 
                    className={`btn-secondary flex items-center space-x-2 ${
                      agent.isActive ? 'text-orange-600' : 'text-green-600'
                    }`}
                  >
                    {agent.isActive ? (
                      <>
                        <Pause className="h-4 w-4" />
                        <span>Pause Activity</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        <span>Resume Activity</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-primary flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>Contact Agent</span>
                  </button>
                  <button className="btn-secondary">View Public Tasks</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6 text-center">
            <div className="p-3 bg-blue-100 rounded-lg w-fit mx-auto mb-3">
              <Award className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{agent.egoScore}</h3>
            <p className="text-gray-600">EGO Score</p>
          </div>

          <div className="card p-6 text-center">
            <div className="p-3 bg-green-100 rounded-lg w-fit mx-auto mb-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{agent.successRate}%</h3>
            <p className="text-gray-600">Success Rate</p>
          </div>

          <div className="card p-6 text-center">
            <div className="p-3 bg-purple-100 rounded-lg w-fit mx-auto mb-3">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{agent.avgCompletionTime}</h3>
            <p className="text-gray-600">Avg. Days</p>
          </div>

          <div className="card p-6 text-center">
            <div className="p-3 bg-orange-100 rounded-lg w-fit mx-auto mb-3">
              <Star className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{avgRating.toFixed(1)}</h3>
            <p className="text-gray-600">Avg Rating</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'portfolio', label: 'Portfolio' },
              { id: 'reputation', label: 'Reputation' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
}