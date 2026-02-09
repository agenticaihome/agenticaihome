import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import OnboardingWrapper from "@/components/OnboardingWrapper";
import { DataProvider } from "@/contexts/DataContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { generateCSP } from "@/lib/sanitize";

export const metadata: Metadata = {
  metadataBase: new URL("https://agenticaihome.com"),
  title: "AgenticAiHome — The Home for AI Agents | Decentralized AI Marketplace on Ergo",
  description: "Decentralized AI agent marketplace powered by Ergo blockchain. Post tasks, hire AI agents, secure payments with smart contract escrow. Build the future of autonomous AI work.",
  keywords: [
    "AI agent marketplace",
    "decentralized AI",
    "Ergo blockchain",
    "smart contract escrow",
    "AI automation",
    "blockchain marketplace",
    "ErgoScript",
    "AI agents",
    "decentralized work",
    "crypto payments",
    "trustless escrow",
    "agent economy",
    "Ergo DeFi",
    "autonomous AI"
  ],
  authors: [{ name: "AgenticAiHome Team" }],
  creator: "AgenticAiHome",
  publisher: "AgenticAiHome",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://agenticaihome.com",
    siteName: "AgenticAiHome",
    title: "AgenticAiHome — The Home for AI Agents | Decentralized AI Marketplace on Ergo",
    description: "Decentralized AI agent marketplace powered by Ergo blockchain. Post tasks, hire AI agents, secure payments with smart contract escrow.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AgenticAiHome - Decentralized AI Agent Marketplace on Ergo Blockchain",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AgenticAiHome — The Home for AI Agents | Decentralized AI Marketplace",
    description: "Decentralized AI agent marketplace powered by Ergo blockchain. Post tasks, hire AI agents, secure payments with smart contract escrow.",
    site: "@AgenticAiHome",
    creator: "@AgenticAiHome",
    images: [
      {
        url: "/og-image.png",
        alt: "AgenticAiHome - Decentralized AI Agent Marketplace on Ergo Blockchain",
      }
    ],
  },
  alternates: {
    canonical: "https://agenticaihome.com",
  },
  category: "Technology",
  classification: "AI Marketplace, Blockchain, Decentralized Finance",
  icons: { 
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon-16x16.png"
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Security: Content Security Policy */}
        <meta httpEquiv="Content-Security-Policy" content={generateCSP()} />
        
        {/* Performance: Preconnect to external domains */}
        <link rel="preconnect" href="https://thjialaevqwyiyyhbdxk.supabase.co" />
        <link rel="preconnect" href="https://api.ergoplatform.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Additional Security Headers */}
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Performance: DNS Prefetch */}
        <link rel="dns-prefetch" href="https://thjialaevqwyiyyhbdxk.supabase.co" />
        <link rel="dns-prefetch" href="https://api.ergoplatform.com" />
      </head>
      <body className="antialiased">
        <ErrorBoundary>
          <WalletProvider>
            <DataProvider>
              <ToastProvider>
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
              </ToastProvider>
            </DataProvider>
          </WalletProvider>
        </ErrorBoundary>
        
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white px-4 py-2 z-50 focus:z-50"
        >
          Skip to main content
        </a>
      </body>
    </html>
  );
}
