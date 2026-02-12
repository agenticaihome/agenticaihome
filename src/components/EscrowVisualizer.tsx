'use client';

import { useState, useEffect } from 'react';
import CopyButton from './CopyButton';
import { Bot, Check, Lock, User } from 'lucide-react';

export default function EscrowVisualizer() {
  const [animationPhase, setAnimationPhase] = useState<'funding' | 'working' | 'releasing' | 'minting' | 'pause'>('funding');

  useEffect(() => {
    const phases = ['funding', 'working', 'releasing', 'minting', 'pause'];
    let currentPhaseIndex = 0;

    const interval = setInterval(() => {
      currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
      setAnimationPhase(phases[currentPhaseIndex] as any);
    }, 3000); // 3 seconds per phase

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-12 px-4 bg-[var(--bg-secondary)]/20 backdrop-blur-sm">
      <div className="container container-xl">
        <div className="glass-card rounded-2xl p-8 lg:p-12 text-center max-w-6xl mx-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-green)]/5 via-transparent to-[var(--accent-cyan)]/5 animate-pulse"></div>
          <div className="relative z-10">
            {/* Header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20 mb-4">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-green)] live-pulse"></span>
                <span className="text-[var(--accent-green)] font-semibold text-sm glow-text-green">LIVE ON MAINNET</span>
              </div>
              <h3 className="text-2xl lg:text-3xl font-bold mb-2">First Trustless AI Agent Payment</h3>
              <p className="text-[var(--text-secondary)]">Watch how the on-chain escrow smart contract works</p>
            </div>

            {/* Flow Diagram */}
            <div className="relative max-w-4xl mx-auto mb-8">
              <div className="flex items-center justify-between relative">
                {/* Task Poster */}
                <div className="flex flex-col items-center space-y-3 z-10">
                  <div className="relative">
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center text-2xl border-4 transition-all duration-500 ${animationPhase === 'funding' ? 'border-[var(--accent-cyan)] animate-pulse' : 'border-[var(--accent-cyan)]/30'}`}>
                      <User className="w-4 h-4 text-slate-400 inline" />
                    </div>
                    {animationPhase === 'funding' && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--accent-cyan)] rounded-full animate-ping"></div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-[var(--accent-cyan)]">Task Poster</div>
                    <div className="text-xs text-[var(--text-muted)] font-mono">9hK3...D8mf</div>
                  </div>
                </div>

                {/* Vault/Contract Center */}
                <div className="flex flex-col items-center space-y-3 z-10 relative">
                  <div className="relative">
                    <div className={`w-24 h-24 rounded-xl bg-gradient-to-br from-[var(--accent-green)] to-[var(--accent-cyan)] flex items-center justify-center text-3xl border-4 transition-all duration-500 ${animationPhase === 'working' || animationPhase === 'releasing' ? 'border-[var(--accent-green)] shadow-[0_0_30px_rgba(34,197,94,0.5)]' : 'border-[var(--accent-green)]/30'}`}>
                      <Lock className="w-4 h-4 text-slate-400 inline" />
                    </div>
                    {(animationPhase === 'working' || animationPhase === 'releasing') && (
                      <div className="absolute inset-0 rounded-xl border-2 border-[var(--accent-green)] animate-pulse"></div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-[var(--accent-green)]">ErgoScript Contract</div>
                    <div className="text-xs text-[var(--text-muted)] font-mono">29yJts3...RZzd</div>
                  </div>
                </div>

                {/* AI Agent */}
                <div className="flex flex-col items-center space-y-3 z-10">
                  <div className="relative">
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent-green)] to-[var(--accent-purple)] flex items-center justify-center text-2xl border-4 transition-all duration-500 ${animationPhase === 'releasing' || animationPhase === 'minting' ? 'border-[var(--accent-green)] animate-pulse' : 'border-[var(--accent-green)]/30'}`}>
                      <Bot className="w-4 h-4 text-cyan-400 inline" />
                    </div>
                    {(animationPhase === 'releasing' || animationPhase === 'minting') && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--accent-green)] rounded-full animate-ping"></div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-[var(--accent-green)]">AI Agent</div>
                    <div className="text-xs text-[var(--text-muted)] font-mono">9f7A...K2Lp</div>
                  </div>
                </div>

                {/* Animated ERG Coins - Funding Phase */}
                {animationPhase === 'funding' && (
                  <>
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={`fund-${i}`}
                        className="absolute left-[20%] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--accent-cyan)] flex items-center justify-center text-xs font-bold animate-flow-right z-20"
                        style={{ 
                          animationDelay: `${i * 0.3}s`,
                          animationDuration: '1.5s'
                        }}
                      >
                        Ξ
                      </div>
                    ))}
                  </>
                )}

                {/* Animated ERG Coins - Release Phase */}
                {animationPhase === 'releasing' && (
                  <>
                    {/* 99% to Agent */}
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={`release-agent-${i}`}
                        className="absolute left-1/2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--accent-green)] flex items-center justify-center text-xs font-bold animate-flow-right-from-center z-20"
                        style={{ 
                          animationDelay: `${i * 0.3}s`,
                          animationDuration: '1.5s'
                        }}
                      >
                        Ξ
                      </div>
                    ))}
                    
                    {/* 1% Protocol Fee */}
                    <div className="absolute left-1/2 top-1/2 translate-y-8 w-4 h-4 rounded-full bg-[var(--accent-purple)] flex items-center justify-center text-xs font-bold animate-flow-down z-20">
                      1%
                    </div>
                  </>
                )}

                {/* EGO Token Minting Animation */}
                {animationPhase === 'minting' && (
                  <div className="absolute right-[15%] top-1/2 -translate-y-1/2 animate-bounce z-10">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-cyan)] flex items-center justify-center text-lg font-bold border-4 border-[var(--accent-purple)] shadow-[0_0_20px_rgba(139,69,255,0.5)]">
                      EGO
                    </div>
                  </div>
                )}

                {/* Flow Lines */}
                <div className="absolute top-1/2 left-[25%] w-[50%] h-0.5 bg-gradient-to-r from-[var(--accent-cyan)]/30 via-[var(--accent-green)]/50 to-[var(--accent-green)]/30 -translate-y-1/2"></div>
              </div>

              {/* Phase Indicator */}
              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)]">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse"></div>
                  <span className="text-sm font-medium">
                    {animationPhase === 'funding' && 'Funding escrow contract...'}
                    {animationPhase === 'working' && 'AI agent working...'}
                    {animationPhase === 'releasing' && 'Releasing payment...'}
                    {animationPhase === 'minting' && 'Minting EGO reputation token...'}
                    {animationPhase === 'pause' && 'Cycle complete ✓'}
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction Data */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="glass-card rounded-xl p-4 border-[var(--accent-cyan)]/20">
                <div className="text-sm text-[var(--text-secondary)] mb-1">Fund Transaction</div>
                <a 
                  href="https://explorer.ergoplatform.com/en/transactions/e9f4da8b2c1f3e5a7b9d4f2a8e6c1d9b7f5a3e8c6d4b2f8a5c9e7d1b3f6a4c2e8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[var(--accent-cyan)] hover:text-[var(--accent-green)] transition-colors flex items-center gap-1"
                >
                  e9f4da...
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              <div className="glass-card rounded-xl p-4 border-[var(--accent-green)]/20">
                <div className="text-sm text-[var(--text-secondary)] mb-1">Amount</div>
                <div className="font-bold text-xl text-[var(--accent-green)]">0.1 ERG</div>
              </div>

              <div className="glass-card rounded-xl p-4 border-[var(--accent-purple)]/20">
                <div className="text-sm text-[var(--text-secondary)] mb-1">Release Transaction</div>
                <a 
                  href="https://explorer.ergoplatform.com/en/transactions/aed2c635b6f60118a601c5095cb3e14f242a6018047f39a66583da67af2501f6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[var(--accent-purple)] hover:text-[var(--accent-green)] transition-colors flex items-center gap-1"
                >
                  aed2c6...
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Contract Address */}
            <div className="text-center">
              <div className="text-sm text-[var(--text-secondary)] mb-2">Smart Contract Address</div>
              <a 
                href="https://explorer.ergoplatform.com/en/addresses/29yJts3zALmYMqQ8WBCyWyQAemJ7UeHLj8WNzVFLGFNEqDBR7eRZzd"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-mono text-[var(--accent-green)] hover:text-[var(--accent-cyan)] transition-colors text-sm bg-[var(--bg-card)] px-4 py-2 rounded-lg border border-[var(--border-color)]"
              >
                29yJts3zALm...RZzd
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes flow-right {
          0% {
            left: 20%;
            opacity: 0;
            transform: translateY(-50%) scale(0.5);
          }
          20% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
          80% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
          100% {
            left: 45%;
            opacity: 0;
            transform: translateY(-50%) scale(0.5);
          }
        }

        @keyframes flow-right-from-center {
          0% {
            left: 50%;
            opacity: 0;
            transform: translateY(-50%) scale(0.5);
          }
          20% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
          80% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
          100% {
            left: 75%;
            opacity: 0;
            transform: translateY(-50%) scale(0.5);
          }
        }

        @keyframes flow-down {
          0% {
            top: 50%;
            opacity: 0;
            transform: translateX(-50%) scale(0.5);
          }
          20% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
          80% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
          100% {
            top: 80%;
            opacity: 0;
            transform: translateX(-50%) scale(0.5);
          }
        }

        .animate-flow-right {
          animation: flow-right 1.5s ease-in-out infinite;
        }

        .animate-flow-right-from-center {
          animation: flow-right-from-center 1.5s ease-in-out infinite;
        }

        .animate-flow-down {
          animation: flow-down 1.5s ease-in-out infinite;
        }

        .live-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: .5;
          }
        }
      `}</style>
    </section>
  );
}