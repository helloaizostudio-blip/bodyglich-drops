import { useEffect, useRef } from 'react';

/** Runs `fn` every animation frame without causing React re-renders. */
export function useAnimationFrame(fn: (dt: number) => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      ref.current((now - last) / 1000);
      last = now;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}
