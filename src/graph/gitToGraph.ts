import type { GitRepositoryState } from '../git/GitRepository';
import type { CommitNode, CommitEdge, GraphLayoutState } from './types';
import { getBranchColor } from './branchColors';

function assignCommitBranches(
  gitState: GitRepositoryState
): Map<string, string> {
  const commitBranch = new Map<string, string>();
  const commits = Object.values(gitState.commits);
  const sorted = [...commits].sort((a, b) => a.timestamp - b.timestamp);

  // Step 1: Use createdOnBranch as the primary source of truth.
  // Every commit knows which branch HEAD was on when it was created.
  sorted.forEach(commit => {
    if (commit.createdOnBranch) {
      commitBranch.set(commit.id, commit.createdOnBranch);
    }
  });

  // Step 2: For commits without createdOnBranch (legacy/stateless commits),
  // fall back to branch tips — a branch tip always belongs to that branch.
  const branchTips = new Map<string, string>();
  gitState.branches.forEach(b => {
    if (!branchTips.has(b.commitId)) {
      branchTips.set(b.commitId, b.name);
    }
  });

  sorted.forEach(commit => {
    if (!commitBranch.has(commit.id) && branchTips.has(commit.id)) {
      commitBranch.set(commit.id, branchTips.get(commit.id)!);
    }
  });

  // Step 3: For any remaining unassigned commits, inherit from first parent.
  // This handles edge cases where createdOnBranch is missing entirely.
  for (let pass = 0; pass < 5; pass++) {
    let changed = false;
    for (const commit of sorted) {
      if (commitBranch.has(commit.id)) continue;
      for (const parentId of commit.parentIds) {
        const parentBranch = commitBranch.get(parentId);
        if (parentBranch) {
          commitBranch.set(commit.id, parentBranch);
          changed = true;
          break;
        }
      }
    }
    if (!changed) break;
  }

  // Step 4: Final fallback to 'main' for any still-unassigned commits.
  sorted.forEach(commit => {
    if (!commitBranch.has(commit.id)) {
      commitBranch.set(commit.id, 'main');
    }
  });

  return commitBranch;
}

export function gitStateToGraph(
  gitState: GitRepositoryState,
  savedPositions?: GraphLayoutState
): { nodes: CommitNode[]; edges: CommitEdge[] } {
  if (!gitState.initialized || Object.keys(gitState.commits).length === 0) {
    return { nodes: [], edges: [] };
  }

  const commits = Object.values(gitState.commits);
  const sorted = [...commits].sort((a, b) => a.timestamp - b.timestamp);

  const branchMap = new Map<string, string[]>();
  gitState.branches.forEach(b => {
    const list = branchMap.get(b.commitId) || [];
    list.push(b.name);
    branchMap.set(b.commitId, list);
  });

  const commitBranch = assignCommitBranches(gitState);

  const headCommitId = (() => {
    if (gitState.HEAD.type === 'commit') return gitState.HEAD.value;
    const branch = gitState.branches.find(b => b.name === gitState.HEAD.value);
    return branch?.commitId || '';
  })();

  const branchCreationPoints = gitState.branchCreationPoints || {};

  const nodes: CommitNode[] = sorted.map((commit, index) => {
    const saved = savedPositions?.[commit.id];
    const branches = branchMap.get(commit.id) || [];
    const isHead = commit.id === headCommitId;
    const isMerge = commit.parentIds.length > 1;
    const branchColor = getBranchColor(commitBranch.get(commit.id) || 'main');

    let branchCreationPoint: string | undefined;
    for (const [branchName, creationCommitId] of Object.entries(branchCreationPoints)) {
      if (creationCommitId === commit.id) {
        branchCreationPoint = branchName;
        break;
      }
    }

    return {
      id: commit.id,
      type: 'commit' as const,
      position: saved || { x: 80 + index * 180, y: 60 },
      data: {
        commit,
        shortId: commit.id.substring(0, 7),
        message: commit.message,
        timestamp: commit.timestamp,
        branches,
        isHead,
        headBranch: isHead && gitState.HEAD.type === 'branch' ? gitState.HEAD.value : '',
        isMerge,
        branchColor,
        branchName: commitBranch.get(commit.id) || 'main',
        branchCreationPoint,
      },
    };
  });

  const edges: CommitEdge[] = [];
  sorted.forEach(commit => {
    const targetBranch = commitBranch.get(commit.id) || 'main';
    const isMerge = commit.parentIds.length > 1;

    commit.parentIds.forEach(parentId => {
      if (!gitState.commits[parentId]) return;
      const sourceBranch = commitBranch.get(parentId) || 'main';
      const isRemote = gitState.remotes.some(r =>
        r.branches.some(rb => rb.commitId === parentId)
      );

      // Edge coloring rules:
      // - For merge commits: each parent edge uses that parent's branch color
      //   (so the two incoming edges are visually distinct)
      // - For normal commits: the edge uses the child's branch color
      //   (the child's createdOnBranch tells us which branch it belongs to)
      let edgeColor: string;
      if (isMerge) {
        edgeColor = getBranchColor(sourceBranch);
      } else {
        edgeColor = getBranchColor(targetBranch);
      }

      edges.push({
        id: `e-${commit.id.substring(0, 7)}-${parentId.substring(0, 7)}`,
        source: parentId,
        target: commit.id,
        type: 'smoothstep',
        animated: false,
        style: {
          strokeWidth: isRemote ? 1.5 : 2,
          stroke: edgeColor,
          strokeDasharray: isRemote ? '6 3' : undefined,
        },
        data: { sourceBranch, targetBranch, isMerge, isRemote },
      });
    });
  });

  return { nodes, edges };
}
