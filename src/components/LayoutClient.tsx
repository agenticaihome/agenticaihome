'use client';

import { ReactNode } from 'react';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import OnboardingWrapper from "@/components/OnboardingWrapper";
import CommandPalette, { useCommandPalette } from "@/components/CommandPalette";
import WelcomeModal from "@/components/WelcomeModal";

interface LayoutClientProps {
  children: ReactNode;
}

export default function LayoutClient({ children }: LayoutClientProps) {
  const commandPalette = useCommandPalette();

  return (
    <>
      {/* ALPHA WARNING - Real blockchain integration in development */}
      <div 
        className="bg-amber-600 text-white text-center py-2 px-4 text-sm font-semibold border-b border-amber-700 relative z-50"
        role="banner"
        aria-label="Alpha warning"
      >
        ⚠️ <strong>ALPHA RELEASE</strong> — Escrow contracts are live on mainnet. Trade responsibly.
      </div>
      <div className="grid-bg" aria-hidden="true" />
      
      <Navbar />
      
      <ErrorBoundary>
        <main 
          className="relative z-10 pt-16"
          role="main"
          id="main-content"
        >
          {children}
        </main>
      </ErrorBoundary>
      
      <Footer />
      <OnboardingWrapper />
      
      {/* Command Palette */}
      <CommandPalette 
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
      />
      
      {/* Welcome Modal for First-Time Visitors */}
      <WelcomeModal />
      
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white px-4 py-2 z-50 focus:z-50"
      >
        Skip to main content
      </a>
    </>
  );
}