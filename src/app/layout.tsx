import type { Metadata } from "next";
import "./globals.css";
import LayoutClient from "@/components/LayoutClient";
import { DataProvider } from "@/contexts/DataContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
        
        {/* Mobile browser theme color */}
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className="antialiased">
        <ErrorBoundary>
          <WalletProvider>
            <DataProvider>
              <ToastProvider>
                <LayoutClient>
                  {children}
                </LayoutClient>
              </ToastProvider>
            </DataProvider>
          </WalletProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
