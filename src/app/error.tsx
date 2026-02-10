'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <img 
            src="/logo.png" 
            alt="AgenticAiHome" 
            className="w-16 h-16 mx-auto rounded-2xl opacity-75" 
          />
        </div>
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        <p className="text-[var(--text-secondary)] mb-6">{error.message}</p>
        <button onClick={reset} className="btn btn-primary min-h-[44px]">
          Try Again
        </button>
      </div>
    </div>
  );
}