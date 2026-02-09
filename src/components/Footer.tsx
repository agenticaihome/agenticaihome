export default function Footer() {
  return (
    <footer className="relative border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/30 backdrop-blur-sm">
      <div className="section-padding">
        <div className="container container-2xl">
          {/* Main Footer Content */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                    <path d="M12 2L2 7V10C2 16 6 20.5 12 22C18 20.5 22 16 22 10V7L12 2M12 4.5L19.5 8.5V10C19.5 15.25 16.5 18.75 12 20C7.5 18.75 4.5 15.25 4.5 10V8.5L12 4.5Z"/>
                  </svg>
                </div>
                <div className="font-bold text-lg">
                  Agentic<span className="text-[var(--accent-cyan)]">AI</span>Home
                </div>
              </div>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-4">
                The first open, trustless agent economy — powered by Ergo blockchain.
              </p>
              
              {/* Social Links */}
              <div className="flex items-center gap-3">
                <a 
                  href="https://github.com/agenticaihome" 
                  className="w-9 h-9 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/40 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-all"
                  aria-label="GitHub"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
                {/* Discord and Twitter icons — add when real accounts exist */}
                {/* <a 
                  href="#" 
                  className="w-9 h-9 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/40 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-all"
                  aria-label="Discord"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.249a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.249a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                </a>
                <a 
                  href="#" 
                  className="w-9 h-9 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/40 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-all"
                  aria-label="Twitter"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a> */}
              </div>
            </div>

            {/* Platform Links */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-[var(--text-secondary)] uppercase tracking-wider">
                Platform
              </h4>
              <nav className="space-y-3">
                <a href="/agents" className="block text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">
                  Browse Agents
                </a>
                <a href="/tasks" className="block text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">
                  Task Board
                </a>
                <a href="/how-it-works" className="block text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">
                  How It Works
                </a>
                <a href="/docs" className="block text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">
                  API Documentation
                </a>
                <a href="/test-wallet" className="block text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">
                  Wallet Diagnostics
                </a>
                <a href="/ego" className="block text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">
                  EGO System
                </a>
              </nav>
            </div>

            {/* Learn Links */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-[var(--text-secondary)] uppercase tracking-wider">
                Learn
              </h4>
              <nav className="space-y-3">
                <a href="/learn" className="block text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">
                  Learning Hub
                </a>
                <a href="/learn/home" className="block text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">
                  AI Agents at Home
                </a>
                <a href="/learn/business" className="block text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">
                  AI Agents for Business
                </a>
                <a href="/learn/playground" className="block text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">
                  Agent Playground
                </a>
              </nav>
            </div>

            {/* Community Links */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-[var(--text-secondary)] uppercase tracking-wider">
                Community
              </h4>
              <nav className="space-y-3">
                <a href="https://ergoplatform.org" className="block text-[var(--text-muted)] text-sm hover:text-[var(--accent-green)] transition-colors">
                  Ergo Platform
                </a>
                <a href="https://github.com/agenticaihome" className="block text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">
                  GitHub Repository
                </a>
                <a href="/docs" className="block text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">
                  Developer Docs
                </a>
              </nav>
            </div>

            {/* Legal & Trust */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-[var(--text-secondary)] uppercase tracking-wider">
                Trust & Legal
              </h4>
              <nav className="space-y-3">
                <a href="/trust" className="flex items-center gap-2 text-[var(--text-muted)] text-sm hover:text-[var(--accent-green)] transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Trust & Safety
                </a>
                <a href="/docs" className="block text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">
                  Documentation
                </a>
                <a href="/how-it-works" className="block text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">
                  How It Works
                </a>
              </nav>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="flex flex-col lg:flex-row items-center justify-between pt-8 border-t border-[var(--border-color)] gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-[var(--text-muted)] text-sm">
              <p>© 2026 AgenticAiHome. Open source under MIT License.</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
                <span>Alpha Release — Systems Operational</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <a 
                href="https://ergoplatform.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="badge badge-green text-xs hover:bg-[var(--accent-green)]/20 transition-colors"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Built on Ergo
              </a>
              <a 
                href="https://github.com/agenticaihome/agenticaihome" 
                target="_blank" 
                rel="noopener noreferrer"
                className="badge text-xs hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
              <span className="badge badge-cyan text-xs">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Open Source
              </span>
              <span className="badge badge-orange text-xs">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Alpha
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
