'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion as m, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, Check, Trash2, Play, RotateCcw, ArrowLeft, Trophy, Volume2, VolumeX, Clock, Flame, Keyboard, ChevronLeft, ChevronRight, Share2, Pause } from 'lucide-react';
import confetti from 'canvas-confetti';

// Types
interface Email {
  id: number;
  type: string;
  subject: string;
  action: 'delegate' | 'delete';
  color: string;
  borderColor: string;
  icon: string;
  priority: 'normal' | 'high' | 'critical';
  spawnTime: number;
  isCritical: boolean;
  timeToLive: number;
}

interface CaptainMessage {
  text: string;
  mood: 'neutral' | 'happy' | 'helpful' | 'excited' | 'concerned' | 'urgent' | 'victory' | 'sad';
}

interface Particle {
  id: number;
  text: string;
  subtext?: string;
  color: string;
}

interface ComboPopup {
  text: string;
  color: string;
}

interface Stats {
  correct: number;
  wrong: number;
  fastActions: number;
  criticalSaved: number;
}

interface PersonalBest {
  score: number;
  triaged: number;
}

interface SwipeableEmailCardProps {
  email: Email;
  onAction: (id: number, action: 'delegate' | 'delete') => void;
  isSelected: boolean;
  onSelect: (index: number) => void;
  index: number;
}

type GameState = 'start' | 'playing' | 'paused' | 'won' | 'lost';

// Local storage helpers
const getTriageBest = (): PersonalBest => {
  const stored = localStorage.getItem('agent-triage-best');
  return stored ? JSON.parse(stored) : { score: 0, triaged: 0 };
};

const setTriageBest = (best: PersonalBest) => {
  localStorage.setItem('agent-triage-best', JSON.stringify(best));
};

