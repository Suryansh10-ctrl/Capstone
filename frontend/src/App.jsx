import { useState, useCallback, useEffect } from 'react';
import LandingScreen from './components/LandingScreen';
import Topbar from './components/Topbar';
import ChatPanel from './components/ChatPanel';
import PreviewPanel from './components/PreviewPanel';
import TerminalPanel from './components/TerminalPanel';
import ResizeHandle from './components/ResizeHandle';
import { useResizable } from './hooks/useResizable';
import './index.css';

import FileViewer from './components/FileViewer';

import { waitForSandboxReady } from './api';

/**
 * WorkspaceLayout — the full IDE-like layout rendered after sandbox creation.
 * Fully responsive across mobile, tablet, and desktop screens.
 */
function WorkspaceLayout({ sandboxData, onNewSandbox }) {
  const { sandboxId, previewURL, agentURL } = sandboxData;
  const [showChat, setShowChat] = useState(true);
  const [showExplorer, setShowExplorer] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [terminalState, setTerminalState] = useState('normal'); // 'normal' | 'maximized' | 'collapsed'
  const [isContainerReady, setIsContainerReady] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const triggerPreviewRefresh = useCallback(() => {
    setPreviewKey((k) => k + 1);
  }, []);

  // Non-blocking readiness check in background to update Topbar status dot (Starting -> Ready)
  useEffect(() => {
    let isMounted = true;
    setIsContainerReady(false);
    waitForSandboxReady(agentURL, 30, 1500)
      .then(() => {
        if (isMounted) setIsContainerReady(true);
      })
      .catch(() => {
        // Even if readiness check times out, let user access everything
        if (isMounted) setIsContainerReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, [agentURL]);

  const toggleTerminalMaximize = useCallback(() => {
    setTerminalState((prev) => (prev === 'maximized' ? 'normal' : 'maximized'));
  }, []);

  const toggleTerminalCollapse = useCallback(() => {
    setTerminalState((prev) => (prev === 'collapsed' ? 'normal' : 'collapsed'));
  }, []);

  // Detect small screens & track viewport height
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setViewportHeight(window.innerHeight);
      if (window.innerWidth < 768) {
        setShowChat(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Horizontal resize: file explorer width (left side, reverse=false)
  const {
    size: explorerWidth,
    handleMouseDown: onExplorerResize,
  } = useResizable('horizontal', 240, 160, 520, false);

  // Horizontal resize: chat panel width (right side, reverse=true)
  const {
    size: chatWidth,
    handleMouseDown: onChatResize,
  } = useResizable('horizontal', 380, 260, 640, true);

  // Vertical resize: preview & code panel height
  const defaultPreviewHeight = Math.min(Math.max(300, Math.floor(viewportHeight * 0.55)), 700);
  const {
    size: previewHeight,
    handleMouseDown: onPreviewResize,
  } = useResizable('vertical', defaultPreviewHeight, 160, Math.floor(viewportHeight * 0.8));

  // Dynamic preview panel height for mobile vs desktop
  const computedHeight = isMobile
    ? Math.min(previewHeight, Math.floor(viewportHeight * 0.58))
    : previewHeight;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] overflow-hidden">
      {/* ── Topbar ──────────────────────────────────────────── */}
      <Topbar
        sandboxId={sandboxId}
        isReady={isContainerReady}
        onNewSandbox={onNewSandbox}
        showChat={showChat}
        onToggleChat={() => setShowChat((prev) => !prev)}
        showExplorer={showExplorer}
        onToggleExplorer={() => setShowExplorer((prev) => !prev)}
      />

      {/* ── Main Panel Row ──────────────────────────────────── */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* ── Column 1: VS Code Style Full-Height File Explorer Sidebar ─ */}
        {showExplorer && !isMobile && (
          <>
            <div
              className="flex-shrink-0 border-r border-white/5 bg-[var(--bg-panel)] h-full overflow-hidden"
              style={{ width: `${explorerWidth}px` }}
            >
              <FileViewer
                agentURL={agentURL}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
                hideEditor={true}
              />
            </div>

            {/* Resize handle between Explorer and Main Workspace */}
            <ResizeHandle direction="horizontal" onMouseDown={onExplorerResize} />
          </>
        )}

        {/* ── Column 2: Main Workspace (Code + Preview & Terminal) ─ */}
        <div className="flex flex-col flex-1 min-w-0 animate-fade-in overflow-hidden h-full">
          {/* File Preview & Code / Browser Preview */}
          <div
            className={`transition-all duration-150 ${
              terminalState === 'collapsed'
                ? 'flex-1 min-h-0'
                : terminalState === 'maximized'
                ? 'h-11 flex-shrink-0 overflow-hidden border-b border-white/5'
                : 'flex-shrink-0 border-b border-white/5'
            }`}
            style={terminalState === 'normal' ? { height: `${computedHeight}px` } : undefined}
          >
            <PreviewPanel
              previewURL={previewURL}
              agentURL={agentURL}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              refreshTrigger={previewKey}
            />
          </div>

          {/* Vertical resize handle (Normal state only) */}
          {terminalState === 'normal' && (
            <ResizeHandle direction="vertical" onMouseDown={onPreviewResize} />
          )}

          {/* Terminal Panel */}
          {terminalState !== 'collapsed' ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              <TerminalPanel
                agentURL={agentURL}
                terminalState={terminalState}
                onToggleMaximize={toggleTerminalMaximize}
                onToggleCollapse={toggleTerminalCollapse}
              />
            </div>
          ) : (
            /* Collapsed IDE Terminal Status Bar */
            <button
              onClick={toggleTerminalCollapse}
              className="h-8 border-t border-white/5 bg-[var(--bg-panel)] px-3 flex items-center justify-between text-xs text-slate-400 hover:text-white transition-colors cursor-pointer select-none flex-shrink-0"
              title="Expand terminal panel"
            >
              <div className="flex items-center gap-2">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5"/>
                  <line x1="12" y1="19" x2="20" y2="19"/>
                </svg>
                <span className="font-semibold text-slate-300 text-xs">Terminal</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">Connected</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-slate-200">
                <span>Click to expand</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
              </div>
            </button>
          )}
        </div>

        {/* ── Desktop Right Column: AI Chat Panel ───────────── */}
        {showChat && !isMobile && (
          <>
            {/* Horizontal resize handle */}
            <ResizeHandle direction="horizontal" onMouseDown={onChatResize} />

            <div
              className="flex-shrink-0 border-l border-white/5 animate-slide-in-right h-full overflow-hidden"
              style={{ width: chatWidth }}
            >
              <ChatPanel
                sandboxId={sandboxId}
                onSelectFile={setSelectedFile}
                onRefreshPreview={triggerPreviewRefresh}
                onClose={() => setShowChat(false)}
              />
            </div>
          </>
        )}

        {/* ── Mobile / Tablet Overlay Drawer & Backdrop for Chat ─────────── */}
        {showChat && isMobile && (
          <>
            {/* Backdrop Scrim */}
            <div
              onClick={() => setShowChat(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 animate-fade-in"
            />
            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[380px] bg-[var(--bg-panel)] shadow-2xl border-l border-white/10 animate-slide-in-right flex flex-col">
              <ChatPanel
                sandboxId={sandboxId}
                onSelectFile={setSelectedFile}
                onRefreshPreview={triggerPreviewRefresh}
                onClose={() => setShowChat(false)}
              />
            </div>
          </>
        )}

        {/* ── Mobile / Tablet Overlay Drawer & Backdrop for Explorer ─────── */}
        {showExplorer && isMobile && (
          <>
            {/* Backdrop Scrim */}
            <div
              onClick={() => setShowExplorer(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 animate-fade-in"
            />
            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 z-40 w-72 sm:w-80 bg-[var(--bg-panel)] shadow-2xl border-r border-white/10 animate-slide-in-left flex flex-col">
              <div className="flex items-center justify-between px-3.5 h-11 border-b border-white/5 bg-[var(--bg-panel)]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Explorer</span>
                <button
                  onClick={() => setShowExplorer(false)}
                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-white/10 text-xs px-2"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <FileViewer
                  agentURL={agentURL}
                  selectedFile={selectedFile}
                  onSelectFile={(f) => {
                    setSelectedFile(f);
                    setShowExplorer(false);
                  }}
                  hideEditor={true}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * App — root component that manages the sandbox lifecycle.
 */
export default function App() {
  const [sandboxData, setSandboxData] = useState(null);

  const handleStart = useCallback((data) => {
    setSandboxData(data);
  }, []);

  const handleNewSandbox = useCallback(() => {
    setSandboxData(null);
  }, []);

  if (!sandboxData) {
    return <LandingScreen onStart={handleStart} />;
  }

  return (
    <WorkspaceLayout
      sandboxData={sandboxData}
      onNewSandbox={handleNewSandbox}
    />
  );
}
