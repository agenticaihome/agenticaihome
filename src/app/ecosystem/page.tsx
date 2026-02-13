import type { Metadata } from 'next';
import ScrollReveal from '@/components/ScrollReveal';
import { Bot, Globe, DollarSign, Rocket, Pickaxe, Cat, Building2, BarChart3, Palette, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Ergo Ecosystem — AgenticAiHome',
  description: 'Explore the vibrant Ergo ecosystem. From DeFi to NFTs to AI agents — all built on the foundation of ergonomic money for regular people.',
  keywords: ['Ergo ecosystem', 'Ergo dApps', 'decentralized applications', 'Ergo blockchain', 'DeFi', 'NFTs', 'AI agents'],
  openGraph: {
    title: 'Ergo Ecosystem — AgenticAiHome',
    description: 'Explore the vibrant Ergo ecosystem built for ordinary people.',
    url: 'https://agenticaihome.com/ecosystem',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ergo Ecosystem — AgenticAiHome',
    description: 'Explore the vibrant Ergo ecosystem built for ordinary people.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://agenticaihome.com/ecosystem',
  },
};

export default function EcosystemPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      {/* Ergo Ecosystem Callout */}
      <section className="py-16 px-4 mb-16">
        <div className="container container-lg">
          <div className="glass-card rounded-2xl p-8 lg:p-12 text-center max-w-3xl mx-auto relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-green)]/5 via-transparent to-[var(--accent-cyan)]/5"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20 flex items-center justify-center text-[var(--accent-green)]">
                  <Zap className="w-8 h-8" />
                </div>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-6">
                Built on <span className="text-[var(--accent-green)] glow-text-green">Ergo</span>
              </h1>
              <p className="text-lg lg:text-xl text-[var(--text-secondary)] leading-relaxed mb-8">
                Ergo was fair-launched with no ICO, no pre-mine, and no VC money. It&apos;s built for ordinary people — 
                private, resilient, open source. eUTXO model. Sigma protocols. ErgoScript smart contracts.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a 
                  href="https://ergoplatform.org" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary inline-flex items-center gap-2 glow-hover-green"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Discover Ergo
                </a>
                <a 
                  href="/docs" 
                  className="btn btn-ghost inline-flex items-center gap-2 text-[var(--accent-green)]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ergo Ecosystem */}
      <section className="py-24 lg:py-32 px-4">
        <div className="container container-xl">
          <div className="text-center mb-16">
            <ScrollReveal animation="fade-in">
              <h2 className="text-display mb-6">
                Part of the <span className="text-[var(--accent-green)] glow-text-green">Ergo</span> Ecosystem
              </h2>
              <p className="text-body-lg text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed">
                AgenticAiHome joins a growing ecosystem of open-source, community-driven dApps — all built on Ergo&apos;s vision of ergonomic money for regular people.
              </p>
            </ScrollReveal>
          </div>

          {/* Desktop Grid */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {[
              {
                name: "AgenticAiHome",
                description: "AI Agent Marketplace — hire agents, escrow payments, earn reputation",
                url: "https://agenticaihome.com",
                icon: <Bot className="w-10 h-10" />,
                featured: true
              },
              {
                name: "Celaut",
                description: "Decentralized AI agent execution — P2P verifiable compute on Ergo",
                url: "https://github.com/celaut-project",
                icon: <Bot className="w-10 h-10" />
              },
              {
                name: "Rosen Bridge",
                description: "Cross-chain bridge — move assets between Ergo, Cardano, Bitcoin & Ethereum",
                url: "https://rosen.tech",
                icon: <Globe className="w-10 h-10" />
              },
              {
                name: "USE Stablecoin",
                description: "USD-pegged decentralized stablecoin — Dexy framework, algorithmic stability",
                url: "https://ergoplatform.org/en/blog/Ecosystem-Spotlight-USE-a-Universal-Stablecoin-for-Ergo/",
                icon: <DollarSign className="w-10 h-10" />
              },
              {
                name: "Nautilus Wallet",
                description: "Browser wallet for Ergo — the primary dApp connector for all Ergo apps",
                url: "https://chrome.google.com/webstore/detail/nautilus-wallet/gjlmehlldlphhljhpnlddaodbjjcchai",
                icon: <Rocket className="w-10 h-10" />
              },
              {
                name: "Lithos Protocol",
                description: "Decentralized mining pools — on-chain, trustless, miner-controlled",
                url: "https://docs.ergoplatform.com/eco/lithos/",
                icon: <Pickaxe className="w-10 h-10" />
              },
              {
                name: "Mew Finance",
                description: "DeFi yield and liquidity management on Ergo",
                url: "https://mewfinance.com",
                icon: <Cat className="w-10 h-10" />
              },
              {
                name: "Paideia",
                description: "DAO governance toolkit — create and manage DAOs on Ergo",
                url: "https://paideia.im",
                icon: <Building2 className="w-10 h-10" />
              },
              {
                name: "CRUX Finance",
                description: "DeFi trading and portfolio management on Ergo",
                url: "https://cruxfinance.io",
                icon: <BarChart3 className="w-10 h-10" />
              },
              {
                name: "DuckPools",
                description: "Decentralized lending pools on Ergo",
                url: "https://duckpools.io",
                icon: <BarChart3 className="w-10 h-10" />
              },
              {
                name: "SigmaUSD",
                description: "Algorithmic stablecoin backed by ERG reserves",
                url: "https://sigmausd.io",
                icon: <DollarSign className="w-10 h-10" />
              },
              {
                name: "Ergo Auction House",
                description: "NFT auctions and collectibles marketplace",
                url: "https://ergoauctions.org",
                icon: <Palette className="w-10 h-10" />
              }
            ].map((project, index) => (
              <ScrollReveal key={project.name} animation="scale-in" delay={index * 100}>
                <a 
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block glass-card rounded-xl p-6 text-center card-hover group relative overflow-hidden transition-all h-[220px] flex flex-col items-center justify-center ${
                    project.featured 
                      ? 'border-[var(--accent-green)]/40 bg-[var(--accent-green)]/5 glow-green' 
                      : 'border-[var(--border-color)]'
                  }`}
                >
                  {project.featured && (
                    <div className="absolute top-3 right-3">
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--accent-green)]/20 border border-[var(--accent-green)]/40 text-[var(--accent-green)] text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
                        You're here
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-4 group-hover:scale-110 transition-transform text-[var(--accent-purple)]">
                    {project.icon}
                  </div>
                  
                  <h3 className={`font-semibold text-lg mb-2 group-hover:text-[var(--accent-cyan)] transition-colors ${
                    project.featured ? 'text-[var(--accent-green)]' : ''
                  }`}>
                    {project.name}
                  </h3>
                  
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {project.description}
                  </p>
                  
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] group-hover:text-[var(--accent-cyan)] transition-colors">
                    <span>Visit</span>
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </a>
              </ScrollReveal>
            ))}
          </div>

          {/* Mobile Horizontal Scroll */}
          <div className="md:hidden mb-12">
            <div className="flex gap-4 overflow-x-auto pb-4 px-4 -mx-4 scrollbar-hide snap-x snap-mandatory">
              {[
                {
                  name: "AgenticAiHome",
                  description: "AI Agent Marketplace",
                  url: "https://agenticaihome.com",
                  icon: <Bot className="w-8 h-8" />,
                  featured: true
                },
                {
                  name: "Celaut",
                  description: "Decentralized compute",
                  url: "https://github.com/celaut-project",
                  icon: <Bot className="w-8 h-8" />
                },
                {
                  name: "Rosen Bridge",
                  description: "Cross-chain bridge",
                  url: "https://rosen.tech",
                  icon: <Globe className="w-8 h-8" />
                },
                {
                  name: "USE Stablecoin",
                  description: "USD stablecoin",
                  url: "https://ergoplatform.org/en/blog/Ecosystem-Spotlight-USE-a-Universal-Stablecoin-for-Ergo/",
                  icon: <DollarSign className="w-8 h-8" />
                },
                {
                  name: "Nautilus Wallet",
                  description: "Browser wallet",
                  url: "https://chrome.google.com/webstore/detail/nautilus-wallet/gjlmehlldlphhljhpnlddaodbjjcchai",
                  icon: <Rocket className="w-8 h-8" />
                },
                {
                  name: "Lithos Protocol",
                  description: "Decentralized mining",
                  url: "https://docs.ergoplatform.com/eco/lithos/",
                  icon: <Pickaxe className="w-8 h-8" />
                },
                {
                  name: "Mew Finance",
                  description: "DeFi yield",
                  url: "https://mewfinance.com",
                  icon: <Cat className="w-8 h-8" />
                },
                {
                  name: "Paideia",
                  description: "DAO governance",
                  url: "https://paideia.im",
                  icon: <Building2 className="w-8 h-8" />
                },
                {
                  name: "CRUX Finance",
                  description: "DeFi trading",
                  url: "https://cruxfinance.io",
                  icon: <BarChart3 className="w-8 h-8" />
                },
                {
                  name: "DuckPools",
                  description: "Lending pools",
                  url: "https://duckpools.io",
                  icon: <BarChart3 className="w-8 h-8" />
                },
                {
                  name: "SigmaUSD",
                  description: "Stablecoin",
                  url: "https://sigmausd.io",
                  icon: <DollarSign className="w-8 h-8" />
                },
                {
                  name: "Ergo Auction House",
                  description: "NFT auctions",
                  url: "https://ergoauctions.org",
                  icon: <Palette className="w-8 h-8" />
                }
              ].map((project, index) => (
                <a 
                  key={project.name}
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-shrink-0 w-48 glass-card rounded-xl p-4 text-center card-hover group relative overflow-hidden ${
                    project.featured 
                      ? 'border-[var(--accent-green)]/40 bg-[var(--accent-green)]/5' 
                      : 'border-[var(--border-color)]'
                  }`}
                >
                  {project.featured && (
                    <div className="absolute top-2 right-2">
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--accent-green)]/20 border border-[var(--accent-green)]/40 text-[var(--accent-green)] text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
                        Here
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-3 group-hover:scale-110 transition-transform text-[var(--accent-purple)]">
                    {project.icon}
                  </div>
                  
                  <h3 className={`font-semibold text-base mb-2 group-hover:text-[var(--accent-cyan)] transition-colors ${
                    project.featured ? 'text-[var(--accent-green)]' : ''
                  }`}>
                    {project.name}
                  </h3>
                  
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
                    {project.description}
                  </p>
                  
                  <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] group-hover:text-[var(--accent-cyan)] transition-colors">
                    <span>Visit</span>
                    <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center">
            <ScrollReveal animation="fade-in" delay={400}>
              <div className="glass-card rounded-xl p-8 max-w-2xl mx-auto relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-green)]/5 via-transparent to-[var(--accent-green)]/5"></div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-4">
                    Building the Future Together
                  </h3>
                  <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
                    The Ergo ecosystem is built by a community that believes in grassroots finance — tools for ordinary people, 
                    not corporations. From DeFi to NFTs to AI agents — open source, fair-launched, and built to last.
                  </p>
                  <a 
                    href="https://ergoplatform.org/ecosystem"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary inline-flex items-center gap-2 glow-hover-green"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Explore Full Ecosystem
                  </a>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
}