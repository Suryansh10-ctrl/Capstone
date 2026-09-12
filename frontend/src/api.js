// Sandbox API utilities
const BASE_API = '';

// In-flight promise cache to deduplicate simultaneous requests (e.g. Explorer + Editor)
const pendingRequests = new Map();

/**
 * Resilient fetch helper that handles 502 Bad Gateway / 503 Service Unavailable
 * during sandbox container warm-up by silently polling until ready.
 */
async function fetchWithRetry(url, options = {}, maxRetries = 12, delay = 1500) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 502 || res.status === 503) {
        // Container is booting up; wait silently before retrying
        if (attempt === maxRetries - 1) {
          throw new Error(`Sandbox service warming up (HTTP ${res.status}). Please retry shortly.`);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Request timed out after ${maxRetries} attempts`);
}

/**
 * Polls the sandbox agent endpoint until it returns 200 OK or times out.
 * Provides real-time progress callbacks for smooth UI status updates.
 */
export async function waitForSandboxReady(agentURL, maxAttempts = 30, delay = 1800, onProgress) {
  if (!agentURL) return;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onProgress?.({ attempt, maxAttempts });
    try {
      const res = await fetch(`${agentURL}/list-files`);
      if (res.ok) {
        return true;
      }
    } catch (_) {
      // Connection refused / network error while container initializes
    }
    await new Promise((r) => setTimeout(r, delay));
  }

  throw new Error('Sandbox initialization timed out. The container may still be starting or resource constrained.');
}

/**
 * Keep the sandbox URL exactly as returned by the backend.
 * Ingress handles routing for *.agent.localhost and *.preview.localhost.
 */

export function formatSandboxUrl(url) {
  if (!url) return url;

  try {
    const parsed = new URL(url);

    // Keep the URL returned by the backend.
    // Ingress handles the agent/preview hostname.
    return parsed.toString().replace(/\/$/, '');
  } catch (_) {
    return url;
  }
}

/**
 * Start a new sandbox environment
 * @returns {Promise<{sandboxId: string, previewURL: string, agentURL: string}>}
 */
export async function startSandbox() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${BASE_API}/api/sandbox/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`Failed to start sandbox: ${res.statusText}`);
    const data = await res.json();

    return {
      ...data,
      previewURL: formatSandboxUrl(data.previewURL),
      agentURL: formatSandboxUrl(data.agentURL),
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Sandbox creation timed out. Please click "Create Sandbox" to try again.');
    }
    throw err;
  }
}

/**
 * List files in the sandbox with auto-retry on container warm-up & request deduplication
 * @param {string} agentURL
 * @returns {Promise<string[]>}
 */
export async function listFiles(agentURL) {
  if (!agentURL) return [];
  const cacheKey = `list-files:${agentURL}`;
  
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const promise = (async () => {
    try {
      const res = await fetchWithRetry(`${agentURL}/list-files`);
      if (!res.ok) throw new Error(`HTTP ${res.status} (${res.statusText || 'Bad Gateway'})`);
      const data = await res.json();
      return data.files || [];
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, promise);
  return promise;
}

/**
 * Read a file from the sandbox
 * @param {string} agentURL
 * @param {string} filePath
 * @returns {Promise<string>}
 */
export async function readFile(agentURL, filePath) {
  if (!agentURL || !filePath) return '';
  const res = await fetchWithRetry(`${agentURL}/read-file?files=${encodeURIComponent(filePath)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} (${res.statusText || 'Failed to read file'})`);
  const data = await res.json();
  const fileObj = data.files?.[0];
  if (!fileObj) return '';
  return fileObj[filePath] ?? Object.values(fileObj)[0] ?? '';
}

/**
 * Update a file in the sandbox
 * @param {string} agentURL
 * @param {string} filePath
 * @param {string} content
 */
export async function updateFile(agentURL, filePath, content) {
  const res = await fetchWithRetry(`${agentURL}/update-file`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates: [{ file: filePath, content }] }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} (${res.statusText || 'Failed to update file'})`);
  return res.json();
}

/**
 * Send a message to AI and stream SSE response.
 * The SSE stream may contain plain-text status lines (e.g. "Listing files")
 * or `data: <text>` formatted lines. Both are surfaced via onChunk.
 *
 * @param {string} message
 * @param {string} projectId
 * @param {(text: string, isStatus: boolean) => void} onChunk
 * @param {() => void} onDone
 * @param {(err: string) => void} onError
 * @returns {AbortController} â€” call .abort() to cancel
 */
export function invokeAI(message, projectId, onChunk, onDone, onError) {
  const controller = new AbortController();

  fetch(`${BASE_API}/api/ai/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, projectId }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      onError?.(`AI request failed: ${res.statusText}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) { onDone?.(); break; }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep last potentially-incomplete line

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === ':') continue;

        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6).trim();
          if (!data || data === '[DONE]') continue;

          // Try to parse structured JSON from the new backend format
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'token' && parsed.content) {
              onChunk(parsed.content, false);
            } else if (parsed.type === 'status' && parsed.message) {
              onChunk(parsed.message, true);
            }
          } catch (_) {
            // Legacy fallback: treat as plain text token
            onChunk(data, false);
          }
        } else {
          // Plain-text status line (legacy fallback)
          onChunk(trimmed, true);
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') onError?.(err.message);
  });

  return controller;
}
