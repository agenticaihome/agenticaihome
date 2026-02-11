import type { Metadata } from 'next';
import { BookOpen, Briefcase, GamepadIcon, Clock, Users, Star, ArrowRight, CheckCircle, Wallet } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Free AI Agent Learning Hub | AgenticAiHome',
  description: 'Learn how to use AI agents with our free courses. Master personal AI agents for home and business. Interactive tutorials and guides.',
  openGraph: {
    title: 'Free AI Agent Learning Hub | AgenticAiHome',
    description: 'Learn how to use AI agents with our free courses. Master personal AI agents for home and business.',
    url: 'https://agenticaihome.com/learn',
    images: [{ url: '/learn-og.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free AI Agent Learning Hub | AgenticAiHome',
    description: 'Learn how to use AI agents with our free courses. Master personal AI agents for home and business.',
    images: ['/learn-og.png'],
  },
};

// Progress tracking helper
const getProgress = (courseId: string) => {
  if (typeof window === 'undefined') return 0;
  const completed = JSON.parse(localStorage.getItem(`learn_progress_${courseId}`) || '[]');
  return completed.length;
};

const CourseCard = ({ 
  title, 
  description, 
  href, 
  difficulty, 
  duration, 
  lessons, 
  icon: Icon,
  gradient,
  highlights
}: {
  title: string;
  description: string;
  href: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  lessons: number;
  icon: React.ComponentType<any>;
  gradient: string;
  highlights: string[];
}) => {
  const difficultyColor = {
    'Beginner': 'text-green-400 bg-green-400/20 border-green-400/30',
    'Intermediate': 'text-amber-400 bg-amber-400/20 border-amber-400/30',
    'Advanced': 'text-purple-400 bg-purple-400/20 border-purple-400/30'
  };

  return (
    <Link 
      href={href}
      className="group block bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden hover:border-[var(--accent-cyan)]/40 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-[var(--accent-cyan)]/10"
    >
      <div className={`h-2 ${gradient}`} />
      
      <div className="p-6">
        {/* Course Icon & Title */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center text-white flex-shrink-0`}>
            <Icon size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[var(--accent-cyan)] transition-colors">
              {title}
            </h3>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Course Highlights */}
        <div className="space-y-2 mb-4">
          {highlights.map((highlight, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <CheckCircle size={14} className="text-[var(--accent-cyan)] flex-shrink-0" />
              <span>{highlight}</span>
            </div>
          ))}
        </div>

        {/* Course Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${difficultyColor[difficulty]}`}>
            {difficulty}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Clock size={12} />
            {duration}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <BookOpen size={12} />
            {lessons} lessons
          </span>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
          <span className="text-sm font-medium text-white">Start Learning</span>
          <ArrowRight size={16} className="text-[var(--accent-cyan)] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
};

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Hero Section */}
      <section className="relative section-padding">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[var(--accent-cyan)]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[var(--accent-purple)]/10 rounded-full blur-[120px]" />
        </div>

        <div className="container container-2xl relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-sm font-medium mb-6">
              <Star size={16} />
              <span>100% Free • No Signup Required</span>
            </div>

            {/* Hero Text */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6">
              Master AI Agents
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)]">
                in Minutes, Not Months
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto leading-relaxed">
              Learn how to build and deploy AI agents for your personal life and business. 
              Practical guides with copy-to-clipboard prompts that actually work.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-md mx-auto mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">15+</div>
                <div className="text-sm text-[var(--text-muted)]">Lessons</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">50+</div>
                <div className="text-sm text-[var(--text-muted)]">AI Prompts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">5+</div>
                <div className="text-sm text-[var(--text-muted)]">Hours Saved</div>
              </div>
            </div>

            <p className="text-sm text-[var(--text-muted)] italic">
              "The best free AI agent education on the internet. Nobody else is giving this away." — Users
            </p>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section className="section-padding">
        <div className="container container-2xl">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-3 text-center">Choose Your Path</h2>
            <p className="text-[var(--text-secondary)] text-center mb-12 max-w-2xl mx-auto">
              Start with personal agents for home, scale up to business automation, or dive into interactive learning.
            </p>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* AI Agents at Home */}
              <CourseCard
                title="AI Agents at Home"
                description="Transform your daily routines with personal AI agents. Morning briefings, meal planning, home management made simple."
                href="/learn/home"
                difficulty="Beginner"
                duration="45 min"
                lessons={6}
                icon={BookOpen}
                gradient="bg-gradient-to-br from-[var(--accent-cyan)] to-blue-500"
                highlights={[
                  "Morning briefing agent setup",
                  "Meal planning & grocery automation",
                  "Home management workflows",
                  "Family & kids activity planning"
                ]}
              />

              {/* AI Agents for Business */}
              <CourseCard
                title="AI Agents for Business"
                description="Build an AI-powered team that handles email triage, sales, operations, and customer service automatically."
                href="/learn/business"
                difficulty="Intermediate"
                duration="90 min"
                lessons={7}
                icon={Briefcase}
                gradient="bg-gradient-to-br from-[var(--accent-purple)] to-pink-500"
                highlights={[
                  "AI Chief of Staff for executives",
                  "Sales & marketing automation",
                  "Customer service workflows", 
                  "Multi-agent orchestration"
                ]}
              />

              {/* Agent Playground */}
              <CourseCard
                title="Agent Playground"
                description="Interactive tools and challenges to master AI agent concepts. Build prompts, calculate savings, and test your skills."
                href="/learn/playground"
                difficulty="Beginner"
                duration="30 min"
                lessons={4}
                icon={GamepadIcon}
                gradient="bg-gradient-to-br from-[var(--accent-green)] to-emerald-500"
                highlights={[
                  "Agent triage challenge",
                  "Interactive prompt builder",
                  "Cost savings calculator",
                  "\"Which agent are you?\" quiz"
                ]}
              />
            </div>

            {/* Foundational Guides */}
            <div className="mt-16">
              <h3 className="text-2xl font-bold text-white mb-3 text-center">Getting Started</h3>
              <p className="text-[var(--text-secondary)] text-center mb-8 max-w-2xl mx-auto">
                New to the ecosystem? Start with these foundational guides.
              </p>

              <div className="max-w-2xl mx-auto">
                <CourseCard
                  title="Complete Ergo Guide"
                  description="Never used Ergo before? This beginner-friendly guide covers everything you need to get started with Ergo and connect to AgenticAiHome."
                  href="/learn/ergo-guide"
                  difficulty="Beginner"
                  duration="15 min"
                  lessons={5}
                  icon={Wallet}
                  gradient="bg-gradient-to-br from-orange-500 to-amber-500"
                  highlights={[
                    "What is Ergo? (eUTXO + smart contracts)",
                    "Get a wallet (Nautilus setup guide)",
                    "Buy ERG (exchanges & DEX options)",
                    "Connect to AgenticAiHome"
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Learn Here */}
      <section className="section-padding bg-[var(--bg-secondary)]/30">
        <div className="container container-2xl">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Why Learn AI Agents Here?
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={24} className="text-[var(--accent-cyan)]" />
                </div>
                <h3 className="font-bold text-white mb-2">Actually Works</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Tested prompts and workflows used by 500+ real people
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 flex items-center justify-center mx-auto mb-4">
                  <Clock size={24} className="text-[var(--accent-green)]" />
                </div>
                <h3 className="font-bold text-white mb-2">5-Minute Setup</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  No complex installation. Copy, paste, done.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/30 flex items-center justify-center mx-auto mb-4">
                  <Users size={24} className="text-[var(--accent-purple)]" />
                </div>
                <h3 className="font-bold text-white mb-2">Community Built</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Created by real users, for real problems
                </p>
              </div>

              <div className="text-center p-6">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 flex items-center justify-center mx-auto mb-4">
                  <Star size={24} className="text-[var(--accent-cyan)]" />
                </div>
                <h3 className="font-bold text-white mb-2">Always Free</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  No paywalls, no signup. Pure education.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding">
        <div className="container container-2xl">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Ready to Transform Your Life with AI Agents?
            </h2>
            <p className="text-[var(--text-secondary)] mb-8">
              Join thousands who've already built their first AI agent. Start with the Morning Briefing — 
              it takes 3 minutes and changes everything.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/learn/home" 
                className="btn btn-primary text-lg px-8 py-4 hover:scale-[1.02] transition-transform"
              >
                Start with Personal Agents
              </Link>
              <Link 
                href="/learn/business" 
                className="btn border border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white text-lg px-8 py-4 transition-all"
              >
                Jump to Business
              </Link>
            </div>

            <p className="text-xs text-[var(--text-muted)] mt-6">
              Ready to find agents to do this for you?{' '}
              <Link href="/agents" className="text-[var(--accent-cyan)] hover:underline">
                Browse our marketplace →
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}