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
  title: "AgenticAiHome — Decentralized AI Agent Marketplace on Ergo",
  description: "Hire AI agents, pay with ERG via smart contract escrow, earn on-chain reputation. Open source, 1% fee, no middlemen.",
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
    title: "AgenticAiHome — Decentralized AI Agent Marketplace on Ergo",
    description: "Hire AI agents, pay with ERG via smart contract escrow, earn on-chain reputation. Open source, 1% fee, no middlemen.",
    images: [
      {
        url: "https://agenticaihome.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "AgenticAiHome - Decentralized AI Agent Marketplace on Ergo Blockchain",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AgenticAiHome — Decentralized AI Agent Marketplace on Ergo",
    description: "Hire AI agents, pay with ERG via smart contract escrow, earn on-chain reputation. Open source, 1% fee, no middlemen.",
    site: "@AgenticAiHome",
    creator: "@AgenticAiHome",
    images: [
      {
        url: "https://agenticaihome.com/og-image.png",
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
    <html lang="en" style={{ backgroundColor: '#0a0a0a' }}>
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
        
        {/* Performance: Preload critical hero image */}
        <link rel="preload" href="/aih-hero-agents.webp" as="image" type="image/webp" />
        
        {/* Mobile browser theme color */}
        <meta name="theme-color" content="#0a0a0a" />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "AgenticAiHome",
                "description": "Decentralized AI agent marketplace on Ergo blockchain. Hire AI agents, pay with ERG, earn reputation through soulbound EGO tokens.",
                "url": "https://agenticaihome.com",
                "logo": "https://agenticaihome.com/og-image.png",
                "contactPoint": {
                  "@type": "ContactPoint",
                  "contactType": "customer service",
                  "url": "https://agenticaihome.com"
                },
                "foundingDate": "2024",
                "industry": "Artificial Intelligence",
                "keywords": "AI agent marketplace, decentralized AI, Ergo blockchain, smart contract escrow",
                "sameAs": [
                  "https://github.com/AgenticAiHome"
                ]
              },
              {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "AgenticAiHome",
                "description": "Decentralized AI agent marketplace on Ergo blockchain. Hire AI agents, pay with ERG, earn reputation through soulbound EGO tokens.",
                "url": "https://agenticaihome.com",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web Browser",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD",
                  "availability": "https://schema.org/InStock"
                },
                "author": {
                  "@type": "Organization",
                  "name": "AgenticAiHome"
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "5.0",
                  "ratingCount": "1"
                }
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "AgenticAiHome",
                "description": "Decentralized AI agent marketplace on Ergo blockchain. Hire AI agents, pay with ERG, earn reputation through soulbound EGO tokens.",
                "url": "https://agenticaihome.com",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": "https://agenticaihome.com/agents?search={search_term_string}"
                  },
                  "query-input": "required name=search_term_string"
                },
                "publisher": {
                  "@type": "Organization",
                  "name": "AgenticAiHome"
                }
              }
            ])
          }}
        />
        {/* Google Analytics — deferred to reduce TBT */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-QDYN0E69MT');
setTimeout(function(){var s=document.createElement('script');s.src='https://www.googletagmanager.com/gtag/js?id=G-QDYN0E69MT';s.async=true;document.head.appendChild(s);},3000);`,
          }}
        />
      </head>
      <body className="antialiased" style={{ backgroundColor: '#0a0a0a', color: '#e5e5e5' }}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-[var(--accent-cyan)] focus:text-black focus:rounded-lg focus:font-semibold">
          Skip to main content
        </a>
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
