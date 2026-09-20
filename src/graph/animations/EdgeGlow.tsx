import { useEffect, useRef, useState } from 'react';
import { smoothstepSegments, totalLength, interpolate, segmentsToPath, type HandleDir } from '../edgePath';

interface EdgeGlowProps {
  sourcePos: { x: number; y: number };
  targetPos: { x: number; y: number };
  sourceDir: HandleDir;
  targetDir: HandleDir;
  color: string;
  duration?: number;
  onComplete: () => void;
}

/**
 * Minimal traveling-dot animation for a single newly created commit edge.
 * A small bright dot slides along the smoothstep path, then fades out.
 * Respects prefers-reduced-motion. Purely visual — no state persisted.
 */
export function EdgeGlow({
  sourcePos,
  targetPos,
  sourceDir,
  targetDir,
  color,
  duration = 500,
  onComplete,
}: EdgeGlowProps) {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    setPrefersReduced(
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
  }, []);

  const segs = smoothstepSegments(sourcePos, targetPos, sourceDir, targetDir);
  const pathD = segmentsToPath(segs);
  const len = totalLength(segs);

  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const start = useRef(0);

  useEffect(() => {
    if (prefersReduced || len === 0) {
      onComplete();
      return;
    }
    const animate = (ts: number) => {
      if (!start.current) start.current = ts;
      const elapsed = ts - start.current;
      const t = Math.min(elapsed / duration, 1);
      setProgress(t);
      if (t < 1) {
        raf.current = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [duration, len, onComplete, prefersReduced]);

  if (prefersReduced || len === 0) return null;

  const { x, y } = interpolate(segs, progress);
  const fadeIn = Math.min(progress * 6, 1);
  const fadeOut = Math.max(1 - (progress - 0.75) / 0.25, 0);
  const opacity = fadeIn * (progress > 0.75 ? fadeOut : 1);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 1,
        height: 1,
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      {/* Faint path highlight */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} opacity={opacity * 0.2} />

      {/* Traveling dot */}
      <circle cx={x} cy={y} r={4} fill={color} opacity={opacity * 0.9} />
      <circle cx={x} cy={y} r={1.5} fill="#ffffff" opacity={opacity * 0.8} />
    </svg>
  );
}
