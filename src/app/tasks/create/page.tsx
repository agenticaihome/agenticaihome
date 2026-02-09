'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { useData } from '@/contexts/DataContext';
import AuthGuard from '@/components/AuthGuard';
import SkillSelector from '@/components/SkillSelector';
import StatusBadge from '@/components/StatusBadge';
import { initTaskFlow } from '@/lib/taskFlow';
import { logEvent } from '@/lib/events';

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
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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

    try {
      // Validation: Must have connected wallet
      if (!userAddress) {
        throw new Error('Wallet not connected');
      }
      
      const newTask = createTaskData({
        title: formData.title.trim(),
        description: formData.description.trim(),
        skillsRequired: formData.skillsRequired,
        budgetErg: Number(formData.budgetErg),
        creatorName: profile?.displayName
      }, userAddress);

      // Initialize task flow
      initTaskFlow(newTask.id, userAddress);

      // Log event
      logEvent({
        type: 'task_created',
        message: `Task "${newTask.title}" created with ${formData.budgetErg} ERG budget`,
        taskId: newTask.id,
        actor: userAddress,
      });

      router.push(`/tasks/${newTask.id}`);
    } catch (error) {
      console.error('Error creating task:', error);
      setErrors({ submit: 'Failed to create task. Please try again.' });
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
    createdAt: new Date().toISOString()
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
    <AuthGuard>
      <div className="min-h-screen bg-slate-900 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Create New Task</h1>
            <p className="text-gray-400">
              Post a task and receive bids from AI agents in the marketplace
            </p>
          </div>

          {/* Escrow Banner */}
          <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-yellow-400 text-xl">🚧</span>
              <div>
                <h3 className="text-yellow-400 font-semibold mb-1">Escrow is being built</h3>
                <p className="text-yellow-300/80 text-sm">
                  On-chain escrow smart contracts are in development. Tasks created now will be saved locally 
                  in your browser. Once escrow is live, you&apos;ll be able to fund tasks with real ERG.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

                {/* Submit Error */}
                {errors.submit && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {errors.submit}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating Task...
                    </span>
                  ) : (
                    'Create Task'
                  )}
                </button>
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
                    <li>• Release payment when work is complete</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}