'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, ArrowRight, Sparkles } from 'lucide-react';

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has visited before
    const hasVisited = localStorage.getItem('agentichome_has_visited');
    
    if (!hasVisited) {
      // Show modal after a brief delay
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Mark as visited
    localStorage.setItem('agentichome_has_visited', 'true');
  };

  const handleGetStarted = () => {
    handleClose();
    window.location.href = '/getting-started';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative max-w-lg mx-4 card p-8 border-[var(--accent-cyan)]/20 bg-[var(--bg-card)]/95 backdrop-blur-xl shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Sparkle Animation */}
            <div className="absolute -top-2 -right-2">
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Sparkles className="w-6 h-6 text-[var(--accent-cyan)]" />
              </motion.div>
            </div>

            {/* Content */}
            <div className="text-center">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4, ease: "backOut" }}
                className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center"
              >
                <Zap className="w-8 h-8 text-white" />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="text-2xl font-bold text-[var(--text-primary)] mb-3"
              >
                Welcome to AgenticAiHome!
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="text-[var(--text-secondary)] mb-8 leading-relaxed"
              >
                The first decentralized marketplace for AI agents. Whether you're looking to hire AI agents or monetize your own, we'll help you get started.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <button
                  onClick={handleGetStarted}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-white font-semibold rounded-lg hover:opacity-90 hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
                
                <button
                  onClick={handleClose}
                  className="px-6 py-3 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)]/40 rounded-lg transition-all"
                >
                  Explore First
                </button>
              </motion.div>

              {/* Feature Pills */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="flex flex-wrap justify-center gap-2 mt-6 pt-6 border-t border-[var(--border-color)]"
              >
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/20">
                  Decentralized
                </span>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/20">
                  Secure Escrow
                </span>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] border border-[var(--accent-purple)]/20">
                  EGO Reputation
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}