import { Position } from '@xyflow/react';
import { smoothstepSegments as computeSegments, type HandleDir, type Segment } from './edgePath';

export { Position } from '@xyflow/react';

const HYSTERESIS_FRACTION = 0.3;

/**
 * Decide which source/target POSITIONS produce the cleanest connection between two nodes.
 *
 * Returns React Flow Position enum values for sourcePosition and targetPosition.
 * These tell React Flow which side of each node to connect from/to.
 *
 * Rules:
 * - Compute dx, dy from source position to target position.
 * - If horizontal gap clearly dominates → Right/Left.
 * - If vertical gap clearly dominates → Bottom/Top (target below) or Top/Bottom (target above).
 * - If diagonal → pick the shorter axis.
 * - Hysteresis prevents oscillation during small movements.
 */
export function getOptimalEdgePositions(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  _sourceId: string,
  _targetId: string,
  prevPositions?: { source: Position; target: Position }
): { source: Position; target: Position } {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  const maxGap = Math.max(absDx, absDy);
  // When both gaps are 0 (same position), default to horizontal.
  if (maxGap === 0) {
    return { source: Position.Right, target: Position.Left };
  }

  const tolerance = maxGap * HYSTERESIS_FRACTION;
  const balanced = Math.abs(absDx - absDy) < tolerance;

  if (balanced && prevPositions) {
    return prevPositions;
  }

  // Clear horizontal.
  if (absDx > absDy && absDx > tolerance) {
    return {
      source: dx > 0 ? Position.Right : Position.Left,
      target: dx > 0 ? Position.Left : Position.Right,
    };
  }

  // Clear vertical.
  if (absDy > absDx && absDy > tolerance) {
    return {
      source: dy > 0 ? Position.Bottom : Position.Top,
      target: dy > 0 ? Position.Top : Position.Bottom,
    };
  }

  // Small gaps or balanced — use previous if available, else default.
  if (prevPositions) {
    return prevPositions;
  }

  if (absDx >= absDy) {
    return {
      source: dx > 0 ? Position.Right : Position.Left,
      target: dx > 0 ? Position.Left : Position.Right,
    };
  }
  return {
    source: dy > 0 ? Position.Bottom : Position.Top,
    target: dy > 0 ? Position.Top : Position.Bottom,
  };
}

/**
 * Convert a Position enum value to the corresponding source handle ID.
 */
export function sourcePositionToHandle(pos: Position): string {
  switch (pos) {
    case Position.Top: return 'source-top';
    case Position.Bottom: return 'source-bottom';
    case Position.Left: return 'source-left';
    case Position.Right: return 'source-right';
    default: return 'source-right';
  }
}

/**
 * Convert a Position enum value to the corresponding target handle ID.
 */
export function targetPositionToHandle(pos: Position): string {
  switch (pos) {
    case Position.Top: return 'target-top';
    case Position.Bottom: return 'target-bottom';
    case Position.Left: return 'target-left';
    case Position.Right: return 'target-right';
    default: return 'target-left';
  }
}

/**
 * Recompute edge sourceHandle/targetHandle based on current node positions.
 * Uses position-aware routing to select the best handles.
 */
export function recomputeEdgeHandles(
  edges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; data?: Record<string, unknown> }>,
  nodePositions: Map<string, { x: number; y: number }>
): typeof edges {
  // First pass: compute optimal handles for all edges.
  const routed = edges.map(edge => {
    const sourcePos = nodePositions.get(edge.source);
    const targetPos = nodePositions.get(edge.target);
    if (!sourcePos || !targetPos) return edge;

    const prevSourceHandle = edge.sourceHandle || 'source-right';
    const prevTargetHandle = edge.targetHandle || 'target-left';

    const prevPositions = {
      source: handleToSourcePosition(prevSourceHandle),
      target: handleToTargetPosition(prevTargetHandle),
    };

    const positions = getOptimalEdgePositions(
      sourcePos,
      targetPos,
      edge.source,
      edge.target,
      prevPositions
    );

    return {
      ...edge,
      sourceHandle: sourcePositionToHandle(positions.source),
      targetHandle: targetPositionToHandle(positions.target),
    };
  });

  // Second pass: optimize merge edges to avoid crossings.
  return routed.map(edge => {
    if (!edge.data?.isMerge) return edge;
    const sourcePos = nodePositions.get(edge.source);
    const targetPos = nodePositions.get(edge.target);
    if (!sourcePos || !targetPos) return edge;

    const best = findBestMergeHandles(
      sourcePos, targetPos,
      handleToSourcePosition(edge.sourceHandle || 'source-right'),
      handleToTargetPosition(edge.targetHandle || 'target-left'),
      edge.source, edge.target, routed, nodePositions,
    );
    return {
      ...edge,
      sourceHandle: sourcePositionToHandle(best.source),
      targetHandle: targetPositionToHandle(best.target),
    };
  });
}

/**
 * Convert a source handle ID back to a Position value.
 */
export function handleToSourcePosition(handleId: string): Position {
  if (handleId === 'source-top') return Position.Top;
  if (handleId === 'source-bottom') return Position.Bottom;
  if (handleId === 'source-left') return Position.Left;
  if (handleId === 'source-right') return Position.Right;
  return Position.Right;
}

/**
 * Convert a target handle ID back to a Position value.
 */
export function handleToTargetPosition(handleId: string): Position {
  if (handleId === 'target-top') return Position.Top;
  if (handleId === 'target-bottom') return Position.Bottom;
  if (handleId === 'target-left') return Position.Left;
  if (handleId === 'target-right') return Position.Right;
  return Position.Left;
}

