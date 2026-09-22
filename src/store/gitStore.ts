import { create } from 'zustand';
import type { GitRepositoryState } from '../git/GitRepository';
import { createEmptyState, type GitIdentity } from '../git/GitRepository';
import {
  executeInit, executeAdd, executeCommit, executeBranch,
  executeSwitch, executeMerge, executeRebase, executeStatus,
  executeLog, executeDiff, executeRemote, executeFetch,
  executePull, executePush, executeReset, executeRestore,
  executeRevert, executeStash, executeCherryPick, executeReflog,
  executeCheckout, executeCreate,
} from '../git/commands';
import {
  playInitSound, playAddSound, playCommitSound, playBranchSound,
  playSwitchSound, playMergeSound, playRebaseSound, playErrorSound,
  playStashSound, playResetSound, playPushSound, playGenericSound,
} from '../utils/sounds';
import { saveSession, loadSession, clearSession } from './persistence';
import { serializeProject, downloadProject, importProject as importProjectFile } from './projectIO';
import type { GraphLayoutState } from '../graph/types';

interface Explanation {
  command: string;
  output: string;
  explanation: string;
}

// UI-only timer for the branch creation callout auto-dismiss (data in
// gitState.branchCreationPoints is never touched by this).
let branchCalloutTimer: ReturnType<typeof setTimeout> | null = null;

interface GitStore {
  gitState: GitRepositoryState;
  history: GitRepositoryState[];
  historyIndex: number;
  explanations: Explanation[];
  activeTab: 'terminal' | 'graph' | 'state' | 'explanation';
  theme: 'dark' | 'light';
  currentPage: 'landing' | 'lab' | 'merge-rebase' | 'tutorials' | 'challenges' | 'explorer' | 'about';
  selectedTutorial: number | null;
  selectedChallenge: number | null;
  visibleBranchCallout: string | null;
  restoredSessionSeen: boolean;
  projectName: string;
  gitIdentity: GitIdentity;
  toggleBranchCallout: (branchName: string) => void;
  setActiveTab: (tab: 'terminal' | 'graph' | 'state' | 'explanation') => void;
  setCurrentPage: (page: 'landing' | 'lab' | 'merge-rebase' | 'tutorials' | 'challenges' | 'explorer' | 'about') => void;
  toggleTheme: () => void;
  executeCommand: (command: string) => { state: GitRepositoryState; output: string; explanation: string };
  undo: () => void;
  redo: () => void;
  resetSimulation: (clearStorage?: boolean, persist?: boolean) => void;
  setSelectedTutorial: (index: number | null) => void;
  setSelectedChallenge: (index: number | null) => void;
  setGitState: (state: GitRepositoryState) => void;
  setRestoredSessionSeen: () => void;
  setGitIdentity: (identity: GitIdentity) => void;
  saveProject: () => void;
  importProject: (file: File) => Promise<string>;
}

