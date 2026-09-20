import { useEffect, useRef } from 'react';

interface EdgeParticlesProps {
  /** Trigger re-sync when edges change (count is sufficient). */
  edgeCount: number;
}

/**
 * Reads the ACTUAL rendered edge paths from the React Flow DOM
 * and animates a small particle along each path.
 *
 * This guarantees perfect alignment with the visible edges because
 * it uses the exact SVG path geometry computed by React Flow internally.
 *
 * Zero React state updates during animation — pure DOM mutation via rAF.
 * Respects prefers-reduced-motion.
 */
export function EdgeParticles({ edgeCount }: EdgeParticlesProps) {
  const prefersReduced = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReduced.current = mq.matches;
  }, []);

  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (prefersReduced.current || !svgRef.current) return;

    const overlay = svgRef.current;
    const particles = new Map<SVGPathElement, SVGCircleElement>();
    let raf = 0;

    const animate = () => {
      // Read viewport transform from React Flow's viewport div.
      const viewportEl = overlay.closest('.react-flow')?.querySelector('.react-flow__viewport') as HTMLElement | null;
      if (viewportEl) {
        overlay.style.transform = viewportEl.style.transform;
      }

      // Query all rendered edge paths from React Flow's SVG.
      const paths = overlay.closest('.react-flow')?.querySelectorAll<SVGPathElement>('.react-flow__edge-path');

      if (!paths || paths.length === 0) {
        raf = requestAnimationFrame(animate);
        return;
      }

      // Sync particle pool with current paths.
      const currentSet = new Set(paths);

      // Remove particles for edges that no longer exist.
      for (const [pathEl, circle] of particles) {
        if (!currentSet.has(pathEl)) {
          circle.remove();
          particles.delete(pathEl);
        }
      }

      // Create particles for new paths.
      for (const pathEl of paths) {
        if (particles.has(pathEl)) continue;

        // Skip invisible paths (e.g. edges being removed).
        const d = pathEl.getAttribute('d');
        if (!d || d === 'M 0 0') continue;

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', '2.5');
        circle.setAttribute('opacity', '0.5');

        // Inherit the edge's stroke color.
        const parentEdge = pathEl.closest('.react-flow__edge');
        const edgePath = parentEdge?.querySelector('.react-flow__edge-path') as SVGPathElement | null;
        const strokeColor = edgePath?.getAttribute('stroke')
          || getComputedStyle(pathEl).stroke
          || '#8b949e';
        circle.setAttribute('fill', strokeColor);

        // Use the SVG path element directly for getPointAtLength.
        particles.set(pathEl, circle);
        overlay.appendChild(circle);
      }

      // Animate each particle along its path.
      const now = performance.now();
      for (const [pathEl, circle] of particles) {
        const totalLen = pathEl.getTotalLength();
        if (totalLen === 0) continue;

        // Each particle gets a unique speed based on path length.
        // Deterministic: use path length as seed.
        const speed = 80 + (totalLen % 40); // 80–120 px/s
        const period = totalLen / speed; // seconds per traversal

        const t = (now / 1000 / period) % 1;
        const point = pathEl.getPointAtLength(t * totalLen);

        circle.setAttribute('cx', String(point.x));
        circle.setAttribute('cy', String(point.y));
      }

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      for (const circle of particles.values()) circle.remove();
      particles.clear();
    };
  }, [edgeCount]); // Re-sync when edges change.

  // The overlay SVG sits inside React Flow's container, sharing its coordinate system.
  return (
    <svg
      ref={svgRef}
      className="react-flow__svg"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 1,
      }}
    />
  );
}
