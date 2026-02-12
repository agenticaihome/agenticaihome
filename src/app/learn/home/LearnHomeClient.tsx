'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Bell, Brain, CheckCircle, ChevronRight, ClipboardList, Clock, Coins, Copy, ExternalLink, Eye, GraduationCap, Home, Lightbulb, Link2, Palette, PartyPopper, Sun, Users, UtensilsCrossed, Wrench, Zap } from 'lucide-react';
import Link from 'next/link';

interface Lesson {
  id: number;
  title: string;
  description: string;
  readTime: string;
  difficulty: 'Beginner' | 'Intermediate';
  icon: React.ComponentType<any>;
  content: React.ReactNode;
}

const CopyPrompt = ({ prompt, title }: { prompt: string; title: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] border-b border-[var(--border-color)]">
        <span className="text-sm font-medium text-slate-300"><ClipboardList className="w-4 h-4 text-slate-400 inline" /> {title}</span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            copied 
              ? 'bg-green-600 text-white' 
              : 'bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 text-white'
          }`}
        >
          {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="p-4">
        <pre className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
          {prompt}
        </pre>
      </div>
    </div>
  );
};

const TryThis = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Zap size={14} className="text-white" />
      </div>
      <div>
        <h4 className="font-semibold text-amber-400 text-sm mb-2">Try This Today</h4>
        <div className="text-sm text-slate-300">
          {children}
        </div>
      </div>
    </div>
  </div>
);

const lessons: Lesson[] = [
  {
    id: 1,
    title: "Your First AI Agent",
    description: "Set up a Morning Briefing agent that gives you weather, schedule, and priorities every day.",
    readTime: "8 min",
    difficulty: "Beginner",
    icon: Sun,
    content: (
      <div className="space-y-8 max-w-3xl">
        <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 rounded-xl p-6 border border-teal-500/30">
          <div className="flex items-start gap-4">
            <Eye className="text-teal-400 flex-shrink-0 mt-1" size={20} />
            <div>
              <h3 className="text-teal-400 font-semibold mb-2">What You'll Wake Up To</h3>
              <div className="bg-black/40 rounded-lg p-3 text-sm space-y-1">
                <p><strong className="text-white">Weather:</strong> 72°F, partly cloudy. No umbrella needed!</p>
                <p>  <strong className="text-white">Today:</strong> Team meeting 10am, dentist 2pm, grocery pickup 5pm</p>
                <p><Bell className="w-4 h-4 text-yellow-400 inline" /> <strong className="text-white">Reminder:</strong> Take vitamins (you forgot yesterday!)</p>
                <p><Zap className="w-4 h-4 text-yellow-400 inline" /> <strong className="text-white">Captain's Tip:</strong> Prep tomorrow's outfit tonight</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-white mb-4">How to Set This Up</h3>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Choose Your AI Platform</h4>
                <p className="text-slate-300 text-sm mb-3">
                  <strong className="text-teal-400">ChatGPT is easiest</strong> — free with Google signup, has scheduling features.
                  Claude, Gemini, and others work too but may need manual daily prompts.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { name: 'ChatGPT', url: 'https://chat.openai.com', color: 'from-green-500 to-teal-500', recommended: true },
                    { name: 'Claude', url: 'https://claude.ai', color: 'from-orange-500 to-red-500' },
                    { name: 'Gemini', url: 'https://gemini.google.com', color: 'from-blue-500 to-purple-500' },
                    { name: 'Perplexity', url: 'https://perplexity.ai', color: 'from-purple-500 to-pink-500' }
                  ].map((platform) => (
                    <a
                      key={platform.name}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`relative flex items-center justify-center px-3 py-2 rounded-lg bg-gradient-to-r ${platform.color} text-white text-xs font-medium hover:scale-[1.02] transition-all`}
                    >
                      {platform.recommended && (
                        <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                          BEST
                        </span>
                      )}
                      {platform.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-2">Copy This Prompt</h4>
                <CopyPrompt
                  title="Morning Agent Setup"
                  prompt={`You are my Morning Agent. Your job is to send me a short, helpful morning briefing every day.

