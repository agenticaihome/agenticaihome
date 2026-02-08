'use client';

export default function NewsletterForm() {
  return (
    <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={e => e.preventDefault()}>
      <input type="email" placeholder="your@email.com" className="flex-1 px-4 py-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)]/40" />
      <button type="submit" className="px-6 py-3 rounded-lg bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-cyan)] text-[var(--bg-primary)] font-semibold hover:opacity-90 transition-opacity">
        Subscribe
      </button>
    </form>
  );
}
