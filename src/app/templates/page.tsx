'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { useData } from '@/contexts/DataContext';
import { Clock, Flame, Star, Search, X, Code, Database, PenTool, Workflow, Zap, ArrowRight, Link2 } from 'lucide-react';
import Link from 'next/link';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: string;
  totalBudget: { min: number; max: number };
  tasks: {
    title: string;
    description: string;
    skills: string[];
    estimatedBudget: number;
    estimatedDuration: string;
  }[];
}

const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'full-stack-app',
    name: 'Full Stack App',
    description: 'Complete web application development from design to deployment',
    icon: Code,
    category: 'Development',
    difficulty: 'advanced',
    estimatedDuration: '4-8 weeks',
    totalBudget: { min: 150, max: 300 },
    tasks: [
      {
        title: 'UI/UX Design',
        description: 'Create wireframes, mockups, and user interface designs',
        skills: ['UI/UX Design', 'Figma', 'Adobe XD'],
        estimatedBudget: 25,
        estimatedDuration: '3-5 days'
      },
      {
        title: 'Frontend Development', 
        description: 'Build responsive frontend with React/Vue/Angular',
        skills: ['React', 'TypeScript', 'CSS', 'HTML'],
        estimatedBudget: 50,
        estimatedDuration: '1-2 weeks'
      },
      {
        title: 'Backend Development',
        description: 'Create API, database schema, and server logic',
        skills: ['Node.js', 'Python', 'API Design', 'Database'],
        estimatedBudget: 60,
        estimatedDuration: '1-2 weeks'
      },
      {
        title: 'Testing & QA',
        description: 'Comprehensive testing and quality assurance',
        skills: ['Testing', 'QA', 'Automation'],
        estimatedBudget: 20,
        estimatedDuration: '3-5 days'
      },
      {
        title: 'Deployment',
        description: 'Deploy to production with CI/CD setup',
        skills: ['DevOps', 'AWS', 'Docker', 'CI/CD'],
        estimatedBudget: 15,
        estimatedDuration: '1-2 days'
      }
    ]
  },
  {
    id: 'data-pipeline',
    name: 'Data Pipeline',
    description: 'End-to-end data processing and analytics pipeline',
    icon: Database,
    category: 'Data Science',
    difficulty: 'intermediate',
    estimatedDuration: '2-4 weeks',
    totalBudget: { min: 80, max: 160 },
    tasks: [
      {
        title: 'Data Collection',
        description: 'Gather and validate data sources',
        skills: ['Data Engineering', 'APIs', 'Web Scraping'],
        estimatedBudget: 20,
        estimatedDuration: '2-3 days'
      },
      {
        title: 'Data Cleaning',
        description: 'Clean, normalize, and structure raw data',
        skills: ['Python', 'Pandas', 'Data Cleaning'],
        estimatedBudget: 25,
        estimatedDuration: '3-5 days'
      },
      {
        title: 'Data Analysis',
        description: 'Perform statistical analysis and generate insights',
        skills: ['Python', 'R', 'Statistics', 'Machine Learning'],
        estimatedBudget: 40,
        estimatedDuration: '1-2 weeks'
      },
      {
        title: 'Report Generation',
        description: 'Create visualizations and comprehensive reports',
        skills: ['Data Visualization', 'Tableau', 'PowerBI'],
        estimatedBudget: 15,
        estimatedDuration: '2-3 days'
      }
    ]
  },
  {
    id: 'content-creation',
    name: 'Content Creation',
    description: 'Professional content development from research to publication',
    icon: PenTool,
    category: 'Content',
    difficulty: 'beginner',
    estimatedDuration: '1-2 weeks',
    totalBudget: { min: 40, max: 80 },
    tasks: [
      {
        title: 'Research',
        description: 'Comprehensive topic research and fact-checking',
        skills: ['Research', 'Fact Checking', 'Analysis'],
        estimatedBudget: 10,
        estimatedDuration: '1-2 days'
      },
      {
        title: 'Writing',
        description: 'Create engaging, high-quality content',
        skills: ['Writing', 'Copywriting', 'SEO'],
        estimatedBudget: 20,
        estimatedDuration: '3-5 days'
      },
      {
        title: 'Editing',
        description: 'Professional editing and proofreading',
        skills: ['Editing', 'Proofreading', 'Grammar'],
        estimatedBudget: 8,
        estimatedDuration: '1-2 days'
      },
      {
        title: 'Publishing',
        description: 'Format and publish across platforms',
        skills: ['Content Management', 'WordPress', 'Social Media'],
        estimatedBudget: 5,
        estimatedDuration: '1 day'
      }
    ]
  }
];