// ── Merge-edge crossing avoidance ──────────────────────────────────────

function posToDir(p: Position): HandleDir {
  if (p === Position.Left) return 'Left';
  if (p === Position.Right) return 'Right';
  if (p === Position.Top) return 'Top';
  return 'Bottom';
}

function smoothstepSegments(
  sp: { x: number; y: number },
  tp: { x: number; y: number },
  sh: Position,
  th: Position,
): Segment[] {
  return computeSegments(sp, tp, posToDir(sh), posToDir(th));
}

function segsCross(a: Segment, b: Segment): boolean {
  const aH = a.y1 === a.y2, bH = b.y1 === b.y2;
  if (aH === bH) return false;
  const horiz = aH ? a : b, vert = aH ? b : a;
  // Skip degenerate (zero-length) segments.
  if (horiz.x1 === horiz.x2 || vert.y1 === vert.y2) return false;
  const hxMin = Math.min(horiz.x1, horiz.x2), hxMax = Math.max(horiz.x1, horiz.x2);
  const vyMin = Math.min(vert.y1, vert.y2), vyMax = Math.max(vert.y1, vert.y2);
  const hY = horiz.y1;
  const vX = vert.x1;
  return hxMax >= vX - 0.5 && hxMin <= vX + 0.5 && vyMax >= hY - 0.5 && vyMin <= hY + 0.5;
}

function countCrossings(
  candidate: { source: Position; target: Position },
  mergeEdgeSource: string,
  mergeEdgeTarget: string,
  allEdges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; data?: Record<string, unknown> }>,
  nodePositions: Map<string, { x: number; y: number }>,
): number {
  const msp = nodePositions.get(mergeEdgeSource);
  const mtp = nodePositions.get(mergeEdgeTarget);
  if (!msp || !mtp) return 0;
  const mSh = handleToSourcePosition(candidate.source);
  const mTh = handleToTargetPosition(candidate.target);
  const mergeSegs = smoothstepSegments(msp, mtp, mSh, mTh);
  let count = 0;

  for (const e of allEdges) {
    if (e.source === mergeEdgeSource && e.target === mergeEdgeTarget) continue;
    if (e.source === mergeEdgeTarget || e.target === mergeEdgeSource) continue;
    const esp = nodePositions.get(e.source);
    const etp = nodePositions.get(e.target);
    if (!esp || !etp) continue;
    const eSh = handleToSourcePosition(e.sourceHandle || 'source-right');
    const eTh = handleToTargetPosition(e.targetHandle || 'target-left');
    const edgeSegs = smoothstepSegments(esp, etp, eSh, eTh);
    for (const ms of mergeSegs) {
      for (const es of edgeSegs) {
        if (segsCross(ms, es)) count++;
      }
    }
  }
  return count;
}

function findBestMergeHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  defaultSource: Position,
  defaultTarget: Position,
  mergeEdgeSource: string,
  mergeEdgeTarget: string,
  allEdges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; data?: Record<string, unknown> }>,
  nodePositions: Map<string, { x: number; y: number }>,
): { source: Position; target: Position } {
  const candidates: { source: Position; target: Position }[] = [
    { source: defaultSource, target: defaultTarget },
  ];

  const sDir = sourcePos.y > targetPos.y ? 'above' : sourcePos.y < targetPos.y ? 'below' : 'same';
  const horizPreferred = Math.abs(targetPos.x - sourcePos.x) > Math.abs(targetPos.y - sourcePos.y) * 0.5;

  if (sDir === 'below') {
    candidates.push({ source: Position.Right, target: Position.Bottom });
    candidates.push({ source: Position.Top, target: Position.Bottom });
    if (horizPreferred) {
      candidates.push({ source: Position.Right, target: Position.Left });
    }
  } else if (sDir === 'above') {
    candidates.push({ source: Position.Right, target: Position.Top });
    candidates.push({ source: Position.Bottom, target: Position.Top });
    if (horizPreferred) {
      candidates.push({ source: Position.Right, target: Position.Left });
    }
  } else {
    candidates.push({ source: Position.Right, target: Position.Left });
    candidates.push({ source: Position.Bottom, target: Position.Top });
    candidates.push({ source: Position.Top, target: Position.Bottom });
  }

  let best = candidates[0];
  let bestScore = Infinity;

  for (const c of candidates) {
    const crossings = countCrossings(c, mergeEdgeSource, mergeEdgeTarget, allEdges, nodePositions);
    const msp = nodePositions.get(mergeEdgeSource)!;
    const mtp = nodePositions.get(mergeEdgeTarget)!;
    const len = Math.hypot(mtp.x - msp.x, mtp.y - msp.y);
    const isHoriz = c.source === Position.Left || c.source === Position.Right;
    const bends = isHoriz ? 2 : 2;
    const score = crossings * 10000 + len * 0.1 + bends;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

export function getMergeAwareEdgePositions(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
  sourceId: string,
  targetId: string,
  sourceHandle: Position,
  targetHandle: Position,
  isMergeEdge: boolean,
  allEdges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; data?: Record<string, unknown> }>,
  nodePositions: Map<string, { x: number; y: number }>,
): { source: Position; target: Position } {
  if (!isMergeEdge) {
    return { source: sourceHandle, target: targetHandle };
  }
  return findBestMergeHandles(
    sourcePos, targetPos, sourceHandle, targetHandle,
    sourceId, targetId, allEdges, nodePositions,
  );
}
