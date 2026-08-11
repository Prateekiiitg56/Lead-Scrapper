import { useEffect, useRef } from 'react';

const GRAIN_URL = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.280'/></svg>")`;

const BLOBS = [
  {
    bx: 66.94,
    by: 46.43,
    p: 0.0,
    p2: 1.2,
    stops: 'rgba(215, 213, 213, 1) 0%, rgba(215, 213, 213, 0.844) 19.02%, rgba(215, 213, 213, 0.5) 38.05%, rgba(215, 213, 213, 0.156) 57.07%, rgba(215, 213, 213, 0) 76.1%',
  },
  {
    bx: 34.69,
    by: 66.31,
    p: 1.57,
    p2: 2.7,
    stops: 'rgba(49, 5, 39, 1) 0%, rgba(49, 5, 39, 0.844) 12.73%, rgba(49, 5, 39, 0.5) 25.45%, rgba(49, 5, 39, 0.156) 38.18%, rgba(49, 5, 39, 0) 50.9%',
  },
  {
    bx: 48.93,
    by: 19.32,
    p: 3.14,
    p2: 4.2,
    stops: 'rgba(57, 5, 31, 1) 0%, rgba(57, 5, 31, 0.844) 16.75%, rgba(57, 5, 31, 0.5) 33.5%, rgba(57, 5, 31, 0.156) 50.25%, rgba(57, 5, 31, 0) 67%',
  },
  {
    bx: 80.23,
    by: 87.54,
    p: 4.71,
    p2: 5.8,
    stops: 'rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.844) 10.28%, rgba(255, 255, 255, 0.5) 20.55%, rgba(255, 255, 255, 0.156) 30.83%, rgba(255, 255, 255, 0) 41.1%',
  },
];

export function AlmoayyedGradient({ className = '', opacity = 1 }: { className?: string; opacity?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startTime = performance.now();
    let animationFrameId: number;

    const renderFrame = (now: number) => {
      const t = prefersReducedMotion ? 0 : (now - startTime) / 1000;
      const ph = t * 1.0;
      const amt = 0.4;

      const radialGradients = BLOBS.map((b) => {
        const dx = (Math.sin(ph * 0.55 + b.p) - Math.sin(b.p)) * 14 * amt;
        const dy = (Math.sin(ph * 0.43 + b.p2) - Math.sin(b.p2)) * 14 * amt;
        const x = b.bx + dx;
        const y = b.by + dy;
        return `radial-gradient(circle at ${x.toFixed(4)}% ${y.toFixed(4)}%, ${b.stops})`;
      });

      el.style.backgroundImage = `${GRAIN_URL}, ${radialGradients.join(', ')}`;

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(renderFrame);
      }
    };

    animationFrameId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 pointer-events-none z-0 transition-opacity ${className}`}
      style={{
        backgroundColor: '#D7D5D5',
        backgroundSize: '120px 120px, auto, auto, auto, auto',
        backgroundBlendMode: 'overlay, normal, normal, normal, normal',
        opacity,
      }}
    />
  );
}