function parseAndExecute(state: GitRepositoryState, command: string, identity: GitIdentity): { state: GitRepositoryState; output: string; explanation: string } {
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  switch (cmd) {
    case 'create': {
      const filename = args[0] || 'file.txt';
      const content = args.slice(1).join(' ');
      return executeCreate(state, filename, content || undefined);
    }
    case 'git': {
      const subcmd = args[0];
      const subArgs = args.slice(1);
      switch (subcmd) {
        case 'init': return executeInit(state);
        case 'add': {
          const files = subArgs.length > 0 ? subArgs : ['.'];
          return executeAdd(state, files);
        }
        case 'commit': {
          const msgIdx = subArgs.indexOf('-m');
          const message = msgIdx >= 0 ? subArgs.slice(msgIdx + 1).join(' ').replace(/^["']|["']$/g, '') : subArgs.join(' ');
          return executeCommit(state, message || 'No message', identity);
        }
        case 'branch': return executeBranch(state, subArgs[0]);
        case 'switch': {
          const detach = subArgs.includes('--detach');
          const name = subArgs.find((a) => !a.startsWith('-'));
          if (!name) return { state, output: 'error: missing branch name', explanation: 'Usage: git switch <branch>' };
          return executeSwitch(state, name, detach);
        }
        case 'checkout': {
          const name = subArgs.find((a) => !a.startsWith('-'));
          if (!name) return { state, output: 'error: missing branch/commit', explanation: 'Usage: git checkout <branch/commit>' };
          return executeCheckout(state, name);
        }
        case 'merge': {
          const name = subArgs[0];
          if (!name) return { state, output: 'error: missing branch name', explanation: 'Usage: git merge <branch>' };
          return executeMerge(state, name, identity);
        }
        case 'rebase': {
          const name = subArgs[0];
          if (!name) return { state, output: 'error: missing upstream', explanation: 'Usage: git rebase <branch>' };
          return executeRebase(state, name);
        }
        case 'status': return executeStatus(state);
        case 'log': return executeLog(state);
        case 'diff': return executeDiff(state);
        case 'remote': return executeRemote(state, subArgs[0], subArgs.slice(1));
        case 'fetch': return executeFetch(state);
        case 'pull': return executePull(state);
        case 'push': return executePush(state);
        case 'reset': {
          const mode = (subArgs[0]?.replace('--', '') || 'mixed') as 'soft' | 'mixed' | 'hard';
          const target = subArgs[1] || 'HEAD~1';
          return executeReset(state, mode, target);
        }
        case 'restore': {
          const file = subArgs[1] || subArgs[0];
          if (!file) return { state, output: 'error: missing file', explanation: 'Usage: git restore <file>' };
          return executeRestore(state, file);
        }
        case 'revert': return executeRevert(state, subArgs[0], identity);
        case 'stash': return executeStash(state);
        case 'cherry-pick': {
          const id = subArgs[0];
          if (!id) return { state, output: 'error: missing commit', explanation: 'Usage: git cherry-pick <commit>' };
          return executeCherryPick(state, id, identity);
        }
        case 'reflog': return executeReflog(state);
        default: return { state, output: `git: '${subcmd}' is not a git command`, explanation: `Unknown git subcommand: ${subcmd}` };
      }
    }
    default: return { state, output: `command not found: ${cmd}`, explanation: 'Enter a valid git command.' };
  }
}

// ── Session persistence ────────────────────────────────────────────────

const restoredSession = loadSession();

function persistToStorage(getter: () => {
  gitState: GitRepositoryState;
  history: GitRepositoryState[];
  historyIndex: number;
  explanations: Explanation[];
  theme: 'dark' | 'light';
}, positions: GraphLayoutState = {}) {
  const s = getter();
  saveSession({
    gitState: s.gitState,
    history: s.history,
    historyIndex: s.historyIndex,
    explanations: s.explanations,
    savedPositions: positions,
    theme: s.theme,
  });
}

// ── Store ──────────────────────────────────────────────────────────────

export const useGitStore = create<GitStore>((set, get) => ({
  gitState: restoredSession?.gitState ?? createEmptyState(),
  history: restoredSession?.history ?? [restoredSession?.gitState ?? createEmptyState()],
  historyIndex: restoredSession?.historyIndex ?? 0,
  explanations: restoredSession?.explanations ?? [],
  activeTab: 'terminal',
  theme: restoredSession?.theme ?? 'dark',
  currentPage: 'landing',
  restoredSessionSeen: false,
  projectName: 'Git Visualizer Project',
  gitIdentity: { name: '', email: '' },
  selectedTutorial: null,
  selectedChallenge: null,
  visibleBranchCallout: null,
  toggleBranchCallout: (branchName) => {
    if (branchCalloutTimer) {
      clearTimeout(branchCalloutTimer);
      branchCalloutTimer = null;
    }
    set((s) => ({ visibleBranchCallout: s.visibleBranchCallout === branchName ? null : branchName }));
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleTheme: () => {
    set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' }));
    persistToStorage(get);
  },
  executeCommand: (command) => {
    const { gitState, history, historyIndex, gitIdentity } = get();
    const cmdLower = command.trim().toLowerCase();
    const isCommitCommand = cmdLower.startsWith('git commit') || cmdLower.startsWith('git merge') || cmdLower.startsWith('git revert') || cmdLower.startsWith('git cherry-pick');
    if (isCommitCommand && (!gitIdentity.name || !gitIdentity.email)) {
      return { state: gitState, output: 'error: Please configure your Git identity (Name and Email) in Settings before creating commits.', explanation: 'Click the Settings button in the toolbar to configure your Git identity.' };
    }
    const result = parseAndExecute(gitState, command, gitIdentity);
    result.state.commandHistory = [...gitState.commandHistory, command];
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(result.state);
    set({
      gitState: result.state,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      explanations: [...get().explanations, { command, output: result.output, explanation: result.explanation }],
    });
    persistToStorage(get);

    const isError = result.output.includes('fatal:') || result.output.includes('error:') || result.output.includes('nothing to commit');

    // UI only: when a new branch is created, auto-show its creation callout for 5s.
    const prevCreationBranches = Object.keys(gitState.branchCreationPoints || {});
    const newBranch = Object.keys(result.state.branchCreationPoints || {}).find(
      (b) => !prevCreationBranches.includes(b)
    );
    if (newBranch && !isError) {
      if (branchCalloutTimer) clearTimeout(branchCalloutTimer);
      set({ visibleBranchCallout: newBranch });
      branchCalloutTimer = setTimeout(() => {
        branchCalloutTimer = null;
        if (useGitStore.getState().visibleBranchCallout === newBranch) {
          set({ visibleBranchCallout: null });
        }
      }, 5000);
    }

    // Play sound based on command
    const cmd = command.trim().toLowerCase();
    if (isError) {
      playErrorSound();
    } else if (cmd.startsWith('git init')) {
      playInitSound();
    } else if (cmd.startsWith('git add')) {
      playAddSound();
    } else if (cmd.startsWith('git commit')) {
      playCommitSound();
    } else if (cmd.startsWith('git branch')) {
      playBranchSound();
    } else if (cmd.startsWith('git switch') || cmd.startsWith('git checkout')) {
      playSwitchSound();
    } else if (cmd.startsWith('git merge')) {
      playMergeSound();
    } else if (cmd.startsWith('git rebase')) {
      playRebaseSound();
    } else if (cmd.startsWith('git stash')) {
      playStashSound();
    } else if (cmd.startsWith('git reset')) {
      playResetSound();
    } else if (cmd.startsWith('git push')) {
      playPushSound();
    } else if (cmd.startsWith('create')) {
      playAddSound();
    } else {
      playGenericSound();
    }

    return result;
  },
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({ historyIndex: historyIndex - 1, gitState: history[historyIndex - 1] });
      persistToStorage(get);
    }
  },
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({ historyIndex: historyIndex + 1, gitState: history[historyIndex + 1] });
      persistToStorage(get);
    }
  },
  resetSimulation: (clearStorage = false, persist = true) => {
    const empty = createEmptyState();
    if (branchCalloutTimer) {
      clearTimeout(branchCalloutTimer);
      branchCalloutTimer = null;
    }
    set({ gitState: empty, history: [empty], historyIndex: 0, explanations: [], visibleBranchCallout: null });
    if (clearStorage) {
      clearSession();
    } else if (persist) {
      persistToStorage(get);
    }
  },
  setSelectedTutorial: (index) => set({ selectedTutorial: index }),
  setSelectedChallenge: (index) => set({ selectedChallenge: index }),
  setGitState: (state) => set({ gitState: state }),
  setRestoredSessionSeen: () => set({ restoredSessionSeen: true }),
  setGitIdentity: (identity) => set({ gitIdentity: identity }),
  saveProject: () => {
    const s = get();
    const project = serializeProject(
      s.gitState, s.history, s.historyIndex, s.explanations,
      {} as GraphLayoutState, s.projectName, s.gitIdentity,
    );
    downloadProject(project);
  },
  importProject: async (file: File) => {
    const project = await importProjectFile(file);
    const s = project.state;
    set({
      gitState: s.gitState,
      history: s.history,
      historyIndex: s.historyIndex,
      explanations: s.explanations,
      projectName: project.project.name,
      gitIdentity: project.gitConfig?.user ?? { name: '', email: '' },
    });
    persistToStorage(get);
    return project.project.name;
  },
}));
