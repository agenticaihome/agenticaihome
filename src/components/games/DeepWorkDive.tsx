'use client';

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion as m, AnimatePresence } from 'framer-motion';
import { Play, Trophy, ArrowLeft, RotateCcw, Share2, Pause, Volume2, VolumeX } from "lucide-react";
import confetti from "canvas-confetti";

// Types
interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'distraction' | 'meeting' | 'notification';
  color: string;
  icon: string;
  speed: number;
}

interface PersonalBest {
  score: number;
  depth: number;
}

interface PassedEffect {
  id: number;
  points: number;
  x: number;
  y: number;
}

type GameState = "idle" | "playing" | "paused" | "dead";

interface DeepWorkDiveProps {
  onBack: () => void;
}

// Local storage helpers
const getDeepWorkBest = (): PersonalBest => {
  const stored = localStorage.getItem('deep-work-best');
  return stored ? JSON.parse(stored) : { score: 0, depth: 0 };
};

const setDeepWorkBest = (best: PersonalBest) => {
  localStorage.setItem('deep-work-best', JSON.stringify(best));
};

const DeepWorkDive: React.FC<DeepWorkDiveProps> = ({ onBack }) => {
  // State
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState<PersonalBest>(() => getDeepWorkBest());
  const [isNewBest, setIsNewBest] = useState(false);

  // Visual state
  const [captainY, setCaptainY] = useState(50);
  const [captainRotation, setCaptainRotation] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [screenShake, setScreenShake] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [nearMiss, setNearMiss] = useState(false);
  const [passedEffects, setPassedEffects] = useState<PassedEffect[]>([]);
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [depth, setDepth] = useState(0);

  // Audio
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Refs for game loop
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const gameStateRef = useRef<GameState>("idle");
  const velocityRef = useRef(0);
  const captainYRef = useRef(50);
  const scoreRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const lastSpawnRef = useRef(0);
  const audioContext = useRef<AudioContext | null>(null);

  // Constants
  const FIXED_TIMESTEP = 1000 / 60;
  const CAPTAIN_X = 20;
  const CAPTAIN_SIZE = 14;
  const GRAVITY = 0.8;
  const JUMP_STRENGTH = -12;
  const TERMINAL_VELOCITY = 15;
  const GAME_WIDTH = 320;
  const GAME_HEIGHT = 400;

  // Keep refs in sync
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { captainYRef.current = captainY; }, [captainY]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { obstaclesRef.current = obstacles; }, [obstacles]);

  // Obstacle types
  const obstacleTypes = [
    {
      type: 'distraction' as const,
      color: 'bg-red-500',
      icon: '📱',
      width: 25,
      height: 25,
      speed: 2,
      points: 100
    },
    {
      type: 'meeting' as const,
      color: 'bg-yellow-500',
      icon: '💼',
      width: 30,
      height: 20,
      speed: 1.5,
      points: 150
    },
    {
      type: 'notification' as const,
      color: 'bg-blue-500',
      icon: '🔔',
      width: 20,
      height: 20,
      speed: 2.5,
      points: 80
    }
  ];

  // Sound effects
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
        case 'jump':
          oscillator.frequency.setValueAtTime(400, ctx.currentTime);
          oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.15);
          break;
        case 'score':
          oscillator.frequency.setValueAtTime(800, ctx.currentTime);
          oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.2);
          break;
        case 'crash':
          oscillator.frequency.setValueAtTime(150, ctx.currentTime);
          oscillator.type = 'sawtooth';
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.5);
          break;
      }

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // Audio not available
    }
  }, [soundEnabled]);

  // Spawn obstacle
  const spawnObstacle = useCallback((currentTime: number) => {
    if (currentTime - lastSpawnRef.current < 800 - (difficultyLevel * 50)) return;
    
    const obstacleType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    const newObstacle: Obstacle = {
      id: Date.now(),
      x: GAME_WIDTH,
      y: Math.random() * (GAME_HEIGHT - 100) + 50,
      width: obstacleType.width,
      height: obstacleType.height,
      type: obstacleType.type,
      color: obstacleType.color,
      icon: obstacleType.icon,
      speed: obstacleType.speed + (difficultyLevel * 0.3)
    };

    setObstacles(prev => [...prev, newObstacle]);
    lastSpawnRef.current = currentTime;
  }, [difficultyLevel]);

  // Jump
  const jump = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      velocityRef.current = JUMP_STRENGTH;
      setCaptainRotation(-20);
      playSound('jump');
      setTimeout(() => setCaptainRotation(0), 200);
    }
  }, [playSound]);

  // Collision detection
  const checkCollision = useCallback((captainY: number, obstacles: Obstacle[]) => {
    const captainRect = {
      x: CAPTAIN_X,
      y: captainY,
      width: CAPTAIN_SIZE,
      height: CAPTAIN_SIZE
    };

    for (const obstacle of obstacles) {
      if (
        captainRect.x < obstacle.x + obstacle.width &&
        captainRect.x + captainRect.width > obstacle.x &&
        captainRect.y < obstacle.y + obstacle.height &&
        captainRect.y + captainRect.height > obstacle.y
      ) {
        return true;
      }
    }

    return false;
  }, []);

  // Game loop
  const gameLoop = useCallback((currentTime: number) => {
    if (gameStateRef.current !== 'playing') return;

    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;

    // Update physics
    velocityRef.current += GRAVITY;
    velocityRef.current = Math.min(velocityRef.current, TERMINAL_VELOCITY);
    
    const newY = captainYRef.current + velocityRef.current;
    
    // Boundary checking
    if (newY <= 0 || newY >= GAME_HEIGHT - CAPTAIN_SIZE) {
      endGame();
      return;
    }

    setCaptainY(newY);

    // Spawn obstacles
    spawnObstacle(currentTime);

    // Update obstacles
    setObstacles(prev => {
      const updated = prev.map(obstacle => ({
        ...obstacle,
        x: obstacle.x - obstacle.speed
      })).filter(obstacle => {
        // Check if obstacle passed captain
        if (obstacle.x + obstacle.width < CAPTAIN_X && obstacle.x + obstacle.width > CAPTAIN_X - 5) {
          const points = obstacleTypes.find(t => t.type === obstacle.type)?.points || 100;
          setScore(s => s + points);
          setDepth(d => d + 1);
          playSound('score');
          
          // Add passed effect
          setPassedEffects(effects => [...effects, {
            id: Date.now(),
            points,
            x: obstacle.x,
            y: obstacle.y
          }]);

          setTimeout(() => {
            setPassedEffects(effects => effects.slice(1));
          }, 800);
        }
        
        return obstacle.x > -50;
      });

      // Check collision
      if (checkCollision(newY, updated)) {
        endGame();
        return updated;
      }

      return updated;
    });

    // Update difficulty
    const newDifficulty = Math.floor(scoreRef.current / 500) + 1;
    if (newDifficulty !== difficultyLevel) {
      setDifficultyLevel(newDifficulty);
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [spawnObstacle, checkCollision, difficultyLevel, playSound]);

  // Start game
  const startGame = useCallback(() => {
    setGameState("playing");
    setScore(0);
    setDepth(0);
    setCaptainY(GAME_HEIGHT / 2);
    setObstacles([]);
    setPassedEffects([]);
    setDifficultyLevel(1);
    setIsNewBest(false);
    velocityRef.current = 0;
    lastSpawnRef.current = 0;
    lastTimeRef.current = performance.now();

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  // End game
  const endGame = useCallback(() => {
    setGameState("dead");
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const newDepth = Math.floor(depth);
    const newBest = { score, depth: newDepth };

    if (score > bestScore.score || newDepth > bestScore.depth) {
      setIsNewBest(true);
      setDeepWorkBest(newBest);
      setBestScore(newBest);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 300);
    playSound('crash');
  }, [score, depth, bestScore, playSound]);

  // Handle input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameState === 'idle') {
          startGame();
        } else if (gameState === 'playing') {
          jump();
        }
      }
    };

    const handleClick = () => {
      if (gameState === 'idle') {
        startGame();
      } else if (gameState === 'playing') {
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('click', handleClick);
    };
  }, [gameState, startGame, jump]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Share score
  const shareScore = useCallback(() => {
    const text = `🏊‍♂️ I dove ${depth} levels deep and scored ${score} points in Deep Work Dive!\n\nAvoided distractions and reached peak focus! 🎯\nThink you can dive deeper? 🎮\n\nPlay free: AgenticAIHome.com/learn/playground`;

    if (navigator.share) {
      navigator.share({
        title: 'Deep Work Dive Challenge',
        text
      }).catch(() => {
        navigator.clipboard?.writeText(text);
        alert('Challenge copied! Paste it anywhere to challenge a friend.');
      });
    } else {
      navigator.clipboard?.writeText(text);
      alert('Challenge copied! Paste it anywhere to challenge a friend.');
    }
  }, [score, depth]);

  return (
    <div 
      ref={gameAreaRef}
      className={`w-full max-w-sm mx-auto bg-slate-900/95 border border-teal-500/30 rounded-2xl overflow-hidden shadow-2xl ${screenShake ? 'animate-pulse' : ''}`}
    >
      {/* Header */}
      <div className="bg-slate-800/95 p-4 border-b border-slate-600">
        <div className="flex justify-between items-center mb-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{score}</div>
            <div className="text-xs text-slate-300">Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-teal-400">{depth}m</div>
            <div className="text-xs text-slate-300">Depth</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">L{difficultyLevel}</div>
            <div className="text-xs text-slate-300">Level</div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-xs text-slate-400">
            Best: {bestScore.score} pts • {bestScore.depth}m
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
        className="relative h-96 bg-gradient-to-b from-teal-900/20 via-blue-900/30 to-indigo-900/40 overflow-hidden cursor-pointer"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        onClick={jump}
      >
        {/* Depth indicator lines */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-full h-px bg-teal-500/10"
              style={{ top: `${i * 20}px` }}
            />
          ))}
        </div>

        {/* Start Screen */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-center p-4">
            <div className="text-4xl mb-4">🏊‍♂️</div>
            <h3 className="text-xl font-bold text-white mb-2">Deep Work Dive</h3>
            <p className="text-slate-300 mb-4 text-sm">
              Dive deep into focus! Avoid distractions and reach maximum productivity depth.
            </p>
            <div className="text-xs text-slate-400 mb-6">
              Click or press SPACE to dive<br/>
              Avoid: 📱 🔔 💼
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startGame();
              }}
              className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-white px-6 py-3 rounded-xl font-bold transition-all"
            >
              <Play size={20} /> Start Dive
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'dead' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center p-4">
            <div className="text-4xl mb-3">💥</div>
            <div className="text-2xl font-bold text-red-400 mb-2">Focus Lost!</div>
            <div className="text-xl font-bold text-white mb-2">{score} points</div>
            <div className="text-lg text-teal-400 mb-3">{depth}m deep</div>
            
            {isNewBest && (
              <div className="text-yellow-400 font-bold mb-2 animate-bounce">
                🏆 NEW PERSONAL BEST!
              </div>
            )}
            
            <div className="flex gap-2 mb-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBack();
                }}
                className="flex items-center gap-1 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                <ArrowLeft size={16} /> Hub
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startGame();
                }}
                className="flex items-center gap-1 bg-teal-500 text-white px-4 py-2 rounded-lg text-sm"
              >
                <RotateCcw size={16} /> Dive Again
              </button>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                shareScore();
              }}
              className="flex items-center gap-1 bg-purple-500 text-white px-4 py-2 rounded-lg text-sm"
            >
              <Share2 size={16} /> Share
            </button>
          </div>
        )}

        {/* Captain */}
        {gameState === 'playing' && (
          <m.div
            className="absolute w-14 h-14 flex items-center justify-center text-2xl"
            style={{ left: CAPTAIN_X, top: captainY }}
            animate={{ rotate: captainRotation }}
            transition={{ duration: 0.1 }}
          >
            <div className="w-full h-full bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
              CE
            </div>
          </m.div>
        )}

        {/* Obstacles */}
        <AnimatePresence>
          {obstacles.map((obstacle) => (
            <m.div
              key={obstacle.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={`absolute ${obstacle.color} rounded-lg flex items-center justify-center text-white shadow-lg`}
              style={{ 
                left: obstacle.x, 
                top: obstacle.y,
                width: obstacle.width,
                height: obstacle.height
              }}
            >
              <span className="text-xs">{obstacle.icon}</span>
            </m.div>
          ))}
        </AnimatePresence>

        {/* Passed Effects */}
        <AnimatePresence>
          {passedEffects.map((effect) => (
            <m.div
              key={effect.id}
              initial={{ opacity: 1, scale: 0.5, y: 0 }}
              animate={{ opacity: 0, scale: 1.5, y: -30 }}
              exit={{ opacity: 0 }}
              className="absolute text-teal-400 font-bold text-lg pointer-events-none"
              style={{ left: effect.x, top: effect.y }}
            >
              +{effect.points}
            </m.div>
          ))}
        </AnimatePresence>

        {/* Instructions */}
        {gameState === 'playing' && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-slate-400 text-center">
            Click to swim up! Avoid distractions! 🏊‍♂️
          </div>
        )}
      </div>
    </div>
  );
};

export default DeepWorkDive;