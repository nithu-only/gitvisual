export type HandleDir = 'Left' | 'Right' | 'Top' | 'Bottom';

export interface Segment {
  x1: number; y1: number;
  x2: number; y2: number;
}

/**
 * Compute the axis-aligned segments of a React Flow smoothstep edge.
 * Matches the library's internal routing exactly.
 */
export function smoothstepSegments(
  sp: { x: number; y: number },
  tp: { x: number; y: number },
  sh: HandleDir,
  th: HandleDir,
): Segment[] {
  const segs: Segment[] = [];
  const sx = sp.x, sy = sp.y, tx = tp.x, ty = tp.y;
  const isSourceHoriz = sh === 'Left' || sh === 'Right';
  const isTargetHoriz = th === 'Left' || th === 'Right';

  if (isSourceHoriz && isTargetHoriz) {
    const midX = (sx + tx) / 2;
    segs.push({ x1: sx, y1: sy, x2: midX, y2: sy });
    segs.push({ x1: midX, y1: sy, x2: midX, y2: ty });
    segs.push({ x1: midX, y1: ty, x2: tx, y2: ty });
  } else if (!isSourceHoriz && !isTargetHoriz) {
    const midY = (sy + ty) / 2;
    segs.push({ x1: sx, y1: sy, x2: sx, y2: midY });
    segs.push({ x1: sx, y1: midY, x2: tx, y2: midY });
    segs.push({ x1: tx, y1: midY, x2: tx, y2: ty });
  } else if (isSourceHoriz && !isTargetHoriz) {
    segs.push({ x1: sx, y1: sy, x2: tx, y2: sy });
    segs.push({ x1: tx, y1: sy, x2: tx, y2: ty });
  } else {
    segs.push({ x1: sx, y1: sy, x2: sx, y2: ty });
    segs.push({ x1: sx, y1: ty, x2: tx, y2: ty });
  }
  return segs;
}

/**
 * Total arc length of a set of segments.
 */
export function totalLength(segs: Segment[]): number {
  let len = 0;
  for (const s of segs) {
    len += Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
  }
  return len;
}

/**
 * Interpolate a position along a set of segments by normalised t ∈ [0,1].
 */
export function interpolate(
  segs: Segment[],
  t: number,
): { x: number; y: number } {
  const total = totalLength(segs);
  if (total === 0) return { x: segs[0].x1, y: segs[0].y1 };
  let remaining = t * total;
  for (const s of segs) {
    const segLen = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    if (remaining <= segLen || segLen === 0) {
      const frac = segLen === 0 ? 0 : remaining / segLen;
      return {
        x: s.x1 + (s.x2 - s.x1) * frac,
        y: s.y1 + (s.y2 - s.y1) * frac,
      };
    }
    remaining -= segLen;
  }
  const last = segs[segs.length - 1];
  return { x: last.x2, y: last.y2 };
}

/**
 * Build an SVG path d-attribute from segments.
 */
export function segmentsToPath(segs: Segment[]): string {
  if (segs.length === 0) return '';
  return `M ${segs[0].x1} ${segs[0].y1} ` +
    segs.map(s => `L ${s.x2} ${s.y2}`).join(' ');
}
