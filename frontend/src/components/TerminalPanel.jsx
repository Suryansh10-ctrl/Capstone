import { useState } from 'react';
import { useTerminal } from '../hooks/useTerminal';

/**
 * TerminalPanel — exact VS Code / Antigravity style bottom panel matching:
 * Tabs: Problems | Output | Debug Console | Terminal | Ports
 * Right Controls: + | ... | [ ] Maximize | X Close
 * Body: Left xterm.js terminal + Right terminal session sidebar (node).
 */
export default function TerminalPanel({
  agentURL,
  terminalState = 'normal',
  onToggleMaximize,
  onToggleCollapse,
}) {
  const { terminalRef, isConnected, clearTerminal } = useTerminal(agentURL);
  const [activeTab, setActiveTab] = useState('terminal'); // 'problems' | 'output' | 'debug' | 'terminal' | 'ports'
  const [sessions, setSessions] = useState([{ id: 'node-1', name: 'node' }]);
  const [activeSession, setActiveSession] = useState('node-1');

  const addSession = () => {
    const newId = `node-${sessions.length + 1}`;
    setSessions((prev) => [...prev, { id: newId, name: 'node' }]);
    setActiveSession(newId);
  };

  return (
    <div className="flex flex-col h-full bg-[#181818] overflow-hidden text-[#cccccc]">
      {/* ── VS Code Style Panel Header ──────────────────────────── */}
      <div className="flex items-center justify-between px-3 sm:px-4 h-9 border-b border-white/5 bg-[#181818] flex-shrink-0 gap-2 select-none text-xs">
        {/* Left: Tab Bar (Problems, Output, Debug Console, Terminal, Ports) */}
        <div className="flex items-center gap-4 sm:gap-6 min-w-0 font-normal">
          <button
            onClick={() => setActiveTab('problems')}
            className={`py-1.5 transition-colors ${
              activeTab === 'problems'
                ? 'text-white font-medium border-b-2 border-slate-200'
                : 'text-[#858585] hover:text-slate-200'
            }`}
          >
            Problems
          </button>

          <button
            onClick={() => setActiveTab('output')}
            className={`py-1.5 transition-colors ${
              activeTab === 'output'
                ? 'text-white font-medium border-b-2 border-slate-200'
                : 'text-[#858585] hover:text-slate-200'
            }`}
          >
            Output
          </button>

          <button
            onClick={() => setActiveTab('debug')}
            className={`hidden sm:inline py-1.5 transition-colors ${
              activeTab === 'debug'
                ? 'text-white font-medium border-b-2 border-slate-200'
                : 'text-[#858585] hover:text-slate-200'
            }`}
          >
            Debug Console
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            className={`py-1.5 transition-colors flex items-center gap-1.5 ${
              activeTab === 'terminal'
                ? 'text-white font-medium border-b-2 border-slate-200'
                : 'text-[#858585] hover:text-slate-200'
            }`}
          >
            <span>Terminal</span>
            {isConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('ports')}
            className={`hidden md:inline py-1.5 transition-colors ${
              activeTab === 'ports'
                ? 'text-white font-medium border-b-2 border-slate-200'
                : 'text-[#858585] hover:text-slate-200'
            }`}
          >
            Ports
          </button>
        </div>

        {/* Right: Actions (+ dropdown, ..., Maximize, Close) */}
        <div className="flex items-center gap-1 text-[#858585]">
          {/* New Terminal Dropdown Button (+) */}
          {activeTab === 'terminal' && (
            <div className="flex items-center hover:bg-white/10 rounded px-1 py-0.5 transition-colors cursor-pointer" onClick={addSession}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-0.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          )}

          {/* More Options (...) */}
          <button
            onClick={clearTerminal}
            className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Clear Terminal / Options"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="19" cy="12" r="1.5"/>
              <circle cx="5" cy="12" r="1.5"/>
            </svg>
          </button>

          {/* Maximize / Restore Toggle */}
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
              title={terminalState === 'maximized' ? 'Restore Panel Size' : 'Maximize Panel Size'}
            >
              {terminalState === 'maximized' ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="5" width="14" height="14" rx="1"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                </svg>
              )}
            </button>
          )}

          {/* Close Panel (X) */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
              title="Close Panel"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Main Panel Content ──────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden relative flex">
        {/* Tab 1: Terminal View */}
        <div className={`flex-1 h-full min-w-0 ${activeTab === 'terminal' ? 'flex' : 'hidden'}`}>
          {/* Main xterm container */}
          <div className="flex-1 h-full min-w-0 overflow-hidden">
            <div ref={terminalRef} className="terminal-container" />
          </div>

          {/* VS Code Style Right Terminal Session Bar */}
          <div className="w-24 sm:w-28 border-l border-white/5 bg-[#181818] p-1.5 flex flex-col gap-1 select-none flex-shrink-0 hidden sm:flex">
            {sessions.map((sess) => (
              <button
                key={sess.id}
                onClick={() => setActiveSession(sess.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors font-mono ${
                  activeSession === sess.id
                    ? 'bg-[#2a2d2e] text-white font-medium border border-white/10 shadow-sm'
                    : 'text-[#858585] hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {/* Terminal prompt icon */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                  <rect x="3" y="4" width="18" height="16" rx="2"/>
                  <path d="m7 8 4 4-4 4"/>
                  <path d="M13 16h4"/>
                </svg>
                <span className="truncate">{sess.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab 2: Output */}
        {activeTab === 'output' && (
          <div className="flex-1 h-full p-4 font-mono text-xs text-slate-300 overflow-y-auto space-y-1 bg-[#181818]">
            <div className="text-emerald-400">[info] Development server running at {agentURL}</div>
            <div className="text-slate-400">[info] Vite v8.2.2 building client environment for sandbox...</div>
            <div className="text-slate-400">[info] Ready for connection.</div>
          </div>
        )}

        {/* Tab 3: Debug Console */}
        {activeTab === 'debug' && (
          <div className="flex-1 h-full p-4 font-mono text-xs text-slate-400 overflow-y-auto bg-[#181818]">
            <div>Debugger attached. No active breakpoints.</div>
          </div>
        )}

        {/* Tab 4: Problems */}
        {activeTab === 'problems' && (
          <div className="flex-1 h-full flex flex-col items-center justify-center text-xs text-[#858585] gap-2 bg-[#181818]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-40">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>No problems have been detected in the workspace.</span>
          </div>
        )}

        {/* Tab 5: Ports */}
        {activeTab === 'ports' && (
          <div className="flex-1 h-full p-4 font-mono text-xs text-slate-300 overflow-y-auto bg-[#181818]">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 font-semibold text-[#858585]">
              <span>Port</span>
              <span>Local Address</span>
              <span>Status</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-indigo-400">5173 / 5175</span>
              <span>http://localhost:5175</span>
              <span className="text-emerald-400">Forwarded</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