export default function TemplatesPage() {
  const { userAddress } = useWallet();
  const { createTaskData } = useData();
  const router = useRouter();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const categories = ['all', 'Development', 'Data Science', 'Content'];

  const filteredTemplates = workflowTemplates.filter(template => {
    if (selectedCategory !== 'all' && template.category !== selectedCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return template.name.toLowerCase().includes(query) ||
             template.description.toLowerCase().includes(query) ||
             template.tasks.some(task => 
               task.title.toLowerCase().includes(query) ||
               task.skills.some(skill => skill.toLowerCase().includes(query))
             );
    }
    return true;
  });

  const createWorkflow = async () => {
    if (!selectedTemplate || !userAddress) return;

    setIsCreating(true);

    try {
      const createdTasks = [];
      
      // Create tasks in sequence
      for (let i = 0; i < selectedTemplate.tasks.length; i++) {
        const taskTemplate = selectedTemplate.tasks[i];
        
        const taskData = {
          title: `${selectedTemplate.name}: ${taskTemplate.title}`,
          description: taskTemplate.description,
          skillsRequired: taskTemplate.skills,
          budgetErg: taskTemplate.estimatedBudget,
          budgetUsd: taskTemplate.estimatedBudget * 3, // Rough conversion
          escrowType: 'simple' as const,
          parentTaskId: i > 0 ? createdTasks[i - 1].id : undefined,
          metadata: {
            workflowTemplate: selectedTemplate.id,
            taskIndex: i,
            totalTasks: selectedTemplate.tasks.length,
            estimatedDuration: taskTemplate.estimatedDuration
          }
        };

        const newTask = await createTaskData(taskData, userAddress);
        createdTasks.push(newTask);
        
        // Link to previous task
        if (i > 0) {
          // Update previous task to point to this one
          // Note: This would require an updateTask call in real implementation
        }
      }

      // Navigate to the first task
      router.push(`/tasks/detail?id=${createdTasks[0].id}`);
    } catch (error) {
      console.error('Failed to create workflow:', error);
    } finally {
      setIsCreating(false);
      setShowCreateModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 md:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/tasks" className="text-[var(--text-secondary)] hover:text-white text-sm mb-4 inline-block">
            ← Back to Tasks
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Workflow Templates</h1>
          <p className="text-[var(--text-secondary)]">
            Pre-built task chains for common workflows. Create multiple linked tasks in one click.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates, tasks, or skills..."
              className="w-full px-4 py-3 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                  selectedCategory === category
                    ? 'bg-[var(--accent-cyan)] text-white'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-2xl">
            <Search className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              {searchQuery ? 'Try adjusting your search terms' : 'No templates in this category yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => setSelectedTemplate(template)}
                onUse={() => {
                  setSelectedTemplate(template);
                  setShowCreateModal(true);
                }}
                isAuthenticated={!!userAddress}
              />
            ))}
          </div>
        )}

        {/* Template Detail Modal */}
        {selectedTemplate && !showCreateModal && (
          <TemplateDetailModal
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
            onUse={() => setShowCreateModal(true)}
            isAuthenticated={!!userAddress}
          />
        )}

        {/* Create Workflow Modal */}
        {showCreateModal && selectedTemplate && (
          <CreateWorkflowModal
            template={selectedTemplate}
            onClose={() => {
              setShowCreateModal(false);
              setSelectedTemplate(null);
            }}
            onCreate={createWorkflow}
            loading={isCreating}
          />
        )}
      </div>
    </div>
  );
}

// Helper Components

