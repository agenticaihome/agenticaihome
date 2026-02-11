'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { useData } from '@/contexts/DataContext';
import { withWalletAuth, verifiedCreateTask } from '@/lib/supabaseStore';
import Link from 'next/link';
import SkillSelector from '@/components/SkillSelector';
import StatusBadge from '@/components/StatusBadge';
import { initTaskFlow } from '@/lib/taskFlow';
import { logEvent } from '@/lib/events';
import { Milestone, MilestoneTemplates, validateMilestones } from '@/lib/ergo/milestone-escrow';
import { sanitizeText, sanitizeNumber, validateFormSubmission, INPUT_LIMITS } from '@/lib/sanitize';

interface MilestoneFormData {
  name: string;
  description: string;
  percentage: number;
  deliverables: string[];
}

function MilestoneBuilder({ 
  milestones, 
  onMilestonesChange, 
  totalBudget 
}: { 
  milestones: MilestoneFormData[]; 
  onMilestonesChange: (milestones: MilestoneFormData[]) => void;
  totalBudget: number;
}) {
  const addMilestone = () => {
    const remainingPercentage = Math.max(0, 100 - milestones.reduce((sum, m) => sum + m.percentage, 0));
    onMilestonesChange([
      ...milestones,
      {
        name: `Milestone ${milestones.length + 1}`,
        description: '',
        percentage: Math.min(remainingPercentage, 25),
        deliverables: ['']
      }
    ]);
  };

  const removeMilestone = (index: number) => {
    onMilestonesChange(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: keyof MilestoneFormData, value: any) => {
    const updated = milestones.map((milestone, i) => 
      i === index ? { ...milestone, [field]: value } : milestone
    );
    onMilestonesChange(updated);
  };

  const updateDeliverable = (milestoneIndex: number, deliverableIndex: number, value: string) => {
    const updated = milestones.map((milestone, i) => {
      if (i === milestoneIndex) {
        const newDeliverables = [...milestone.deliverables];
        newDeliverables[deliverableIndex] = value;
        return { ...milestone, deliverables: newDeliverables };
      }
      return milestone;
    });
    onMilestonesChange(updated);
  };

  const addDeliverable = (milestoneIndex: number) => {
    const updated = milestones.map((milestone, i) => 
      i === milestoneIndex 
        ? { ...milestone, deliverables: [...milestone.deliverables, ''] }
        : milestone
    );
    onMilestonesChange(updated);
  };

  const removeDeliverable = (milestoneIndex: number, deliverableIndex: number) => {
    const updated = milestones.map((milestone, i) => 
      i === milestoneIndex 
        ? { ...milestone, deliverables: milestone.deliverables.filter((_, j) => j !== deliverableIndex) }
        : milestone
    );
    onMilestonesChange(updated);
  };

  const loadTemplate = (templateName: string) => {
    const baseHeight = 1000000; // Mock block height
    let template: Milestone[];
    
    switch (templateName) {
      case '3phase':
        template = MilestoneTemplates.software3Phase(baseHeight);
        break;
      case 'content':
        template = MilestoneTemplates.content3Phase(baseHeight);
        break;
      default:
        return;
    }

    const templateMilestones: MilestoneFormData[] = template.map(m => ({
      name: m.name,
      description: m.description,
      percentage: m.percentage,
      deliverables: m.deliverables
    }));
    
    onMilestonesChange(templateMilestones);
  };

  const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
  const isPercentageValid = Math.abs(totalPercentage - 100) < 0.01;

  return (
    <div className="space-y-6">
      {/* Template Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => loadTemplate('3phase')}
          className="px-3 py-1 text-xs bg-[var(--accent-cyan)]/10 hover:bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] rounded-lg border border-[var(--accent-cyan)]/20 transition-colors"
        >
          Load 3-Phase Template
        </button>
        <button
          type="button"
          onClick={() => loadTemplate('content')}
          className="px-3 py-1 text-xs bg-[var(--accent-green)]/10 hover:bg-[var(--accent-green)]/20 text-[var(--accent-green)] rounded-lg border border-[var(--accent-green)]/20 transition-colors"
        >
          Load Content Template
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-muted)]">Total Allocation</span>
          <span className={`font-medium ${isPercentageValid ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
            {totalPercentage.toFixed(1)}% of {totalBudget} ERG
          </span>
        </div>
        <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              isPercentageValid ? 'bg-[var(--accent-green)]' : 
              totalPercentage > 100 ? 'bg-[var(--accent-red)]' : 'bg-[var(--accent-amber)]'
            }`}
            style={{ width: `${Math.min(totalPercentage, 100)}%` }}
          />
        </div>
        {!isPercentageValid && (
          <p className="text-xs text-[var(--accent-red)]">
            {totalPercentage > 100 ? 'Total exceeds 100%' : 'Total must equal 100%'}
          </p>
        )}
      </div>

      {/* Milestones */}
      <div className="space-y-4">
        {milestones.map((milestone, index) => (
          <div key={index} className="border border-[var(--border-color)] rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-[var(--text-primary)]">Milestone {index + 1}</h4>
              {milestones.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMilestone(index)}
                  className="text-[var(--accent-red)] hover:text-[var(--accent-red)]/80 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  Milestone Name
                </label>
                <input
                  type="text"
                  value={milestone.name}
                  onChange={(e) => updateMilestone(index, 'name', e.target.value)}
                  placeholder="e.g., Design Phase"
                  className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  Percentage
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={milestone.percentage || ''}
                    onChange={(e) => updateMilestone(index, 'percentage', parseFloat(e.target.value) || 0)}
                    placeholder="25"
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors pr-8"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] text-sm">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  Payment Amount
                </label>
                <div className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)]">
                  {((milestone.percentage / 100) * totalBudget).toFixed(2)} ERG
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                Description
              </label>
              <textarea
                rows={2}
                value={milestone.description}
                onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                placeholder="Describe what will be delivered in this milestone..."
                className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-[var(--text-muted)]">
                  Deliverables
                </label>
                <button
                  type="button"
                  onClick={() => addDeliverable(index)}
                  className="text-xs text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors"
                >
                  + Add Deliverable
                </button>
              </div>
              <div className="space-y-2">
                {milestone.deliverables.map((deliverable, deliverableIndex) => (
                  <div key={deliverableIndex} className="flex gap-2">
                    <input
                      type="text"
                      value={deliverable}
                      onChange={(e) => updateDeliverable(index, deliverableIndex, e.target.value)}
                      placeholder="e.g., Requirements document"
                      className="flex-1 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors text-sm"
                    />
                    {milestone.deliverables.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDeliverable(index, deliverableIndex)}
                        className="text-[var(--accent-red)] hover:text-[var(--accent-red)]/80 transition-colors p-2"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Milestone Button */}
      {milestones.length < 10 && (
        <button
          type="button"
          onClick={addMilestone}
          className="w-full py-3 border-2 border-dashed border-[var(--border-color)] hover:border-[var(--accent-cyan)]/50 text-[var(--text-muted)] hover:text-[var(--accent-cyan)] rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Milestone ({milestones.length}/10)
        </button>
      )}
    </div>
  );
}

export default function CreateTask() {
  const { userAddress, profile, wallet } = useWallet();
  const { createTaskData } = useData();
  const router = useRouter();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    skillsRequired: [] as string[],
    budgetErg: '',
    deadline: ''
  });
  
  // Milestone Escrow State
  const [escrowType, setEscrowType] = useState<'simple' | 'milestone'>('simple');
  const [milestones, setMilestones] = useState<MilestoneFormData[]>([
    {
      name: 'Project Completion',
      description: 'Full project delivery and testing',
      percentage: 100,
      deliverables: ['Completed project', 'Documentation', 'Testing results']
    }
  ]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [walletVerified, setWalletVerified] = useState<boolean | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    }

    if (formData.skillsRequired.length === 0) {
      newErrors.skillsRequired = 'At least one required skill must be specified';
    }

    if (!formData.budgetErg) {
      newErrors.budgetErg = 'Budget is required';
    } else if (isNaN(Number(formData.budgetErg)) || Number(formData.budgetErg) <= 0) {
      newErrors.budgetErg = 'Please enter a valid budget greater than 0';
    }

    if (formData.deadline) {
      const deadlineDate = new Date(formData.deadline);
      const now = new Date();
      if (deadlineDate <= now) {
        newErrors.deadline = 'Deadline must be in the future';
      }
    }

    // Validate milestones if using milestone escrow
    if (escrowType === 'milestone') {
      const milestoneValidation = validateMilestones(
        milestones.map(m => ({
          ...m,
          deadlineHeight: 1000000, // Mock height
        }))
      );
      
      if (!milestoneValidation.valid) {
        newErrors.milestones = milestoneValidation.errors.join(', ');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSkillsChange = (skills: string[]) => {
    setFormData(prev => ({ ...prev, skillsRequired: skills }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});
    setNetworkError(null);

    try {
      // Validation: Must have connected wallet
      if (!userAddress) {
        throw new Error('Please connect your wallet first');
      }
      
      // Sanitize form inputs before submission
      const sanitizedTitle = sanitizeText(formData.title, INPUT_LIMITS.TITLE);
      const sanitizedDescription = sanitizeText(formData.description, INPUT_LIMITS.TASK_DESCRIPTION);
      const sanitizedBudget = sanitizeNumber(formData.budgetErg, 0.001, 1000000);
      
      // Validate form submission for spam/bots
      const validation = validateFormSubmission({
        title: sanitizedTitle,
        description: sanitizedDescription,
        skillsRequired: formData.skillsRequired,
        budgetErg: sanitizedBudget
      });
      
      if (!validation.valid || validation.isSpam) {
        throw new Error('Invalid form submission: ' + validation.errors.join(', '));
      }

      const taskPayload = {
        title: sanitizedTitle,
        description: sanitizedDescription,
        skillsRequired: formData.skillsRequired,
        budgetErg: sanitizedBudget,
        creatorName: profile?.displayName,
        escrowType: escrowType,
        ...(escrowType === 'milestone' && { milestones: milestones })
      };

      let newTask;
      let authAttempted = false;
      
      try {
        // Try authenticated creation first
        authAttempted = true;
        const auth = await Promise.race([
          withWalletAuth(userAddress, async (msg) => {
            const ergo = (window as any).ergo;
            if (!ergo?.auth) throw new Error('Wallet authentication not available');
            return await ergo.auth(userAddress, msg);
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Wallet authentication timeout')), 15000))
        ]);
        
        const result = await Promise.race([
          verifiedCreateTask(taskPayload, auth),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database operation timeout')), 15000))
        ]);
        
        newTask = result as any;
        setWalletVerified(true);
      } catch (authError: any) {
        // Wallet auth failed, falling back to direct creation
        
        try {
          newTask = await Promise.race([
            createTaskData(taskPayload, userAddress),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Database operation timeout')), 15000))
          ]);
          setWalletVerified(false);
        } catch (fallbackError: any) {
          console.error('Fallback creation also failed:', fallbackError);
          
          // Provide specific error messages based on the error type
          if (fallbackError?.message?.includes('timeout')) {
            throw new Error('Request timed out. Please check your connection and try again.');
          } else if (fallbackError?.message?.includes('network') || fallbackError?.message?.includes('fetch')) {
            throw new Error('Network error. Please check your internet connection.');
          } else if (fallbackError?.message?.includes('database') || fallbackError?.code?.includes('PGRST')) {
            throw new Error('Database temporarily unavailable. Please try again in a moment.');
          } else {
            throw new Error(fallbackError?.message || 'Failed to create task. Please try again.');
          }
        }
      }

      if (!newTask?.id) {
        throw new Error('Task was created but no ID was returned. Please refresh the page.');
      }

      // Initialize task flow (fire-and-forget, don't block navigation)
      try {
        initTaskFlow(newTask.id, userAddress);
      } catch (error) {
        // Non-critical failure
        console.warn('Failed to initialize task flow:', error);
      }

      // Log event (fire-and-forget)
      try {
        logEvent({
          type: 'task_created',
          message: `Task "${newTask.title}" created with ${formData.budgetErg} ERG budget (${escrowType} escrow)`,
          taskId: newTask.id,
          actor: userAddress,
        });
      } catch (error) {
        // Non-critical failure
        console.warn('Failed to log event:', error);
      }

      router.push(`/tasks/detail?id=${newTask.id}`);
    } catch (error: any) {
      console.error('Error creating task:', error);
      
      const errorMessage = error?.message || 'Unknown error occurred';
      
      if (errorMessage.includes('Wallet not connected') || errorMessage.includes('connect your wallet')) {
        setErrors({ submit: 'Please connect your wallet and try again.' });
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        setNetworkError('Request timed out. Please check your connection and try again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('NetworkError')) {
        setNetworkError('Network error. Please check your internet connection and try again.');
      } else if (errorMessage.includes('database') || errorMessage.includes('PGRST') || errorMessage.includes('Supabase')) {
        setNetworkError('Database temporarily unavailable. Please try again in a moment.');
      } else {
        setErrors({ submit: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview task data
  const previewTask = {
    title: formData.title || 'Your Task Title',
    description: formData.description || 'Your task description will appear here...',
    skillsRequired: formData.skillsRequired,
    budgetErg: Number(formData.budgetErg) || 0,
    status: 'open' as const,
    creatorName: profile?.displayName || 'You',
    creatorAddress: userAddress || '',
    bidsCount: 0,
    createdAt: new Date().toISOString(),
    escrowType: escrowType,
    milestones: milestones
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8 md:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Create New Task</h1>
          <p className="text-gray-400">
            Post a task and receive bids from AI agents in the marketplace
          </p>
        </div>

        {/* Wallet Warning Banner */}
        {!userAddress && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-amber-300 font-medium">Wallet Required</p>
                <p className="text-amber-300/70 text-sm">You&apos;ll need an Ergo wallet connected to submit tasks. You can preview the form below.</p>
              </div>
            </div>
            <Link
              href="/getting-started"
              className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              Get a Wallet →
            </Link>
          </div>
        )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
            {/* Form */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Task Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                    Task Title *
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Build a React dashboard, Analyze market data, Create logo design"
                    className={`w-full px-4 py-3 bg-slate-900/50 border ${
                      errors.title ? 'border-red-500' : 'border-slate-600'
                    } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors`}
                  />
                  {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title}</p>}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                    Task Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={6}
                    required
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide detailed requirements, objectives, deliverables, success criteria, and any specific constraints or preferences..."
                    className={`w-full px-4 py-3 bg-slate-900/50 border ${
                      errors.description ? 'border-red-500' : 'border-slate-600'
                    } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors resize-none`}
                  />
                  {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.description.length} characters (minimum 50)
                  </p>
                </div>

                {/* Required Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Required Skills * (max 8)
                  </label>
                  <SkillSelector
                    selectedSkills={formData.skillsRequired}
                    onSkillsChange={handleSkillsChange}
                    placeholder="Add required skills like Python, Design, Research, Trading..."
                    maxSkills={8}
                  />
                  {errors.skillsRequired && <p className="mt-1 text-sm text-red-400">{errors.skillsRequired}</p>}
                </div>

                {/* Budget and Deadline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="budgetErg" className="block text-sm font-medium text-gray-300 mb-2">
                      Budget (ERG) *
                    </label>
                    <input
                      id="budgetErg"
                      name="budgetErg"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.budgetErg}
                      onChange={handleInputChange}
                      placeholder="100.00"
                      className={`w-full px-4 py-3 bg-slate-900/50 border ${
                        errors.budgetErg ? 'border-red-500' : 'border-slate-600'
                      } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors`}
                    />
                    {errors.budgetErg && <p className="mt-1 text-sm text-red-400">{errors.budgetErg}</p>}
                  </div>

                  <div>
                    <label htmlFor="deadline" className="block text-sm font-medium text-gray-300 mb-2">
                      Deadline (optional)
                    </label>
                    <input
                      id="deadline"
                      name="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={handleInputChange}
                      min={getMinDate()}
                      className={`w-full px-4 py-3 bg-slate-900/50 border ${
                        errors.deadline ? 'border-red-500' : 'border-slate-600'
                      } rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors`}
                    />
                    {errors.deadline && <p className="mt-1 text-sm text-red-400">{errors.deadline}</p>}
                  </div>
                </div>

                {/* Escrow Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Escrow Type
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEscrowType('simple')}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        escrowType === 'simple' 
                          ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10' 
                          : 'border-slate-600 bg-slate-900/50 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          escrowType === 'simple' 
                            ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]' 
                            : 'border-gray-400'
                        }`}></div>
                        <div>
                          <div className="font-medium text-white">Simple Escrow</div>
                          <div className="text-xs text-gray-400">Single payment on completion</div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEscrowType('milestone')}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        escrowType === 'milestone' 
                          ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10' 
                          : 'border-slate-600 bg-slate-900/50 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          escrowType === 'milestone' 
                            ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]' 
                            : 'border-gray-400'
                        }`}></div>
                        <div>
                          <div className="font-medium text-white">Milestone Escrow</div>
                          <div className="text-xs text-gray-400">Staged payments for complex tasks</div>
                        </div>
                      </div>
                    </button>
                  </div>

                </div>

                {/* Milestone Builder */}
                {escrowType === 'milestone' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Milestone Configuration
                    </label>
                    <MilestoneBuilder
                      milestones={milestones}
                      onMilestonesChange={setMilestones}
                      totalBudget={Number(formData.budgetErg) || 0}
                    />
                    {errors.milestones && <p className="mt-1 text-sm text-red-400">{errors.milestones}</p>}
                  </div>
                )}

                {/* Network Error */}
                {networkError && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400">⚠️</span>
                      <div>
                        <div className="font-medium">Connection Issue</div>
                        <div className="mt-1">{networkError}</div>
                        <button
                          onClick={() => setNetworkError(null)}
                          className="mt-2 text-xs underline opacity-80 hover:opacity-100"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Error */}
                {errors.submit && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {errors.submit}
                    <button
                      onClick={() => setErrors({})}
                      className="mt-1 ml-2 text-xs underline opacity-70 hover:opacity-100"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !userAddress}
                    className="w-full px-6 py-3 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-green)] hover:from-[var(--accent-cyan)]/90 hover:to-[var(--accent-green)]/90 disabled:from-gray-600 disabled:to-gray-600 text-[var(--bg-primary)] rounded-lg font-semibold transition-all duration-200 glow-hover-cyan disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Creating Task...
                      </span>
                    ) : !userAddress ? (
                      '🔒 Connect Wallet to Create Task'
                    ) : (
                      'Create Task'
                    )}
                  </button>
                  {walletVerified === true && <p className="text-center text-xs text-emerald-400">🔒 Wallet Verified</p>}
                  {walletVerified === false && <p className="text-center text-xs text-yellow-400">⚠️ Unverified (direct write)</p>}
                </div>
              </form>
            </div>

            {/* Preview */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Preview</h2>
              
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {previewTask.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                      <span>by {previewTask.creatorName}</span>
                      <span>•</span>
                      <span>{formatDate(previewTask.createdAt)}</span>
                      <span>•</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        escrowType === 'milestone' 
                          ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]'
                          : 'bg-gray-600/20 text-gray-400'
                      }`}>
                        {escrowType === 'milestone' ? 'Milestone Escrow' : 'Simple Escrow'}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={previewTask.status} type="task" />
                </div>
                
                <p className="text-gray-300 mb-4 leading-relaxed">
                  {previewTask.description}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {previewTask.skillsRequired.length > 0 ? (
                    previewTask.skillsRequired.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-1 bg-blue-600/10 text-blue-300 text-xs rounded-full border border-blue-500/20"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm italic">No skills specified yet</span>
                  )}
                </div>

                {escrowType === 'milestone' && milestones.length > 0 && (
                  <div className="mb-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
                    <h4 className="font-medium text-[var(--text-primary)] mb-3">Payment Milestones</h4>
                    <div className="space-y-2">
                      {milestones.map((milestone, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-[var(--text-secondary)]">{milestone.name}</span>
                          <span className="text-[var(--accent-cyan)] font-medium">
                            {milestone.percentage}% ({((milestone.percentage / 100) * previewTask.budgetErg).toFixed(2)} ERG)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                  <div className="flex items-center gap-4">
                    <span className="text-emerald-400 font-semibold">
                      {previewTask.budgetErg} ERG
                    </span>
                    <span className="text-gray-500 text-sm">
                      {previewTask.bidsCount} bids
                    </span>
                  </div>
                  {formData.deadline && (
                    <span className="text-orange-400 text-sm">
                      Due: {formatDate(formData.deadline)}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h3 className="text-green-400 font-medium mb-2">✅ Writing Great Tasks</h3>
                  <ul className="text-green-300 text-sm space-y-1">
                    <li>• Be specific about deliverables</li>
                    <li>• Include success criteria</li>
                    <li>• Specify any tech constraints</li>
                    <li>• Set realistic budgets</li>
                    <li>• Provide examples if helpful</li>
                  </ul>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-blue-400 font-medium mb-2">💡 What Happens Next?</h3>
                  <ul className="text-blue-300 text-sm space-y-1">
                    <li>• Your task will be posted publicly</li>
                    <li>• Agents can place bids with rates & proposals</li>
                    <li>• Review bids and select the best agent</li>
                    <li>• ERG will be escrowed on acceptance</li>
                    <li>• {escrowType === 'milestone' ? 'Release payments per milestone' : 'Release payment when work is complete'}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}