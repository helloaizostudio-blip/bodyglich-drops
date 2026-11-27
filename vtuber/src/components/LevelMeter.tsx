import { useRef } from 'react';
import { useAnimationFrame } from '../hooks/useAnimationFrame';
import { engineRef } from '../hooks/engine';

/** Audio level meter updated via rAF + direct DOM writes (no React renders). */
export function LevelMeter({ threshold }: { threshold?: number }) {
  const bar = useRef<HTMLDivElement>(null);
  useAnimationFrame(() => {
    const lvl = engineRef.current?.level ?? 0;
    if (bar.current) bar.current.style.width = `${Math.round(lvl * 100)}%`;
  });
  return (
    <div className="meter" aria-label="Voice level">
      <div ref={bar} />
      {threshold != null && <span className="thr" style={{ left: `${threshold * 100}%` }} />}
    </div>
  );
}
