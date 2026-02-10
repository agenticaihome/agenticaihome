'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

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
  const [isVisible, setIsVisible] = useState(false);

  // Configuration - heavily reduced for mobile
  const config = {
    desktop: {
      particleCount: 30, // Reduced from 45
      connectionDistance: 100, // Reduced from 120
      mouseInfluence: 60, // Reduced from 80
      frameSkip: 1 // Render every frame
    },
    mobile: {
      particleCount: 15, // Reduced from 22
      connectionDistance: 80, // Reduced from 100
      mouseInfluence: 40, // Reduced from 60
      frameSkip: 2 // Render every other frame for performance
    }
  };

  const colors = {
    nodes: '#00ff88', // Green for nodes
    connections: '#00ffff', // Cyan for connection lines
    nodeOpacity: 0.3, // Reduced from 0.4
    connectionOpacity: 0.2 // Reduced from 0.3
  };

  // Check if mobile device
  const isMobile = useCallback(() => {
    return window.innerWidth < 768;
  }, []);

  // Check if element is in viewport
  const checkVisibility = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const rect = canvas.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }, []);

  // Initialize particles
  const initParticles = useCallback((width: number, height: number) => {
    const currentConfig = isMobile() ? config.mobile : config.desktop;
    particlesRef.current = [];

    for (let i = 0; i < currentConfig.particleCount; i++) {
      particlesRef.current.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2, // Reduced velocity
        vy: (Math.random() - 0.5) * 0.2, // Reduced velocity
        size: Math.random() * 2 + 1.5, // Smaller particles
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.015 + 0.008 // Slower pulse
      });
    }
  }, []);

  let frameCounter = 0;

  // Animate particles
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const currentConfig = isMobile() ? config.mobile : config.desktop;

    // Frame skipping for mobile performance
    frameCounter++;
    if (frameCounter % currentConfig.frameSkip !== 0) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    // Check visibility periodically to pause when not visible
    if (frameCounter % 60 === 0 && !checkVisibility()) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const particles = particlesRef.current;
    const mouse = mouseRef.current;

    // Update and draw particles
    particles.forEach((particle, i) => {
      // Update pulse
      particle.pulse += particle.pulseSpeed;

      // Simplified mouse interaction (only on desktop)
      if (!isMobile() && mouse.isInteracting) {
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < currentConfig.mouseInfluence) {
          const force = (currentConfig.mouseInfluence - distance) / currentConfig.mouseInfluence;
          const angle = Math.atan2(dy, dx);
          
          // Very gentle interaction
          const intensity = force * 0.001;
          if (distance < currentConfig.mouseInfluence * 0.3) {
            // Repel when very close
            particle.vx -= Math.cos(angle) * intensity;
            particle.vy -= Math.sin(angle) * intensity;
          } else {
            // Attract when at medium distance
            particle.vx += Math.cos(angle) * intensity * 0.3;
            particle.vy += Math.sin(angle) * intensity * 0.3;
          }
        }
      }

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Gentle boundaries (wrap around with dampening)
      if (particle.x < 0) {
        particle.x = width;
        particle.vx *= 0.9;
      } else if (particle.x > width) {
        particle.x = 0;
        particle.vx *= 0.9;
      }

      if (particle.y < 0) {
        particle.y = height;
        particle.vy *= 0.9;
      } else if (particle.y > height) {
        particle.y = 0;
        particle.vy *= 0.9;
      }

      // Add slight random drift and damping
      particle.vx += (Math.random() - 0.5) * 0.0005;
      particle.vy += (Math.random() - 0.5) * 0.0005;
      particle.vx *= 0.9995;
      particle.vy *= 0.9995;

      // Draw connections first (behind nodes) - reduced number
      for (let j = i + 1; j < particles.length; j += 2) { // Skip every other connection for performance
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

      // Draw simplified node (no glow effect on mobile)
      const pulseSize = particle.size + Math.sin(particle.pulse) * 0.3;
      
      if (!isMobile()) {
        // Desktop: with glow
        const glowIntensity = (Math.sin(particle.pulse) + 1) * 0.5;
        
        // Outer glow
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, pulseSize * 2
        );
        gradient.addColorStop(0, `${colors.nodes}${Math.floor((colors.nodeOpacity * glowIntensity) * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${colors.nodes}00`);
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, pulseSize * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Core node
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = `${colors.nodes}${Math.floor(colors.nodeOpacity * 255).toString(16).padStart(2, '0')}`;
      ctx.fill();

      // Bright center (only on desktop)
      if (!isMobile()) {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, pulseSize * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = `${colors.nodes}${Math.floor((colors.nodeOpacity + 0.1) * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();
      }
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [checkVisibility, isVisible]);

  // Handle mouse movement (only on desktop)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isMobile()) return;
    
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

  // Intersection Observer to pause when not visible
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(canvas);

    return () => {
      observer.unobserve(canvas);
    };
  }, []);

  // Setup and cleanup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initial setup
    handleResize();

    // Event listeners (only mouse on desktop)
    if (!isMobile()) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseleave', handleMouseLeave);
    }
    window.addEventListener('resize', handleResize);

    // Start animation when visible
    if (isVisible) {
      animate();
    }

    return () => {
      // Cleanup
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, [animate, handleMouseMove, handleMouseLeave, handleResize, isVisible]);

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