'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion as m, AnimatePresence } from 'framer-motion';
import { Zap, Target, Clock, Trophy, Play, RotateCcw, ArrowLeft, Flame, Star, Share2, Pause, Volume2, VolumeX } from 'lucide-react';
import confetti from 'canvas-confetti';

// Types
interface ClickEffect {
  id: number;
  x: number;
  y: number;
  points: number;
  isCritical: boolean;
}

interface PowerUp {
  id: number;
  type: 'freeze' | 'double' | 'grow';
  emoji: string;
  label: string;
  color: string;
  duration: number;
  x: number;
  y: number;
}

interface PersonalBest {
  score: number;
  accuracy: number;
}

type GameState = 'idle' | 'playing' | 'paused' | 'finished';

interface CaptainClickChallengeProps {
  onBack: () => void;
}

// Local storage helpers
const getCaptainClickBest = (): PersonalBest => {
  const stored = localStorage.getItem('captain-click-best');
  return stored ? JSON.parse(stored) : { score: 0, accuracy: 0 };
};

const setCaptainClickBest = (best: PersonalBest) => {
  localStorage.setItem('captain-click-best', JSON.stringify(best));
};

const CaptainClickChallenge: React.FC<CaptainClickChallengeProps> = ({ onBack }) => {
  // Game state
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<PersonalBest>(() => getCaptainClickBest());
  const [timeLeft, setTimeLeft] = useState(30);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  // Captain state
  const [captainPos, setCaptainPos] = useState({ x: 50, y: 50 });
  const [captainScale, setCaptainScale] = useState(1);
  const [isFrozen, setIsFrozen] = useState(false);

  // Visual effects
  const [clickEffects, setClickEffects] = useState<ClickEffect[]>([]);
  const [screenShake, setScreenShake] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [criticalHit, setCriticalHit] = useState(false);

  // Audio
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Combo system
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [frenzyMode, setFrenzyMode] = useState(false);

  // Power-ups
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [activePowerUp, setActivePowerUp] = useState<PowerUp | null>(null);
  const [powerUpTimer, setPowerUpTimer] = useState(0);

  // Stats
  const [clicks, setClicks] = useState(0);
  const [hits, setHits] = useState(0);

  // Difficulty
  const [moveInterval, setMoveInterval] = useState(1200);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const moveRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef(0);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const gameStateRef = useRef(gameState);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Power-up definitions
  const POWER_UP_TYPES = [
    { type: 'freeze' as const, emoji: '❄️', label: 'Freeze', color: 'from-cyan-400 to-cyan-600', duration: 3000 },
    { type: 'double' as const, emoji: '💎', label: '2X Points', color: 'from-purple-400 to-purple-600', duration: 5000 },
    { type: 'grow' as const, emoji: '🎯', label: 'Big Target', color: 'from-green-400 to-green-600', duration: 4000 },
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
        case 'hit':
          oscillator.frequency.setValueAtTime(800, ctx.currentTime);
          oscillator.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.15);
          break;
        case 'critical':
          oscillator.frequency.setValueAtTime(1000, ctx.currentTime);
          oscillator.frequency.setValueAtTime(1500, ctx.currentTime + 0.05);
          oscillator.frequency.setValueAtTime(2000, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.2);
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
      console.warn('Audio not available:', e);
    }
  }, [soundEnabled]);

  // Haptic feedback
  const triggerHaptic = (pattern: number | number[] = 10) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  // Move Captain
  const moveCaptain = useCallback(() => {
    if (gameState !== 'playing' || isFrozen) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const maxX = rect.width - 80;
      const maxY = rect.height - 80;
      
      setCaptainPos({
        x: Math.random() * maxX,
        y: Math.random() * maxY
      });
    }
  }, [gameState, isFrozen]);

  // Start Game
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(30);
    setCombo(0);
    setMaxCombo(0);
    setClicks(0);
    setHits(0);
    setClickEffects([]);
    setPowerUps([]);
    setActivePowerUp(null);
    setIsNewHighScore(false);
    setCaptainScale(1);
    setIsFrozen(false);
    setMoveInterval(1200);

    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start movement
    const move = () => {
      moveCaptain();
      if (gameStateRef.current === 'playing') {
        moveRef.current = setTimeout(move, moveInterval - Math.min(800, score / 50));
      }
    };
    move();

    // Spawn power-ups occasionally
    const spawnPowerUp = () => {
      if (Math.random() < 0.3 && gameStateRef.current === 'playing') {
        const powerUpType = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
        const newPowerUp: PowerUp = {
          id: Date.now(),
          ...powerUpType,
          x: Math.random() * 300,
          y: Math.random() * 300
        };
        setPowerUps(prev => [...prev, newPowerUp]);
      }
      if (gameStateRef.current === 'playing') {
        setTimeout(spawnPowerUp, 8000 + Math.random() * 4000);
      }
    };
    setTimeout(spawnPowerUp, 5000);

  }, [moveCaptain, moveInterval, score]);

  // End Game
  const endGame = useCallback(() => {
    setGameState('finished');
    
    if (timerRef.current) clearInterval(timerRef.current);
    if (moveRef.current) clearTimeout(moveRef.current);
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);

    const accuracy = clicks > 0 ? Math.round((hits / clicks) * 100) : 0;
    const newBest = { score, accuracy };

    if (score > highScore.score) {
      setIsNewHighScore(true);
      setCaptainClickBest(newBest);
      setHighScore(newBest);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [score, highScore.score, clicks, hits]);

  // Handle Captain Click
  const handleCaptainClick = useCallback((e: React.MouseEvent) => {
    if (gameState !== 'playing') return;

    e.stopPropagation();
    setClicks(prev => prev + 1);
    setHits(prev => prev + 1);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check for critical hit (center area)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const isCritical = distanceFromCenter < 20;

    // Calculate points
    let basePoints = 100;
    if (isCritical) {
      basePoints = 200;
      setCriticalHit(true);
      setTimeout(() => setCriticalHit(false), 300);
      triggerHaptic([20, 10, 20]);
      playSound('critical');
    } else {
      triggerHaptic(15);
      playSound('hit');
    }

    // Apply multipliers
    let totalPoints = basePoints;
    if (activePowerUp?.type === 'double') totalPoints *= 2;
    if (frenzyMode) totalPoints *= 1.5;
    if (combo >= 5) totalPoints += 50;

    setScore(prev => prev + totalPoints);

    // Update combo
    setCombo(prev => {
      const newCombo = prev + 1;
      setMaxCombo(max => Math.max(max, newCombo));
      
      if (newCombo >= 10 && !frenzyMode) {
        setFrenzyMode(true);
        setTimeout(() => setFrenzyMode(false), 5000);
      }
      
      return newCombo;
    });

    // Reset combo timeout
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    comboTimeoutRef.current = setTimeout(() => {
      setCombo(0);
    }, 2000);

    // Add click effect
    setClickEffects(prev => [...prev, {
      id: Date.now(),
      x: e.clientX - containerRef.current!.getBoundingClientRect().left,
      y: e.clientY - containerRef.current!.getBoundingClientRect().top,
      points: totalPoints,
      isCritical
    }]);

    // Flash effect
    setFlashColor(isCritical ? 'gold' : 'cyan');
    setTimeout(() => setFlashColor(null), 100);

    // Move captain immediately
    moveCaptain();

    // Clean up old effects
    setTimeout(() => {
      setClickEffects(prev => prev.slice(1));
    }, 800);
  }, [gameState, activePowerUp, frenzyMode, combo, triggerHaptic, playSound, moveCaptain]);

  // Handle Miss Click
  const handleMissClick = useCallback(() => {
    if (gameState !== 'playing') return;
    
    setClicks(prev => prev + 1);
    setCombo(0);
    
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
  }, [gameState]);

  // Handle Power-up Click
  const handlePowerUpClick = useCallback((powerUp: PowerUp, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setPowerUps(prev => prev.filter(p => p.id !== powerUp.id));
    setActivePowerUp(powerUp);
    setPowerUpTimer(powerUp.duration);
    playSound('powerup');

    switch (powerUp.type) {
      case 'freeze':
        setIsFrozen(true);
        break;
      case 'grow':
        setCaptainScale(1.5);
        break;
      // double points is handled in scoring logic
    }

    // Clear power-up after duration
    setTimeout(() => {
      setActivePowerUp(null);
      setPowerUpTimer(0);
      setIsFrozen(false);
      setCaptainScale(1);
    }, powerUp.duration);
  }, [playSound]);

  // Power-up timer
  useEffect(() => {
    if (activePowerUp && powerUpTimer > 0) {
      const timer = setInterval(() => {
        setPowerUpTimer(prev => Math.max(0, prev - 100));
      }, 100);
      return () => clearInterval(timer);
    }
  }, [activePowerUp, powerUpTimer]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (moveRef.current) clearTimeout(moveRef.current);
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    };
  }, []);

  // Share Score
  const shareScore = useCallback(() => {
    const accuracy = clicks > 0 ? Math.round((hits / clicks) * 100) : 0;
    const text = `🎯 I scored ${score} points with ${accuracy}% accuracy in Captain Click Challenge!\n\nMax combo: ${maxCombo}x | Reaction time game\nThink you can beat me? 🎮\n\nPlay free: AgenticAIHome.com/learn/playground`;

    if (navigator.share) {
      navigator.share({
        title: 'Captain Click Challenge',
        text
      }).catch(() => {
        navigator.clipboard?.writeText(text);
        alert('Challenge copied! Paste it anywhere to challenge a friend.');
      });
    } else {
      navigator.clipboard?.writeText(text);
      alert('Challenge copied! Paste it anywhere to challenge a friend.');
    }
  }, [score, clicks, hits, maxCombo]);

  const accuracy = clicks > 0 ? Math.round((hits / clicks) * 100) : 0;

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900/95 border border-yellow-500/30 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-slate-800/95 p-4 border-b border-slate-600">
        <div className="flex justify-between items-center mb-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{score}</div>
            <div className="text-xs text-slate-300">Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{timeLeft}s</div>
            <div className="text-xs text-slate-300">Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">{combo}x</div>
            <div className="text-xs text-slate-300">Combo</div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Accuracy: {accuracy}%</span>
          <span>Best: {highScore.score}</span>
        </div>

        {/* Active Power-up */}
        {activePowerUp && (
          <div className="flex items-center justify-between bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg p-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{activePowerUp.emoji}</span>
              <span className="text-xs text-white font-medium">{activePowerUp.label}</span>
            </div>
            <div className="w-20 bg-slate-700 rounded-full h-1">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-orange-400 h-1 rounded-full transition-all"
                style={{ width: `${(powerUpTimer / activePowerUp.duration) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-300">
            {frenzyMode && <span className="text-red-400 font-bold animate-pulse">🔥 FRENZY MODE!</span>}
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded bg-slate-700/50 hover:bg-slate-600"
          >
            {soundEnabled ? <Volume2 size={14} className="text-slate-300" /> : <VolumeX size={14} className="text-slate-300" />}
          </button>
        </div>
      </div>

      {/* Game Area */}
      <div 
        ref={containerRef}
        className={`relative h-96 bg-gradient-to-b from-slate-800 to-slate-900 overflow-hidden cursor-crosshair ${screenShake ? 'animate-pulse' : ''}`}
        style={{
          boxShadow: flashColor === 'gold' ? '0 0 30px rgba(255, 215, 0, 0.6)' :
                     flashColor === 'cyan' ? '0 0 30px rgba(0, 255, 255, 0.4)' : 'none'
        }}
        onClick={handleMissClick}
      >
        {/* Start Screen */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-center p-4">
            <Target className="w-16 h-16 text-yellow-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Captain Click Challenge</h3>
            <p className="text-slate-300 mb-4 text-sm">
              Click the moving Captain as fast as you can! Hit the center for critical damage.
            </p>
            <div className="text-xs text-slate-400 mb-6">
              🎯 Center hits = 2x points<br/>
              ⚡ Collect power-ups for bonuses<br/>
              🔥 Build combos for frenzy mode
            </div>
            <button
              onClick={startGame}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold transition-all"
            >
              <Play size={20} /> Start Challenge
            </button>
          </div>
        )}

        {/* Finished Screen */}
        {gameState === 'finished' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center p-4">
            <div className="text-4xl mb-3">🎯</div>
            <div className="text-3xl font-bold text-white mb-2">{score}</div>
            
            {isNewHighScore && (
              <div className="text-yellow-400 font-bold mb-2 animate-bounce">
                🏆 NEW HIGH SCORE!
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div className="bg-slate-800 p-2 rounded">
                <div className="text-slate-300">Accuracy</div>
                <div className="text-white font-bold">{accuracy}%</div>
              </div>
              <div className="bg-slate-800 p-2 rounded">
                <div className="text-slate-300">Max Combo</div>
                <div className="text-white font-bold">{maxCombo}x</div>
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
                className="flex items-center gap-1 bg-yellow-500 text-black px-4 py-2 rounded-lg text-sm font-bold"
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

        {/* Captain */}
        {gameState === 'playing' && (
          <m.div
            className={`absolute w-20 h-20 cursor-pointer ${criticalHit ? 'animate-pulse' : ''}`}
            style={{ 
              left: captainPos.x, 
              top: captainPos.y,
              transform: `scale(${captainScale})`
            }}
            animate={{ 
              scale: isFrozen ? [captainScale, captainScale * 1.1, captainScale] : captainScale,
              rotate: frenzyMode ? [0, 360] : 0
            }}
            transition={{ 
              scale: { duration: 0.5, repeat: isFrozen ? Infinity : 0 },
              rotate: { duration: 2, repeat: frenzyMode ? Infinity : 0, ease: "linear" }
            }}
            onClick={handleCaptainClick}
          >
            <div className={`w-full h-full rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg border-4 ${
              isFrozen ? 'border-cyan-400' : 'border-yellow-300'
            }`}>
              <span className={`${frenzyMode ? 'animate-bounce' : ''}`}>CE</span>
            </div>
            
            {/* Center target indicator */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 border-2 border-white/30 rounded-full" />
            </div>
          </m.div>
        )}

        {/* Power-ups */}
        <AnimatePresence>
          {powerUps.map((powerUp) => (
            <m.div
              key={powerUp.id}
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              exit={{ scale: 0 }}
              className={`absolute w-12 h-12 bg-gradient-to-r ${powerUp.color} rounded-full cursor-pointer flex items-center justify-center text-lg shadow-lg border-2 border-white/20`}
              style={{ left: powerUp.x, top: powerUp.y }}
              onClick={(e) => handlePowerUpClick(powerUp, e)}
            >
              {powerUp.emoji}
            </m.div>
          ))}
        </AnimatePresence>

        {/* Click Effects */}
        <AnimatePresence>
          {clickEffects.map((effect) => (
            <m.div
              key={effect.id}
              initial={{ opacity: 1, scale: 0.5, y: 0 }}
              animate={{ opacity: 0, scale: 1.5, y: -50 }}
              exit={{ opacity: 0 }}
              className={`absolute pointer-events-none font-bold text-xl ${
                effect.isCritical ? 'text-yellow-400' : 'text-cyan-400'
              }`}
              style={{ left: effect.x, top: effect.y }}
            >
              +{effect.points}
              {effect.isCritical && (
                <div className="text-xs text-yellow-300">CRITICAL!</div>
              )}
            </m.div>
          ))}
        </AnimatePresence>

        {/* Game indicator */}
        {gameState === 'playing' && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-slate-400">
            Click the Captain! 🎯
          </div>
        )}
      </div>
    </div>
  );
};

export default CaptainClickChallenge;