'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { ClipboardList, KeyRound, Link2, Search, Trash2 } from 'lucide-react';
import {
  getChainTemplates,
  getChainsByCreator,
  getPublicChains,
  createChainFromTemplate,
  createCustomChain,
  addChainStep,
  deleteChain,
  getChainStatistics,
  getChainCategories,
  validateChain,
  estimateChainCost,
  Chain,
  ChainTemplate,
  ChainStep,
  ChainCategory,
  ChainStatistics
} from '@/lib/chains';

export default function ChainsPage() {
  const { wallet, isAuthenticated } = useWallet();
  const [activeTab, setActiveTab] = useState<'browse' | 'templates' | 'my-chains' | 'create'>('browse');
  const [templates, setTemplates] = useState<ChainTemplate[]>([]);
  const [publicChains, setPublicChains] = useState<Chain[]>([]);
  const [userChains, setUserChains] = useState<Chain[]>([]);
  const [statistics, setStatistics] = useState<ChainStatistics | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ChainCategory | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState<ChainTemplate | null>(null);
  const [newChainData, setNewChainData] = useState({
    name: '',
    description: '',
    category: 'custom' as ChainCategory,
    isPublic: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = getChainCategories();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isAuthenticated && wallet.address) {
      loadUserChains();
    }
  }, [isAuthenticated, wallet.address]);

  const loadData = async () => {
    try {
      const templatesData = getChainTemplates();
      const publicChainsData = getPublicChains();
      const statsData = getChainStatistics();
      
      setTemplates(templatesData);
      setPublicChains(publicChainsData);
      setStatistics(statsData);
    } catch (err) {
      setError('Failed to load chains data');
    }
  };

  const loadUserChains = async () => {
    try {
      const userChainsData = getChainsByCreator(wallet.address!);
      setUserChains(userChainsData);
    } catch (err) {
      setError('Failed to load your chains');
    }
  };

  const handleCreateFromTemplate = async (templateId: string, customName?: string) => {
    if (!isAuthenticated || !wallet.address) return;

    setLoading(true);
    try {
      const newChain = createChainFromTemplate(templateId, wallet.address, customName);
      setUserChains([...userChains, newChain]);
      setShowTemplateModal(null);
      setActiveTab('my-chains');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chain from template');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomChain = async () => {
    if (!isAuthenticated || !wallet.address) return;

    setLoading(true);
    try {
      const newChain = createCustomChain({
        ...newChainData,
        creatorAddress: wallet.address!,
        tags: [],
        totalBudgetErg: 0,
        estimatedDurationHours: 0,
        isTemplate: false
      });
      setUserChains([...userChains, newChain]);
      setShowCreateModal(false);
      setNewChainData({ name: '', description: '', category: 'custom', isPublic: false });
      setActiveTab('my-chains');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create custom chain');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChain = async (chainId: string) => {
    if (!confirm('Are you sure you want to delete this chain?')) return;

    try {
      const success = deleteChain(chainId);
      if (success) {
        setUserChains(userChains.filter(c => c.id !== chainId));
      }
    } catch (err) {
      setError('Failed to delete chain');
    }
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const filteredPublicChains = selectedCategory === 'all' 
    ? publicChains 
    : publicChains.filter(c => c.category === selectedCategory);

  return (
    <main className="container py-8">
      <div className="max-w-7xl mx-auto">
        {/* Coming Soon Banner */}
        <div className="bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] text-center py-2 px-4 text-sm font-medium rounded-lg mb-6">
          → Chains is coming soon. This is a preview of planned agent workflow automation.
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Agent Chains</h1>
          <p className="text-[var(--text-secondary)] mb-6">
            Create sequences of agents that work together to complete complex tasks
          </p>

          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="card p-4">
                <div className="text-2xl font-bold text-[var(--accent-cyan)]">
                  {statistics.totalChains}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Total Chains</div>
              </div>
              <div className="card p-4">
                <div className="text-2xl font-bold text-[var(--accent-purple)]">
                  {statistics.totalExecutions}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Executions</div>
              </div>
              <div className="card p-4">
                <div className="text-2xl font-bold text-[var(--accent-green)]">
                  {statistics.totalExecutions > 0 
                    ? Math.round((statistics.successfulExecutions / statistics.totalExecutions) * 100)
                    : 0}%
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Success Rate</div>
              </div>
              <div className="card p-4">
                <div className="text-2xl font-bold text-yellow-400">
                  {Math.round((statistics.avgExecutionTime / (1000 * 60 * 60)) * 10) / 10}h
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Avg Duration</div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-[var(--border-color)]">
          {[
            { key: 'browse', label: 'Browse Chains', icon: '⌕' },
            { key: 'templates', label: 'Templates', icon: '☰' },
            ...(isAuthenticated ? [{ key: 'my-chains', label: 'My Chains', icon: '🔗' }] : []),
            ...(isAuthenticated ? [{ key: 'create', label: 'Create New', icon: '➕' }] : [])
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 font-medium transition-all min-h-[44px] flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'text-[var(--accent-cyan)] border-b-2 border-[var(--accent-cyan)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--accent-cyan)]'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        {(activeTab === 'browse' || activeTab === 'templates') && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-[var(--accent-cyan)] text-white'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm transition-all capitalize ${
                    selectedCategory === category
                      ? 'bg-[var(--accent-cyan)] text-white'
                      : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                  }`}
                >
                  {category.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">
          {/* Browse Public Chains */}
          {activeTab === 'browse' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Public Chains</h2>
              {filteredPublicChains.length === 0 ? (
                <div className="text-center py-12 card">
                  <div className="text-4xl mb-4"><Link2 className="w-4 h-4 text-blue-400 inline" /></div>
                  <h3 className="text-lg font-semibold mb-2">No public chains yet</h3>
                  <p className="text-[var(--text-secondary)] mb-4">
                    Be the first to create and share a public chain!
                  </p>
                  {isAuthenticated && (
                    <button
                      onClick={() => setActiveTab('create')}
                      className="btn-primary"
                    >
                      Create Chain
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPublicChains.map(chain => (
                    <ChainCard 
                      key={chain.id} 
                      chain={chain}
                      showActions={false}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Templates */}
          {activeTab === 'templates' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Chain Templates</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map(template => (
                  <TemplateCard 
                    key={template.id}
                    template={template}
                    onUseTemplate={() => setShowTemplateModal(template)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* My Chains */}
          {activeTab === 'my-chains' && isAuthenticated && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">My Chains</h2>
                <button
                  onClick={() => setActiveTab('create')}
                  className="btn-primary"
                >
                  Create New Chain
                </button>
              </div>
              
              {userChains.length === 0 ? (
                <div className="text-center py-12 card">
                  <div className="text-4xl mb-4"><Link2 className="w-4 h-4 text-blue-400 inline" /></div>
                  <h3 className="text-lg font-semibold mb-2">No chains created yet</h3>
                  <p className="text-[var(--text-secondary)] mb-4">
                    Start by creating a chain from a template or build your own custom chain
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setActiveTab('templates')}
                      className="btn-secondary"
                    >
                      Browse Templates
                    </button>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="btn-primary"
                    >
                      Create Custom Chain
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userChains.map(chain => (
                    <ChainCard 
                      key={chain.id}
                      chain={chain}
                      showActions={true}
                      onDelete={() => handleDeleteChain(chain.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create New Chain */}
          {activeTab === 'create' && isAuthenticated && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Create New Chain</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Quick Start from Template</h3>
                  <p className="text-[var(--text-secondary)] mb-4">
                    Choose from pre-built templates and customize as needed
                  </p>
                  <div className="space-y-3">
                    {templates.slice(0, 3).map(template => (
                      <div key={template.id} className="p-3 border border-[var(--border-color)] rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-sm text-[var(--text-secondary)]">
                              {template.steps.length} steps • {template.category}
                            </div>
                          </div>
                          <button
                            onClick={() => setShowTemplateModal(template)}
                            className="btn-secondary text-sm"
                          >
                            Use Template
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('templates')}
                    className="btn-outline w-full mt-4"
                  >
                    View All Templates
                  </button>
                </div>

                <div className="card p-6">
                  <h3 className="text-lg font-semibold mb-4">Create Custom Chain</h3>
                  <p className="text-[var(--text-secondary)] mb-4">
                    Build a completely custom chain from scratch
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary w-full"
                  >
                    Start Custom Chain
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isAuthenticated && (activeTab === 'my-chains' || activeTab === 'create') && (
            <div className="text-center py-12 card">
              <div className="text-4xl mb-4">🔑</div>
              <h3 className="text-lg font-semibold mb-2">Connect Wallet</h3>
              <p className="text-[var(--text-secondary)] mb-4">
                Connect your wallet to create and manage chains
              </p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Template Modal */}
        {showTemplateModal && (
          <TemplateModal
            template={showTemplateModal}
            onClose={() => setShowTemplateModal(null)}
            onCreate={handleCreateFromTemplate}
            loading={loading}
          />
        )}

        {/* Create Custom Chain Modal */}
        {showCreateModal && (
          <CreateChainModal
            chainData={newChainData}
            onChange={setNewChainData}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateCustomChain}
            loading={loading}
          />
        )}
      </div>
    </main>
  );
}

// Helper Components
function ChainCard({ 
  chain, 
  showActions, 
  onDelete 
}: { 
  chain: Chain; 
  showActions: boolean;
  onDelete?: () => void;
}) {
  const costEstimate = estimateChainCost(chain.steps);
  
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold mb-1">{chain.name}</h3>
          <span className={`inline-block px-2 py-1 text-xs rounded-full capitalize ${
            chain.status === 'active' ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]' :
            chain.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {chain.status}
          </span>
        </div>
        <span className="text-xs bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] px-2 py-1 rounded capitalize">
          {chain.category.replace('-', ' ')}
        </span>
      </div>

      <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
        {chain.description}
      </p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Steps:</span>
          <span>{chain.steps.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Budget:</span>
          <span>{chain.totalBudgetErg.toFixed(1)} ERG</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Duration:</span>
          <span>{chain.estimatedDurationHours}h</span>
        </div>
        {chain.executions > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Success Rate:</span>
            <span className="text-[var(--accent-green)]">{Math.round(chain.successRate)}%</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <a 
          href="/chains" 
          className="btn-secondary flex-1 text-center"
          onClick={(e) => e.preventDefault()}
        >
          View Details
        </a>
        {showActions && (
          <button
            onClick={onDelete}
            className="btn-outline px-3 text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function TemplateCard({ 
  template, 
  onUseTemplate 
}: { 
  template: ChainTemplate; 
  onUseTemplate: () => void;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold mb-1">{template.name}</h3>
          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
            template.difficulty === 'beginner' ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]' :
            template.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {template.difficulty}
          </span>
        </div>
        <span className="text-xs bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] px-2 py-1 rounded capitalize">
          {template.category.replace('-', ' ')}
        </span>
      </div>

      <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
        {template.description}
      </p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Steps:</span>
          <span>{template.steps.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Cost:</span>
          <span>{template.estimatedCost.min}-{template.estimatedCost.max} ERG</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Duration:</span>
          <span>{template.estimatedDuration.min}-{template.estimatedDuration.max}h</span>
        </div>
      </div>

      <button
        onClick={onUseTemplate}
        className="btn-primary w-full"
      >
        Use Template
      </button>
    </div>
  );
}

function TemplateModal({
  template,
  onClose,
  onCreate,
  loading
}: {
  template: ChainTemplate;
  onClose: () => void;
  onCreate: (templateId: string, customName?: string) => void;
  loading: boolean;
}) {
  const [customName, setCustomName] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Create Chain from Template</h3>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">{template.name}</h4>
            <p className="text-[var(--text-secondary)] mb-4">{template.description}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Chain Name (Optional)</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={template.name}
              className="input w-full"
            />
          </div>

          <div>
            <h5 className="font-medium mb-2">Steps:</h5>
            <div className="space-y-2">
              {template.steps.map((step, index) => (
                <div key={index} className="p-3 bg-[var(--bg-card-hover)] rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">Step {step.stepNumber}</span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {step.estimatedDurationHours}h • {step.suggestedBudgetErg} ERG
                    </span>
                  </div>
                  <div className="text-sm">{step.title}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    Skills: {step.requiredSkills.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-outline flex-1">
              Cancel
            </button>
            <button
              onClick={() => onCreate(template.id, customName || undefined)}
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Creating...' : 'Create Chain'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateChainModal({
  chainData,
  onChange,
  onClose,
  onCreate,
  loading
}: {
  chainData: any;
  onChange: (data: any) => void;
  onClose: () => void;
  onCreate: () => void;
  loading: boolean;
}) {
  const categories = getChainCategories();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Create Custom Chain</h3>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Chain Name</label>
            <input
              type="text"
              value={chainData.name}
              onChange={(e) => onChange({ ...chainData, name: e.target.value })}
              className="input w-full"
              placeholder="Enter chain name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={chainData.description}
              onChange={(e) => onChange({ ...chainData, description: e.target.value })}
              className="input w-full h-20"
              placeholder="Describe what this chain does"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={chainData.category}
              onChange={(e) => onChange({ ...chainData, category: e.target.value })}
              className="input w-full"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={chainData.isPublic}
              onChange={(e) => onChange({ ...chainData, isPublic: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="isPublic" className="text-sm">
              Make this chain public for others to use
            </label>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-outline flex-1">
              Cancel
            </button>
            <button
              onClick={onCreate}
              disabled={loading || !chainData.name.trim()}
              className="btn-primary flex-1"
            >
              {loading ? 'Creating...' : 'Create Chain'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}