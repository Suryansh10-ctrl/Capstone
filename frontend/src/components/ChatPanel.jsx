import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { invokeAI } from '../api';

/**
 * Helper to extract updated file paths from status lines or text content
 */
function extractUpdatedFiles(statusLines = [], content = '') {
  const files = new Set();
  
  // 1. Parse status lines
  for (const line of statusLines) {
    const matches = String(line).matchAll(/(?:Saved|Updating|Saved file|Updated|file|patch)\s*:?\s*["']?([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)["']?/gi);
    for (const match of matches) {
      if (match[1]) {
        const cleanPath = match[1].replace(/\.+$/, '').trim();
        if (cleanPath.includes('.') || cleanPath.includes('/')) {
          files.add(cleanPath);
        }
      }
    }
  }

  // 2. Parse inline file references from response (e.g. `src/index.css` or `src/App.jsx`)
  const codeMatches = String(content).matchAll(/`([a-zA-Z0-9_\-\.\/]+\.(?:css|jsx|js|ts|tsx|json|html|md))`|["']([a-zA-Z0-9_\-\.\/]+\.(?:css|jsx|js|ts|tsx|json|html|md))["']\s*:\s*["']File updated/gi);
  for (const match of codeMatches) {
    const pathCandidate = match[1] || match[2];
    if (pathCandidate && (pathCandidate.startsWith('src/') || pathCandidate.startsWith('public/') || pathCandidate.endsWith('.css') || pathCandidate.endsWith('.jsx'))) {
      files.add(pathCandidate);
    }
  }

  return Array.from(files);
}

/**
 * ChatPanel — AI chat interface with SSE streaming and responsive collapse support.
 */
export default function ChatPanel({ sandboxId, onSelectFile, onRefreshPreview, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'ai',
      content: "Hi! I'm your AI assistant. Describe the UI you want to build and I'll generate it in your sandbox. Try: *\"Build a todo app with React\"* or *\"Create a dashboard with charts\"*",
      statusLines: [],
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const controllerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add user message
    const userId = `user-${Date.now()}`;
    setMessages(prev => [...prev, { id: userId, role: 'user', content: text }]);

    // Add placeholder AI message
    const aiId = `ai-${Date.now()}`;
    setMessages(prev => [...prev, { id: aiId, role: 'ai', content: '', statusLines: [], isStreaming: true }]);
    setIsStreaming(true);

    controllerRef.current = invokeAI(
      text,
      sandboxId,
      (chunk, isStatus) => {
        setMessages(prev => prev.map(m => {
          if (m.id !== aiId) return m;
          if (isStatus) {
            const isSaveStatus = /Saved|Updating|Updated/i.test(chunk);
            if (isSaveStatus) {
              onRefreshPreview?.();
            }
            return { ...m, statusLines: [...(m.statusLines || []), chunk] };
          }
          // Ensure raw JSON tool results or file array dumps are not leaked into the AI chat bubble
          const trimmed = (chunk || '').trim();
          if (
            (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
            (trimmed.startsWith('{"') && trimmed.endsWith('}')) ||
            trimmed.startsWith('{"message":') ||
            trimmed.startsWith('{"results":')
          ) {
            return m;
          }
          return { ...m, content: m.content + chunk };
        }));
      },
      () => {
        setIsStreaming(false);
        setMessages(prev => prev.map(m => {
          if (m.id !== aiId) return m;
          const updated = extractUpdatedFiles(m.statusLines, m.content);
          if (updated.length > 0) {
            onSelectFile?.(updated[updated.length - 1]);
            onRefreshPreview?.();
          }
          return { ...m, isStreaming: false };
        }));
      },
      (err) => {
        setIsStreaming(false);
        setMessages(prev => prev.map(m =>
          m.id === aiId
            ? { ...m, content: `⚠️ Error: ${err}`, isStreaming: false }
            : m
        ));
      }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  const cancelStream = () => {
    controllerRef.current?.abort();
    setIsStreaming(false);
    setMessages(prev => prev.map(m =>
      m.isStreaming ? { ...m, isStreaming: false, content: m.content || '[Cancelled]' } : m
    ));
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)] overflow-hidden">
      {/* ── Panel Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/5 flex-shrink-0 gap-2" style={{ paddingLeft: '14px', paddingRight: '14px', height: '46px' }}>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/30 flex items-center justify-center shadow-sm" style={{ width: '26px', height: '26px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">AI Assistant</span>
        </div>

        <div className="flex items-center gap-1.5">
          {isStreaming && (
            <button
              onClick={cancelStream}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors px-2 py-0.5 rounded-md border border-rose-500/30 hover:bg-rose-500/10 font-medium"
            >
              Stop
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-white/8 text-[var(--text-muted)] hover:text-white transition-colors"
              title="Close AI Chat panel"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Messages Stream ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar" style={{ padding: '14px 14px 16px 14px' }}>
        <div className="flex flex-col space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`animate-fade-in flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start items-start'
              }`}
              style={{ gap: '10px', marginBottom: '10px' }}
            >
              {/* AI Avatar Icon */}
              {msg.role === 'ai' && (
                <div className="rounded-lg bg-gradient-to-br from-indigo-500/25 to-purple-500/25 border border-indigo-500/35 text-indigo-300 flex items-center justify-center text-[11px] font-bold flex-shrink-0 shadow-sm" style={{ width: '28px', height: '28px', minWidth: '28px', marginTop: '2px' }}>
                  AI
                </div>
              )}

              {/* Content Container */}
              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`} style={{ gap: '4px', maxWidth: '88%' }}>
                {/* Role Sub-Label */}
                <span className="text-[10px] font-medium text-slate-400" style={{ paddingLeft: '2px', paddingRight: '2px' }}>
                  {msg.role === 'user' ? 'You' : 'AI Assistant'}
                </span>

                {/* Status lines — deduplicated, last few only */}
                {msg.role === 'ai' && msg.statusLines?.length > 0 && (
                  <div className="w-full space-y-1" style={{ marginBottom: '6px' }}>
                    {[...new Set(msg.statusLines)].slice(-4).map((line, i) => (
                      <div key={i} className="msg-status rounded-md flex items-center gap-1.5 shadow-sm" style={{ padding: '4px 8px' }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span className="font-mono text-[11px] truncate">{line.replace(/\n/g, '').trim()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`rounded-xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'msg-user text-white'
                      : 'msg-ai text-[var(--text-primary)]'
                  }`}
                  style={{ padding: '10px 14px', borderRadius: '14px' }}
                >
                  {msg.role === 'ai' && !msg.content && msg.isStreaming ? (
                    <div className="flex items-center gap-1 py-0.5">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  ) : msg.role === 'ai' ? (
                    <div className="ai-markdown">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                      {msg.isStreaming && msg.content && (
                        <span className="terminal-cursor" />
                      )}

                      {/* Interactive Updated File Badges */}
                      {extractUpdatedFiles(msg.statusLines, msg.content).length > 0 && (
                        <div className="flex flex-col gap-1.5 mt-3 pt-2.5 border-t border-white/10">
                          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9"/>
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                            </svg>
                            Updated Files:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {extractUpdatedFiles(msg.statusLines, msg.content).map((filePath) => (
                              <button
                                key={filePath}
                                onClick={() => onSelectFile?.(filePath)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-mono hover:bg-indigo-500/25 hover:text-white transition-colors cursor-pointer shadow-xs"
                                title={`Click to view ${filePath} in Code Editor`}
                              >
                                <span className="text-[11px]">✏️</span>
                                <span>{filePath}</span>
                                <span className="text-[10px] text-indigo-400 font-sans font-medium hover:underline ml-0.5">Open ↗</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
              </div>

              {/* User Avatar Icon */}
              {msg.role === 'user' && (
                <div className="rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center text-[11px] font-bold flex-shrink-0 shadow-sm" style={{ width: '28px', height: '28px', minWidth: '28px', marginTop: '2px' }}>
                  U
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input Bar ───────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-white/5 bg-[var(--bg-panel)] flex flex-col" style={{ padding: '12px 14px', gap: '6px' }}>
        <div
          className="flex items-end bg-[var(--bg-card)] border border-white/10 rounded-xl focus-within:border-indigo-500/50 transition-all shadow-inner"
          style={{ padding: '8px 10px', gap: '10px' }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build…"
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none outline-none leading-relaxed disabled:opacity-60"
            style={{
              height: 'auto',
              minHeight: '28px',
              maxHeight: '120px',
              padding: '4px 8px',
              border: 'none',
              outline: 'none',
              boxShadow: 'none'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 rounded-lg btn-primary flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm hover:scale-105 active:scale-95"
            style={{
              width: '34px',
              height: '34px',
              minWidth: '34px',
              minHeight: '34px',
              marginBottom: '1px'
            }}
            title="Send prompt"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]" style={{ paddingLeft: '2px', paddingRight: '2px' }}>
          <span>AI Powered Sandbox</span>
          <span><kbd className="px-1 py-0.5 rounded bg-white/5 text-[9px] font-mono border border-white/8" style={{ marginRight: '2px' }}>Enter</kbd> to send</span>
        </div>
      </div>
    </div>
  );
}
