import { useState, useCallback } from 'react';
import { startSandbox } from '../api';

/**
 * LandingScreen — full-screen splash with animated background and "Create Sandbox" CTA.
 * @param {(data: {sandboxId, previewURL, agentURL}) => void} onStart
 */
export default function LandingScreen({ onStart }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await startSandbox();
      onStart(data);
    } catch (err) {
      setError(err.message || 'Failed to create sandbox');
      setLoading(false);
    }
  }, [onStart]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[var(--bg-primary)]">
      {/* Animated grid background */}
      <div className="absolute inset-0 landing-grid opacity-60" />

      {/* Radial glow blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-cyan-600/6 rounded-full blur-[80px] pointer-events-none" />

      {/* Floating orbit dots */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-indigo-400/40"
            style={{
              animation: `orbit ${6 + i * 2}s linear infinite`,
              animationDelay: `${i * -2}s`,
              transformOrigin: 'center',
            }}
          />
        ))}
      </div>

      {/* Main card */}
      <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8 max-w-lg w-full px-4 sm:px-6 animate-fade-in my-auto py-8">
        {/* Icon */}
        <div className="relative animate-float">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-900/60 animate-pulse-glow">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="sm:w-9 sm:h-9">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
              <line x1="12" y1="22" x2="12" y2="15.5"/>
              <polyline points="22 8.5 12 15.5 2 8.5"/>
            </svg>
          </div>
          {/* Corner badges */}
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-[var(--bg-primary)] flex items-center justify-center">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center space-y-2.5 sm:space-y-3">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            <span className="gradient-text">Sandbox</span>
            <span className="text-white"> AI</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-sm sm:text-lg leading-relaxed">
            Spin up an instant dev environment.<br className="hidden sm:inline" />
            Chat with AI to build UIs — live.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { icon: '⚡', label: 'Instant Setup' },
            { icon: '🤖', label: 'AI-Powered' },
            { icon: '🖥️', label: 'Live Preview' },
            { icon: '💻', label: 'Full Terminal' },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/8 text-sm text-[var(--text-secondary)]"
            >
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3 w-full">
          <button
            id="create-sandbox-btn"
            onClick={handleCreate}
            disabled={loading}
            className="btn-primary w-full max-w-xs py-4 px-8 rounded-2xl text-base font-semibold tracking-wide shadow-xl shadow-indigo-900/40"
          >
            <span className="flex items-center justify-center gap-3">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating sandbox…
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="16"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  Create Sandbox
                </>
              )}
            </span>
          </button>

          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <p className="text-xs text-[var(--text-muted)]">
            React + Vite sandbox · ~3 seconds to ready
          </p>
        </div>
      </div>
    </div>
  );
}
