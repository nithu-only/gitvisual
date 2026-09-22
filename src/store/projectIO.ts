import type { GitRepositoryState, GitIdentity } from '../git/GitRepository';
import type { GraphLayoutState } from '../graph/types';

const FORMAT_ID = 'gitviz';
const CURRENT_VERSION = 1;

export interface GitvizProject {
  format: string;
  version: number;
  project: { name: string };
  gitConfig?: { user: GitIdentity };
  state: {
    gitState: GitRepositoryState;
    history: GitRepositoryState[];
    historyIndex: number;
    explanations: Array<{ command: string; output: string; explanation: string }>;
    savedPositions: GraphLayoutState;
  };
}

function validateGitState(s: unknown): s is GitRepositoryState {
  if (!s || typeof s !== 'object') return false;
  const obj = s as Record<string, unknown>;
  if (typeof obj.initialized !== 'boolean') return false;
  if (!obj.commits || typeof obj.commits !== 'object') return false;
  if (!Array.isArray(obj.branches)) return false;
  if (!obj.HEAD || typeof obj.HEAD !== 'object') return false;
  const head = obj.HEAD as Record<string, unknown>;
  if (head.type !== 'branch' && head.type !== 'commit') return false;
  if (typeof head.value !== 'string') return false;
  if (obj.stagingArea && typeof obj.stagingArea !== 'object') return false;
  if (obj.workingTree && typeof obj.workingTree !== 'object') return false;
  if (!Array.isArray(obj.remotes)) return false;
  if (!Array.isArray(obj.reflog)) return false;
  if (!Array.isArray(obj.commandHistory)) return false;
  if (obj.conflictState !== null && (!obj.conflictState || typeof obj.conflictState !== 'object')) return false;
  if (obj.branchCreationPoints && typeof obj.branchCreationPoints !== 'object') return false;
  return true;
}

function validate(data: unknown): data is GitvizProject {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (obj.format !== FORMAT_ID) return false;
  if (typeof obj.version !== 'number' || obj.version > CURRENT_VERSION) return false;
  if (!obj.project || typeof obj.project !== 'object') return false;
  const proj = obj.project as Record<string, unknown>;
  if (typeof proj.name !== 'string') return false;
  if (!obj.state || typeof obj.state !== 'object') return false;
  const state = obj.state as Record<string, unknown>;
  if (!validateGitState(state.gitState)) return false;
  if (!Array.isArray(state.history)) return false;
  if (typeof state.historyIndex !== 'number') return false;
  if (!Array.isArray(state.explanations)) return false;
  if (!state.savedPositions || typeof state.savedPositions !== 'object') return false;
  return true;
}

export function serializeProject(
  gitState: GitRepositoryState,
  history: GitRepositoryState[],
  historyIndex: number,
  explanations: Array<{ command: string; output: string; explanation: string }>,
  savedPositions: GraphLayoutState,
  projectName: string,
  gitIdentity?: GitIdentity,
): GitvizProject {
  return {
    format: FORMAT_ID,
    version: CURRENT_VERSION,
    project: { name: projectName },
    gitConfig: gitIdentity && gitIdentity.name ? { user: gitIdentity } : undefined,
    state: { gitState, history, historyIndex, explanations, savedPositions },
  };
}

export function downloadProject(project: GitvizProject): void {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = project.project.name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'git-visualizer-project';
  a.download = `${safeName}.gitviz.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importProject(file: File): Promise<GitvizProject> {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.gitviz.json')) {
      reject(new Error('Invalid file type. Expected a .gitviz.json file.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!validate(data)) {
          reject(new Error('Invalid Git Visualizer project file.'));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error('Invalid JSON in project file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
