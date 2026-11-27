import { useEffect } from 'react';
import { EXPRESSION_NAMES } from '../expressions/presets';
import { settings, status } from '../state/store';
import { withEngine } from './engine';

/** 1–8 expressions · B blink · S stream mode · F fullscreen · Esc exit stream mode */
export function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= EXPRESSION_NAMES.length) {
        settings.set({ expression: EXPRESSION_NAMES[n - 1] });
      } else if (e.key === 'b' || e.key === 'B') {
        withEngine((en) => en.blink.trigger());
      } else if (e.key === 's' || e.key === 'S') {
        status.set((s) => ({ streamMode: !s.streamMode }));
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape' && status.get().streamMode && !status.get().isPopout) {
        status.set({ streamMode: false });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => {});
}