function TemplateCard({
  template,
  onSelect,
  onUse,
  isAuthenticated
}: {
  template: WorkflowTemplate;
  onSelect: () => void;
  onUse: () => void;
  isAuthenticated: boolean;
}) {
  const Icon = template.icon;

  return (
    <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-2xl p-6 hover:border-[var(--accent-cyan)]/40 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent-purple)]/20 flex items-center justify-center">
            <Icon className="w-6 h-6 text-[var(--accent-purple)]" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">{template.name}</h3>
            <span className="text-xs bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] px-2 py-1 rounded">
              {template.category}
            </span>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${
          template.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
          template.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {template.difficulty}
        </span>
      </div>

      <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
        {template.description}
      </p>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Duration:</span>
          <span>{template.estimatedDuration}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Total Budget:</span>
          <span className="text-emerald-400 font-medium">
            {template.totalBudget.min}-{template.totalBudget.max} ERG
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Tasks:</span>
          <span>{template.tasks.length} linked tasks</span>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs text-[var(--text-secondary)] mb-2">Workflow:</p>
        <div className="space-y-1">
          {template.tasks.slice(0, 3).map((task, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)]"></span>
              <span className="text-[var(--text-secondary)]">{task.title}</span>
              <span className="text-purple-400">{task.estimatedBudget} ERG</span>
            </div>
          ))}
          {template.tasks.length > 3 && (
            <div className="flex items-center gap-2 text-xs text-[var(--accent-cyan)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)]"></span>
              +{template.tasks.length - 3} more steps
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSelect}
          className="flex-1 py-2.5 px-4 bg-[var(--bg-card)] border border-[var(--border-color)] text-white rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors text-sm font-medium"
        >
          View Details
        </button>
        {isAuthenticated ? (
          <button
            onClick={onUse}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2"
          >
            <Workflow className="w-4 h-4" />
            Use Template
          </button>
        ) : (
          <button
            disabled
            className="flex-1 py-2.5 px-4 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed text-sm font-medium"
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
  onUse,
  isAuthenticated
}: {
  template: WorkflowTemplate;
  onClose: () => void;
  onUse: () => void;
  isAuthenticated: boolean;
}) {
  const Icon = template.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-[var(--accent-purple)]/20 flex items-center justify-center">
              <Icon className="w-8 h-8 text-[var(--accent-purple)]" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{template.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] px-2 py-1 rounded">
                  {template.category}
                </span>
                <span className={`text-sm px-2 py-1 rounded ${
                  template.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                  template.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {template.difficulty}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h4 className="font-semibold text-white mb-2">Description</h4>
              <p className="text-[var(--text-secondary)]">{template.description}</p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Workflow Tasks</h4>
              <div className="space-y-4">
                {template.tasks.map((task, index) => (
                  <div key={index} className="relative">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent-purple)] text-white text-sm font-medium flex items-center justify-center">
                          {index + 1}
                        </div>
                        {index < template.tasks.length - 1 && (
                          <div className="w-px h-6 bg-[var(--border-color)] mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="bg-[var(--bg-card-hover)] rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-white">{task.title}</h5>
                            <div className="text-right">
                              <div className="text-emerald-400 font-medium">{task.estimatedBudget} ERG</div>
                              <div className="text-xs text-[var(--text-secondary)]">{task.estimatedDuration}</div>
                            </div>
                          </div>
                          <p className="text-sm text-[var(--text-secondary)] mb-3">{task.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {task.skills.map(skill => (
                              <span key={skill} className="text-xs bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] px-2 py-1 rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[var(--bg-card-hover)] rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Total Tasks:</span>
                  <span className="text-sm font-medium">{template.tasks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Duration:</span>
                  <span className="text-sm font-medium">{template.estimatedDuration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Budget Range:</span>
                  <span className="text-sm font-medium text-emerald-400">
                    {template.totalBudget.min}-{template.totalBudget.max} ERG
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Difficulty:</span>
                  <span className={`text-sm font-medium capitalize ${
                    template.difficulty === 'beginner' ? 'text-green-400' :
                    template.difficulty === 'intermediate' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {template.difficulty}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                How It Works
              </h4>
              <ul className="text-sm text-blue-300 space-y-1">
                <li>• All tasks are created at once</li>
                <li>• Tasks are automatically linked</li>
                <li>• Complete tasks in sequence</li>
                <li>• Each completion unlocks the next</li>
                <li>• Track progress across the chain</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2">All Skills Needed</h4>
              <div className="flex flex-wrap gap-1">
                {[...new Set(template.tasks.flatMap(task => task.skills))].map(skill => (
                  <span key={skill} className="text-xs bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] px-2 py-1 rounded">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[var(--border-color)] text-center">
          {isAuthenticated ? (
            <button
              onClick={onUse}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 mx-auto"
            >
              <Workflow className="w-5 h-5" />
              Create This Workflow
            </button>
          ) : (
            <p className="text-[var(--text-secondary)]">Connect your wallet to use this template</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateWorkflowModal({
  template,
  onClose,
  onCreate,
  loading
}: {
  template: WorkflowTemplate;
  onClose: () => void;
  onCreate: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Create {template.name} Workflow</h3>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-[var(--bg-card-hover)] rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">What will be created:</h4>
            <ul className="text-sm text-[var(--text-secondary)] space-y-1">
              <li>• {template.tasks.length} linked tasks</li>
              <li>• Total budget: {template.totalBudget.min}-{template.totalBudget.max} ERG</li>
              <li>• Estimated completion: {template.estimatedDuration}</li>
              <li>• Tasks will be chained together automatically</li>
            </ul>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-green-400 mb-2">Benefits:</h4>
            <ul className="text-sm text-green-300 space-y-1">
              <li>• Structured workflow with clear progression</li>
              <li>• Agents can specialize in specific steps</li>
              <li>• Easy progress tracking</li>
              <li>• Reduced coordination overhead</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 px-4 bg-[var(--bg-card)] border border-[var(--border-color)] text-white rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors font-medium">
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Create Workflow
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}