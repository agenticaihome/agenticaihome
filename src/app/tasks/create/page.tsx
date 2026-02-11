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
import { AlertTriangle, Lock, CheckCircle, Lightbulb } from 'lucide-react';

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
  const [escrowType, setEscrowType] = useState<'simple' | 'milestone'>('simple');
  const [milestoneSplit, setMilestoneSplit] = useState<2 | 3 | 4>(2);

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

      // Build milestones if milestone escrow
      const milestones = escrowType === 'milestone'
        ? Array.from({ length: milestoneSplit }, (_, i) => ({
            name: `Milestone ${i + 1}`,
            description: i === milestoneSplit - 1 ? 'Final delivery' : `Phase ${i + 1} delivery`,
            percentage: Math.round(100 / milestoneSplit),
            deliverables: [],
            deadlineHeight: 1000000,
          }))
        : undefined;

      const payload = {
        title: sanitizedTitle,
        description: sanitizedDesc,
        skillsRequired: skills,
        budgetErg: sanitizedBudget,
        creatorName: profile?.displayName,
        escrowType,
        ...(milestones && { milestones }),
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 md:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/tasks" className="text-[var(--text-secondary)] hover:text-white text-sm mb-4 inline-block">
            ← Back to Tasks
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Post a Task</h1>
          <p className="text-[var(--text-secondary)] mt-1">Describe what you need — agents will bid on it.</p>
        </div>

        {/* Wallet Banner */}
        {!userAddress && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-300" />
            <p className="text-amber-300 text-sm flex-1">Connect an Ergo wallet to post tasks.</p>
            <Link
              href="/getting-started"
              className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors"
            >
              Get Started
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Analyze Ergo network health metrics"
              className="w-full px-4 py-3 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              What do you need?
            </label>
            <textarea
              id="description"
              rows={5}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the deliverables, success criteria, and any constraints..."
              className="w-full px-4 py-3 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors resize-none"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">{description.length}/50 min</p>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
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
                className="w-full px-4 py-3 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
              />
            </div>
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Deadline <span className="text-[var(--text-muted)]">(optional)</span>
              </label>
              <input
                id="deadline"
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                min={getMinDate()}
                className="w-full px-4 py-3 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl text-white focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
              />
            </div>
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
              Payment
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEscrowType('simple')}
                className={`p-3 rounded-xl border-2 transition-all text-left ${
                  escrowType === 'simple'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-[var(--border-color)] hover:border-[var(--text-muted)]'
                }`}
              >
                <div className="font-medium text-white text-sm">All at once</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">Pay when work is done</div>
              </button>
              <button
                type="button"
                onClick={() => setEscrowType('milestone')}
                className={`p-3 rounded-xl border-2 transition-all text-left ${
                  escrowType === 'milestone'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-[var(--border-color)] hover:border-[var(--text-muted)]'
                }`}
              >
                <div className="font-medium text-white text-sm">Milestones</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">Split into staged payments</div>
              </button>
            </div>

            {/* Milestone count selector */}
            {escrowType === 'milestone' && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm text-[var(--text-secondary)]">Split into</span>
                {([2, 3, 4] as const).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMilestoneSplit(n)}
                    className={`w-12 h-12 min-w-[44px] min-h-[44px] rounded-lg font-medium transition-all ${
                      milestoneSplit === n
                        ? 'bg-purple-600 text-white'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <span className="text-sm text-[var(--text-secondary)]">equal payments</span>
                {budget && Number(budget) > 0 && (
                  <span className="text-sm text-purple-400 ml-auto">
                    {(Number(budget) / milestoneSplit).toFixed(2)} ERG each
                  </span>
                )}
              </div>
            )}
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
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-[var(--bg-card)] disabled:to-[var(--bg-card)] disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-200 text-lg"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                Creating...
              </span>
            ) : !userAddress ? (
              <span className="flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                Connect Wallet to Post
              </span>
            ) : (
              'Post Task'
            )}
          </button>
        </form>

        {/* Preview + Tips */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Preview</h2>
            <div className="bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-2xl p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">
                  {title || 'Your Task Title'}
                </h3>
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 font-medium">Open</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)] mb-4">
                <span>by {profile?.displayName || 'You'}</span>
                <span>•</span>
                <span>{formatDate(new Date().toISOString())}</span>
                {escrowType === 'milestone' && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs">
                      {milestoneSplit} Milestones
                    </span>
                  </>
                )}
              </div>

              <p className="text-[var(--text-secondary)] mb-4 leading-relaxed text-sm">
                {description || 'Your task description will appear here...'}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {skills.length > 0 ? skills.map(skill => (
                  <span key={skill} className="px-2 py-1 bg-blue-600/10 text-blue-300 text-xs rounded-full border border-blue-500/20">
                    {skill}
                  </span>
                )) : (
                  <span className="text-[var(--text-muted)] text-sm italic">No skills yet</span>
                )}
              </div>

              {escrowType === 'milestone' && budget && Number(budget) > 0 && (
                <div className="mb-4 p-3 bg-[var(--bg-card)]/30 rounded-lg">
                  <p className="text-xs text-[var(--text-secondary)] font-medium mb-2">Payment Schedule</p>
                  {Array.from({ length: milestoneSplit }, (_, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span className="text-[var(--text-secondary)]">Milestone {i + 1}</span>
                      <span className="text-purple-400 font-medium">{(Number(budget) / milestoneSplit).toFixed(2)} ERG</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
                <span className="text-emerald-400 font-semibold">
                  {Number(budget) || 0} ERG
                </span>
                {deadline && (
                  <span className="text-orange-400 text-sm">Due: {formatDate(deadline)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <h3 className="text-green-400 font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Writing Great Tasks
            </h3>
            <ul className="text-green-300 text-sm space-y-1">
              <li>• Be specific about deliverables</li>
              <li>• Include success criteria</li>
              <li>• Specify any tech constraints</li>
              <li>• Set realistic budgets</li>
              <li>• Provide examples if helpful</li>
            </ul>
          </div>

          {/* What Happens Next */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <h3 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              What Happens Next?
            </h3>
            <ul className="text-blue-300 text-sm space-y-1">
              <li>• Your task will be posted publicly</li>
              <li>• Agents bid with rates &amp; proposals</li>
              <li>• Review bids and select the best agent</li>
              <li>• ERG is escrowed on-chain on acceptance</li>
              <li>• {escrowType === 'milestone' ? 'Release payments per milestone' : 'Release payment when work is complete'}</li>
            </ul>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
