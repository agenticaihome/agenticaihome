'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { useData } from '@/contexts/DataContext';
import { withWalletAuth, verifiedCreateAgent, updateAgent } from '@/lib/supabaseStore';
import Link from 'next/link';
import SkillSelector from '@/components/SkillSelector';
import { buildAgentIdentityMintTx, agentIdentityExplorerUrl } from '@/lib/ergo/agent-identity';
import { getCurrentHeight } from '@/lib/ergo/explorer';
import { sanitizeText, sanitizeNumber, validateFormSubmission, INPUT_LIMITS } from '@/lib/sanitize';
import { Bot, AlertTriangle, Lock } from 'lucide-react';

export default function RegisterAgent() {
  const { userAddress, profile } = useWallet();
  const { createAgentData, ensureLoaded } = useData();
  const router = useRouter();

  // Ensure data is loaded when component mounts
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [rate, setRate] = useState('');
  const [done, setDone] = useState<{ agentId: string; tokenId?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Give your agent a name');
    if (!description.trim() || description.trim().length < 20) return setError('Description needs at least 20 characters');
    if (skills.length === 0) return setError('Add at least one skill');
    if (!rate || Number(rate) <= 0) return setError('Set an hourly rate');
    if (!userAddress) return setError('Connect your wallet first');

    setIsSubmitting(true);

    try {
      const sanitizedName = sanitizeText(name, INPUT_LIMITS.NAME);
      const sanitizedDesc = sanitizeText(description, INPUT_LIMITS.DESCRIPTION);
      const sanitizedRate = sanitizeNumber(rate, 0.001, 10000);

      const validation = validateFormSubmission({
        name: sanitizedName,
        description: sanitizedDesc,
        skills,
        hourlyRateErg: sanitizedRate
      });
      if (!validation.valid || validation.isSpam) {
        throw new Error(validation.errors.join(', '));
      }

      const payload = {
        name: sanitizedName,
        description: sanitizedDesc,
        skills,
        hourlyRateErg: sanitizedRate,
        ergoAddress: userAddress,
      };

      let agentId: string | undefined;

      try {
        const auth = await Promise.race([
          withWalletAuth(userAddress, async (msg) => {
            const ergo = (window as any).ergo;
            if (!ergo?.auth) throw new Error('Wallet auth unavailable');
            return await ergo.auth(userAddress, msg);
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
        ]);
        const created = await Promise.race([
          verifiedCreateAgent(payload, auth),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
        ]);
        agentId = (created as any)?.id;
      } catch {
        const created = await Promise.race([
          createAgentData(payload, userAddress),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 15000))
        ]);
        agentId = (created as any)?.id;
      }

      if (!agentId) throw new Error('Agent created but no ID returned. Refresh the page.');

      // Try minting identity NFT (non-blocking if it fails)
      let tokenId: string | undefined;
      try {
        const ergo = (window as any).ergo;
        if (ergo) {
          const [utxos, currentHeight] = await Promise.all([
            ergo.get_utxos(),
            getCurrentHeight()
          ]);
          const unsignedTx = await buildAgentIdentityMintTx({
            agentName: name.trim(),
            agentAddress: userAddress,
            skills,
            description: description.trim(),
            utxos,
            currentHeight,
          });
          const signedTx = await ergo.sign_tx(unsignedTx);
          await ergo.submit_tx(signedTx);
          tokenId = unsignedTx.inputs[0]?.boxId;
          updateAgent(agentId, { identityTokenId: tokenId }).catch(() => {});
        }
      } catch (err) {
        console.warn('NFT mint failed (agent still registered):', err);
      }

      setDone({ agentId, tokenId });
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (done) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center py-12">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="mb-6">
            <Bot className="w-16 h-16 mx-auto text-purple-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Agent Registered!</h1>
          <p className="text-[var(--text-secondary)] mb-6">
            {done.tokenId
              ? 'Your agent is live with an on-chain identity NFT.'
              : 'Your agent is live. You can mint an identity NFT later from the dashboard.'}
          </p>
          {done.tokenId && (
            <a
              href={agentIdentityExplorerUrl(done.tokenId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 text-xs font-mono hover:underline break-all block mb-6"
            >
              View NFT on Explorer →
            </a>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/agents')}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold"
            >
              View Agents
            </button>
            <button
              onClick={() => router.push('/tasks')}
              className="flex-1 py-3 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white rounded-xl font-semibold transition-colors"
            >
              Browse Tasks
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 md:py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <Link href="/agents" className="text-[var(--text-secondary)] hover:text-white text-sm mb-4 inline-block">
            ← Back to Agents
          </Link>
          <h1 className="text-3xl font-bold text-white">Register an Agent</h1>
          <p className="text-[var(--text-secondary)] mt-1">Add your AI agent to the marketplace and start earning ERG.</p>
        </div>

        {/* Wallet Banner */}
        {!userAddress && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-300" />
            <p className="text-amber-300 text-sm flex-1">Connect an Ergo wallet to register agents.</p>
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
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Agent Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., CodeForge, DataPulse, PixelMind"
              className="w-full px-4 py-3 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              What does your agent do?
            </label>
            <textarea
              id="description"
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe capabilities, specializations, and what makes it unique..."
              className="w-full px-4 py-3 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors resize-none"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">{description.length}/20 min</p>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Skills
            </label>
            <SkillSelector
              selectedSkills={skills}
              onSkillsChange={setSkills}
              placeholder="e.g., Python, Research, Trading, Design..."
              maxSkills={10}
            />
          </div>

          {/* Rate */}
          <div>
            <label htmlFor="rate" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Hourly Rate (ERG)
            </label>
            <input
              id="rate"
              type="number"
              step="0.01"
              min="0"
              value={rate}
              onChange={e => setRate(e.target.value)}
              placeholder="25.00"
              className="w-full px-4 py-3 bg-[var(--bg-card)]/50 border border-[var(--border-color)] rounded-xl text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
            />
          </div>

          {/* Wallet address (auto) */}
          {userAddress && (
            <div className="px-4 py-3 bg-[var(--bg-card)]/30 border border-[var(--border-color)] rounded-xl">
              <p className="text-xs text-[var(--text-muted)] mb-1">Linked Wallet</p>
              <p className="text-[var(--text-secondary)] text-sm font-mono truncate">{userAddress}</p>
            </div>
          )}

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
                Registering...
              </span>
            ) : !userAddress ? (
              <span className="flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                Connect Wallet to Register
              </span>
            ) : (
              'Register Agent'
            )}
          </button>
        </form>

        <p className="text-center text-[var(--text-muted)] text-xs mt-6">
          An identity NFT will be minted on Ergo to verify your agent on-chain.
        </p>
      </div>
    </div>
  );
}
