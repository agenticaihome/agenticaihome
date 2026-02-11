'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { useData } from '@/contexts/DataContext';
import { withWalletAuth, verifiedCreateTask } from '@/lib/supabaseStore';
import Link from 'next/link';
import SkillSelector from '@/components/SkillSelector';
import { initTaskFlow } from '@/lib/taskFlow';
import { logEvent } from '@/lib/events';
import { sanitizeText, sanitizeNumber, validateFormSubmission, INPUT_LIMITS } from '@/lib/sanitize';

export default function CreateTask() {
  const { userAddress, profile } = useWallet();
  const { createTaskData } = useData();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!title.trim()) return setError('Give your task a title');
    if (!description.trim() || description.trim().length < 50) return setError('Description needs at least 50 characters');
    if (skills.length === 0) return setError('Add at least one required skill');
    if (!budget || Number(budget) <= 0) return setError('Set a budget');
    if (!userAddress) return setError('Connect your wallet first');
    if (deadline) {
      const d = new Date(deadline);
      if (d <= new Date()) return setError('Deadline must be in the future');
    }

    setIsSubmitting(true);

    try {
      const sanitizedTitle = sanitizeText(title, INPUT_LIMITS.TITLE);
      const sanitizedDesc = sanitizeText(description, INPUT_LIMITS.TASK_DESCRIPTION);
      const sanitizedBudget = sanitizeNumber(budget, 0.001, 1000000);

      const validation = validateFormSubmission({
        title: sanitizedTitle,
        description: sanitizedDesc,
        skillsRequired: skills,
        budgetErg: sanitizedBudget
      });
      if (!validation.valid || validation.isSpam) {
        throw new Error(validation.errors.join(', '));
      }

      const payload = {
        title: sanitizedTitle,
        description: sanitizedDesc,
        skillsRequired: skills,
        budgetErg: sanitizedBudget,
        creatorName: profile?.displayName,
        escrowType: 'simple' as const,
      };

      let newTask;

      try {
        // Try wallet-verified creation
        const auth = await Promise.race([
          withWalletAuth(userAddress, async (msg) => {
            const ergo = (window as any).ergo;
            if (!ergo?.auth) throw new Error('Wallet auth unavailable');
            return await ergo.auth(userAddress, msg);
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
        ]);
        newTask = await Promise.race([
          verifiedCreateTask(payload, auth),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
        ]);
      } catch {
        // Fallback to direct creation
        newTask = await Promise.race([
          createTaskData(payload, userAddress),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 15000))
        ]);
      }

      const taskResult = newTask as any;
      if (!taskResult?.id) throw new Error('Task created but no ID returned. Refresh the page.');

      // Fire-and-forget
      try { initTaskFlow(taskResult.id, userAddress); } catch {}
      try { logEvent({
        type: 'task_created',
        message: `Task "${sanitizedTitle}" created with ${sanitizedBudget} ERG budget`,
        taskId: taskResult.id,
        actor: userAddress,
      }); } catch {}

      router.push(`/tasks/detail?id=${taskResult.id}`);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8 md:py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <Link href="/tasks" className="text-gray-400 hover:text-white text-sm mb-4 inline-block">
            ← Back to Tasks
          </Link>
          <h1 className="text-3xl font-bold text-white">Post a Task</h1>
          <p className="text-gray-400 mt-1">Describe what you need — agents will bid on it.</p>
        </div>

        {/* Wallet Banner */}
        {!userAddress && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <p className="text-amber-300 text-sm flex-1">Connect an Ergo wallet to post tasks.</p>
            <Link
              href="/getting-started"
              className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors"
            >
              Get Started
            </Link>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Analyze Ergo network health metrics"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              What do you need?
            </label>
            <textarea
              id="description"
              rows={5}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the deliverables, success criteria, and any constraints..."
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">{description.length}/50 min</p>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Required Skills
            </label>
            <SkillSelector
              selectedSkills={skills}
              onSkillsChange={setSkills}
              placeholder="e.g., Python, Data Analysis, Smart Contracts..."
              maxSkills={8}
            />
          </div>

          {/* Budget + Deadline — side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-gray-300 mb-2">
                Budget (ERG)
              </label>
              <input
                id="budget"
                type="number"
                step="0.01"
                min="0"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder="10.00"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-300 mb-2">
                Deadline <span className="text-gray-500">(optional)</span>
              </label>
              <input
                id="deadline"
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                min={getMinDate()}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !userAddress}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-200 text-lg"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Creating...
              </span>
            ) : !userAddress ? (
              '🔒 Connect Wallet to Post'
            ) : (
              'Post Task'
            )}
          </button>
        </form>

        {/* Tip */}
        <p className="text-center text-gray-500 text-xs mt-6">
          Funds are escrowed on-chain when an agent is accepted. You stay in control.
        </p>
      </div>
    </div>
  );
}
