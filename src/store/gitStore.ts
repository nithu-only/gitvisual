import { create } from 'zustand';
import type { GitRepositoryState } from '../git/GitRepository';
import { createEmptyState } from '../git/GitRepository';
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

interface Explanation {
  command: string;
  output: string;
  explanation: string;
}

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
  setActiveTab: (tab: 'terminal' | 'graph' | 'state' | 'explanation') => void;
  setCurrentPage: (page: 'landing' | 'lab' | 'merge-rebase' | 'tutorials' | 'challenges' | 'explorer' | 'about') => void;
  toggleTheme: () => void;
  executeCommand: (command: string) => { state: GitRepositoryState; output: string; explanation: string };
  undo: () => void;
  redo: () => void;
  resetSimulation: () => void;
  setSelectedTutorial: (index: number | null) => void;
  setSelectedChallenge: (index: number | null) => void;
  setGitState: (state: GitRepositoryState) => void;
}

function parseAndExecute(state: GitRepositoryState, command: string): { state: GitRepositoryState; output: string; explanation: string } {
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
          return executeCommit(state, message || 'No message');
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
          return executeMerge(state, name);
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
        case 'revert': return executeRevert(state, subArgs[0]);
        case 'stash': return executeStash(state);
        case 'cherry-pick': {
          const id = subArgs[0];
          if (!id) return { state, output: 'error: missing commit', explanation: 'Usage: git cherry-pick <commit>' };
          return executeCherryPick(state, id);
        }
        case 'reflog': return executeReflog(state);
        default: return { state, output: `git: '${subcmd}' is not a git command`, explanation: `Unknown git subcommand: ${subcmd}` };
      }
    }
    default: return { state, output: `command not found: ${cmd}`, explanation: 'Enter a valid git command.' };
  }
}

export const useGitStore = create<GitStore>((set, get) => ({
  gitState: createEmptyState(),
  history: [createEmptyState()],
  historyIndex: 0,
  explanations: [],
  activeTab: 'terminal',
  theme: 'dark',
  currentPage: 'landing',
  selectedTutorial: null,
  selectedChallenge: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  executeCommand: (command) => {
    const { gitState, history, historyIndex } = get();
    const result = parseAndExecute(gitState, command);
    result.state.commandHistory = [...gitState.commandHistory, command];
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(result.state);
    set({
      gitState: result.state,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      explanations: [...get().explanations, { command, output: result.output, explanation: result.explanation }],
    });

    // Play sound based on command
    const cmd = command.trim().toLowerCase();
    const isError = result.output.includes('fatal:') || result.output.includes('error:') || result.output.includes('nothing to commit');
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
    }
  },
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({ historyIndex: historyIndex + 1, gitState: history[historyIndex + 1] });
    }
  },
  resetSimulation: () => {
    const empty = createEmptyState();
    set({ gitState: empty, history: [empty], historyIndex: 0, explanations: [] });
  },
  setSelectedTutorial: (index) => set({ selectedTutorial: index }),
  setSelectedChallenge: (index) => set({ selectedChallenge: index }),
  setGitState: (state) => set({ gitState: state }),
}));
