import { useState, useEffect, useMemo, useCallback } from 'react';
import { listFiles, readFile, updateFile } from '../api';

function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jsx':
    case 'tsx':
      return { label: 'JSX', color: 'text-cyan-400', bg: 'bg-cyan-500/10' };
    case 'js':
    case 'ts':
      return { label: 'JS', color: 'text-amber-400', bg: 'bg-amber-500/10' };
    case 'css':
    case 'scss':
      return { label: 'CSS', color: 'text-sky-400', bg: 'bg-sky-500/10' };
    case 'json':
      return { label: '{ }', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    case 'html':
      return { label: '< >', color: 'text-orange-400', bg: 'bg-orange-500/10' };
    case 'svg':
    case 'png':
    case 'jpg':
      return { label: 'IMG', color: 'text-purple-400', bg: 'bg-purple-500/10' };
    case 'md':
      return { label: 'MD', color: 'text-slate-400', bg: 'bg-slate-500/10' };
    default:
      return { label: 'FILE', color: 'text-slate-400', bg: 'bg-white/5' };
  }
}

/**
 * Builds a nested file tree from flat paths
 */
function buildTree(filePaths) {
  const root = { name: '', isDir: true, path: '', children: {} };

  for (const filePath of filePaths) {
    const parts = filePath.split('/');
    let current = root;
    let accumulated = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulated = accumulated ? `${accumulated}/${part}` : part;
      const isFile = i === parts.length - 1;

      if (isFile) {
        current.children[part] = {
          name: part,
          path: filePath,
          isDir: false,
        };
      } else {
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: accumulated,
            isDir: true,
            children: {},
          };
        }
        current = current.children[part];
      }
    }
  }

  function sortNodes(node) {
    if (!node.isDir) return node;
    const sorted = Object.values(node.children).sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });
    return sorted.map(child => ({
      ...child,
      children: child.isDir ? sortNodes(child) : undefined,
    }));
  }

  return sortNodes(root);
}

/**
 * Recursive Tree Item component with comfortable spacing
 */
function TreeItem({
  node,
  level = 0,
  selectedFile,
  onSelectFile,
  expandedDirs,
  onToggleDir,
}) {
  const isExpanded = expandedDirs.has(node.path);
  const isSelected = !node.isDir && selectedFile === node.path;
  const icon = !node.isDir ? getFileIcon(node.name) : null;

  if (node.isDir) {
    return (
      <div className="select-none">
        <button
          onClick={() => onToggleDir(node.path)}
          style={{ paddingLeft: `${level * 14 + 8}px` }}
          className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md text-left text-xs font-mono text-[var(--text-secondary)] hover:bg-white/5 hover:text-white transition-colors group"
        >
          {/* Chevron */}
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-slate-500 transition-transform duration-150 flex-shrink-0 ${
              isExpanded ? 'rotate-90 text-slate-300' : ''
            }`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>

          {/* Folder icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`flex-shrink-0 ${
              isExpanded ? 'text-amber-400' : 'text-amber-400/80'
            }`}
          >
            {isExpanded ? (
              <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
            ) : (
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
            )}
          </svg>

          <span className="truncate font-medium text-slate-300 group-hover:text-white">
            {node.name}
          </span>
        </button>

        {isExpanded && node.children && (
          <div className="flex flex-col">
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                level={level + 1}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                expandedDirs={expandedDirs}
                onToggleDir={onToggleDir}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File Row
  return (
    <button
      onClick={() => onSelectFile(node.path)}
      style={{ paddingLeft: `${level * 14 + 20}px` }}
      className={`w-full flex items-center gap-2 py-1.5 px-2 rounded-md text-left text-xs font-mono transition-colors group ${
        isSelected
          ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-medium shadow-sm shadow-indigo-950/40'
          : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-white'
      }`}
      title={node.path}
    >
      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${icon.bg} ${icon.color}`}>
        {icon.label}
      </span>
      <span className="truncate flex-1">{node.name}</span>
    </button>
  );
}

