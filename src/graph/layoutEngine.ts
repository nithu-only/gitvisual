import type { CommitNode, CommitEdge } from './types';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 70;
const LANE_HEIGHT = 120;
const LAYER_SPACING = 250;

export interface GitLayoutMetadata {
  commitBranch: Map<string, string>;
  branchLanes: Map<string, number>;
  branchCreationPoints: Record<string, string>;
}

export function computeGitLayoutMetadata(
  nodes: CommitNode[],
  _edges: CommitEdge[],
  branchCreationPoints: Record<string, string>
): GitLayoutMetadata {
  const commitBranch = new Map<string, string>();
  nodes.forEach(n => {
    commitBranch.set(n.id, (n.data.branchName as string) || 'main');
  });

  const branchSet = new Set<string>();
  nodes.forEach(n => {
    const b = n.data.branchName as string;
    if (b) branchSet.add(b);
  });

  const branchNames = Array.from(branchSet).sort((a, b) => {
    if (a === 'main') return -1;
    if (b === 'main') return 1;
    return a.localeCompare(b);
  });

  const branchLanes = new Map<string, number>();
  branchNames.forEach((name, i) => {
    branchLanes.set(name, i);
  });

  return { commitBranch, branchLanes, branchCreationPoints };
}

function computeTopologicalLayers(
  nodes: CommitNode[],
  edges: CommitEdge[]
): Map<string, number> {
  const layers = new Map<string, number>();
  const childrenOf = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach(n => {
    inDegree.set(n.id, 0);
    childrenOf.set(n.id, []);
  });

  edges.forEach(e => {
    childrenOf.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  const queue: string[] = [];
  nodes.forEach(n => {
    if ((inDegree.get(n.id) || 0) === 0) {
      queue.push(n.id);
      layers.set(n.id, 0);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLayer = layers.get(current) || 0;
    const children = childrenOf.get(current) || [];
    for (const child of children) {
      const newLayer = currentLayer + 1;
      const existing = layers.get(child) || 0;
      if (newLayer > existing) {
        layers.set(child, newLayer);
      }
      const deg = (inDegree.get(child) || 1) - 1;
      inDegree.set(child, deg);
      if (deg === 0) {
        queue.push(child);
      }
    }
  }

  nodes.forEach(n => {
    if (!layers.has(n.id)) layers.set(n.id, 0);
  });

  return layers;
}

function assignBranchLanes(
  nodes: CommitNode[],
  commitBranch: Map<string, string>
): Map<string, number> {
  const branchSet = new Set<string>();
  nodes.forEach(n => {
    const b = commitBranch.get(n.id) || 'main';
    branchSet.add(b);
  });

  const branchNames = Array.from(branchSet).sort((a, b) => {
    if (a === 'main') return -1;
    if (b === 'main') return 1;
    return a.localeCompare(b);
  });

  const lanes = new Map<string, number>();
  let above = 1;
  let below = -1;

  for (const name of branchNames) {
    if (name === 'main') {
      lanes.set(name, 0);
    } else {
      if (above <= -below) {
        lanes.set(name, above);
        above++;
      } else {
        lanes.set(name, below);
        below--;
      }
    }
  }

  return lanes;
}

export async function calculateAutoLayout(
  nodes: CommitNode[],
  _edges: CommitEdge[],
  branchCreationPoints: Record<string, string> = {}
): Promise<Record<string, { x: number; y: number }>> {
  if (nodes.length === 0) return {};
  if (nodes.length === 1) {
    return { [nodes[0].id]: { x: 60, y: 60 } };
  }

  const commitBranch = new Map<string, string>();
  nodes.forEach(n => {
    commitBranch.set(n.id, (n.data.branchName as string) || 'main');
  });

  const layers = computeTopologicalLayers(nodes, _edges);
  const lanes = assignBranchLanes(nodes, commitBranch);

  const positions: Record<string, { x: number; y: number }> = {};

  nodes.forEach(n => {
    const layer = layers.get(n.id) || 0;
    const branch = commitBranch.get(n.id) || 'main';
    const lane = lanes.get(branch) || 0;

    positions[n.id] = {
      x: 60 + layer * LAYER_SPACING,
      y: 60 + (lanes.size - 1 + lane) * LANE_HEIGHT,
    };
  });

  return positions;
}
