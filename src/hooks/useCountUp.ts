import { useState, useEffect, useRef } from 'react';

/** Animate from the currently shown value to `target`. Jumps straight there under reduced motion. */
export function useCountUp(target: number, duration: number = 600): number {
  const [count, setCount] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shownRef.current = target;
      setCount(target);
      return;
    }

    const from = shownRef.current;
    let start: number | null = null;
    let frame = 0;

    const step = (timestamp: number) => {
      start ??= timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + (target - from) * eased);
      shownRef.current = value;
      setCount(value);
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return count;
}
