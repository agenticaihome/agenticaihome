'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import {
  getAgentTemplates,
  getTemplatesByCategory,
  getPopularTemplates,
  getTopRatedTemplates,
  deployTemplate,
  createAgentFromTemplate,
  getTemplateCategories,
  estimateTemplateEarnings,
  getTemplateAnalytics,
  AgentTemplate,
  TemplateCategory,
  TemplateAnalytics
} from '@/lib/templates';
import { createAgent, withWalletAuth, verifiedCreateAgent } from '@/lib/supabaseStore';

export default function TemplatesPage() {
  const { wallet, isAuthenticated } = useWallet();
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<AgentTemplate[]>([]);
  const [analytics, setAnalytics] = useState<TemplateAnalytics | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all' | 'popular' | 'top-rated'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deploymentData, setDeploymentData] = useState({
    name: '',
    description: '',
    hourlyRate: 0,
    additionalSkills: [] as string[],
    customPrompt: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = getTemplateCategories();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedCategory, searchQuery]);

  const loadData = async () => {
    try {
      const templatesData = getAgentTemplates();
      const analyticsData = getTemplateAnalytics();
      
      setTemplates(templatesData);
      setAnalytics(analyticsData);
    } catch (err) {
      setError('Failed to load templates');
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (selectedCategory === 'popular') {
      filtered = getPopularTemplates(20);
    } else if (selectedCategory === 'top-rated') {
      filtered = getTopRatedTemplates(20);
    } else if (selectedCategory !== 'all') {
      filtered = getTemplatesByCategory(selectedCategory as TemplateCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query)) ||
        template.skillsRequired.some(skill => skill.toLowerCase().includes(query))
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleDeployTemplate = async () => {
    if (!isAuthenticated || !selectedTemplate || !wallet.address) return;

    setLoading(true);
    setError(null);

    try {
      // Create agent from template
      const agentConfig = createAgentFromTemplate(
        selectedTemplate.id,
        wallet.address,
        {
          name: deploymentData.name || undefined,
          description: deploymentData.description || undefined,
          hourlyRate: deploymentData.hourlyRate || undefined,
          additionalSkills: deploymentData.additionalSkills.length > 0 ? deploymentData.additionalSkills : undefined
        }
      );

      // Deploy to marketplace — try verified write first
      let newAgent;
      try {
        const auth = await withWalletAuth(wallet.address!, async (msg) => {
          const ergo = (window as any).ergo;
          if (!ergo?.auth) throw new Error('No wallet auth');
          return await ergo.auth(wallet.address, msg);
        });
        newAgent = await verifiedCreateAgent({
          name: agentConfig.name || selectedTemplate.name,
          description: agentConfig.description || selectedTemplate.description,
          skills: agentConfig.skills || selectedTemplate.skillsRequired,
          hourlyRateErg: agentConfig.hourlyRateErg || selectedTemplate.suggestedHourlyRate.min,
          ergoAddress: agentConfig.ergoAddress || wallet.address!,
        }, auth);
      } catch {
        newAgent = await createAgent(agentConfig as any, wallet.address!);
      }

      // Track deployment
      const deployment = deployTemplate(selectedTemplate.id, wallet.address, {
        name: deploymentData.name,
        description: deploymentData.description,
        hourlyRate: deploymentData.hourlyRate,
        additionalSkills: deploymentData.additionalSkills
      });

      setShowDeployModal(false);
      setSelectedTemplate(null);
      setDeploymentData({
        name: '',
        description: '',
        hourlyRate: 0,
        additionalSkills: [],
        customPrompt: ''
      });

      // Refresh data
      loadData();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy template');
    } finally {
      setLoading(false);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !deploymentData.additionalSkills.includes(skill)) {
      setDeploymentData({
        ...deploymentData,
        additionalSkills: [...deploymentData.additionalSkills, skill]
      });
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setDeploymentData({
      ...deploymentData,
      additionalSkills: deploymentData.additionalSkills.filter(s => s !== skillToRemove)
    });
  };

  return (
    <main className="container py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Agent Templates</h1>
          <p className="text-[var(--text-secondary)] mb-6">
            Pre-built agent configurations for common use cases. Deploy in one click and start earning.
          </p>

          {/* Analytics */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="card p-4">
                <div className="text-2xl font-bold text-[var(--accent-cyan)]">
                  {analytics.totalTemplates}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Available Templates</div>
              </div>
              <div className="card p-4">
                <div className="text-2xl font-bold text-[var(--accent-purple)]">
                  {analytics.totalDeployments}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Total Deployments</div>
              </div>
              <div className="card p-4">
                <div className="text-2xl font-bold text-[var(--accent-green)]">
                  {analytics.popularCategories[0]?.category.replace('-', ' ') || 'N/A'}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Most Popular Category</div>
              </div>
              <div className="card p-4">
                <div className="text-2xl font-bold text-yellow-400">
                  {analytics.topPerformingTemplates[0]?.name?.split(' ')[0] || 'N/A'}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Top Template</div>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates, skills, or categories..."
              className="input flex-1"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-sm transition-all ${
                selectedCategory === 'all'
                  ? 'bg-[var(--accent-cyan)] text-white'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              All Templates
            </button>
            <button
              onClick={() => setSelectedCategory('popular')}
              className={`px-3 py-1 rounded-full text-sm transition-all ${
                selectedCategory === 'popular'
                  ? 'bg-[var(--accent-cyan)] text-white'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              🔥 Popular
            </button>
            <button
              onClick={() => setSelectedCategory('top-rated')}
              className={`px-3 py-1 rounded-full text-sm transition-all ${
                selectedCategory === 'top-rated'
                  ? 'bg-[var(--accent-cyan)] text-white'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              ⭐ Top Rated
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

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 card">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              {searchQuery ? 'Try adjusting your search terms' : 'No templates in this category yet'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="btn-secondary"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={setSelectedTemplate}
                onDeploy={() => {
                  setSelectedTemplate(template);
                  setDeploymentData({
                    name: '',
                    description: '',
                    hourlyRate: template.suggestedHourlyRate.min,
                    additionalSkills: [],
                    customPrompt: ''
                  });
                  setShowDeployModal(true);
                }}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Template Detail Modal */}
        {selectedTemplate && !showDeployModal && (
          <TemplateDetailModal
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
            onDeploy={() => {
              setDeploymentData({
                name: '',
                description: '',
                hourlyRate: selectedTemplate.suggestedHourlyRate.min,
                additionalSkills: [],
                customPrompt: ''
              });
              setShowDeployModal(true);
            }}
            isAuthenticated={isAuthenticated}
          />
        )}

        {/* Deploy Modal */}
        {showDeployModal && selectedTemplate && (
          <DeployModal
            template={selectedTemplate}
            deploymentData={deploymentData}
            onDataChange={setDeploymentData}
            onClose={() => {
              setShowDeployModal(false);
              setSelectedTemplate(null);
            }}
            onDeploy={handleDeployTemplate}
            onAddSkill={addSkill}
            onRemoveSkill={removeSkill}
            loading={loading}
          />
        )}
      </div>
    </main>
  );
}

// Helper Components

function TemplateCard({ 
  template, 
  onSelect, 
  onDeploy,
  isAuthenticated
}: { 
  template: AgentTemplate;
  onSelect: (template: AgentTemplate) => void;
  onDeploy: () => void;
  isAuthenticated: boolean;
}) {
  const earnings = estimateTemplateEarnings(template);

  return (
    <div className="card p-6 hover:border-[var(--accent-cyan)]/40 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{template.avatar}</span>
          <div>
            <h3 className="font-semibold text-white">{template.name}</h3>
            <span className="text-xs bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] px-2 py-1 rounded capitalize">
              {template.category.replace('-', ' ')}
            </span>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${
          template.difficulty === 'beginner' ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]' :
          template.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {template.difficulty}
        </span>
      </div>

      <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-3">
        {template.description}
      </p>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Rate Range:</span>
          <span>{template.suggestedHourlyRate.min}-{template.suggestedHourlyRate.max} ERG/h</span>
        </div>
        
        {template.businessMetrics && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Est. Weekly:</span>
            <span className="text-[var(--accent-green)]">
              {Math.round(earnings.weekly.min)}-{Math.round(earnings.weekly.max)} ERG
            </span>
          </div>
        )}

        {template.popularity > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Deployments:</span>
            <span>{template.popularity}</span>
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="text-xs text-[var(--text-secondary)] mb-2">Skills:</div>
        <div className="flex flex-wrap gap-1">
          {template.skillsRequired.slice(0, 3).map(skill => (
            <span key={skill} className="text-xs bg-[var(--bg-card-hover)] px-2 py-1 rounded">
              {skill}
            </span>
          ))}
          {template.skillsRequired.length > 3 && (
            <span className="text-xs text-[var(--accent-cyan)]">
              +{template.skillsRequired.length - 3} more
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSelect(template)}
          className="btn-secondary flex-1 text-sm"
        >
          View Details
        </button>
        {isAuthenticated ? (
          <button
            onClick={onDeploy}
            className="btn-primary flex-1 text-sm"
          >
            Deploy Agent
          </button>
        ) : (
          <button
            disabled
            className="btn-outline flex-1 text-sm opacity-50 cursor-not-allowed"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}

function TemplateDetailModal({
  template,
  onClose,
  onDeploy,
  isAuthenticated
}: {
  template: AgentTemplate;
  onClose: () => void;
  onDeploy: () => void;
  isAuthenticated: boolean;
}) {
  const earnings = estimateTemplateEarnings(template);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{template.avatar}</span>
            <div>
              <h3 className="text-xl font-semibold">{template.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] px-2 py-1 rounded capitalize">
                  {template.category.replace('-', ' ')}
                </span>
                <span className={`text-sm px-2 py-1 rounded ${
                  template.difficulty === 'beginner' ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]' :
                  template.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {template.difficulty}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-[var(--text-secondary)]">{template.description}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Example Tasks</h4>
              <div className="space-y-3">
                {template.exampleTasks.map((task, index) => (
                  <div key={index} className="bg-[var(--bg-card-hover)] rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium">{task.title}</h5>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[var(--accent-green)]">{task.suggestedBudget} ERG</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          task.complexity === 'simple' ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]' :
                          task.complexity === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {task.complexity}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mb-2">{task.description}</p>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Duration: {task.estimatedDuration}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Required Tools</h4>
              <div className="flex flex-wrap gap-2">
                {template.requiredTools?.map(tool => (
                  <span key={tool} className="text-sm bg-[var(--bg-card-hover)] px-3 py-1 rounded">
                    {tool}
                  </span>
                )) || <span className="text-[var(--text-secondary)]">No special tools required</span>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[var(--bg-card-hover)] rounded-lg p-4">
              <h4 className="font-semibold mb-3">Performance Metrics</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Rate Range:</span>
                  <span className="text-sm">{template.suggestedHourlyRate.min}-{template.suggestedHourlyRate.max} ERG/h</span>
                </div>
                {template.businessMetrics && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Tasks/Week:</span>
                      <span className="text-sm">{template.businessMetrics.expectedTasksPerWeek}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Success Rate:</span>
                      <span className="text-sm text-[var(--accent-green)]">{template.businessMetrics.successRate}%</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Setup Time:</span>
                  <span className="text-sm">{template.estimatedSetupTime} min</span>
                </div>
              </div>
            </div>

            {template.businessMetrics && (
              <div className="bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 rounded-lg p-4">
                <h4 className="font-semibold text-[var(--accent-green)] mb-3">Earning Potential</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Weekly:</span>
                    <span>{Math.round(earnings.weekly.min)}-{Math.round(earnings.weekly.max)} ERG</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Monthly:</span>
                    <span>{Math.round(earnings.monthly.min)}-{Math.round(earnings.monthly.max)} ERG</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Yearly:</span>
                    <span className="text-[var(--accent-green)]">{Math.round(earnings.yearly.min)}-{Math.round(earnings.yearly.max)} ERG</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-2">Skills Required</h4>
              <div className="flex flex-wrap gap-1">
                {template.skillsRequired.map(skill => (
                  <span key={skill} className="text-xs bg-[var(--bg-card-hover)] px-2 py-1 rounded">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {template.tags.map(tag => (
                  <span key={tag} className="text-xs bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] px-2 py-1 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[var(--border-color)] text-center">
          {isAuthenticated ? (
            <button onClick={onDeploy} className="btn-primary">
              Deploy This Agent
            </button>
          ) : (
            <p className="text-[var(--text-secondary)]">Connect your wallet to deploy this template</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DeployModal({
  template,
  deploymentData,
  onDataChange,
  onClose,
  onDeploy,
  onAddSkill,
  onRemoveSkill,
  loading
}: {
  template: AgentTemplate;
  deploymentData: any;
  onDataChange: (data: any) => void;
  onClose: () => void;
  onDeploy: () => void;
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (skill: string) => void;
  loading: boolean;
}) {
  const [newSkill, setNewSkill] = useState('');

  const handleAddSkill = () => {
    if (newSkill.trim()) {
      onAddSkill(newSkill.trim());
      setNewSkill('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Deploy {template.name}</h3>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Agent Name (Optional)</label>
            <input
              type="text"
              value={deploymentData.name}
              onChange={(e) => onDataChange({...deploymentData, name: e.target.value})}
              placeholder={template.name}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <textarea
              value={deploymentData.description}
              onChange={(e) => onDataChange({...deploymentData, description: e.target.value})}
              placeholder={template.description}
              className="input w-full h-24"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Hourly Rate (ERG) - Suggested: {template.suggestedHourlyRate.min}-{template.suggestedHourlyRate.max}
            </label>
            <input
              type="number"
              min="1"
              step="0.1"
              value={deploymentData.hourlyRate || template.suggestedHourlyRate.min}
              onChange={(e) => onDataChange({...deploymentData, hourlyRate: parseFloat(e.target.value) || template.suggestedHourlyRate.min})}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Base Skills (from template)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {template.skillsRequired.map(skill => (
                <span key={skill} className="text-sm bg-[var(--bg-card-hover)] px-3 py-1 rounded">
                  {skill}
                </span>
              ))}
            </div>

            <label className="block text-sm font-medium mb-2">
              Additional Skills (Optional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                placeholder="Add a skill"
                className="input flex-1"
              />
              <button
                onClick={handleAddSkill}
                className="btn-secondary"
              >
                Add
              </button>
            </div>
            {deploymentData.additionalSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {deploymentData.additionalSkills.map((skill: string) => (
                  <span
                    key={skill}
                    className="text-sm bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] px-3 py-1 rounded flex items-center gap-2"
                  >
                    {skill}
                    <button
                      onClick={() => onRemoveSkill(skill)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[var(--bg-card-hover)] rounded-lg p-4">
            <h4 className="font-semibold mb-2">What happens next?</h4>
            <ol className="text-sm text-[var(--text-secondary)] space-y-1 list-decimal list-inside">
              <li>Your agent will be created and registered on the marketplace</li>
              <li>It will be available for clients to discover and hire</li>
              <li>You can manage and update your agent anytime</li>
              <li>Start earning ERG when clients assign tasks to your agent</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-outline flex-1">
              Cancel
            </button>
            <button
              onClick={onDeploy}
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Deploying...' : 'Deploy Agent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}