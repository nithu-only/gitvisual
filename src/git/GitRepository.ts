export interface Commit {
  id: string;
  parentIds: string[];
  message: string;
  author: string;
  timestamp: number;
  files: Record<string, string>;
  createdOnBranch: string;
}

export interface Branch {
  name: string;
  commitId: string;
  createdAtCommitId?: string;
}

export interface Remote {
  name: string;
  url: string;
  branches: Branch[];
}

export interface ReflogEntry {
  ref: string;
  commitId: string;
  action: string;
  timestamp: number;
}

export interface GitRepositoryState {
  initialized: boolean;
  commits: Record<string, Commit>;
  branches: Branch[];
  HEAD: { type: 'branch' | 'commit'; value: string };
  stagingArea: Record<string, string>;
  workingTree: Record<string, string>;
  remotes: Remote[];
  reflog: ReflogEntry[];
  commandHistory: string[];
  conflictState: {
    active: boolean;
    file: string;
    current: string;
    incoming: string;
    type: 'merge' | 'rebase';
  } | null;
  branchCreationPoints: Record<string, string>;
}

export function createEmptyState(): GitRepositoryState {
  return {
    initialized: false,
    commits: {},
    branches: [],
    HEAD: { type: 'branch', value: '' },
    stagingArea: {},
    workingTree: {},
    remotes: [],
    reflog: [],
    commandHistory: [],
    conflictState: null,
    branchCreationPoints: {},
  };
}

let commitCounter = 0;

export function generateCommitId(): string {
  commitCounter++;
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 40; i++) {
    hash += chars[Math.floor(Math.random() * 16)];
  }
  return hash;
}

export function createCommit(
  parentIds: string[],
  message: string,
  files: Record<string, string> = {},
  author = 'user',
  createdOnBranch = 'main'
): Commit {
  return {
    id: generateCommitId(),
    parentIds,
    message,
    author,
    timestamp: Date.now(),
    files: { ...files },
    createdOnBranch,
  };
}

export function getHeadCommit(state: GitRepositoryState): Commit | null {
  if (!state.initialized) return null;
  if (state.HEAD.type === 'commit') {
    return state.commits[state.HEAD.value] || null;
  }
  const branch = state.branches.find((b) => b.name === state.HEAD.value);
  if (!branch) return null;
  return state.commits[branch.commitId] || null;
}

export function getCurrentBranch(state: GitRepositoryState): string {
  if (state.HEAD.type === 'branch') return state.HEAD.value;
  return '';
}

export function getBranchCommitId(state: GitRepositoryState, name: string): string | null {
  const branch = state.branches.find((b) => b.name === name);
  return branch ? branch.commitId : null;
}

export function addReflogEntry(
  state: GitRepositoryState,
  ref: string,
  commitId: string,
  action: string
): void {
  state.reflog.unshift({
    ref,
    commitId,
    action,
    timestamp: Date.now(),
  });
}

export function moveBranch(state: GitRepositoryState, name: string, commitId: string): void {
  const branch = state.branches.find((b) => b.name === name);
  if (branch) {
    branch.commitId = commitId;
  }
}

export function findCommonAncestor(
  state: GitRepositoryState,
  commitId1: string,
  commitId2: string
): string | null {
  const visited1 = new Set<string>();
  const visited2 = new Set<string>();
  const queue1: string[] = [commitId1];
  const queue2: string[] = [commitId2];

  while (queue1.length > 0 || queue2.length > 0) {
    if (queue1.length > 0) {
      const id = queue1.shift()!;
      if (visited2.has(id)) return id;
      if (!visited1.has(id)) {
        visited1.add(id);
        const commit = state.commits[id];
        if (commit) {
          queue1.push(...commit.parentIds);
        }
      }
    }
    if (queue2.length > 0) {
      const id = queue2.shift()!;
      if (visited1.has(id)) return id;
      if (!visited2.has(id)) {
        visited2.add(id);
        const commit = state.commits[id];
        if (commit) {
          queue2.push(...commit.parentIds);
        }
      }
    }
  }
  return null;
}

export function getAllFilesInCommit(state: GitRepositoryState, commitId: string): Record<string, string> {
  const files: Record<string, string> = {};
  const visited = new Set<string>();
  const queue: string[] = [commitId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const commit = state.commits[id];
    if (commit) {
      Object.entries(commit.files).forEach(([name, content]) => {
        if (!(name in files)) {
          files[name] = content;
        }
      });
      queue.push(...commit.parentIds);
    }
  }
  return files;
}

export function cloneState(state: GitRepositoryState): GitRepositoryState {
  return JSON.parse(JSON.stringify(state));
}
