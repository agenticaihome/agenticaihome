import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import React from 'react';
import { getBlogPost, getAllBlogPosts } from '@/lib/blog-posts';

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const posts = getAllBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  
  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: `${post.title} — AgenticAiHome Blog`,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://agenticaihome.com/blog/${post.slug}`,
      type: 'article',
      publishedTime: new Date(post.date).toISOString(),
      authors: [post.author],
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: ['/og-image.png'],
    },
    alternates: {
      canonical: `https://agenticaihome.com/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  
  if (!post) {
    notFound();
  }

  // Convert markdown-style content to JSX
  const formatContent = (content: string) => {
    const lines = content.trim().split('\n');
    const elements: React.JSX.Element[] = [];
    let currentList: string[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = () => {
      if (currentList.length > 0) {
        const ListTag = listType || 'ul';
        elements.push(
          <ListTag key={elements.length} className="mb-6 space-y-2 text-[var(--text-secondary)] leading-relaxed">
            {currentList.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-[var(--accent-cyan)] mt-2 w-1 h-1 rounded-full bg-[var(--accent-cyan)] flex-shrink-0"></span>
                <span>{item}</span>
              </li>
            ))}
          </ListTag>
        );
        currentList = [];
        listType = null;
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (!trimmed) {
        flushList();
        return;
      }

      // Headers
      if (trimmed.startsWith('## ')) {
        flushList();
        const text = trimmed.replace('## ', '');
        elements.push(
          <h2 key={index} className="text-2xl lg:text-3xl font-bold mb-6 mt-12 first:mt-0">
            {text}
          </h2>
        );
        return;
      }

      if (trimmed.startsWith('### ')) {
        flushList();
        const text = trimmed.replace('### ', '');
        elements.push(
          <h3 key={index} className="text-xl lg:text-2xl font-bold mb-4 mt-8 text-[var(--accent-cyan)]">
            {text}
          </h3>
        );
        return;
      }

      // Lists
      if (trimmed.startsWith('- **') || trimmed.startsWith('- ')) {
        const text = trimmed.replace(/^- (\*\*.*?\*\*)?/, '').trim();
        currentList.push(text);
        listType = 'ul';
        return;
      }

      if (/^\d+\./.test(trimmed)) {
        const text = trimmed.replace(/^\d+\.\s*/, '');
        currentList.push(text);
        listType = 'ol';
        return;
      }

      // Images
      const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (imgMatch) {
        flushList();
        elements.push(
          <div key={index} className="my-8 rounded-xl overflow-hidden border border-[var(--border-color)]">
            <img src={imgMatch[2]} alt={imgMatch[1]} className="w-full h-auto" loading="lazy" />
            {imgMatch[1] && (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-3 px-4 bg-[var(--bg-secondary)]">{imgMatch[1]}</p>
            )}
          </div>
        );
        return;
      }

      // Code blocks
      if (trimmed.startsWith('```')) {
        flushList();
        return; // Skip for now
      }

      // Regular paragraphs
      if (!trimmed.startsWith('#') && !trimmed.startsWith('**') && trimmed !== '---') {
        flushList();
        
        // Handle bold text and links
        const formatted = trimmed
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[var(--accent-cyan)] hover:text-[var(--accent-green)] transition-colors" target="_blank" rel="noopener noreferrer">$1</a>');

        elements.push(
          <p 
            key={index} 
            className="mb-6 text-lg text-[var(--text-secondary)] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
        );
        return;
      }

      // Blockquotes
      if (trimmed.startsWith('*') && trimmed.endsWith('*') && trimmed.includes('Ready to experience')) {
        flushList();
        const text = trimmed.slice(1, -1);
        elements.push(
          <div key={index} className="my-8 p-6 bg-[var(--accent-cyan)]/10 border-l-4 border-[var(--accent-cyan)] rounded-r-lg">
            <p 
              className="text-[var(--accent-cyan)] italic"
              dangerouslySetInnerHTML={{ __html: text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="underline hover:no-underline">$1</a>') }}
            />
          </div>
        );
        return;
      }
    });

    flushList(); // Flush any remaining list
    return elements;
  };

  const allPosts = getAllBlogPosts();
  const currentIndex = allPosts.findIndex(p => p.slug === post.slug);
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Breadcrumb */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
            <Link href="/blog" className="hover:text-[var(--accent-cyan)] transition-colors">
              Blog
            </Link>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[var(--text-secondary)]">{post.title}</span>
          </div>
        </nav>

        {/* Article Header */}
        <header className="mb-12">
          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-[var(--text-tertiary)]">
            <time>{post.date}</time>
            <span className="w-1 h-1 rounded-full bg-[var(--text-tertiary)]"></span>
            <span>{post.readingTime}</span>
            <span className="w-1 h-1 rounded-full bg-[var(--text-tertiary)]"></span>
            <span>{post.author}</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            {post.title}
          </h1>
          
          <p className="text-xl text-[var(--text-secondary)] leading-relaxed mb-8">
            {post.description}
          </p>

          <div className="flex flex-wrap gap-2">
            {post.keywords.map((keyword) => (
              <span 
                key={keyword}
                className="px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full text-xs text-[var(--text-tertiary)]"
              >
                {keyword}
              </span>
            ))}
          </div>
        </header>

        {/* Article Content */}
        <article className="prose prose-lg max-w-none">
          <div className="glass-card rounded-2xl p-8 lg:p-12">
            {formatContent(post.content)}
          </div>
        </article>

        {/* Navigation */}
        <nav className="mt-16 pt-8 border-t border-[var(--border-color)]">
          <div className="flex flex-col lg:flex-row justify-between gap-8">
            {prevPost && (
              <Link 
                href={`/blog/${prevPost.slug}`}
                className="group glass-card rounded-xl p-6 flex items-center gap-4 card-hover flex-1"
              >
                <svg className="w-6 h-6 text-[var(--accent-cyan)] group-hover:text-[var(--accent-green)] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <div>
                  <div className="text-sm text-[var(--text-tertiary)] mb-1">Previous Article</div>
                  <div className="font-semibold group-hover:text-[var(--accent-cyan)] transition-colors">
                    {prevPost.title}
                  </div>
                </div>
              </Link>
            )}
            
            {nextPost && (
              <Link 
                href={`/blog/${nextPost.slug}`}
                className="group glass-card rounded-xl p-6 flex items-center gap-4 card-hover flex-1 lg:text-right"
              >
                <div className="flex-1">
                  <div className="text-sm text-[var(--text-tertiary)] mb-1">Next Article</div>
                  <div className="font-semibold group-hover:text-[var(--accent-cyan)] transition-colors">
                    {nextPost.title}
                  </div>
                </div>
                <svg className="w-6 h-6 text-[var(--accent-cyan)] group-hover:text-[var(--accent-green)] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        </nav>

        {/* Call to Action */}
        <section className="mt-16">
          <div className="glass-card rounded-2xl p-8 text-center border-[var(--accent-purple)]/20">
            <h3 className="text-2xl font-bold mb-4">
              <span className="text-[var(--accent-purple)]">Ready to Build</span> on Ergo?
            </h3>
            <p className="text-[var(--text-secondary)] mb-6 max-w-2xl mx-auto">
              Join the decentralized AI agent marketplace. Whether you're a developer, agent operator, or someone who needs AI services, there's a place for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/getting-started" 
                className="btn btn-primary"
              >
                Get Started
              </Link>
              <Link 
                href="/agents" 
                className="btn btn-secondary"
              >
                Explore Agents
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}