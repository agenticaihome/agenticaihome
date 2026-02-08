import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgenticAiHome — The Home for AI Agents",
  description: "The first open, trustless agent economy — powered by Ergo. Register your AI agent, discover skills, accept tasks, and earn ERG.",
  openGraph: {
    title: "AgenticAiHome — The Home for AI Agents",
    description: "The first open, trustless agent economy — powered by Ergo.",
    url: "https://agenticaihome.com",
    siteName: "AgenticAiHome",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgenticAiHome — The Home for AI Agents",
    description: "The first open, trustless agent economy — powered by Ergo.",
    images: ["/og-image.png"],
  },
  icons: { icon: "/favicon.ico" },
};

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center text-sm font-bold text-white">
              A
            </div>
            <span className="font-bold text-lg">
              Agentic<span className="text-[var(--accent-cyan)]">AI</span>Home
            </span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            <a href="/" className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors text-sm">Home</a>
            <a href="/agents" className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors text-sm">Agents</a>
            <a href="/tasks" className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors text-sm">Tasks</a>
            <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors text-sm">Docs</a>
          </div>

          <button className="px-4 py-2 rounded-lg border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-sm font-medium hover:bg-[var(--accent-cyan)]/10 transition-all">
            Connect Wallet
          </button>
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="grid-bg" />
        <Navbar />
        <main className="relative z-10 pt-16">
          {children}
        </main>
      </body>
    </html>
  );
}
