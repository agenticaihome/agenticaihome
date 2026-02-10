'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  pulse: number;
  pulseSpeed: number;
}

interface ParticleNetworkProps {
  className?: string;
}

export default function ParticleNetwork({ className = '' }: ParticleNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, isInteracting: false });

  // Configuration
  const config = {
    desktop: {
      particleCount: 45,
      connectionDistance: 120,
      mouseInfluence: 80
    },
    mobile: {
      particleCount: 22,
      connectionDistance: 100,
      mouseInfluence: 60
    }
  };

  const colors = {
    nodes: '#00ff88', // Green for nodes
    connections: '#00ffff', // Cyan for connection lines
    nodeOpacity: 0.4,
    connectionOpacity: 0.3
  };

  // Check if mobile device
  const isMobile = useCallback(() => {
    return window.innerWidth < 768;
  }, []);

  // Initialize particles
  const initParticles = useCallback((width: number, height: number) => {
    const currentConfig = isMobile() ? config.mobile : config.desktop;
    particlesRef.current = [];

    for (let i = 0; i < currentConfig.particleCount; i++) {
      particlesRef.current.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 3 + 2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01
      });
    }
  }, []);

  // Animate particles
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const currentConfig = isMobile() ? config.mobile : config.desktop;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const particles = particlesRef.current;
    const mouse = mouseRef.current;

    // Update and draw particles
    particles.forEach((particle, i) => {
      // Update pulse
      particle.pulse += particle.pulseSpeed;

      // Mouse interaction
      if (mouse.isInteracting) {
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < currentConfig.mouseInfluence) {
          const force = (currentConfig.mouseInfluence - distance) / currentConfig.mouseInfluence;
          const angle = Math.atan2(dy, dx);
          
          // Gentle attraction/repulsion based on distance
          const intensity = force * 0.002;
          if (distance < currentConfig.mouseInfluence * 0.3) {
            // Repel when very close
            particle.vx -= Math.cos(angle) * intensity;
            particle.vy -= Math.sin(angle) * intensity;
          } else {
            // Attract when at medium distance
            particle.vx += Math.cos(angle) * intensity * 0.5;
            particle.vy += Math.sin(angle) * intensity * 0.5;
          }
        }
      }

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Gentle boundaries (wrap around with dampening)
      if (particle.x < 0) {
        particle.x = width;
        particle.vx *= 0.8;
      } else if (particle.x > width) {
        particle.x = 0;
        particle.vx *= 0.8;
      }

      if (particle.y < 0) {
        particle.y = height;
        particle.vy *= 0.8;
      } else if (particle.y > height) {
        particle.y = 0;
        particle.vy *= 0.8;
      }

      // Add slight random drift and damping
      particle.vx += (Math.random() - 0.5) * 0.001;
      particle.vy += (Math.random() - 0.5) * 0.001;
      particle.vx *= 0.999;
      particle.vy *= 0.999;

      // Draw connections first (behind nodes)
      for (let j = i + 1; j < particles.length; j++) {
        const other = particles[j];
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < currentConfig.connectionDistance) {
          const opacity = (1 - distance / currentConfig.connectionDistance) * colors.connectionOpacity;
          
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(other.x, other.y);
          ctx.strokeStyle = `${colors.connections}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Draw node with pulsing glow
      const pulseSize = particle.size + Math.sin(particle.pulse) * 0.5;
      const glowIntensity = (Math.sin(particle.pulse) + 1) * 0.5;
      
      // Outer glow
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, pulseSize * 3
      );
      gradient.addColorStop(0, `${colors.nodes}${Math.floor((colors.nodeOpacity * glowIntensity) * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, `${colors.nodes}00`);
      
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, pulseSize * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core node
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = `${colors.nodes}${Math.floor(colors.nodeOpacity * 255).toString(16).padStart(2, '0')}`;
      ctx.fill();

      // Bright center
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, pulseSize * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `${colors.nodes}${Math.floor((colors.nodeOpacity + 0.2) * 255).toString(16).padStart(2, '0')}`;
      ctx.fill();
    });

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // Handle mouse movement
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isInteracting: true
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current.isInteracting = false;
  }, []);

  // Handle resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Reinitialize particles for new dimensions
    initParticles(canvas.width, canvas.height);
  }, [initParticles]);

  // Setup and cleanup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initial setup
    handleResize();

    // Event listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    // Start animation
    animate();

    return () => {
      // Cleanup
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, [animate, handleMouseMove, handleMouseLeave, handleResize]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-auto ${className}`}
      style={{ 
        background: 'transparent',
        zIndex: 1
      }}
    />
  );
}