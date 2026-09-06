import { useState } from 'react';

/**
 * Topbar — shows branding, sandbox ID badge, status, chat panel toggle, and a "New Sandbox" action.
 */
export default function Topbar({
  sandboxId,
  isReady,
  onNewSandbox,
  showChat = true,
  onToggleChat,
  showExplorer = true,
  onToggleExplorer,
}) {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    if (!sandboxId) return;
    navigator.clipboard.writeText(sandboxId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const short = sandboxId ? sandboxId.slice(0, 8) + '…' : '';

  return (
    <header className="flex items-center justify-between px-3 sm:px-4 h-13 border-b border-white/5 bg-[var(--bg-panel)] flex-shrink-0 z-20 gap-2 sm:gap-4">
      {/* ── Left: Brand & Status ──────────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
              <line x1="12" y1="22" x2="12" y2="15.5"/>
              <polyline points="22 8.5 12 15.5 2 8.5"/>
            </svg>
          </div>
          <span className="font-semibold text-sm text-white tracking-tight hidden sm:inline">
            Sandbox AI
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/10 hidden sm:block flex-shrink-0" />

        {/* Sandbox ID Badge */}
        {sandboxId && (
          <button
            onClick={copyId}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/8 hover:bg-white/10 transition-colors text-xs font-mono text-[var(--text-secondary)] hover:text-white flex-shrink-0"
            title="Click to copy sandbox ID"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span className="hidden md:inline">{copied ? 'Copied!' : short}</span>
            <span className="md:hidden">{copied ? '✓' : 'ID'}</span>
          </button>
        )}

        {/* Status */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5 flex-shrink-0">
          <div
            className={`w-2 h-2 rounded-full transition-colors ${
              isReady ? 'status-dot-active' : 'bg-yellow-500 animate-pulse'
            }`}
          />
          <span className="text-[11px] font-medium text-[var(--text-secondary)]">
            {isReady ? 'Ready' : 'Starting…'}
          </span>
        </div>
      </div>

      {/* ── Right: Files Toggle, Chat Toggle & New Sandbox ─────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Toggle File Explorer */}
        {onToggleExplorer && (
          <button
            onClick={onToggleExplorer}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              showExplorer
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-950/40'
                : 'bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white border-white/8'
            }`}
            title={showExplorer ? 'Hide File Explorer' : 'Show File Explorer'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
            </svg>
            <span className="hidden sm:inline">Files</span>
            <span className={`w-1.5 h-1.5 rounded-full ${showExplorer ? 'bg-indigo-400' : 'bg-slate-500'}`} />
          </button>
        )}

        {/* Toggle AI Chat Button */}
        {onToggleChat && (
          <button
            onClick={onToggleChat}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              showChat
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-950/40'
                : 'bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white border-white/8'
            }`}
            title={showChat ? 'Hide AI Chat Panel' : 'Open AI Chat Panel'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="hidden sm:inline">AI Chat</span>
            <span className={`w-1.5 h-1.5 rounded-full ${showChat ? 'bg-indigo-400' : 'bg-slate-500'}`} />
          </button>
        )}

        {/* New Sandbox */}
        <button
          onClick={onNewSandbox}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 transition-all hover:border-white/15 shadow-sm"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span className="hidden sm:inline">New Sandbox</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>
    </header>
  );
}
