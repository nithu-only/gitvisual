import ELK from 'elkjs/lib/elk.bundled.js';
import type { CommitNode, CommitEdge } from './types';

const elk = new ELK();

const NODE_WIDTH = 160;
const NODE_HEIGHT = 70;
const LANE_HEIGHT = 100;
const LAYER_SPACING = 140;

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

export async function calculateAutoLayout(
  nodes: CommitNode[],
  edges: CommitEdge[],
  branchCreationPoints: Record<string, string> = {}
): Promise<Record<string, { x: number; y: number }>> {
  if (nodes.length === 0) return {};
  if (nodes.length === 1) {
    return { [nodes[0].id]: { x: 60, y: 60 } };
  }

  const metadata = computeGitLayoutMetadata(nodes, edges, branchCreationPoints);
  const layers = computeTopologicalLayers(nodes, edges);

  const nodeLayerMap = new Map<string, number>();
  nodes.forEach(n => {
    nodeLayerMap.set(n.id, layers.get(n.id) || 0);
  });

  const layerGroups = new Map<number, string[]>();
  nodes.forEach(n => {
    const layer = nodeLayerMap.get(n.id) || 0;
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(n.id);
  });

  const elkNodes = nodes.map(n => ({
    id: n.id,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    layerConstraints: {
      layer: nodeLayerMap.get(n.id) || 0,
    },
  }));

  const elkEdges = edges.map(e => ({
    id: e.id,
    sources: [e.source],
    targets: [e.target],
  }));

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(LAYER_SPACING),
      'elk.spacing.nodeNode': String(LANE_HEIGHT),
      'elk.layered.spacing.edgeNode': '25',
      'elk.layered.spacing.edgeEdge': '15',
      'elk.layered.edgeRouting': 'POLYLINE',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.cycleBreaking.strategy': 'GREEDY',
      'elk.layered.compaction.connectedComponents': 'true',
      'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
    },
    children: elkNodes,
    edges: elkEdges,
  };

  try {
    const result = await elk.layout(graph);
    const positions: Record<string, { x: number; y: number }> = {};

    if (result.children) {
      result.children.forEach(child => {
        positions[child.id] = {
          x: (child.x || 0) + 60,
          y: (child.y || 0) + 40,
        };
      });
    }

    applyBranchLaneConstraints(positions, nodes, metadata);

    return positions;
  } catch (err) {
    console.error('ELK layout failed, using Git-aware fallback:', err);
    return gitAwareFallbackLayout(nodes, metadata, layers);
  }
}

function applyBranchLaneConstraints(
  positions: Record<string, { x: number; y: number }>,
  nodes: CommitNode[],
  metadata: GitLayoutMetadata
): void {
  const branchGroups = new Map<string, { id: string; y: number }[]>();

  nodes.forEach(n => {
    const branch = metadata.commitBranch.get(n.id) || 'main';
    if (!branchGroups.has(branch)) branchGroups.set(branch, []);
    const pos = positions[n.id];
    if (pos) {
      branchGroups.get(branch)!.push({ id: n.id, y: pos.y });
    }
  });

  const branchAvgY = new Map<string, number>();
  branchGroups.forEach((group, branch) => {
    if (group.length > 0) {
      const avg = group.reduce((sum, item) => sum + item.y, 0) / group.length;
      branchAvgY.set(branch, avg);
    }
  });

  const sortedBranches = Array.from(branchAvgY.entries())
    .sort((a, b) => a[1] - b[1]);

  const laneAssignments = new Map<string, number>();
  sortedBranches.forEach(([branch], index) => {
    laneAssignments.set(branch, index);
  });

  branchGroups.forEach((group, branch) => {
    const lane = laneAssignments.get(branch) || 0;
    const targetY = lane * LANE_HEIGHT + 60;

    const currentAvg = branchAvgY.get(branch) || 0;
    const offsetY = targetY - currentAvg;

    if (Math.abs(offsetY) > 10) {
      group.forEach(item => {
        if (positions[item.id]) {
          positions[item.id].y += offsetY;
        }
      });
    }
  });
}

function gitAwareFallbackLayout(
  nodes: CommitNode[],
  metadata: GitLayoutMetadata,
  layers: Map<string, number>
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const layerSpacingX = NODE_WIDTH + 60;

  const branchPositions = new Map<string, number>();
  let nextLane = 0;
  metadata.branchLanes.forEach((_, branch) => {
    branchPositions.set(branch, nextLane);
    nextLane++;
  });

  nodes.forEach(n => {
    const layer = layers.get(n.id) || 0;
    const branch = metadata.commitBranch.get(n.id) || 'main';
    const lane = branchPositions.get(branch) || 0;

    positions[n.id] = {
      x: 60 + layer * layerSpacingX,
      y: 60 + lane * LANE_HEIGHT,
    };
  });

  return positions;
}