// Swipeable Email Card Component
const SwipeableEmailCard: React.FC<SwipeableEmailCardProps> = ({ email, onAction, isSelected, onSelect, index }) => {
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-150, -50, 0, 50, 150],
    [
      'rgba(239, 68, 68, 0.3)',
      'rgba(239, 68, 68, 0.1)',
      'rgba(0, 0, 0, 0)',
      'rgba(34, 197, 94, 0.1)',
      'rgba(34, 197, 94, 0.3)'
    ]
  );
  const leftIconOpacity = useTransform(x, [-150, -50, 0], [1, 0.5, 0]);
  const rightIconOpacity = useTransform(x, [0, 50, 150], [0, 0.5, 1]);

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 80;
    if (info.offset.x > threshold) {
      triggerHaptic();
      onAction(email.id, 'delegate');
    } else if (info.offset.x < -threshold) {
      triggerHaptic();
      onAction(email.id, 'delete');
    }
  };

  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const timeElapsed = Date.now() - email.spawnTime;
  const urgency = email.isCritical ? Math.min(1, timeElapsed / email.timeToLive) : 0;

  const dynamicBoxShadow = email.isCritical
    ? `0 0 ${15 + urgency * 25}px rgba(239, 68, 68, ${0.4 + urgency * 0.4})`
    : '0 4px 15px rgba(0,0,0,0.3)';

  return (
    <m.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
      className="relative w-full mb-2"
    >
      {/* Swipe Indicators Background */}
      <m.div
        className="absolute inset-0 rounded-xl flex items-center justify-between px-4 pointer-events-none"
        style={{ background }}
      >
        <m.div style={{ opacity: leftIconOpacity }} className="flex items-center gap-2 text-red-400">
          <Trash2 size={24} />
          <span className="font-bold text-sm">DELETE</span>
        </m.div>
        <m.div style={{ opacity: rightIconOpacity }} className="flex items-center gap-2 text-green-400">
          <span className="font-bold text-sm">DELEGATE</span>
          <Check size={24} />
        </m.div>
      </m.div>

      {/* Draggable Card */}
      <m.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        style={{ x, boxShadow: dynamicBoxShadow }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect(index)}
        className={`relative bg-gradient-to-r ${email.color} border-2 ${email.borderColor} rounded-xl p-3 sm:p-4 shadow-lg cursor-grab active:cursor-grabbing transition-colors touch-pan-y
          ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900 scale-[1.01]' : ''}
          ${email.isCritical ? 'critical-pulse' : ''}`}
      >
        {/* Critical Timer Bar */}
        {email.isCritical && (
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-900/50 rounded-t-xl overflow-hidden">
            <m.div
              className="h-full bg-gradient-to-r from-red-500 to-orange-500"
              initial={{ width: '100%' }}
              animate={{ width: `${Math.max(0, 100 - urgency * 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        {/* Email Content */}
        <div className="flex items-center gap-3">
          <span className="text-2xl sm:text-3xl flex-shrink-0">{email.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {email.isCritical && (
                <span className="text-[10px] sm:text-xs bg-red-500 text-white px-1.5 py-0.5 rounded font-bold animate-pulse flex-shrink-0">
                  🔥 URGENT
                </span>
              )}
              <span className="text-xs text-slate-300">#{index + 1}</span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-white truncate">{email.subject}</p>
            <p className="text-xs text-slate-300 mt-0.5 hidden sm:block">
              {email.action === 'delegate' ? '💼 Work-related' : '🗑️ Low priority'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={(e) => { e.stopPropagation(); triggerHaptic(); onAction(email.id, 'delegate'); }}
            className="flex-1 bg-green-600/90 hover:bg-green-500 active:bg-green-400 text-white text-sm sm:text-base font-bold py-3 sm:py-3.5 rounded-xl flex justify-center items-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-900/30"
          >
            <Check size={18} />
            <span>DELEGATE</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); triggerHaptic(); onAction(email.id, 'delete'); }}
            className="flex-1 bg-red-600/90 hover:bg-red-500 active:bg-red-400 text-white text-sm sm:text-base font-bold py-3 sm:py-3.5 rounded-xl flex justify-center items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-900/30"
          >
            <Trash2 size={18} />
            <span>DELETE</span>
          </button>
        </div>

        {/* Swipe Hint for Mobile */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] text-slate-300 sm:hidden">
          <ChevronLeft size={12} />
          <span>swipe</span>
          <ChevronRight size={12} />
        </div>
      </m.div>
    </m.div>
  );
};

interface AgentTriageGameProps {
  onBack: () => void;
}

const AgentTriageGame: React.FC<AgentTriageGameProps> = ({ onBack }) => {
  // Core Game State
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [emails, setEmails] = useState<Email[]>([]);
  const [emailsTriaged, setEmailsTriaged] = useState(0);
  const [selectedEmailIndex, setSelectedEmailIndex] = useState(0);

  // Combo & Streak
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  // Waves & Difficulty
  const [wave, setWave] = useState(1);
  const [waveAnnouncement, setWaveAnnouncement] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<Stats>({ correct: 0, wrong: 0, fastActions: 0, criticalSaved: 0 });
  const [personalBest, setPersonalBest] = useState<PersonalBest>(() => getTriageBest());

  // UI State
  const [captainMessage, setCaptainMessage] = useState<CaptainMessage>({ text: "Ready to master your inbox?", mood: 'neutral' });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [comboPopup, setComboPopup] = useState<ComboPopup | null>(null);

  // Refs
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const emailContainerRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef(score);
  const emailsTriagedRef = useRef(emailsTriaged);

  // Keep refs in sync for use in callbacks
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { emailsTriagedRef.current = emailsTriaged; }, [emailsTriaged]);

  // Game state ref for visibility pause
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Visibility pause - pause game when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameStateRef.current === 'playing') {
        // Clear intervals
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        setGameState('paused');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Resume game from pause
  const resumeGame = useCallback(() => {
    if (gameStateRef.current === 'paused') {
      setGameState('playing');
    }
  }, []);

  // Email Templates
  const emailTypes = useMemo(() => [
    // DELEGATE emails (work-related)
    { type: 'urgent', subject: '🔥 Client deadline TODAY', action: 'delegate' as const, color: 'from-red-500/30 to-red-900/30', borderColor: 'border-red-500/60', icon: '🔥', priority: 'critical' as const },
    { type: 'boss', subject: '⚡ Meeting request from CEO', action: 'delegate' as const, color: 'from-amber-500/30 to-amber-900/30', borderColor: 'border-amber-500/60', icon: '⚡', priority: 'high' as const },
    { type: 'work', subject: '📊 Q4 Report needs approval', action: 'delegate' as const, color: 'from-cyan-500/25 to-cyan-900/25', borderColor: 'border-cyan-500/50', icon: '📊', priority: 'normal' as const },
    { type: 'meeting', subject: '📅 Team sync in 30 mins', action: 'delegate' as const, color: 'from-purple-500/25 to-purple-900/25', borderColor: 'border-purple-500/50', icon: '📅', priority: 'normal' as const },
    { type: 'client', subject: '💼 Contract ready for review', action: 'delegate' as const, color: 'from-emerald-500/25 to-emerald-900/25', borderColor: 'border-emerald-500/50', icon: '💼', priority: 'high' as const },
    { type: 'project', subject: '🎯 Sprint blocker identified', action: 'delegate' as const, color: 'from-orange-500/25 to-orange-900/25', borderColor: 'border-orange-500/50', icon: '🎯', priority: 'high' as const },
    { type: 'support', subject: '🆘 Customer needs help ASAP', action: 'delegate' as const, color: 'from-rose-500/25 to-rose-900/25', borderColor: 'border-rose-500/50', icon: '🆘', priority: 'high' as const },

    // DELETE emails (spam, junk)
    { type: 'spam', subject: '🎁 You won $1,000,000!!!', action: 'delete' as const, color: 'from-slate-500/25 to-slate-800/25', borderColor: 'border-slate-500/40', icon: '🎁', priority: 'normal' as const },
    { type: 'newsletter', subject: '📧 Weekly Marketing Digest', action: 'delete' as const, color: 'from-blue-500/20 to-blue-900/20', borderColor: 'border-blue-500/40', icon: '📧', priority: 'normal' as const },
    { type: 'receipt', subject: '🧾 Your Amazon receipt', action: 'delete' as const, color: 'from-green-500/20 to-green-900/20', borderColor: 'border-green-500/40', icon: '🧾', priority: 'normal' as const },
    { type: 'promo', subject: '🏷️ 50% OFF TODAY ONLY!!!', action: 'delete' as const, color: 'from-pink-500/20 to-pink-900/20', borderColor: 'border-pink-500/40', icon: '🏷️', priority: 'normal' as const },
    { type: 'social', subject: '👤 LinkedIn: New connection', action: 'delete' as const, color: 'from-sky-500/20 to-sky-900/20', borderColor: 'border-sky-500/40', icon: '👤', priority: 'normal' as const },
    { type: 'junk', subject: '💊 Miracle weight loss secret', action: 'delete' as const, color: 'from-gray-500/20 to-gray-900/20', borderColor: 'border-gray-500/40', icon: '💊', priority: 'normal' as const },
    { type: 'crypto', subject: '🪙 10X your Bitcoin NOW', action: 'delete' as const, color: 'from-yellow-500/20 to-yellow-900/20', borderColor: 'border-yellow-500/40', icon: '🪙', priority: 'normal' as const },
  ], []);

  // Sound Effects
  const playSound = useCallback((type: string) => {
    if (!soundEnabled) return;

    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContext.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      switch (type) {
        case 'correct':
          oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
          oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
          gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.25);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.25);
          break;
        case 'wrong':
          oscillator.frequency.setValueAtTime(200, ctx.currentTime);
          oscillator.frequency.setValueAtTime(150, ctx.currentTime + 0.15);
          oscillator.type = 'sawtooth';
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'combo':
          oscillator.frequency.setValueAtTime(784, ctx.currentTime);
          oscillator.frequency.setValueAtTime(988, ctx.currentTime + 0.08);
          oscillator.frequency.setValueAtTime(1175, ctx.currentTime + 0.16);
          oscillator.frequency.setValueAtTime(1318, ctx.currentTime + 0.24);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.35);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.35);
          break;
        case 'spawn':
          oscillator.frequency.setValueAtTime(350, ctx.currentTime);
          oscillator.frequency.setValueAtTime(400, ctx.currentTime + 0.05);
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
        case 'critical':
          oscillator.frequency.setValueAtTime(880, ctx.currentTime);
          oscillator.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
          oscillator.type = 'square';
          gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'wave':
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          oscillator.frequency.setValueAtTime(554, ctx.currentTime + 0.15);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.45);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.45);
          break;
        default:
          break;
      }
    } catch (e) {
      // Audio not available
    }
  }, [soundEnabled]);

  // Captain Messages
  const captainMessages = useMemo(() => ({
    start: [
      { text: "Let's clear this inbox! 💪", mood: 'excited' as const },
      { text: "Work emails → Delegate, Junk → Delete!", mood: 'helpful' as const }
    ],
    correct: [
      { text: "Perfect sort! ✨", mood: 'happy' as const },
      { text: "That's efficiency!", mood: 'happy' as const },
      { text: "Nailed it!", mood: 'happy' as const },
      { text: "Keep it flowing!", mood: 'happy' as const }
    ],
    wrong: [
      { text: "Oops! Check the category.", mood: 'concerned' as const },
      { text: "That one slipped. Stay focused!", mood: 'concerned' as const },
      { text: "Shake it off, keep going!", mood: 'concerned' as const }
    ],
    combo3: [{ text: "🔥 3x COMBO! You're heating up!", mood: 'excited' as const }],
    combo5: [{ text: "⚡ 5x STREAK! +15 BONUS!", mood: 'excited' as const }],
    combo7: [{ text: "💎 7x CHAIN! UNSTOPPABLE!", mood: 'excited' as const }],
    combo10: [{ text: "🏆 10x LEGENDARY! +25 BONUS!", mood: 'excited' as const }],
    critical: [{ text: "🚨 CRITICAL! Handle it NOW!", mood: 'urgent' as const }],
    wave2: [{ text: "⚠️ WAVE 2: Speed increasing!", mood: 'urgent' as const }],
    wave3: [{ text: "🌊 FINAL WAVE: Max intensity!", mood: 'urgent' as const }],
    almostWin: [{ text: "Almost there! Push through! 🎯", mood: 'excited' as const }],
    win: [{ text: "🎉 INBOX ZERO! You're a legend!", mood: 'victory' as const }],
    lose: [{ text: "Inbox overflow! Train harder! 💪", mood: 'sad' as const }]
  }), []);

  const updateCaptain = useCallback((eventType: keyof typeof captainMessages) => {
    const messages = captainMessages[eventType];
    if (messages) {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      setCaptainMessage(msg);
    }
  }, [captainMessages]);

  // End Game function
  const endGame = useCallback((win: boolean) => {
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    gameLoopRef.current = null;
    timerRef.current = null;
    setGameState(win ? 'won' : 'lost');

    const finalScore = scoreRef.current;
    const finalTriaged = emailsTriagedRef.current;

    setPersonalBest(prev => {
      if (finalScore > prev.score || finalTriaged > prev.triaged) {
        const newBest = {
          score: Math.max(finalScore, prev.score),
          triaged: Math.max(finalTriaged, prev.triaged)
        };
        setTriageBest(newBest);
        return newBest;
      }
      return prev;
    });

    if (win) {
      updateCaptain('win');
      if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#22c55e', '#eab308', '#a855f7']
      });
    } else {
      updateCaptain('lose');
      if (navigator.vibrate) navigator.vibrate(200);
    }
  }, [updateCaptain]);

  // Share Score
  const shareScore = useCallback(() => {
    const accuracy = stats.correct + stats.wrong > 0
      ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
      : 0;

    const text = `📧 I triaged ${emailsTriaged} emails and scored ${score} points in Inbox Defense!\n\nAccuracy: ${accuracy}% | Max Combo: ${maxCombo}x\nThink you can beat me? 🎮\n\nPlay free: AgenticAIHome.com/learn/playground`;

    if (navigator.share) {
      navigator.share({
        title: 'Inbox Defense Challenge',
        text
      }).catch(() => {
        navigator.clipboard?.writeText(text);
        alert('Challenge copied! Paste it anywhere to challenge a friend.');
      });
    } else {
      navigator.clipboard?.writeText(text);
      alert('Challenge copied! Paste it anywhere to challenge a friend.');
    }
  }, [score, emailsTriaged, maxCombo, stats]);

  // Spawn Email
  const spawnEmail = useCallback((currentWave: number) => {
    setEmails(prev => {
      if (prev.length >= 5) return prev; // Max 5 visible

      const template = emailTypes[Math.floor(Math.random() * emailTypes.length)];
      const isCritical = currentWave === 3 ? Math.random() < 0.25 : currentWave === 2 ? Math.random() < 0.15 : Math.random() < 0.08;

      const newEmail: Email = {
        id: Date.now() + Math.random(),
        ...template,
        spawnTime: Date.now(),
        isCritical: isCritical || template.priority === 'critical',
        timeToLive: isCritical ? 5000 : 10000
      };

      if (isCritical) {
        updateCaptain('critical');
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
        playSound('critical');
      } else {
        playSound('spawn');
      }

      return [...prev, newEmail];
    });
  }, [emailTypes, playSound, updateCaptain]);

  // Start spawner helper
  const startSpawner = useCallback((interval: number, currentWave: number) => {
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    gameLoopRef.current = setInterval(() => {
      spawnEmail(currentWave);
    }, interval);
  }, [spawnEmail]);

  // Start Game
  const startGame = useCallback(() => {
    if (gameStateRef.current === 'playing' || gameStateRef.current === 'paused') return;

    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    setGameState('playing');
    setScore(0);
    setTimeLeft(45);
    setEmails([]);
    setEmailsTriaged(0);
    setCombo(0);
    setMaxCombo(0);
    setWave(1);
    setStats({ correct: 0, wrong: 0, fastActions: 0, criticalSaved: 0 });
    setSelectedEmailIndex(0);
    setComboPopup(null);
    setParticles([]);
    updateCaptain('start');

    // Unlock audio context on mobile
    if (audioContext.current?.state === 'suspended') {
      audioContext.current.resume();
    }

    // Start Timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Initial spawns
    setTimeout(() => spawnEmail(1), 300);
    setTimeout(() => spawnEmail(1), 800);

    // Start spawner
    startSpawner(2200, 1);
  }, [updateCaptain, endGame, spawnEmail, startSpawner]);

  // Wave Management
  useEffect(() => {
    if (gameState !== 'playing') return;

    if (timeLeft === 30 && wave === 1) {
      setWave(2);
      setWaveAnnouncement('WAVE 2');
      updateCaptain('wave2');
      playSound('wave');
      startSpawner(1600, 2);
      setTimeout(() => setWaveAnnouncement(null), 2000);
    } else if (timeLeft === 15 && wave === 2) {
      setWave(3);
      setWaveAnnouncement('FINAL WAVE');
      updateCaptain('wave3');
      playSound('wave');
      startSpawner(1100, 3);
      setTimeout(() => setWaveAnnouncement(null), 2000);
    }
  }, [timeLeft, wave, gameState, updateCaptain, playSound, startSpawner]);

  // Almost win encouragement
  useEffect(() => {
    if (gameState === 'playing' && emailsTriaged >= 17 && emailsTriaged < 20) {
      updateCaptain('almostWin');
    }
  }, [emailsTriaged, gameState, updateCaptain]);

  // Critical email timeout checker
  useEffect(() => {
    if (gameState !== 'playing') return;

    const checkExpired = setInterval(() => {
      const now = Date.now();
      setEmails(prev => {
        const expired = prev.filter(email => email.isCritical && (now - email.spawnTime) > email.timeToLive);
        if (expired.length > 0) {
          setScore(s => Math.max(0, s - 15));
          setCombo(0);
          setShake(true);
          setTimeout(() => setShake(false), 300);
          playSound('wrong');
          if (navigator.vibrate) navigator.vibrate(100);
          return prev.filter(email => !(email.isCritical && (now - email.spawnTime) > email.timeToLive));
        }
        return prev;
      });
    }, 500);

    return () => clearInterval(checkExpired);
  }, [gameState, playSound]);

  // Handle Action
  const handleAction = useCallback((id: number, action: 'delegate' | 'delete') => {
    if (gameState !== 'playing') return;

    setEmails(prevEmails => {
      const email = prevEmails.find(e => e.id === id);
      if (!email) return prevEmails;

      const isCorrect = email.action === action;
      const responseTime = Date.now() - email.spawnTime;
      const isFast = responseTime < 1200;
      const isLightning = responseTime < 600;

      if (isCorrect) {
        let points = 10;
        let bonusText = '';

        // Speed bonuses
        if (isLightning) {
          points += 10;
          bonusText = '⚡ LIGHTNING!';
          setStats(prev => ({ ...prev, fastActions: prev.fastActions + 1 }));
        } else if (isFast) {
          points += 5;
          bonusText = '💨 Fast!';
          setStats(prev => ({ ...prev, fastActions: prev.fastActions + 1 }));
        }

        // Critical email bonus
        if (email.isCritical) {
          points += 15;
          bonusText = '🔥 CRITICAL SAVED!';
          setStats(prev => ({ ...prev, criticalSaved: prev.criticalSaved + 1 }));
        }

        // Update combo
        setCombo(prevCombo => {
          const newCombo = prevCombo + 1;

          // Combo bonuses
          if (newCombo >= 10) {
            points += 25;
            setComboPopup({ text: '🏆 10x LEGENDARY!', color: 'text-yellow-400' });
            updateCaptain('combo10');
            playSound('combo');
            if (navigator.vibrate) navigator.vibrate([20, 15, 25]);
          } else if (newCombo >= 7) {
            points += 18;
            setComboPopup({ text: '💎 7x CHAIN!', color: 'text-purple-400' });
            updateCaptain('combo7');
            playSound('combo');
          } else if (newCombo >= 5) {
            points += 15;
            setComboPopup({ text: '⚡ 5x STREAK!', color: 'text-cyan-400' });
            updateCaptain('combo5');
            playSound('combo');
          } else if (newCombo >= 3) {
            points += 5;
            setComboPopup({ text: '🔥 3x COMBO!', color: 'text-orange-400' });
            updateCaptain('combo3');
          } else {
            updateCaptain('correct');
          }

          if (newCombo >= 3) {
            setTimeout(() => setComboPopup(null), 800);
          }

          setMaxCombo(prev => Math.max(prev, newCombo));
          return newCombo;
        });

        // Update score and stats
        setScore(prev => prev + points);
        setEmailsTriaged(prev => {
          const newCount = prev + 1;
          if (newCount >= 20) {
            setTimeout(() => endGame(true), 100);
          }
          return newCount;
        });
        setStats(prev => ({ ...prev, correct: prev.correct + 1 }));

        // Visual feedback
        setFlashColor('green');
        setTimeout(() => setFlashColor(null), 120);
        playSound('correct');

        // Floating points particle
        setParticles(prev => [...prev, {
          id: Date.now(),
          text: `+${points}`,
          subtext: bonusText,
          color: points >= 25 ? 'text-yellow-400' : points >= 15 ? 'text-cyan-400' : 'text-green-400'
        }]);
        setTimeout(() => setParticles(prev => prev.slice(1)), 800);

        // Remove email
        return prevEmails.filter(e => e.id !== id);
      } else {
        // Wrong action
        setCombo(0);
        setScore(prev => Math.max(0, prev - 8));
        setStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
        updateCaptain('wrong');

        setFlashColor('red');
        setShake(true);
        setTimeout(() => {
          setFlashColor(null);
          setShake(false);
        }, 300);
        playSound('wrong');
        if (navigator.vibrate) navigator.vibrate(80);

        return prevEmails; // Keep email on wrong action
      }
    });
  }, [gameState, playSound, updateCaptain, endGame]);

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // Quick start with spacebar
      if (key === ' ' && gameState === 'start') {
        e.preventDefault();
        startGame();
        return;
      }

      if (gameState !== 'playing') return;

      // Navigation
      if (key === 'arrowup' || key === 'w') {
        e.preventDefault();
        setSelectedEmailIndex(prev => Math.max(0, prev - 1));
      } else if (key === 'arrowdown' || key === 's') {
        e.preventDefault();
        setSelectedEmailIndex(prev => Math.min(emails.length - 1, prev + 1));
      } else if (key >= '1' && key <= '5') {
        const idx = parseInt(key) - 1;
        if (idx < emails.length) setSelectedEmailIndex(idx);
      }

      // Actions
      if (emails.length > 0 && selectedEmailIndex < emails.length) {
        const selectedEmail = emails[selectedEmailIndex];
        if (key === 'd' || key === 'arrowright') {
          e.preventDefault();
          handleAction(selectedEmail.id, 'delegate');
        } else if (key === 'x' || key === 'arrowleft' || key === 'delete' || key === 'backspace') {
          e.preventDefault();
          handleAction(selectedEmail.id, 'delete');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, emails, selectedEmailIndex, handleAction, startGame]);

  // Keep selected index valid
  useEffect(() => {
    if (selectedEmailIndex >= emails.length && emails.length > 0) {
      setSelectedEmailIndex(emails.length - 1);
    } else if (emails.length === 0) {
      setSelectedEmailIndex(0);
    }
  }, [emails.length, selectedEmailIndex]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Overflow check
  useEffect(() => {
    if (gameState === 'playing' && emails.length >= 6) {
      endGame(false);
    }
  }, [emails.length, gameState, endGame]);

  // Captain mood colors
  const moodColors = {
    neutral: 'bg-cyan-600',
    happy: 'bg-green-500',
    helpful: 'bg-blue-500',
    excited: 'bg-yellow-500',
    concerned: 'bg-orange-500',
    urgent: 'bg-red-500',
    victory: 'bg-gradient-to-r from-yellow-400 via-green-400 to-cyan-400',
    sad: 'bg-slate-500'
  };

  // Progress percentage
  const progressPercent = (emailsTriaged / 20) * 100;

  return (
    <div
      ref={gameAreaRef}
      className={`w-full max-w-lg mx-auto bg-slate-900/95 border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl relative backdrop-blur-sm transition-all
        ${shake ? 'animate-pulse' : ''}`}
      style={{
        boxShadow: flashColor === 'green' ? '0 0 50px rgba(34, 197, 94, 0.5)' :
          flashColor === 'red' ? '0 0 50px rgba(239, 68, 68, 0.5)' :
            '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
      }}
    >
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .shake-animation {
          animation: shake 0.3s ease-in-out;
        }
        @keyframes criticalPulse {
          0%, 100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.7); }
        }
        .critical-pulse {
          animation: criticalPulse 1s ease-in-out infinite;
        }
      `}</style>

      {/* Header HUD */}
      <div className="bg-slate-800/95 p-3 sm:p-4 border-b border-slate-600 backdrop-blur-xl">
        {/* Top Row - Score & Time */}
        <div className="flex justify-between items-center gap-3 mb-2">
          {/* Score */}
          <div className="text-center flex-1">
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">{score}</div>
            {personalBest.score > 0 && score <= personalBest.score && (
              <div className="text-[10px] text-slate-300">Best: {personalBest.score}</div>
            )}
            {score > personalBest.score && (
              <div className="text-[10px] text-yellow-400 font-bold animate-pulse">🏆 NEW BEST!</div>
            )}
          </div>

          {/* Time */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${timeLeft <= 10 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-700/50 text-slate-300'
            }`}>
            <Clock size={18} />
            <span className="font-bold font-mono text-lg sm:text-xl">{timeLeft}s</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-3 bg-slate-700/50 rounded-full overflow-hidden mb-2">
          <m.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-green-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white drop-shadow-lg">{emailsTriaged}/20 TRIAGED</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex justify-between items-center gap-2">
          {/* Combo */}
          <div className="flex items-center gap-3">
            {combo > 0 && (
              <m.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg ${combo >= 7 ? 'bg-purple-500/30 text-purple-400' :
                  combo >= 5 ? 'bg-cyan-500/30 text-cyan-400' :
                    combo >= 3 ? 'bg-orange-500/30 text-orange-400' :
                      'bg-slate-600/30 text-slate-300'
                  }`}
              >
                <Flame size={16} className={combo >= 5 ? 'animate-pulse' : ''} />
                <span className="font-bold font-mono">{combo}x</span>
              </m.div>
            )}
            <div className="text-xs text-slate-300 font-mono">W{wave}</div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600 active:scale-95 transition-all"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? <Volume2 size={16} className="text-slate-300" /> : <VolumeX size={16} className="text-slate-300" />}
            </button>
            <button
              onClick={() => setShowControls(!showControls)}
              className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600 active:scale-95 transition-all hidden sm:block"
            >
              <Keyboard size={16} className="text-slate-300" />
            </button>
          </div>
        </div>

        {/* Captain Bar */}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-600/50">
          <m.div
            animate={{ scale: captainMessage.mood === 'excited' || captainMessage.mood === 'victory' ? [1, 1.1, 1] : 1 }}
            transition={{ repeat: captainMessage.mood === 'excited' ? Infinity : 0, duration: 0.5 }}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg transition-all ${moodColors[captainMessage.mood]} ${captainMessage.mood === 'urgent' || captainMessage.mood === 'excited' ? 'animate-pulse' : ''}`}
          >
            CE
          </m.div>
          <p className="flex-1 text-sm sm:text-base text-cyan-300 font-medium">{captainMessage.text}</p>
        </div>
      </div>

      {/* Keyboard Shortcuts Panel */}
      <AnimatePresence>
        {showControls && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-800/90 border-b border-slate-600 px-4 py-3 overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-green-900/50 rounded text-green-400 font-mono">D</kbd>
                <span className="text-slate-300">Delegate</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-red-900/50 rounded text-red-400 font-mono">X</kbd>
                <span className="text-slate-300">Delete</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-300 font-mono">↑↓</kbd>
                <span className="text-slate-300">Select email</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-300 font-mono">1-5</kbd>
                <span className="text-slate-300">Quick select</span>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Game Area */}
      <div className="relative min-h-[400px] sm:min-h-[450px] max-h-[60vh] bg-gradient-to-b from-[#0a0a14] to-[#0f0f1a] overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />

        {/* Wave Announcement */}
        <AnimatePresence>
          {waveAnnouncement && (
            <m.div
              initial={{ opacity: 0, scale: 2, y: -50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
            >
              <div className="text-4xl sm:text-6xl font-black text-cyan-500/40 tracking-widest text-center">
                {waveAnnouncement}
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Combo Popup */}
        <AnimatePresence>
          {comboPopup && (
            <m.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.5, y: -30 }}
              className={`absolute top-4 left-1/2 -translate-x-1/2 ${comboPopup.color} font-black text-2xl sm:text-3xl z-30 pointer-events-none drop-shadow-lg`}
            >
              {comboPopup.text}
            </m.div>
          )}
        </AnimatePresence>

        {/* Start Screen */}
        {gameState === 'start' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-30 backdrop-blur-sm text-center p-4 sm:p-6">
            <m.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-lg shadow-cyan-500/30 mx-auto">
                CE
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">Inbox Defense</h3>
              <p className="text-slate-300 mb-6 text-sm sm:text-base">
                Train your AI Triage Agent! Sort 20 emails before time runs out.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="bg-green-900/40 border border-green-500/40 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center justify-center gap-2 text-green-400 font-bold mb-1 text-sm sm:text-base">
                    <Check size={18} /> DELEGATE
                  </div>
                  <p className="text-slate-300 text-xs">Work emails, meetings, deadlines, clients</p>
                </div>
                <div className="bg-red-900/40 border border-red-500/40 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center justify-center gap-2 text-red-400 font-bold mb-1 text-sm sm:text-base">
                    <Trash2 size={18} /> DELETE
                  </div>
                  <p className="text-slate-300 text-xs">Spam, newsletters, promos, receipts</p>
                </div>
              </div>

              {/* Mobile hint */}
              <div className="text-xs text-slate-300 mb-4 sm:hidden">
                📱 Swipe cards or tap buttons
              </div>

              {/* Desktop hint */}
              <div className="text-xs text-slate-300 mb-4 hidden sm:block">
                ⌨️ <kbd className="px-1 py-0.5 bg-slate-700 rounded mx-0.5">D</kbd> Delegate
                <kbd className="px-1 py-0.5 bg-slate-700 rounded mx-0.5">X</kbd> Delete
                <kbd className="px-1 py-0.5 bg-slate-700 rounded mx-0.5">Space</kbd> Start
              </div>

              <button
                onClick={startGame}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 active:scale-95 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-cyan-900/50"
              >
                <Play size={24} /> START MISSION
              </button>

              {personalBest.score > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-yellow-400 text-sm">
                  <Trophy size={18} />
                  Personal Best: {personalBest.score} pts
                </div>
              )}
            </m.div>
          </div>
        )}

        {/* Pause Screen */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-40 backdrop-blur-md text-center p-4">
            <m.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <div className="text-6xl mb-4">⏸️</div>
              <h2 className="text-2xl font-bold text-white mb-2">Game Paused</h2>
              <p className="text-slate-300 mb-2">Tab was hidden</p>
              <p className="text-sm text-slate-400 mb-6">
                Score: {score} • Time: {timeLeft}s • Triaged: {emailsTriaged}
              </p>
              <m.button
                whileTap={{ scale: 0.95 }}
                onClick={resumeGame}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center gap-2 mx-auto"
              >
                <Play size={20} fill="white" /> Resume
              </m.button>
            </m.div>
          </div>
        )}

        {/* Game Over Screen */}
        {(gameState === 'won' || gameState === 'lost') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-30 backdrop-blur-md text-center p-4 sm:p-6">
            <m.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm"
            >
              <m.h3
                animate={gameState === 'won' ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: gameState === 'won' ? 3 : 0, duration: 0.3 }}
                className={`text-3xl sm:text-4xl font-bold mb-3 ${gameState === 'won' ? 'text-green-400' : 'text-red-400'}`}
              >
                {gameState === 'won' ? '🎯 INBOX ZERO!' : '📥 OVERFLOW!'}
              </m.h3>

              <div className="text-5xl sm:text-6xl font-black text-white mb-2 font-mono">{score}</div>

              {score > 0 && score >= personalBest.score && (
                <m.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-4 py-1.5 rounded-full text-sm font-bold mb-4"
                >
                  <Trophy size={16} /> NEW PERSONAL BEST!
                </m.div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 mb-6">
                <div className="bg-slate-800/60 rounded-xl p-3">
                  <div className="text-slate-300 text-xs mb-1">Triaged</div>
                  <div className="text-2xl font-bold text-white">{emailsTriaged}<span className="text-slate-300 text-lg">/20</span></div>
                </div>
                <div className="bg-slate-800/60 rounded-xl p-3">
                  <div className="text-slate-300 text-xs mb-1">Max Combo</div>
                  <div className="text-2xl font-bold text-orange-400">{maxCombo}x</div>
                </div>
                <div className="bg-slate-800/60 rounded-xl p-3">
                  <div className="text-slate-300 text-xs mb-1">Accuracy</div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {stats.correct + stats.wrong > 0
                      ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
                      : 0}%
                  </div>
                </div>
                <div className="bg-slate-800/60 rounded-xl p-3">
                  <div className="text-slate-300 text-xs mb-1">Fast Actions</div>
                  <div className="text-2xl font-bold text-yellow-400">{stats.fastActions}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onBack}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white px-5 py-3 rounded-xl font-bold transition-all"
                >
                  <ArrowLeft size={20} /> Hub
                </button>
                <button
                  onClick={startGame}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 active:scale-95 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-cyan-900/50"
                >
                  <RotateCcw size={20} /> Play Again
                </button>
              </div>

              {/* PROMINENT SHARE / CHALLENGE SECTION */}
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 rounded-xl p-3 mt-4">
                <p className="text-purple-300 text-xs font-medium mb-2 text-center">
                  📸 Challenge a friend to beat your score!
                </p>
                <button
                  onClick={shareScore}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Share2 size={16} />
                  Challenge a Friend
                </button>
              </div>
            </m.div>
          </div>
        )}

        {/* EMAIL LIST */}
        {gameState === 'playing' && (
          <div
            ref={emailContainerRef}
            className="p-3 sm:p-4 space-y-2 overflow-y-auto max-h-[400px] sm:max-h-[450px]"
          >
            {emails.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-slate-300">
                <Mail size={48} className="mb-3 opacity-30" />
                <p className="text-sm">Waiting for emails...</p>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {emails.map((email, index) => (
                <SwipeableEmailCard
                  key={email.id}
                  email={email}
                  index={index}
                  isSelected={index === selectedEmailIndex}
                  onSelect={setSelectedEmailIndex}
                  onAction={handleAction}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Floating Points */}
        <AnimatePresence>
          {particles.map(particle => (
            <m.div
              key={particle.id}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -60, scale: 1.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 ${particle.color} font-bold text-2xl pointer-events-none z-40 text-center`}
            >
              <div>{particle.text}</div>
              {particle.subtext && (
                <div className="text-sm opacity-80">{particle.subtext}</div>
              )}
            </m.div>
          ))}
        </AnimatePresence>

        {/* Danger Border */}
        {emails.length >= 4 && gameState === 'playing' && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="absolute inset-0 border-4 border-red-500 pointer-events-none z-10 rounded-b-2xl"
          />
        )}

        {/* Overflow Warning */}
        {emails.length >= 5 && gameState === 'playing' && (
          <m.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm animate-pulse z-20 shadow-lg"
          >
            ⚠️ INBOX CRITICAL! Clear emails NOW!
          </m.div>
        )}
      </div>
    </div>
  );
};

export default AgentTriageGame;