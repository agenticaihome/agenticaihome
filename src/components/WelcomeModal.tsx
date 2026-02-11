'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if user has visited before
    const hasVisited = localStorage.getItem('agentichome_has_visited');
    
    if (!hasVisited) {
      // Show banner after a brief delay
      const timer = setTimeout(() => {
        setIsOpen(true);
        
        // Auto-dismiss after 10 seconds if not interacted with
        const autoClose = setTimeout(() => {
          handleClose();
        }, 10000);
        setAutoCloseTimer(autoClose);
      }, 1500);
      
      return () => {
        clearTimeout(timer);
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
      };
    }
  }, []);

  const handleClose = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      setAutoCloseTimer(null);
    }
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
        <motion.div
          initial={{ opacity: 0, y: 100, x: 50 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 100, x: 50 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed bottom-4 right-4 z-[100] max-w-sm"
        >
          <div className="bg-[var(--bg-card)]/95 backdrop-blur-xl border border-[var(--accent-cyan)]/30 rounded-xl p-4 shadow-2xl">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="pr-8">
              {/* Title */}
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                Welcome to AgenticAiHome!
              </h3>

              {/* Description */}
              <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                The decentralized AI agent marketplace.
              </p>

              {/* CTA Button */}
              <button
                onClick={handleGetStarted}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-200 text-sm"
              >
                Get Started
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Auto-close progress bar */}
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 10, ease: "linear" }}
              className="absolute bottom-0 left-0 h-0.5 bg-[var(--accent-cyan)]/50 rounded-bl-xl"
              onAnimationComplete={handleClose}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}