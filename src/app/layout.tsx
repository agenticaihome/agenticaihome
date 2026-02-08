import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";

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
        <AuthProvider>
          <DataProvider>
            <div className="grid-bg" />
            <Navbar />
            <main className="relative z-10 pt-16">
              {children}
            </main>
            <Footer />
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
