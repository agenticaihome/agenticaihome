'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { workflowTemplates, getWorkflowTemplatesByCategory } from '@/lib/workflowTemplates';
import { createWorkflowTasks, type Workflow, type WorkflowStep } from '@/lib/workflows';
import { getErgPrice, usdToErg, ergToUsd } from '@/lib/ergPrice';
import SkillSelector from '@/components/SkillSelector';
import Link from 'next/link';
import { 
  Plus, 
  Trash2, 
  ArrowRight, 
  DollarSign, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Workflow as WorkflowIcon,
  Play,
  Edit3,
  Copy,
  Zap
} from 'lucide-react';

type ViewMode = 'templates' | 'custom' | 'preview';

export default function WorkflowsPage() {
  const { userAddress, profile } = useWallet();
  const router = useRouter();
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<Workflow | null>(null);
  
  // Custom workflow state
  const [customWorkflow, setCustomWorkflow] = useState<Workflow>({
    id: '',
    name: '',
    description: '',
    steps: [],
  });
  
  // Workflow execution state
  const [totalBudget, setTotalBudget] = useState('');
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'ERG'>('USD');
  const [ergPrice, setErgPrice] = useState<number | null>(null);
  const [convertedAmount, setConvertedAmount] = useState<string>('');
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Load ERG price
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const price = await getErgPrice();
        setErgPrice(price);
      } catch (error) {
        console.error('Failed to fetch ERG price:', error);
      }
    };
    fetchPrice();
  }, []);

  // Update converted amount when budget or currency mode changes
  useEffect(() => {
    const updateConversion = async () => {
      if (!totalBudget || !ergPrice || Number(totalBudget) <= 0) {
        setConvertedAmount('');
        return;
      }

      try {
        const budgetNum = Number(totalBudget);
        if (currencyMode === 'USD') {
          const ergAmount = await usdToErg(budgetNum);
          setConvertedAmount(ergAmount.toFixed(3));
        } else {
          const usdAmount = await ergToUsd(budgetNum);
          setConvertedAmount(usdAmount.toFixed(2));
        }
      } catch (error) {
        console.error('Failed to convert currency:', error);
        setConvertedAmount('');
      }
    };

    updateConversion();
  }, [totalBudget, currencyMode, ergPrice]);

  const handleTemplateSelect = (template: Workflow) => {
    setSelectedTemplate(template);
    setViewMode('preview');
  };

  const handleCustomizeTemplate = (template: Workflow) => {
    setCustomWorkflow({
      ...template,
      id: `custom_${Date.now()}`,
    });
    setViewMode('custom');
  };

  const addCustomStep = () => {
    const newStep: WorkflowStep = {
      title: '',
      description: '',
      skillsRequired: [],
      budgetPercentage: 10,
    };
    
    setCustomWorkflow(prev => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }));
  };

  const updateCustomStep = (index: number, updates: Partial<WorkflowStep>) => {
    setCustomWorkflow(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, ...updates } : step
      ),
    }));
  };

  const removeCustomStep = (index: number) => {
    setCustomWorkflow(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const validateWorkflow = (workflow: Workflow): string | null => {
    if (!workflow.name.trim()) return 'Workflow needs a name';
    if (!workflow.description.trim()) return 'Workflow needs a description';
    if (workflow.steps.length === 0) return 'Add at least one step';
    
    const totalPercentage = workflow.steps.reduce((sum, step) => sum + step.budgetPercentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.1) {
      return `Budget percentages must total 100% (currently ${totalPercentage.toFixed(1)}%)`;
    }
    
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      if (!step.title.trim()) return `Step ${i + 1} needs a title`;
      if (!step.description.trim()) return `Step ${i + 1} needs a description`;
      if (step.skillsRequired.length === 0) return `Step ${i + 1} needs at least one skill`;
      if (step.budgetPercentage <= 0) return `Step ${i + 1} needs a budget percentage`;
      
      if (step.dependsOn !== undefined) {
        if (step.dependsOn >= i) return `Step ${i + 1} cannot depend on a later step`;
        if (step.dependsOn < 0) return `Step ${i + 1} has invalid dependency`;
      }
    }
    
    return null;
  };

  const handleCreateWorkflow = async () => {
    const workflow = selectedTemplate || customWorkflow;
    
    if (!userAddress) {
      setError('Connect your wallet first');
      return;
    }
    
    if (!totalBudget || Number(totalBudget) <= 0) {
      setError('Set a total budget');
      return;
    }
    
    const validationError = validateWorkflow(workflow);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsCreating(true);
    setError('');
    
    try {
      let budgetErg: number;
      let budgetUsd: number;
      
      if (currencyMode === 'USD') {
        budgetUsd = Number(totalBudget);
        budgetErg = await usdToErg(budgetUsd);
      } else {
        budgetErg = Number(totalBudget);
        budgetUsd = await ergToUsd(budgetErg);
      }
      
      const workflowExecution = await createWorkflowTasks(
        workflow,
        budgetErg,
        budgetUsd,
        userAddress,
        profile?.displayName
      );
      
      // Redirect to the first task in the workflow
      if (workflowExecution.tasks.length > 0) {
        router.push(`/tasks/detail?id=${workflowExecution.tasks[0].id}&workflow=true`);
      }
      
    } catch (err: any) {
      setError(err?.message || 'Failed to create workflow');
    } finally {
      setIsCreating(false);
    }
  };

  const currentWorkflow = selectedTemplate || customWorkflow;
  const workflowsByCategory = getWorkflowTemplatesByCategory();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <WorkflowIcon className="w-8 h-8 text-purple-400" />
            Automated Workflows
          </h1>
          <p className="text-[var(--text-secondary)] text-lg">
            Chain tasks together — when one completes, the next automatically opens
          </p>
        </div>

        {/* Wallet Banner */}
        {!userAddress && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-300" />
            <p className="text-amber-300 text-sm flex-1">Connect an Ergo wallet to create workflows.</p>
            <Link
              href="/getting-started"
              className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors"
            >
              Get Started
            </Link>
          </div>
        )}

        {/* View Mode Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode('templates')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'templates'
                  ? 'bg-purple-600 text-white'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card)]'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setViewMode('custom')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'custom'
                  ? 'bg-purple-600 text-white'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card)]'
              }`}
            >
              Custom
            </button>
            {(selectedTemplate || (customWorkflow.steps.length > 0)) && (
              <button
                onClick={() => setViewMode('preview')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'preview'
                    ? 'bg-purple-600 text-white'
                    : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card)]'
                }`}
              >
                Preview
              </button>
            )}
          </div>
        </div>

        {/* Templates View */}
        {viewMode === 'templates' && (
          <div className="space-y-8">
            {Object.entries(workflowsByCategory).map(([category, templates]) => (
              <div key={category}>
                <h2 className="text-xl font-semibold text-white mb-4">{category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map(template => (
                    <div key={template.id} className="card p-6 hover:border-purple-500/40 transition-colors">
                      <h3 className="text-lg font-semibold text-white mb-2">{template.name}</h3>
                      <p className="text-[var(--text-secondary)] text-sm mb-4 leading-relaxed">
                        {template.description}
                      </p>
                      
                      {/* Steps Preview */}
                      <div className="space-y-2 mb-6">
                        {template.steps.map((step, index) => (
                          <div key={index} className="flex items-center gap-3 text-sm">
                            <div className="w-6 h-6 rounded-full bg-purple-600/20 text-purple-300 text-xs font-medium flex items-center justify-center">
                              {index + 1}
                            </div>
                            <span className="text-[var(--text-secondary)] flex-1">{step.title}</span>
                            <span className="text-purple-400 font-medium">{step.budgetPercentage}%</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTemplateSelect(template)}
                          className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Use Template
                        </button>
                        <button
                          onClick={() => handleCustomizeTemplate(template)}
                          className="px-3 py-2 border border-[var(--border-color)] hover:border-purple-500/40 text-[var(--text-secondary)] hover:text-purple-300 rounded-lg transition-colors"
                          title="Customize"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Custom Workflow Builder */}
        {viewMode === 'custom' && (
          <div className="max-w-4xl space-y-6">
            {/* Workflow Details */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Workflow Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Workflow Name
                  </label>
                  <input
                    type="text"
                    value={customWorkflow.name}
                    onChange={(e) => setCustomWorkflow(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Custom Website Development"
                    className="w-full px-4 py-3 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={customWorkflow.description}
                    onChange={(e) => setCustomWorkflow(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this workflow accomplishes..."
                    className="w-full px-4 py-3 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Workflow Steps</h2>
                <button
                  onClick={addCustomStep}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Step
                </button>
              </div>
              
              {customWorkflow.steps.length === 0 ? (
                <div className="text-center py-12">
                  <WorkflowIcon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <p className="text-[var(--text-muted)]">No steps yet. Add your first step to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customWorkflow.steps.map((step, index) => (
                    <div key={index} className="p-4 border border-[var(--border-color)] rounded-xl bg-[var(--bg-card)]/30">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-purple-600/20 text-purple-300 text-sm font-medium flex items-center justify-center">
                          {index + 1}
                        </div>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => updateCustomStep(index, { title: e.target.value })}
                          placeholder="Step title..."
                          className="flex-1 px-3 py-2 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
                        />
                        <button
                          onClick={() => removeCustomStep(index)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-[var(--text-secondary)] mb-2">
                            Description
                          </label>
                          <textarea
                            rows={3}
                            value={step.description}
                            onChange={(e) => updateCustomStep(index, { description: e.target.value })}
                            placeholder="Describe what this step involves..."
                            className="w-full px-3 py-2 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors resize-none text-sm"
                          />
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-2">
                              Required Skills
                            </label>
                            <SkillSelector
                              selectedSkills={step.skillsRequired}
                              onSkillsChange={(skills) => updateCustomStep(index, { skillsRequired: skills })}
                              placeholder="Add skills..."
                              maxSkills={6}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-[var(--text-secondary)] mb-2">
                                Budget %
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={step.budgetPercentage}
                                onChange={(e) => updateCustomStep(index, { budgetPercentage: Number(e.target.value) || 0 })}
                                className="w-full px-3 py-2 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-cyan)] transition-colors text-sm"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-xs text-[var(--text-secondary)] mb-2">
                                Depends on Step
                              </label>
                              <select
                                value={step.dependsOn ?? ''}
                                onChange={(e) => updateCustomStep(index, { 
                                  dependsOn: e.target.value ? Number(e.target.value) : undefined 
                                })}
                                className="w-full px-3 py-2 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-cyan)] transition-colors text-sm"
                              >
                                <option value="">None</option>
                                {customWorkflow.steps.map((_, i) => i < index && (
                                  <option key={i} value={i}>Step {i + 1}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {customWorkflow.steps.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={() => setViewMode('preview')}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
                >
                  Preview Workflow
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Preview & Launch */}
        {viewMode === 'preview' && currentWorkflow && (
          <div className="max-w-4xl space-y-6">
            {/* Workflow Overview */}
            <div className="card p-6">
              <h2 className="text-2xl font-semibold text-white mb-2">{currentWorkflow.name}</h2>
              <p className="text-[var(--text-secondary)] mb-6">{currentWorkflow.description}</p>
              
              {/* Workflow Visualization */}
              <div className="space-y-3">
                {currentWorkflow.steps.map((step, index) => (
                  <div key={index} className="relative">
                    <div className="flex items-center gap-4 p-4 border border-[var(--border-color)] rounded-xl bg-[var(--bg-card)]/30">
                      <div className="w-10 h-10 rounded-full bg-purple-600 text-white text-sm font-medium flex items-center justify-center">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-medium mb-1">{step.title}</h3>
                        <p className="text-[var(--text-secondary)] text-sm mb-2">{step.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex flex-wrap gap-1">
                            {step.skillsRequired.slice(0, 3).map(skill => (
                              <span key={skill} className="px-2 py-1 bg-blue-600/10 text-blue-300 text-xs rounded-full border border-blue-500/20">
                                {skill}
                              </span>
                            ))}
                            {step.skillsRequired.length > 3 && (
                              <span className="px-2 py-1 bg-[var(--bg-card)] text-[var(--text-muted)] text-xs rounded-full border border-[var(--border-color)]">
                                +{step.skillsRequired.length - 3}
                              </span>
                            )}
                          </div>
                          <span className="text-purple-400 font-medium">{step.budgetPercentage}%</span>
                          {step.dependsOn !== undefined && (
                            <span className="text-orange-400 text-xs">
                              Depends on Step {step.dependsOn + 1}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {index < currentWorkflow.steps.length - 1 && (
                      <div className="absolute left-5 -bottom-1.5 w-0.5 h-3 bg-[var(--border-color)]" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Budget Configuration */}
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Set Total Budget</h2>
              
              <div className="space-y-4">
                {/* Currency Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setCurrencyMode('USD')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                        currencyMode === 'USD'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card)]'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      USD
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrencyMode('ERG')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        currencyMode === 'ERG'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card)]'
                      }`}
                    >
                      Σ ERG
                    </button>
                  </div>
                  
                  {ergPrice && (
                    <span className="text-xs text-[var(--text-muted)]">
                      1 ERG = ${ergPrice.toFixed(4)}
                    </span>
                  )}
                </div>

                {/* Budget Input */}
                <div className="relative max-w-sm">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                    {currencyMode === 'USD' ? '$' : 'Σ'}
                  </div>
                  <input
                    type="number"
                    step={currencyMode === 'USD' ? '1' : '0.01'}
                    min="0"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(e.target.value)}
                    placeholder={currencyMode === 'USD' ? '500' : '100.00'}
                    className="w-full pl-8 pr-4 py-3 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
                  />
                </div>
                
                {/* Conversion Display */}
                {convertedAmount && (
                  <div className="text-sm text-[var(--text-secondary)]">
                    ≈ {currencyMode === 'USD' ? `${convertedAmount} ERG` : `$${convertedAmount}`}
                  </div>
                )}

                {/* Budget Breakdown */}
                {totalBudget && Number(totalBudget) > 0 && (
                  <div className="mt-6">
                    <h3 className="text-white font-medium mb-3">Budget Breakdown</h3>
                    <div className="space-y-2">
                      {currentWorkflow.steps.map((step, index) => {
                        const stepAmount = (Number(totalBudget) * step.budgetPercentage) / 100;
                        const convertedStepAmount = convertedAmount 
                          ? (Number(convertedAmount) * step.budgetPercentage) / 100
                          : null;
                        
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-[var(--bg-card)]/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-purple-600/20 text-purple-300 text-xs font-medium flex items-center justify-center">
                                {index + 1}
                              </div>
                              <span className="text-[var(--text-secondary)] text-sm">{step.title}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-medium">
                                {currencyMode === 'USD' 
                                  ? `$${stepAmount.toFixed(2)}`
                                  : `${stepAmount.toFixed(2)} ERG`
                                }
                              </div>
                              {convertedStepAmount && (
                                <div className="text-xs text-[var(--text-muted)]">
                                  ≈ {currencyMode === 'USD' 
                                    ? `${convertedStepAmount.toFixed(3)} ERG`
                                    : `$${convertedStepAmount.toFixed(2)}`
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <button
                  onClick={() => setViewMode('templates')}
                  className="px-4 py-2 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg transition-colors"
                >
                  Back to Templates
                </button>
                {!selectedTemplate && (
                  <button
                    onClick={() => setViewMode('custom')}
                    className="px-4 py-2 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg transition-colors"
                  >
                    Edit Workflow
                  </button>
                )}
              </div>
              
              <button
                onClick={handleCreateWorkflow}
                disabled={isCreating || !userAddress}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-[var(--bg-card)] disabled:to-[var(--bg-card)] disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Creating Workflow...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Create Workflow
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}