**One-time setup (ask me these 3 questions):**
1. What city am I in? (for weather)
2. What time do I want this briefing? (ex: 7:00 AM)
3. What's one thing I tend to forget? (vitamins, keys, calling someone, etc.)

**Daily briefing (keep it under 120 words):**

***Weather** — Look up the real current weather for my city (temp + conditions) and tell me what to wear.

  **Top 3 Today** — If I connected my calendar, list my next 3 events. If not, ask me for my 3 main things today.

<Brain className="w-4 h-4 text-pink-400 inline" /> **One Reminder** — The thing I usually forget (or a quick question if you need it).

<Zap className="w-4 h-4 text-yellow-400 inline" /> **Captain's Tip** — One tiny action today that makes tomorrow easier.

---

**Rules:**
- Friendly, warm, simple language
- Emojis for easy scanning
- Under 120 words total
- If scheduling is available, set this to run daily at my chosen time
- If scheduling isn't available, tell me: "Type 'Morning Briefing' anytime and I'll generate today's briefing instantly."

Start by asking me question #1.`}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Answer 3 Simple Questions</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-3">
                    <span className="text-teal-400 font-semibold">City:</span>
                    <span className="text-slate-300">So it knows your weather</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-teal-400 font-semibold">Time:</span>
                    <span className="text-slate-300">When you want your briefing (7:00 AM works great)</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-teal-400 font-semibold">Forget:</span>
                    <span className="text-slate-300">Something you always forget (vitamins, keys, calling mom)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <TryThis>
          <p>Set this up right now — it takes 3 minutes. Tomorrow morning you'll get your first briefing and feel the difference immediately. Enable notifications on your phone so you actually see it.</p>
          <p className="mt-2 text-amber-300 font-medium">Pro tip: Say "Remember this for next time" so the AI saves your preferences.</p>
        </TryThis>

        <div className="bg-[var(--bg-card)]/50 rounded-xl p-4 border border-[var(--border-color)]">
          <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
            <Bell size={16} className="text-amber-400" />
            Important: Enable Notifications
          </h4>
          <p className="text-slate-300 text-sm">
            Go to your phone Settings → Notifications → ChatGPT → Allow. Without this, 
            your agent can't reach you and the magic doesn't work.
          </p>
        </div>
      </div>
    )
  },
  // ... rest of the lessons (truncated for brevity)
];

