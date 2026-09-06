import { useRef, useState, useEffect } from 'react';
import FileViewer from './FileViewer';
import ResizeHandle from './ResizeHandle';
import { useResizable } from '../hooks/useResizable';

/**
 * PreviewPanel — side-by-side workspace showing Code & Live Browser Preview concurrently.
 */
export default function PreviewPanel({ previewURL, agentURL, selectedFile, onSelectFile, refreshTrigger }) {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);
  const [activeTab, setActiveTab] = useState(() => (previewURL ? 'split' : 'files')); // 'split' | 'preview' | 'files'
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [previewReady, setPreviewReady] = useState(false);

  // Auto-refresh preview iframe whenever AI finishes updating files
  useEffect(() => {
    if (refreshTrigger > 0) {
      setLoading(true);
      setKey((k) => k + 1);
    }
  }, [refreshTrigger]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Poll preview URL silently until dev server starts responding, avoiding iframe 502
  useEffect(() => {
    if (!previewURL) {
      setPreviewReady(false);
      setLoading(false);
      return;
    }
    let isMounted = true;
    setPreviewReady(false);
    setLoading(true);

    const checkReady = async () => {
      await new Promise((r) => setTimeout(r, 600));
      for (let i = 0; i < 15; i++) {
        if (!isMounted) return;
        try {
          await fetch(previewURL, { method: 'GET', mode: 'no-cors' });
          if (isMounted) {
            setPreviewReady(true);
            return;
          }
        } catch (_) {
          // Dev server warming up
        }
        await new Promise((r) => setTimeout(r, 1200));
      }
      // After timeout, mount iframe anyway so user doesn't stay blocked on a spinner
      if (isMounted) setPreviewReady(true);
    };

    checkReady();

    return () => {
      isMounted = false;
    };
  }, [previewURL, key]);

  // Auto-switch to split view whenever a file is selected so the Code Editor opens
  useEffect(() => {
    if (selectedFile && activeTab === 'preview') {
      setActiveTab('split');
    }
  }, [selectedFile]);

  // Resizable left code panel width in split mode (Desktop only)
  const { size: codeWidth, handleMouseDown: onCodeResize } = useResizable('horizontal', 540, 280, 950);

  const refresh = () => {
    setLoading(true);
    setKey((k) => k + 1);
  };

  const openExternal = () => {
    window.open(previewURL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)] overflow-hidden">
      {/* ── Top Toolbar ────────────────────────────────────── */}
      <div className="flex items-center justify-between px-2.5 sm:px-4 h-12 border-b border-white/5 bg-[var(--bg-panel)] flex-shrink-0 gap-1.5 sm:gap-2">
        {/* Left: Window dots + View Switcher Tabs */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* macOS window dots */}
          <div className="hidden sm:flex items-center gap-2 mr-1 flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-rose-500/80 hover:opacity-100 transition-opacity cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:opacity-100 transition-opacity cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 hover:opacity-100 transition-opacity cursor-pointer" />
          </div>

          {/* Segmented Tab buttons */}
          <div className="flex items-center rounded-xl bg-[var(--bg-card)] border border-white/10 gap-4 shadow-inner p-1">
            <button
              onClick={() => setActiveTab('split')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'split'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/35 font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/8'
              }`}
              title="View Code and Live Preview side by side"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <line x1="12" x2="12" y1="3" y2="21"/>
              </svg>
              <span>Split</span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'preview'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/35 font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/8'
              }`}
              title="Full width browser preview"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span className="hidden sm:inline">Full Preview</span>
              <span className="sm:hidden">Preview</span>
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'files'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/35 font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/8'
              }`}
              title="Full width code editor"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
              </svg>
              <span className="hidden sm:inline">Code Only</span>
              <span className="sm:hidden">Code</span>
            </button>
          </div>
        </div>

        {/* URL Bar & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {previewURL ? (
            <>
              <div className="hidden md:flex items-center gap-2 bg-[var(--bg-card)] border border-white/8 rounded-md px-3 py-1.5 min-w-0 max-w-xs lg:max-w-sm">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <span className="text-xs text-[var(--text-muted)] truncate font-mono select-all">
                  {previewURL}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={refresh}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-white/8 text-[var(--text-muted)] hover:text-white transition-colors"
                  title="Refresh preview"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                </button>
                <button
                  onClick={openExternal}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-white/8 text-[var(--text-muted)] hover:text-white transition-colors"
                  title="Open preview in new window"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/8 text-[11px] text-[var(--text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span>No live preview URL</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Workspace Content ─────────────────────────── */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {/* Split View (Default): Both Code and Preview visible side-by-side with resizable divider */}
        {activeTab === 'split' && (
          <div className="w-full h-full flex flex-col md:flex-row overflow-hidden">
            {/* Left Column: Code Editor (ALWAYS visible and active) */}
            <div
              className="w-full md:w-auto h-1/2 md:h-full flex-shrink-0 overflow-hidden"
              style={isDesktop ? { width: `${codeWidth}px` } : undefined}
            >
              <FileViewer agentURL={agentURL} selectedFile={selectedFile} onSelectFile={onSelectFile} hideExplorer={true} />
            </div>

            {/* Horizontal Resize Handle (Desktop only) */}
            {isDesktop && (
              <ResizeHandle direction="horizontal" onMouseDown={onCodeResize} />
            )}

            {/* Right Column: Live Browser Preview or No Preview State */}
            <div className="flex-1 w-full h-1/2 md:h-full relative overflow-hidden bg-white">
              {!previewURL ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--bg-secondary)] p-6 text-center">
                  <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-200">No Web Preview Available</p>
                    <p className="text-[11px] text-[var(--text-muted)] max-w-xs leading-relaxed">
                      This sandbox has no live preview dev server configured. Your files and code editor are fully available on the left.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('files')}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm shadow-indigo-600/30"
                  >
                    Expand Code Editor
                  </button>
                </div>
              ) : (
                <>
                  {(loading || !previewReady) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--bg-secondary)] z-10">
                      <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                      <span className="text-xs text-[var(--text-muted)]">
                        {!previewReady ? 'Connecting to live dev server…' : 'Loading live preview…'}
                      </span>
                    </div>
                  )}
                  {previewReady && (
                    <iframe
                      key={key}
                      ref={iframeRef}
                      src={previewURL}
                      title="Sandbox Preview"
                      onLoad={() => setLoading(false)}
                      className="w-full h-full border-none bg-white"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-pointer-lock"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Full Preview View */}
        {activeTab === 'preview' && (
          <div className="w-full h-full relative bg-white">
            {!previewURL ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--bg-secondary)] p-6 text-center">
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-200">No Web Preview Available</p>
                  <p className="text-[11px] text-[var(--text-muted)] max-w-xs leading-relaxed">
                    No web dev server is running for this sandbox.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('files')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm shadow-indigo-600/30"
                >
                  Switch to Code View
                </button>
              </div>
            ) : (
              <>
                {(loading || !previewReady) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--bg-secondary)] z-10">
                    <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    <span className="text-xs text-[var(--text-muted)]">
                      {!previewReady ? 'Connecting to live dev server…' : 'Loading preview…'}
                    </span>
                  </div>
                )}
                {previewReady && (
                  <iframe
                    key={key}
                    ref={iframeRef}
                    src={previewURL}
                    title="Sandbox Preview"
                    onLoad={() => setLoading(false)}
                    className="w-full h-full border-none bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-pointer-lock"
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* Code Only View */}
        {activeTab === 'files' && (
          <div className="w-full h-full">
            <FileViewer agentURL={agentURL} selectedFile={selectedFile} onSelectFile={onSelectFile} hideExplorer={true} />
          </div>
        )}
      </div>
    </div>
  );
}
