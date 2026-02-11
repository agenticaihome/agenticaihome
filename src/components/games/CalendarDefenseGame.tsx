'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion as m, AnimatePresence } from 'framer-motion';
import { Calendar, XCircle, Shield, Clock, Play, RotateCcw, ArrowLeft, Trophy, Volume2, VolumeX, Coffee, Zap, Battery, Keyboard, Share2, Pause } from 'lucide-react';
import confetti from 'canvas-confetti';

// Types
interface Meeting {
  id: number;
  name: string;
  color: string;
  borderColor: string;
  speed: number;
  damage: number;
  points: number;
  priority: 'low' | 'medium' | 'high' | 'boss';
  pattern: 'straight' | 'zigzag' | 'sine';
  icon: string;
  x: number;
  y: number;
  directionX?: number;
  amplitude?: number;
  frequency?: number;
  startTime: number;
}

interface PowerUp {
  id: number;
  type: 'shield' | 'coffee' | 'energy' | 'auto';
  name: string;
  color: string;
  icon: string;
  x: number;
  y: number;
  speed: number;
  effect: string;
}

interface Stats {
  declined: number;
  bossBlocked: number;
  powerUpsCollected: number;
  damagesTaken: number;
}

interface PersonalBest {
  score: number;
  time: number;
}

interface CaptainMessage {
  text: string;
  mood: 'neutral' | 'happy' | 'excited' | 'concerned' | 'urgent' | 'victory' | 'sad' | 'helpful';
}

interface Particle {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
}

type GameState = 'start' | 'playing' | 'paused' | 'won' | 'lost';

interface CalendarDefenseGameProps {
  onBack: () => void;
}

// Local storage helpers
const getCalendarBest = (): PersonalBest => {
  const stored = localStorage.getItem('calendar-defense-best');
  return stored ? JSON.parse(stored) : { score: 0, time: 0 };
};

const setCalendarBest = (best: PersonalBest) => {
  localStorage.setItem('calendar-defense-best', JSON.stringify(best));
};

