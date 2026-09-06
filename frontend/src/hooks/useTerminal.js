import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { io } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';

/**
 * useTerminal — manages an xterm.js instance and its socket.io connection.
 *
 * @param {string | null} agentURL  e.g. "http://<id>.agent.127.0.0.1.nip.io"
 * @returns {{ terminalRef: React.RefObject, isConnected: boolean, clearTerminal: () => void }}
 */
export function useTerminal(agentURL) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!agentURL || !containerRef.current) return;

    let isMounted = true;
    let observer = null;

    // ── Init xterm ──────────────────────────────────────
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.5,
      theme: {
        background: '#050509',
        foreground: '#e2e8f0',
        cursor: '#10b981',
        cursorAccent: '#050509',
        selectionBackground: 'rgba(99,102,241,0.3)',
        black: '#1e1e2e',
        red: '#f43f5e',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#6366f1',
        magenta: '#8b5cf6',
        cyan: '#06b6d4',
        white: '#e2e8f0',
        brightBlack: '#475569',
        brightRed: '#fb7185',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#818cf8',
        brightMagenta: '#a78bfa',
        brightCyan: '#22d3ee',
        brightWhite: '#f1f5f9',
      },
      allowTransparency: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[36m╔══════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[36m║   \x1b[32mSandbox Terminal\x1b[36m — connecting...    ║\x1b[0m');
    term.writeln('\x1b[36m╚══════════════════════════════════════╝\x1b[0m\r\n');

    // Slight delay before initiating socket connection.
    // Prevents React StrictMode's instant mount/unmount cycle from closing in-flight WebSockets.
    const connectTimer = setTimeout(() => {
      if (!isMounted) return;

      const socket = io(agentURL, {
        transports: ['websocket', 'polling'],
        withCredentials: false,
        reconnectionAttempts: 30,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (!isMounted) return;
        setIsConnected(true);
        term.writeln('\x1b[32m✓ Connected to sandbox\x1b[0m\r\n');
      });

      socket.on('connect_error', (err) => {
        if (!isMounted) return;
        setIsConnected(false);
        term.writeln(`\r\n\x1b[33m⚠ Connection error: ${err.message}\x1b[0m`);
        term.writeln('\x1b[90mRetrying...\x1b[0m');
      });

      socket.on('disconnect', (reason) => {
        if (!isMounted) return;
        setIsConnected(false);
        term.writeln(`\r\n\x1b[31m✗ Disconnected: ${reason}\x1b[0m`);
      });

      socket.on('terminal-output', (data) => {
        if (!isMounted) return;
        term.write(typeof data === 'string' ? data : new Uint8Array(data));
      });

      // Forward key input → socket as Uint8Array (binary)
      const encoder = new TextEncoder();
      term.onData((data) => {
        if (socket.connected) {
          socket.emit('terminal-input', encoder.encode(data));
        }
      });
    }, 1500);

    // ── Resize observer ─────────────────────────────────
    observer = new ResizeObserver(() => {
      try { fitAddon.fit(); } catch (_) {}
    });
    observer.observe(containerRef.current);

    return () => {
      isMounted = false;
      clearTimeout(connectTimer);
      if (observer) observer.disconnect();
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }
      fitAddonRef.current = null;
    };
  }, [agentURL]);

  const clearTerminal = () => {
    termRef.current?.clear();
  };

  return { terminalRef: containerRef, isConnected, clearTerminal };
}

