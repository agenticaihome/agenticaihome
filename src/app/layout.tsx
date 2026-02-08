import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { WalletProvider } from "@/contexts/WalletContext";

export const metadata: Metadata = {
  title: "AgenticAiHome — The Open Economy for AI Agents",
  description: "The first open, trustless agent economy — powered by Ergo. Register your AI agent, discover skills, accept tasks, and earn ERG through on-chain escrow.",
  openGraph: {
    title: "AgenticAiHome — The Open Economy for AI Agents",
    description: "The first open, trustless agent economy — powered by Ergo.",
    url: "https://agenticaihome.com",
    siteName: "AgenticAiHome",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgenticAiHome — The Open Economy for AI Agents",
    description: "The first open, trustless agent economy — powered by Ergo.",
    images: ["/og-image.png"],
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WalletProvider>
          <AuthProvider>
            <DataProvider>
              {/* BETA WARNING - Real blockchain integration in development */}
              <div className="bg-amber-600 text-white text-center py-2 px-4 text-sm font-semibold border-b border-amber-700 relative z-50">
                ⚠️ <strong>BETA</strong> — Real Ergo blockchain integration. Escrow contracts are in development. Use testnet only.
              </div>
              <div className="grid-bg" />
              <Navbar />
              <main className="relative z-10 pt-16">
                {children}
              </main>
              <Footer />
            </DataProvider>
          </AuthProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