const CalendarDefenseGame: React.FC<CalendarDefenseGameProps> = ({ onBack }) => {
  // Core Game State
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [deepWorkHours, setDeepWorkHours] = useState(8);
  const [enemies, setEnemies] = useState<Meeting[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);

  // Wave & Time
  const [wave, setWave] = useState(1);
  const [timer, setTimer] = useState(0);
  const [waveAnnouncement, setWaveAnnouncement] = useState<string | null>(null);

  // Shield System
  const [shieldActive, setShieldActive] = useState(false);
  const [shieldCooldown, setShieldCooldown] = useState(0);
  const [shieldCharges, setShieldCharges] = useState(2);
  const SHIELD_DURATION = 2000;
  const SHIELD_COOLDOWN = 8;

  // Combo & Multiplier
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);

  // Active Effects
  const [slowMotion, setSlowMotion] = useState(false);
  const [autoDeclineReady, setAutoDeclineReady] = useState(false);

  // Stats
  const [stats, setStats] = useState<Stats>({
    declined: 0,
    bossBlocked: 0,
    powerUpsCollected: 0,
    damagesTaken: 0
  });
  const [personalBest, setPersonalBest] = useState<PersonalBest>(() => getCalendarBest());

  // UI State
  const [captainMessage, setCaptainMessage] = useState<CaptainMessage>({ text: "Protect your Deep Work blocks!", mood: 'neutral' });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [hoveredEnemy, setHoveredEnemy] = useState<number | null>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // Refs
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const spawnerRef = useRef<NodeJS.Timeout | null>(null);
  const powerUpSpawnerRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimeRef = useRef(0);
  const audioContext = useRef<AudioContext | null>(null);
  const gameStateRef = useRef(gameState);

  // Keep ref in sync with state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Meeting types with movement patterns
  const meetingTypes = [
    // LOW PRIORITY - Easy to hit
    {
      name: 'Touch Base',
      color: 'from-green-600 to-green-700',
      borderColor: 'border-green-400',
      speed: 4.0,
      damage: 0.5,
      points: 50,
      priority: 'low' as const,
      pattern: 'straight' as const,
      icon: '💬'
    },
    {
      name: 'FYI Email',
      color: 'from-emerald-600 to-emerald-700',
      borderColor: 'border-emerald-400',
      speed: 3.5,
      damage: 0.3,
      points: 30,
      priority: 'low' as const,
      pattern: 'straight' as const,
      icon: '📧'
    },
    // MEDIUM PRIORITY - Moderate challenge
    {
      name: 'Brainstorm',
      color: 'from-yellow-500 to-yellow-600',
      borderColor: 'border-yellow-300',
      speed: 5.0,
      damage: 1,
      points: 100,
      priority: 'medium' as const,
      pattern: 'zigzag' as const,
      icon: '💡'
    },
    {
      name: 'Status Update',
      color: 'from-orange-500 to-orange-600',
      borderColor: 'border-orange-300',
      speed: 6.0,
      damage: 1,
      points: 100,
      priority: 'medium' as const,
      pattern: 'sine' as const,
      icon: '📊'
    },
    // HIGH PRIORITY - Hard to hit, fast moving
    {
      name: 'Emergency Call',
      color: 'from-red-500 to-red-600',
      borderColor: 'border-red-300',
      speed: 8.0,
      damage: 2,
      points: 200,
      priority: 'high' as const,
      pattern: 'sine' as const,
      icon: '🚨'
    },
    {
      name: 'Client Crisis',
      color: 'from-pink-500 to-pink-600',
      borderColor: 'border-pink-300',
      speed: 7.5,
      damage: 1.5,
      points: 150,
      priority: 'high' as const,
      pattern: 'zigzag' as const,
      icon: '🔥'
    },
    // BOSS MEETINGS - Special attacks
    {
      name: 'CEO 1:1',
      color: 'from-purple-600 to-purple-700',
      borderColor: 'border-purple-300',
      speed: 4.0,
      damage: 3,
      points: 500,
      priority: 'boss' as const,
      pattern: 'straight' as const,
      icon: '👑'
    }
  ];

  // PowerUp types
  const powerUpTypes = [
    {
      type: 'shield' as const,
      name: 'Focus Shield',
      color: 'from-blue-500 to-cyan-500',
      icon: '🛡️',
      speed: 2.0,
      effect: 'Blocks all meetings for 2 seconds'
    },
    {
      type: 'coffee' as const,
      name: 'Coffee Boost',
      color: 'from-amber-600 to-yellow-500',
      icon: '☕',
      speed: 2.5,
      effect: 'Doubles points for 5 seconds'
    },
    {
      type: 'energy' as const,
      name: 'Energy Drink',
      color: 'from-green-500 to-emerald-500',
      icon: '⚡',
      speed: 2.0,
      effect: 'Restores 1 hour of Deep Work'
    },
    {
      type: 'auto' as const,
      name: 'Auto-Decline',
      color: 'from-violet-500 to-purple-500',
      icon: '🤖',
      speed: 2.2,
      effect: 'Declines meetings automatically for 3 seconds'
    }
  ];

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
        case 'decline':
          oscillator.frequency.setValueAtTime(800, ctx.currentTime);
          oscillator.frequency.setValueAtTime(400, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.2);
          break;
        case 'damage':
          oscillator.frequency.setValueAtTime(150, ctx.currentTime);
          oscillator.type = 'sawtooth';
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
          break;
        case 'powerup':
          oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
          oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
          gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.24);
          break;
      }

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio not available
    }
  }, [soundEnabled]);

  // Captain Messages
  const captainMessages = {
    start: [
      { text: "Protect your Deep Work blocks! 💪", mood: 'excited' as const },
      { text: "Decline non-essential meetings!", mood: 'helpful' as const }
    ],
    damage: [
      { text: "Your focus is slipping! 😵", mood: 'concerned' as const },
      { text: "Defend your calendar!", mood: 'urgent' as const }
    ],
    combo: [
      { text: "Great streak! Keep going! 🔥", mood: 'excited' as const }
    ],
    powerup: [
      { text: "Power-up collected! ⚡", mood: 'happy' as const }
    ],
    critical: [
      { text: "Critical state! Focus! 🚨", mood: 'urgent' as const }
    ],
    win: [
      { text: "Calendar defended! 🎉", mood: 'victory' as const }
    ],
    lose: [
      { text: "Calendar overwhelmed! 📅", mood: 'sad' as const }
    ]
  };

  const updateCaptain = useCallback((eventType: keyof typeof captainMessages) => {
    const messages = captainMessages[eventType];
    if (messages) {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      setCaptainMessage(msg);
    }
  }, []);

  // End Game
  const endGame = useCallback((win: boolean) => {
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    if (spawnerRef.current) clearInterval(spawnerRef.current);
    if (powerUpSpawnerRef.current) clearInterval(powerUpSpawnerRef.current);
    
    gameLoopRef.current = null;
    spawnerRef.current = null;
    powerUpSpawnerRef.current = null;
    
    setGameState(win ? 'won' : 'lost');

    const finalScore = score;
    const finalTime = timer;

    setPersonalBest(prev => {
      if (finalScore > prev.score || finalTime > prev.time) {
        const newBest = {
          score: Math.max(finalScore, prev.score),
          time: Math.max(finalTime, prev.time)
        };
        setCalendarBest(newBest);
        return newBest;
      }
      return prev;
    });

    if (win) {
      updateCaptain('win');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else {
      updateCaptain('lose');
    }
  }, [score, timer, updateCaptain]);

  // Spawn Enemy
  const spawnEnemy = useCallback(() => {
    const template = meetingTypes[Math.floor(Math.random() * meetingTypes.length)];
    const startX = Math.random() * 300;
    
    const newEnemy: Meeting = {
      id: Date.now() + Math.random(),
      ...template,
      x: startX,
      y: -50,
      directionX: Math.random() > 0.5 ? 1 : -1,
      amplitude: 20 + Math.random() * 30,
      frequency: 0.02 + Math.random() * 0.03,
      startTime: Date.now()
    };

    setEnemies(prev => [...prev, newEnemy]);
  }, []);

  // Spawn PowerUp
  const spawnPowerUp = useCallback(() => {
    if (Math.random() > 0.7) return; // 30% chance

    const template = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    const startX = Math.random() * 300;
    
    const newPowerUp: PowerUp = {
      id: Date.now() + Math.random(),
      ...template,
      x: startX,
      y: -30
    };

    setPowerUps(prev => [...prev, newPowerUp]);
  }, []);

  // Start Game
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setDeepWorkHours(8);
    setTimer(0);
    setEnemies([]);
    setPowerUps([]);
    setWave(1);
    setCombo(0);
    setMaxCombo(0);
    setShieldCharges(2);
    setStats({ declined: 0, bossBlocked: 0, powerUpsCollected: 0, damagesTaken: 0 });
    updateCaptain('start');

    // Start main game loop
    gameLoopRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
      gameTimeRef.current += 1;
    }, 1000);

    // Start enemy spawner
    spawnerRef.current = setInterval(() => {
      spawnEnemy();
    }, 2000 - (wave * 200)); // Faster spawning with waves

    // Start powerup spawner
    powerUpSpawnerRef.current = setInterval(() => {
      spawnPowerUp();
    }, 8000);
  }, [wave, spawnEnemy, spawnPowerUp, updateCaptain]);

  // Handle Click
  const handleClick = useCallback((x: number, y: number) => {
    if (gameState !== 'playing') return;

    // Check shield activation
    if (!shieldActive && shieldCharges > 0 && shieldCooldown === 0) {
      setShieldActive(true);
      setShieldCharges(prev => prev - 1);
      setShieldCooldown(SHIELD_COOLDOWN);
      playSound('powerup');
      
      setTimeout(() => {
        setShieldActive(false);
      }, SHIELD_DURATION);

      return;
    }

    // Check enemy clicks
    const hitEnemy = enemies.find(enemy => 
      Math.abs(enemy.x - x) < 40 && Math.abs(enemy.y - y) < 40
    );

    if (hitEnemy) {
      // Remove enemy
      setEnemies(prev => prev.filter(e => e.id !== hitEnemy.id));
      
      // Add score
      let points = hitEnemy.points;
      if (multiplier > 1) points *= multiplier;
      
      setScore(prev => prev + points);
      setStats(prev => ({ 
        ...prev, 
        declined: prev.declined + 1,
        bossBlocked: hitEnemy.priority === 'boss' ? prev.bossBlocked + 1 : prev.bossBlocked
      }));

      // Update combo
      setCombo(prev => {
        const newCombo = prev + 1;
        setMaxCombo(max => Math.max(max, newCombo));
        if (newCombo >= 5) updateCaptain('combo');
        return newCombo;
      });

      playSound('decline');

      // Add particle
      setParticles(prev => [...prev, {
        id: Date.now(),
        text: `+${points}`,
        color: 'text-green-400',
        x,
        y
      }]);

      setTimeout(() => setParticles(prev => prev.slice(1)), 1000);
    }
  }, [gameState, shieldActive, shieldCharges, shieldCooldown, enemies, multiplier, playSound, updateCaptain]);

  // Game Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const physics = setInterval(() => {
      // Move enemies
      setEnemies(prev => {
        const updated = prev.map(enemy => {
          let newY = enemy.y + enemy.speed;
          let newX = enemy.x;

          // Apply movement patterns
          if (enemy.pattern === 'sine') {
            const time = (Date.now() - enemy.startTime) / 1000;
            newX = enemy.x + Math.sin(time * enemy.frequency!) * enemy.amplitude! * 0.1;
          } else if (enemy.pattern === 'zigzag') {
            const time = (Date.now() - enemy.startTime) / 1000;
            newX = enemy.x + Math.sin(time * 3) * 20;
          }

          return { ...enemy, x: newX, y: newY };
        }).filter(enemy => {
          // Remove enemies that reach bottom
          if (enemy.y > 500) {
            // Damage player if not shielded
            if (!shieldActive) {
              setDeepWorkHours(prev => {
                const newHours = Math.max(0, prev - enemy.damage);
                if (newHours <= 0) {
                  setTimeout(() => endGame(false), 100);
                }
                return newHours;
              });
              setStats(prev => ({ ...prev, damagesTaken: prev.damagesTaken + 1 }));
              setCombo(0);
              setShake(true);
              setTimeout(() => setShake(false), 300);
              playSound('damage');
              updateCaptain('damage');
            }
            return false;
          }
          return true;
        });

        return updated;
      });

      // Move powerups
      setPowerUps(prev => prev.map(powerUp => ({
        ...powerUp,
        y: powerUp.y + powerUp.speed
      })).filter(powerUp => powerUp.y < 500));

      // Shield cooldown
      setShieldCooldown(prev => Math.max(0, prev - 0.1));
    }, 50);

    return () => clearInterval(physics);
  }, [gameState, shieldActive, endGame, playSound, updateCaptain]);

  // Handle PowerUp Click
  const handlePowerUpClick = useCallback((powerUp: PowerUp) => {
    setPowerUps(prev => prev.filter(p => p.id !== powerUp.id));
    setStats(prev => ({ ...prev, powerUpsCollected: prev.powerUpsCollected + 1 }));
    playSound('powerup');
    updateCaptain('powerup');

    switch (powerUp.type) {
      case 'shield':
        setShieldCharges(prev => Math.min(3, prev + 1));
        break;
      case 'coffee':
        setMultiplier(2);
        setTimeout(() => setMultiplier(1), 5000);
        break;
      case 'energy':
        setDeepWorkHours(prev => Math.min(8, prev + 1));
        break;
      case 'auto':
        setAutoDeclineReady(true);
        setTimeout(() => {
          setEnemies(prev => prev.slice(0, Math.max(0, prev.length - 3)));
          setAutoDeclineReady(false);
        }, 3000);
        break;
    }
  }, [playSound, updateCaptain]);

  // Share Score
  const shareScore = useCallback(() => {
    const text = `🛡️ I defended my calendar for ${timer} seconds and scored ${score} points in Calendar Defense!\n\nMeetings declined: ${stats.declined} | Deep Work saved: ${Math.round((8 - deepWorkHours) * 10) / 10}h\nThink you can beat me? 🎮\n\nPlay free: AgenticAIHome.com/learn/playground`;

    if (navigator.share) {
      navigator.share({
        title: 'Calendar Defense Challenge',
        text
      }).catch(() => {
        navigator.clipboard?.writeText(text);
        alert('Challenge copied! Paste it anywhere to challenge a friend.');
      });
    } else {
      navigator.clipboard?.writeText(text);
      alert('Challenge copied! Paste it anywhere to challenge a friend.');
    }
  }, [score, timer, stats.declined, deepWorkHours]);

  // Mood colors for captain
  const moodColors = {
    neutral: 'bg-blue-600',
    happy: 'bg-green-500',
    excited: 'bg-yellow-500',
    concerned: 'bg-orange-500',
    urgent: 'bg-red-500',
    victory: 'bg-gradient-to-r from-yellow-400 via-green-400 to-cyan-400',
    sad: 'bg-slate-500',
    helpful: 'bg-teal-500'
  };

  return (
    <div className={`w-full max-w-md mx-auto bg-slate-900/95 border border-blue-500/30 rounded-2xl overflow-hidden shadow-2xl relative ${shake ? 'animate-pulse' : ''}`}>
      {/* Header */}
      <div className="bg-slate-800/95 p-4 border-b border-slate-600">
        <div className="flex justify-between items-center mb-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{score}</div>
            <div className="text-xs text-slate-300">Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">{deepWorkHours}h</div>
            <div className="text-xs text-slate-300">Deep Work</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{timer}s</div>
            <div className="text-xs text-slate-300">Time</div>
          </div>
        </div>

        {/* Deep Work Progress */}
        <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
          <div 
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(deepWorkHours / 8) * 100}%` }}
          />
        </div>

        {/* Captain Message */}
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${moodColors[captainMessage.mood]}`}>
            CD
          </div>
          <p className="text-sm text-cyan-300 flex-1">{captainMessage.text}</p>
        </div>

        {/* Shield & Controls */}
        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded flex items-center justify-center ${
                  i < shieldCharges ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-400'
                }`}
              >
                <Shield size={12} />
              </div>
            ))}
            {shieldCooldown > 0 && (
              <div className="text-xs text-slate-400">
                {Math.ceil(shieldCooldown)}s
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded bg-slate-700/50 hover:bg-slate-600"
            >
              {soundEnabled ? <Volume2 size={14} className="text-slate-300" /> : <VolumeX size={14} className="text-slate-300" />}
            </button>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div 
        className="relative h-96 bg-gradient-to-b from-slate-800 to-slate-900 overflow-hidden cursor-crosshair"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          handleClick(x, y);
        }}
      >
        {/* Shield Effect */}
        {shieldActive && (
          <div className="absolute inset-0 bg-blue-500/20 border-2 border-blue-400 animate-pulse pointer-events-none" />
        )}

        {/* Start Screen */}
        {gameState === 'start' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-center p-4">
            <Calendar className="w-16 h-16 text-blue-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Calendar Defense</h3>
            <p className="text-slate-300 mb-4 text-sm">
              Protect your Deep Work time! Click to decline meetings.
            </p>
            <div className="text-xs text-slate-400 mb-6">
              🛡️ Click shield to activate protection<br/>
              ⚡ Collect power-ups for bonuses
            </div>
            <button
              onClick={startGame}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-xl font-bold transition-all"
            >
              <Play size={20} /> Start Defense
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {(gameState === 'won' || gameState === 'lost') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center p-4">
            <div className={`text-4xl mb-3 ${gameState === 'won' ? 'text-green-400' : 'text-red-400'}`}>
              {gameState === 'won' ? '🎯 VICTORY!' : '📅 OVERLOADED!'}
            </div>
            <div className="text-3xl font-bold text-white mb-2">{score}</div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-xs">
              <div className="bg-slate-800 p-2 rounded">
                <div className="text-slate-300">Time</div>
                <div className="text-white font-bold">{timer}s</div>
              </div>
              <div className="bg-slate-800 p-2 rounded">
                <div className="text-slate-300">Declined</div>
                <div className="text-white font-bold">{stats.declined}</div>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={onBack}
                className="flex items-center gap-1 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                <ArrowLeft size={16} /> Hub
              </button>
              <button
                onClick={startGame}
                className="flex items-center gap-1 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm"
              >
                <RotateCcw size={16} /> Again
              </button>
            </div>

            <button
              onClick={shareScore}
              className="flex items-center gap-1 bg-purple-500 text-white px-4 py-2 rounded-lg text-sm"
            >
              <Share2 size={16} /> Share
            </button>
          </div>
        )}

        {/* Enemies */}
        <AnimatePresence>
          {enemies.map((enemy) => (
            <m.div
              key={enemy.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={`absolute w-16 h-8 bg-gradient-to-r ${enemy.color} border-2 ${enemy.borderColor} rounded-lg cursor-pointer flex items-center justify-center text-white text-xs font-bold shadow-lg`}
              style={{ 
                left: enemy.x, 
                top: enemy.y,
                transform: hoveredEnemy === enemy.id ? 'scale(1.1)' : 'scale(1)'
              }}
              onMouseEnter={() => setHoveredEnemy(enemy.id)}
              onMouseLeave={() => setHoveredEnemy(null)}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const parentRect = e.currentTarget.parentElement!.getBoundingClientRect();
                handleClick(rect.left - parentRect.left + rect.width/2, rect.top - parentRect.top + rect.height/2);
              }}
            >
              <span className="mr-1">{enemy.icon}</span>
              <span className="text-[10px] truncate">{enemy.name}</span>
            </m.div>
          ))}
        </AnimatePresence>

        {/* PowerUps */}
        <AnimatePresence>
          {powerUps.map((powerUp) => (
            <m.div
              key={powerUp.id}
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              exit={{ scale: 0 }}
              className={`absolute w-10 h-10 bg-gradient-to-r ${powerUp.color} rounded-full cursor-pointer flex items-center justify-center text-white text-lg shadow-lg border-2 border-white/20`}
              style={{ left: powerUp.x, top: powerUp.y }}
              onClick={(e) => {
                e.stopPropagation();
                handlePowerUpClick(powerUp);
              }}
            >
              {powerUp.icon}
            </m.div>
          ))}
        </AnimatePresence>

        {/* Particles */}
        <AnimatePresence>
          {particles.map((particle) => (
            <m.div
              key={particle.id}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -50, scale: 1.2 }}
              exit={{ opacity: 0 }}
              className={`absolute ${particle.color} font-bold text-lg pointer-events-none`}
              style={{ left: particle.x, top: particle.y }}
            >
              {particle.text}
            </m.div>
          ))}
        </AnimatePresence>

        {/* Effects */}
        {multiplier > 1 && (
          <div className="absolute top-2 right-2 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-bold">
            ☕ 2x POINTS
          </div>
        )}

        {autoDeclineReady && (
          <div className="absolute top-2 left-2 bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs font-bold animate-pulse">
            🤖 AUTO-DECLINE
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarDefenseGame;