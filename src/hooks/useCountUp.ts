import { useState, useEffect, useRef } from 'react';

export function useCountUp(target: number, duration: number = 600): number {
  const [count, setCount] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef<number>(0);

  useEffect(() => {
    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(target);
      return;
    }

    let animationFrameId: number;
    const startValue = count;
    fromRef.current = startValue;
    startRef.current = null;

    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      // Cubic-bezier / expo out feel
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.round(startValue + (target - startValue) * easeOut);
      setCount(currentVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrameId);
  }, [target, duration]);

  return count;
}
