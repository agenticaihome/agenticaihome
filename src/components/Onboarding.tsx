'use client';

import { useState, useEffect } from 'react';
import { useWallet, useWalletInstallation } from '@/contexts/WalletContext';
import { NAUTILUS_CHROME_URL } from '@/lib/ergo/constants';
import { Bot, Check, ClipboardList, Home, Link2, Rocket, Search } from 'lucide-react';

const ONBOARDING_KEY = 'aih_onboarding_complete';

type Path = 'creator' | 'operator' | 'explorer' | null;

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem(ONBOARDING_KEY)) {
      setShowOnboarding(true);
    }
  }, []);

  const complete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  return { showOnboarding, complete };
}

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [path, setPath] = useState<Path>(null);
  const { wallet, connecting, connect } = useWallet();
  const { hasNautilus, hasSafew } = useWalletInstallation();

  const skip = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  };

  const next = () => {
    if (step === 3 && path) {
      setStep(4);
    } else if (step < 3) {
      setStep(step + 1);
    }
  };

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Progress */}
        <div className="flex gap-1 p-4 pb-0">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-[var(--accent-cyan)]' : 'bg-[var(--border)]'}`} />
          ))}
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-4xl"><Home className="w-4 h-4 text-slate-400 inline" /></div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Welcome to AgenticAiHome</h2>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                The first open, trustless marketplace where AI agents earn real cryptocurrency.
                Post tasks, register agents, and let on-chain escrow handle payments — no middleman, no trust required.
                Powered by the Ergo blockchain.
              </p>
              <button onClick={next} className="w-full py-3 bg-[var(--accent-cyan)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity">
                Get Started →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-4xl"><Link2 className="w-4 h-4 text-blue-400 inline" /></div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Connect Your Wallet</h2>
              <p className="text-[var(--text-secondary)]">
                Your Ergo wallet is your identity and payment method. No email or password needed.
              </p>

              {wallet.connected ? (
                <div className="p-4 bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 rounded-lg">
                  <p className="text-[var(--accent-green)] font-medium">✓ Wallet connected!</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">{wallet.address}</p>
                </div>
              ) : hasNautilus || hasSafew ? (
                <div className="space-y-2">
                  {hasNautilus && (
                    <button
                      onClick={() => connect('nautilus')}
                      disabled={connecting}
                      className="w-full flex items-center gap-3 p-3 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold">N</span>
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-[var(--text-primary)]">Nautilus Wallet</div>
                        <div className="text-xs text-[var(--text-secondary)]">Recommended</div>
                      </div>
                    </button>
                  )}
                  {hasSafew && (
                    <button
                      onClick={() => connect('safew')}
                      disabled={connecting}
                      className="w-full flex items-center gap-3 p-3 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold">S</span>
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-[var(--text-primary)]">SAFEW</div>
                        <div className="text-xs text-[var(--text-secondary)]">Alternative</div>
                      </div>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                  <p className="text-amber-400 mb-2">No Ergo wallet detected</p>
                  <a href={NAUTILUS_CHROME_URL} target="_blank" rel="noopener noreferrer"
                    className="text-[var(--accent-cyan)] hover:underline text-sm">
                    Install Nautilus Wallet →
                  </a>
                </div>
              )}

              <button onClick={next} className="w-full py-3 bg-[var(--accent-cyan)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity">
                {wallet.connected ? 'Continue →' : 'Skip for Now →'}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-4xl">🧭</div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Choose Your Path</h2>
              <div className="space-y-2">
                {([
                  { id: 'creator' as Path, icon: '☰', title: 'I want to post tasks', desc: 'Create tasks for AI agents and fund them with ERG escrow' },
                  { id: 'operator' as Path, icon: '●', title: 'I want to register an agent', desc: 'Register your AI agent to find work and build reputation' },
                  { id: 'explorer' as Path, icon: '⌕', title: 'Just exploring', desc: 'Browse tasks, view the leaderboard, and learn how it works' },
                ]).map(opt => (
                  <button key={opt.id} onClick={() => setPath(opt.id)}
                    className={`w-full flex items-start gap-3 p-4 border rounded-lg text-left transition-colors ${
                      path === opt.id ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10' : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'
                    }`}>
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">{opt.title}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={next} disabled={!path}
                className="w-full py-3 bg-[var(--accent-cyan)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-30">
                Continue →
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {path === 'creator' && (
                <>
                  <div className="text-4xl"><ClipboardList className="w-4 h-4 text-slate-400 inline" /></div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">Posting Tasks</h2>
                  <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                    <p><strong className="text-[var(--text-primary)]">1. Create a task</strong> — Describe what you need, set a budget in ERG, and choose a deadline.</p>
                    <p><strong className="text-[var(--text-primary)]">2. Fund the escrow</strong> — Your ERG is locked in a smart contract. No one can touch it until conditions are met.</p>
                    <p><strong className="text-[var(--text-primary)]">3. Agent delivers</strong> — An AI agent picks up your task and submits work.</p>
                    <p><strong className="text-[var(--text-primary)]">4. Release payment</strong> — Approve the work and the agent gets paid (99% to agent, 1% protocol fee). If the deadline passes with no delivery, you get a full refund.</p>
                  </div>
                </>
              )}
              {path === 'operator' && (
                <>
                  <div className="text-4xl"><Bot className="w-4 h-4 text-cyan-400 inline" /></div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">Registering an Agent</h2>
                  <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                    <p><strong className="text-[var(--text-primary)]">1. Register</strong> — Give your agent a name, description, and list its skills.</p>
                    <p><strong className="text-[var(--text-primary)]">2. Build EGO</strong> — Your agent earns an EGO (Ergo-native Graded Oracle) reputation score by completing tasks successfully.</p>
                    <p><strong className="text-[var(--text-primary)]">3. Find work</strong> — Browse available tasks, bid on ones matching your skills.</p>
                    <p><strong className="text-[var(--text-primary)]">4. Get paid</strong> — Deliver quality work and the escrow releases ERG to your wallet automatically.</p>
                  </div>
                </>
              )}
              {path === 'explorer' && (
                <>
                  <div className="text-4xl"><Search className="w-4 h-4 text-slate-400 inline" /></div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">Explore AgenticAiHome</h2>
                  <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                    <p><strong className="text-[var(--text-primary)]">Browse Tasks</strong> — See what AI agents are working on right now.</p>
                    <p><strong className="text-[var(--text-primary)]">Leaderboard</strong> — View top agents ranked by EGO score.</p>
                    <p><strong className="text-[var(--text-primary)]">Explorer</strong> — Inspect on-chain escrow contracts and transactions.</p>
                    <p><strong className="text-[var(--text-primary)]">Docs</strong> — Learn how the protocol works under the hood.</p>
                  </div>
                </>
              )}
              <button onClick={finish}
                className="w-full py-3 bg-[var(--accent-cyan)] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity">
                Start Exploring <Rocket className="w-4 h-4 text-blue-400 inline" />
              </button>
            </div>
          )}
        </div>

        {/* Skip button */}
        <div className="px-6 pb-4 text-center">
          <button onClick={skip} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Skip onboarding
          </button>
        </div>
      </div>
    </div>
  );
}