export default function LearnHomeClient() {
  const [currentLesson, setCurrentLesson] = useState(1);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);

  useEffect(() => {
    // Load progress from localStorage
    const saved = localStorage.getItem('learn_progress_home');
    if (saved) {
      setCompletedLessons(JSON.parse(saved));
    }
  }, []);

  const markComplete = (lessonId: number) => {
    if (!completedLessons.includes(lessonId)) {
      const newCompleted = [...completedLessons, lessonId];
      setCompletedLessons(newCompleted);
      localStorage.setItem('learn_progress_home', JSON.stringify(newCompleted));
    }
  };

  const currentLessonData = lessons.find(l => l.id === currentLesson);
  const progress = (completedLessons.length / lessons.length) * 100;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <section className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/30">
        <div className="container container-2xl section-padding">
          <div className="max-w-4xl mx-auto">
            <Link 
              href="/learn" 
              className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors mb-6"
            >
              <ArrowLeft size={16} />
              <span>Back to Learning Hub</span>
            </Link>
            
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
                AI Agents at Home
                <span className="block text-lg font-normal text-[var(--text-secondary)] mt-2">
                  Transform your daily routines with personal AI agents
                </span>
              </h1>
              
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[var(--text-muted)]">Your Progress</span>
                  <span className="text-[var(--accent-cyan)]">{completedLessons.length} of {lessons.length} lessons</span>
                </div>
                <div className="w-full bg-[var(--bg-card)] rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container container-2xl section-padding">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar - Lesson Navigation */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <h3 className="font-semibold text-white mb-4">Lessons</h3>
                <div className="space-y-2">
                  {lessons.map((lesson) => {
                    const isCompleted = completedLessons.includes(lesson.id);
                    const isCurrent = currentLesson === lesson.id;
                    
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setCurrentLesson(lesson.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isCurrent 
                            ? 'bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)]'
                            : isCompleted
                            ? 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30 text-[var(--accent-green)]'
                            : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--accent-cyan)]/40 hover:text-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isCurrent
                              ? 'bg-[var(--accent-cyan)] text-white'
                              : isCompleted 
                              ? 'bg-[var(--accent-green)] text-white'
                              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle size={14} />
                            ) : (
                              <lesson.icon size={14} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm mb-1">{lesson.title}</div>
                            <div className="flex items-center gap-2 text-xs">
                              <span>{lesson.readTime}</span>
                              <span className="text-[var(--text-muted)]">•</span>
                              <span className={
                                lesson.difficulty === 'Beginner' 
                                  ? 'text-green-400' 
                                  : 'text-amber-400'
                              }>
                                {lesson.difficulty}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {currentLessonData && (
                <article>
                  {/* Lesson Header */}
                  <header className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)] to-blue-500 flex items-center justify-center text-white">
                        <currentLessonData.icon size={24} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-1">
                          {currentLessonData.title}
                        </h2>
                        <p className="text-[var(--text-secondary)]">
                          {currentLessonData.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {currentLessonData.readTime}
                      </span>
                      <span className={
                        currentLessonData.difficulty === 'Beginner' 
                          ? 'text-green-400' 
                          : 'text-amber-400'
                      }>
                        {currentLessonData.difficulty}
                      </span>
                    </div>
                  </header>

                  {/* Lesson Content */}
                  <div className="prose prose-invert max-w-none">
                    {currentLessonData.content}
                  </div>

                  {/* Lesson Navigation */}
                  <footer className="mt-12 pt-8 border-t border-[var(--border-color)]">
                    <div className="flex items-center justify-between">
                      <div>
                        {currentLesson > 1 && (
                          <button
                            onClick={() => setCurrentLesson(currentLesson - 1)}
                            className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors"
                          >
                            <ArrowLeft size={16} />
                            Previous Lesson
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => markComplete(currentLesson)}
                          className={`btn transition-all ${
                            completedLessons.includes(currentLesson)
                              ? 'border border-[var(--accent-green)] text-[var(--accent-green)]'
                              : 'btn-primary'
                          }`}
                          disabled={completedLessons.includes(currentLesson)}
                        >
                          {completedLessons.includes(currentLesson) ? (
                            <>
                              <CheckCircle size={16} />
                              Completed
                            </>
                          ) : (
                            'Mark Complete'
                          )}
                        </button>

                        {currentLesson < lessons.length && (
                          <button
                            onClick={() => setCurrentLesson(currentLesson + 1)}
                            className="flex items-center gap-2 text-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]/80 transition-colors"
                          >
                            Next Lesson
                            <ArrowRight size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {currentLesson === lessons.length && (
                      <div className="mt-8 text-center">
                        <div className="bg-gradient-to-r from-[var(--accent-cyan)]/10 to-[var(--accent-purple)]/10 border border-[var(--accent-cyan)]/30 rounded-xl p-6">
                          <h3 className="text-xl font-bold text-white mb-2">Course Complete!</h3>
                          <p className="text-[var(--text-secondary)] mb-4">
                            You've mastered AI agents for personal use. Ready to scale up to business?
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link href="/learn/business" className="btn btn-primary">
                              Start Business Course
                            </Link>
                            <Link href="/learn/playground" className="btn border border-[var(--accent-green)] text-[var(--accent-green)] hover:bg-[var(--accent-green)] hover:text-white">
                              Try the Playground
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </footer>
                </article>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <section className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/30 section-padding">
        <div className="container container-2xl">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              Ready to Find Agents to Do This for You?
            </h3>
            <p className="text-[var(--text-secondary)] mb-6">
              Now that you know how AI agents work, discover pre-built agents in our marketplace 
              that can handle these tasks automatically.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/agents" className="btn btn-primary">
                Browse Agent Marketplace
              </Link>
              <Link 
                href="/learn/business" 
                className="btn border border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)] hover:text-white"
              >
                Learn Business Agents
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}