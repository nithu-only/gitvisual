import type { GitRepositoryState } from '../git/GitRepository';
import type { GraphLayoutState } from '../graph/types';

const STORAGE_KEY = 'git-visualizer-session';
const STORAGE_VERSION = 1;

interface PersistedSession {
  version: number;
  gitState: GitRepositoryState;
  history: GitRepositoryState[];
  historyIndex: number;
  explanations: Array<{ command: string; output: string; explanation: string }>;
  savedPositions: GraphLayoutState;
  theme: 'dark' | 'light';
}

export function saveSession(data: {
  gitState: GitRepositoryState;
  history: GitRepositoryState[];
  historyIndex: number;
  explanations: Array<{ command: string; output: string; explanation: string }>;
  savedPositions: GraphLayoutState;
  theme: 'dark' | 'light';
}): void {
  try {
    const session: PersistedSession = {
      version: STORAGE_VERSION,
      gitState: data.gitState,
      history: data.history,
      historyIndex: data.historyIndex,
      explanations: data.explanations,
      savedPositions: data.savedPositions,
      theme: data.theme,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Silently ignore write failures (e.g. quota exceeded).
  }
}

export function loadSession(): Omit<PersistedSession, 'version'> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== STORAGE_VERSION) return null;
    if (!parsed.gitState || typeof parsed.gitState !== 'object') return null;
    if (!Array.isArray(parsed.history)) return null;
    if (typeof parsed.historyIndex !== 'number') return null;
    return {
      gitState: parsed.gitState,
      history: parsed.history,
      historyIndex: parsed.historyIndex,
      explanations: Array.isArray(parsed.explanations) ? parsed.explanations : [],
      savedPositions: parsed.savedPositions && typeof parsed.savedPositions === 'object' ? parsed.savedPositions : {},
      theme: parsed.theme === 'light' ? 'light' : 'dark',
    };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently ignore.
  }
}
