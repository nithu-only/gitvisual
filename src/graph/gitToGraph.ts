import type { GitRepositoryState } from '../git/GitRepository';
import type { CommitNode, CommitEdge, GraphLayoutState } from './types';
import { getBranchColor } from './branchColors';
import { getOptimalEdgePositions, Position, sourcePositionToHandle, targetPositionToHandle, handleToSourcePosition, handleToTargetPosition, getMergeAwareEdgePositions } from './smartHandles';

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

  // Branch names grouped by the commit where they were created (for callouts).
  const branchesByCreationCommit = new Map<string, string[]>();
  Object.entries(branchCreationPoints).forEach(([branchName, creationCommitId]) => {
    const list = branchesByCreationCommit.get(creationCommitId) || [];
    list.push(branchName);
    branchesByCreationCommit.set(creationCommitId, list);
  });

  const nodes: CommitNode[] = sorted.map((commit, index) => {
    const saved = savedPositions?.[commit.id];
    const branches = branchMap.get(commit.id) || [];
    const isHead = commit.id === headCommitId;
    const isMerge = commit.parentIds.length > 1;
    const branchColor = getBranchColor(commitBranch.get(commit.id) || 'main');

    const createdHere = branchesByCreationCommit.get(commit.id);

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
        branchCreationPoints: createdHere || [],
      },
    };
  });

  const edges: CommitEdge[] = [];

  // Deduplicate edges: each parent-child Git relationship produces exactly one edge.
  const seenEdges = new Set<string>();

  // Build a position lookup so edges can be position-aware at graph-build time.
  const nodePositions = new Map<string, { x: number; y: number }>();
  nodes.forEach(n => {
    nodePositions.set(n.id, n.position);
  });

  // Build a map of which branches were created from which commits
  const branchCreationMap = new Map<string, string>();
  gitState.branches.forEach(b => {
    if (b.createdAtCommitId) {
      branchCreationMap.set(b.name, b.createdAtCommitId);
    }
  });

  sorted.forEach(commit => {
    const targetBranch = commitBranch.get(commit.id) || 'main';
    const isMerge = commit.parentIds.length > 1;

    commit.parentIds.forEach((parentId, parentIndex) => {
      if (!gitState.commits[parentId]) return;

      // Deduplicate: only one edge per parent→child relationship.
      const edgeKey = `${parentId}:${commit.id}`;
      if (seenEdges.has(edgeKey)) return;
      seenEdges.add(edgeKey);

      const sourceBranch = commitBranch.get(parentId) || 'main';
      const isRemote = gitState.remotes.some(r =>
        r.branches.some(rb => rb.commitId === parentId)
      );

      // Determine if this is a branch creation edge
      const isBranchCreation = sourceBranch !== targetBranch &&
        branchCreationMap.get(targetBranch) === parentId;

      // Determine if this is a merge edge (child has multiple parents)
      const isMergeEdge = isMerge;

      // Edge coloring rules:
      let edgeColor: string;
      if (isMerge) {
        edgeColor = getBranchColor(sourceBranch);
      } else {
        edgeColor = getBranchColor(targetBranch);
      }

      // Position-aware routing: choose sourcePosition/targetPosition based on
      // actual node positions. These are React Flow Position enum values that
      // tell React Flow which side of each node to connect from.
      const sourcePos = nodePositions.get(parentId);
      const targetPos = nodePositions.get(commit.id);

      let sourcePosition: Position;
      let targetPosition: Position;

      if (sourcePos && targetPos) {
        const positions = getOptimalEdgePositions(sourcePos, targetPos, parentId, commit.id);
        sourcePosition = positions.source;
        targetPosition = positions.target;
      } else {
        sourcePosition = Position.Right;
        targetPosition = Position.Left;
      }

      // Merge edge hint: prefer horizontal for primary parent when nearly aligned.
      // This keeps the main line clean; secondary parents will be optimized in a second pass.
      if (isMergeEdge && sourcePos && targetPos && parentIndex === 0) {
        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        if (Math.abs(dy) < Math.abs(dx) * 0.6) {
          sourcePosition = dx > 0 ? Position.Right : Position.Left;
          targetPosition = dx > 0 ? Position.Left : Position.Right;
        }
      }

      edges.push({
        id: `e-${commit.id.substring(0, 7)}-${parentId.substring(0, 7)}`,
        source: parentId,
        target: commit.id,
        sourceHandle: sourcePositionToHandle(sourcePosition),
        targetHandle: targetPositionToHandle(targetPosition),
        type: 'smoothstep',
        animated: false,
        style: {
          strokeWidth: isRemote ? 1.5 : 2,
          stroke: edgeColor,
          strokeDasharray: isRemote ? '6 3' : undefined,
        },
        data: { sourceBranch, targetBranch, isMerge, isRemote, isBranchCreation },
      });
    });
  });

  // Second pass: optimize merge edge handles to avoid crossings.
  for (const edge of edges) {
    if (!edge.data?.isMerge) continue;
    const sourcePos = nodePositions.get(edge.source);
    const targetPos = nodePositions.get(edge.target);
    if (!sourcePos || !targetPos) continue;

    const best = getMergeAwareEdgePositions(
      sourcePos, targetPos,
      edge.source, edge.target,
      handleToSourcePosition(edge.sourceHandle || 'source-right'),
      handleToTargetPosition(edge.targetHandle || 'target-left'),
      true, edges, nodePositions,
    );
    edge.sourceHandle = sourcePositionToHandle(best.source);
    edge.targetHandle = targetPositionToHandle(best.target);
  }

  return { nodes, edges };
}
