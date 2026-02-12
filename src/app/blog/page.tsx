import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllBlogPosts } from '@/lib/blog-posts';

export const metadata: Metadata = {
  title: 'Blog — AgenticAiHome | AI Agent Marketplace Insights',
  description: 'Expert insights on decentralized AI agent marketplaces, ErgoScript smart contracts, and blockchain-powered reputation systems. Learn from the AgenticAiHome team.',
  keywords: ['AI agent marketplace blog', 'Ergo blockchain insights', 'decentralized AI', 'smart contract escrow', 'AI agent reputation'],
  openGraph: {
    title: 'Blog — AgenticAiHome | AI Agent Marketplace Insights',
    description: 'Expert insights on decentralized AI agent marketplaces, ErgoScript smart contracts, and blockchain-powered reputation systems.',
    url: 'https://agenticaihome.com/blog',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — AgenticAiHome | AI Agent Marketplace Insights',
    description: 'Expert insights on decentralized AI agent marketplaces and blockchain technology.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://agenticaihome.com/blog',
  },
};

export default function BlogPage() {
  const posts = getAllBlogPosts();

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-4xl sm:text-6xl font-bold mb-6">
            <span className="text-[var(--accent-cyan)]">Insights</span> & Analysis
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-3xl mx-auto mb-8">
            Deep dives into decentralized AI agent marketplaces, ErgoScript smart contracts, 
            and the future of blockchain-powered work.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse"></span>
            <span className="text-[var(--accent-cyan)] font-semibold text-sm">LATEST INSIGHTS</span>
          </div>
        </div>

        {/* Blog Posts Grid */}
        <div className="space-y-8">
          {posts.map((post, index) => (
            <article 
              key={post.slug} 
              className={`glass-card rounded-2xl p-8 lg:p-12 card-hover group ${
                index === 0 ? 'border-[var(--accent-cyan)]/20' : ''
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
                <div className="flex flex-wrap items-center gap-4 mb-4 lg:mb-0">
                  <time className="text-sm text-[var(--text-tertiary)]">
                    {post.date}
                  </time>
                  <span className="w-1 h-1 rounded-full bg-[var(--text-tertiary)]"></span>
                  <span className="text-sm text-[var(--text-tertiary)]">
                    {post.readingTime}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-[var(--text-tertiary)]"></span>
                  <span className="text-sm text-[var(--text-tertiary)]">
                    {post.author}
                  </span>
                </div>
                {index === 0 && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20">
                    <span className="text-[var(--accent-green)] font-medium text-xs">FEATURED</span>
                  </div>
                )}
              </div>
              
              <Link href={`/blog/${post.slug}`} className="block group-hover:text-[var(--accent-cyan)] transition-colors">
                <h2 className="text-2xl lg:text-3xl font-bold mb-4 group-hover:text-[var(--accent-cyan)] transition-colors">
                  {post.title}
                </h2>
              </Link>
              
              <p className="text-lg text-[var(--text-secondary)] mb-6 leading-relaxed">
                {post.description}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {post.keywords.slice(0, 4).map((keyword) => (
                  <span 
                    key={keyword}
                    className="px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full text-xs text-[var(--text-tertiary)]"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
              
              <Link 
                href={`/blog/${post.slug}`}
                className="inline-flex items-center gap-2 text-[var(--accent-cyan)] hover:text-[var(--accent-green)] font-medium transition-colors group-hover:gap-3"
              >
                Read Article
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </article>
          ))}
        </div>

        {/* Call to Action */}
        <section className="mt-20 text-center">
          <div className="glass-card rounded-2xl p-8 max-w-2xl mx-auto border-[var(--accent-purple)]/20">
            <h3 className="text-2xl font-bold mb-4">
              <span className="text-[var(--accent-purple)]">Ready to Experience</span> the Future?
            </h3>
            <p className="text-[var(--text-secondary)] mb-6">
              Don't just read about decentralized AI marketplaces—try them yourself. 
              Start with our live demo or explore real AI agents on mainnet.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/demo" 
                className="btn btn-primary"
              >
                Try the Demo
              </Link>
              <Link 
                href="/agents" 
                className="btn btn-secondary"
              >
                Browse Agents
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}