export default function FileViewer({
  agentURL,
  initialFile = null,
  selectedFile: externalSelectedFile,
  onSelectFile: externalOnSelectFile,
  hideExplorer = false,
  hideEditor = false,
}) {
  const [files, setFiles] = useState([]);
  const [internalSelectedFile, setInternalSelectedFile] = useState(initialFile);

  const selectedFile = externalSelectedFile !== undefined ? externalSelectedFile : internalSelectedFile;
  const setSelectedFile = externalOnSelectFile || setInternalSelectedFile;

  const [fileContent, setFileContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState(new Set(['src', 'public', 'src/assets']));
  const [showExplorer, setShowExplorer] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 640 : true));

  // Fetch file list
  const refreshFileList = useCallback(async () => {
    if (!agentURL) return;
    setLoadingFiles(true);
    setError(null);
    try {
      const fileList = await listFiles(agentURL);
      setFiles(fileList);

      // Auto-expand all top-level directories
      const dirs = new Set(['src', 'public', 'src/assets']);
      for (const f of fileList) {
        const parts = f.split('/');
        if (parts.length > 1) {
          dirs.add(parts[0]);
          if (parts.length > 2) {
            dirs.add(`${parts[0]}/${parts[1]}`);
          }
        }
      }
      setExpandedDirs(dirs);

      if (fileList.length > 0) {
        setSelectedFile((prev) => prev || fileList.find(f => f.includes('App.jsx')) || fileList[0]);
      }
    } catch (err) {
      setError(`Failed to list files: ${err.message}`);
    } finally {
      setLoadingFiles(false);
    }
  }, [agentURL, setSelectedFile]);

  useEffect(() => {
    refreshFileList();
  }, [agentURL, refreshFileList]);

  // Load content whenever selected file changes
  useEffect(() => {
    if (!agentURL || !selectedFile) return;

    let isMounted = true;
    setLoadingContent(true);
    setError(null);
    setIsEditing(false);
    setSaveSuccess(false);

    readFile(agentURL, selectedFile)
      .then((content) => {
        if (!isMounted) return;
        setFileContent(content);
        setEditedContent(content);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(`Failed to read ${selectedFile}: ${err.message}`);
      })
      .finally(() => {
        if (isMounted) setLoadingContent(false);
      });

    return () => {
      isMounted = false;
    };
  }, [agentURL, selectedFile]);

  // Toggle directory expanded state
  const handleToggleDir = (dirPath) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
      }
      return next;
    });
  };

  // Handle Save
  const handleSave = async () => {
    if (!agentURL || !selectedFile || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateFile(agentURL, selectedFile, editedContent);
      setFileContent(editedContent);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setError(`Failed to save ${selectedFile}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = isEditing ? editedContent : fileContent;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build tree from files
  const fileTree = useMemo(() => {
    if (!searchQuery.trim()) {
      return buildTree(files);
    }
    const filtered = files.filter(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
    return buildTree(filtered);
  }, [files, searchQuery]);

  // Auto-expand dirs when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const allDirs = new Set();
      for (const f of files) {
        if (f.toLowerCase().includes(searchQuery.toLowerCase())) {
          const parts = f.split('/');
          let acc = '';
          for (let i = 0; i < parts.length - 1; i++) {
            acc = acc ? `${acc}/${parts[i]}` : parts[i];
            allDirs.add(acc);
          }
        }
      }
      setExpandedDirs(allDirs);
    }
  }, [searchQuery, files]);

  const lineCount = useMemo(() => {
    const text = isEditing ? editedContent : fileContent;
    return text ? text.split('\n').length : 1;
  }, [isEditing, editedContent, fileContent]);

  const activeIcon = selectedFile ? getFileIcon(selectedFile) : null;

  return (
    <div className="flex h-full w-full bg-[var(--bg-secondary)] overflow-hidden">
      {/* ── Left Sidebar: VS Code Style Hierarchical File Tree ───────────────────── */}
      {!hideExplorer && showExplorer && (
        <div className={`${hideEditor ? 'w-full' : 'w-52 sm:w-60 flex-shrink-0 border-r border-white/5'} flex flex-col bg-[var(--bg-panel)] animate-fade-in h-full`}>
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 h-11 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Explorer</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)] font-mono">{files.length}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => refreshFileList()}
                disabled={loadingFiles}
                title="Refresh files"
                className="p-1 rounded-md hover:bg-white/8 text-[var(--text-muted)] hover:text-white transition-colors disabled:opacity-50"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={loadingFiles ? 'animate-spin' : ''}
                >
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="p-2 border-b border-white/5">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[var(--bg-card)] border border-white/10 rounded-lg focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all shadow-xs">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--text-muted)] flex-shrink-0"
              >
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter files…"
                className="w-full bg-transparent border-none p-0 text-xs text-white placeholder-[var(--text-muted)] focus:outline-none focus:ring-0 min-w-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[var(--text-muted)] hover:text-white transition-colors flex-shrink-0"
                  title="Clear search"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Hierarchical Tree Container */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
            {loadingFiles && files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <span className="text-[11px] text-[var(--text-muted)]">Listing files…</span>
              </div>
            ) : fileTree.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--text-muted)] space-y-2">
                <p>No files found</p>
                <button
                  onClick={() => refreshFileList()}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white text-[11px] transition-colors border border-white/10 cursor-pointer"
                >
                  Retry Loading
                </button>
              </div>
            ) : (
              fileTree.map((node) => (
                <TreeItem
                  key={node.path}
                  node={node}
                  level={0}
                  selectedFile={selectedFile}
                  onSelectFile={setSelectedFile}
                  expandedDirs={expandedDirs}
                  onToggleDir={handleToggleDir}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Right Content: Code Viewer / Editor ──────────────── */}
      {!hideEditor && (
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-secondary)] h-full">
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between px-3 sm:px-4 h-11 border-b border-white/5 bg-[var(--bg-panel)] flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Toggle Explorer Button (only shown when explorer is embedded in this instance) */}
            {!hideExplorer && (
              <button
                onClick={() => setShowExplorer(!showExplorer)}
                className="p-1.5 rounded-md hover:bg-white/8 text-[var(--text-muted)] hover:text-white transition-colors flex-shrink-0"
                title={showExplorer ? 'Hide Explorer' : 'Show Explorer'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M9 3v18"/>
                </svg>
              </button>
            )}

            {activeIcon && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono ${activeIcon.bg} ${activeIcon.color} flex-shrink-0`}>
                {activeIcon.label}
              </span>
            )}
            <span className="text-xs font-mono text-white truncate font-medium">
              {selectedFile || 'No file selected'}
            </span>
            {lineCount > 0 && (
              <span className="text-[11px] text-[var(--text-muted)] font-mono hidden md:inline flex-shrink-0">
                • {lineCount} lines
              </span>
            )}
            {saveSuccess && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 animate-fade-in flex items-center gap-1 font-medium flex-shrink-0">
                ✓ Saved
              </span>
            )}
          </div>

          {selectedFile && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Edit / View Toggle */}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 border ${
                  isEditing
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30'
                    : 'bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white border-white/8'
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                </svg>
                <span className="hidden sm:inline">{isEditing ? 'Editing' : 'Edit'}</span>
              </button>

              {/* Save Button */}
              {isEditing && (
                <button
                  onClick={handleSave}
                  disabled={saving || editedContent === fileContent}
                  className="px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-sm shadow-emerald-700/30"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  <span>{saving ? 'Saving…' : 'Save'}</span>
                </button>
              )}

              {/* Copy Button */}
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-white/8 text-[var(--text-muted)] hover:text-white transition-colors"
                title="Copy code to clipboard"
              >
                {copied ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="px-3.5 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white font-bold ml-2">×</button>
          </div>
        )}

        {/* Content Area with pixel-matched font metrics */}
        <div className="flex-1 relative overflow-hidden bg-[#07090e]">
          {loadingContent ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-xs text-[var(--text-muted)]">Loading file content…</span>
            </div>
          ) : !selectedFile ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-3 p-6 text-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <p className="text-xs max-w-xs">Select a file from the explorer on the left to preview its code.</p>
            </div>
          ) : isEditing ? (
            <div className="h-full flex overflow-hidden">
              {/* Line numbers column */}
              <div className="w-12 sm:w-14 flex-shrink-0 bg-[#06070b] border-r border-white/5 select-none py-3 sm:py-4 text-right pr-2 sm:pr-3 text-[13px] font-mono leading-[22px] text-slate-600 overflow-hidden">
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i} className="h-[22px] leading-[22px]">{i + 1}</div>
                ))}
              </div>
              {/* Textarea */}
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                spellCheck={false}
                className="flex-1 h-full p-3 sm:p-4 bg-transparent text-[13px] font-mono leading-[22px] text-slate-200 resize-none focus:outline-none custom-scrollbar whitespace-pre tab-size-2"
                style={{ tabSize: 2 }}
              />
            </div>
          ) : (
            <div className="h-full flex overflow-auto custom-scrollbar">
              {/* Line numbers column */}
              <div className="w-12 sm:w-14 flex-shrink-0 bg-[#06070b] border-r border-white/5 select-none py-3 sm:py-4 text-right pr-2 sm:pr-3 text-[13px] font-mono leading-[22px] text-slate-600">
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i} className="h-[22px] leading-[22px]">{i + 1}</div>
                ))}
              </div>
              {/* Code Pre */}
              <pre className="flex-1 p-3 sm:p-4 text-[13px] font-mono leading-[22px] text-slate-200 whitespace-pre select-text">
                <code>{fileContent}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
