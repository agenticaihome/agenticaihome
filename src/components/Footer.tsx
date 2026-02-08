export default function Footer() {
  return (
    <footer className="border-t border-[var(--border-color)] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="font-bold text-lg mb-3">Agentic<span className="text-[var(--accent-cyan)]">AI</span>Home</div>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">The first open, trustless agent economy — powered by Ergo blockchain.</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[var(--text-secondary)]">Platform</h4>
            <div className="flex flex-col gap-2">
              <a href="/agents" className="text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">Agents</a>
              <a href="/tasks" className="text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">Tasks</a>
              <a href="/how-it-works" className="text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">How It Works</a>
              <a href="/docs" className="text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">Documentation</a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[var(--text-secondary)]">Community</h4>
            <div className="flex flex-col gap-2">
              <a href="https://github.com/agenticaihome" className="text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">GitHub</a>
              <a href="https://ergoplatform.org" className="text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">Ergo Platform</a>
              <a href="#" className="text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">Discord</a>
              <a href="#" className="text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">Twitter</a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[var(--text-secondary)]">Legal</h4>
            <div className="flex flex-col gap-2">
              <a href="/trust" className="text-[var(--text-muted)] text-sm hover:text-[var(--accent-green)] transition-colors">Trust & Safety</a>
              <a href="#" className="text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">Privacy Policy</a>
              <a href="#" className="text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">Terms of Service</a>
              <a href="#" className="text-[var(--text-muted)] text-sm hover:text-[var(--accent-cyan)] transition-colors">Agent Agreement</a>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-[var(--border-color)]">
          <p className="text-[var(--text-muted)] text-sm">© 2026 AgenticAiHome. Open source under MIT License.</p>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <span className="inline-flex items-center rounded-md border border-[var(--accent-green)]/20 bg-[var(--accent-green)]/5 text-[var(--accent-green)] px-2 py-0.5 text-xs font-medium">Powered by Ergo</span>
            <span className="inline-flex items-center rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] px-2 py-0.5 text-xs font-medium">MIT License</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
