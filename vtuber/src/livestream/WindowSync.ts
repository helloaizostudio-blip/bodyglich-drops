import { settings, type Settings } from '../state/store';

/**
 * Keeps settings in sync between the control window and a pop-out stream
 * window (same browser profile) via BroadcastChannel. Expressions, camera,
 * counters etc. chosen in the control panel instantly apply on stream.
 */
export function startWindowSync(): () => void {
  if (!('BroadcastChannel' in window)) return () => {};
  const ch = new BroadcastChannel('vtuber-studio');
  let applying = false;
  const unsub = settings.subscribe((s, prev) => {
    if (applying) return;
    const diff: Partial<Settings> = {};
    for (const k in s) {
      const key = k as keyof Settings;
      if (s[key] !== prev[key]) (diff as Record<string, unknown>)[key] = s[key];
    }
    ch.postMessage({ type: 'settings', diff });
  });
  ch.onmessage = (e) => {
    if (e.data?.type === 'settings') {
      applying = true;
      settings.set(e.data.diff);
      applying = false;
    } else if (e.data?.type === 'hello') {
      ch.postMessage({ type: 'settings', diff: settings.get() });
    } else if (e.data?.type === 'model-changed') {
      window.dispatchEvent(new CustomEvent('vtuber:model-changed'));
    }
  };
  ch.postMessage({ type: 'hello' });
  return () => {
    unsub();
    ch.close();
  };
}

export function broadcastModelChanged() {
  if (!('BroadcastChannel' in window)) return;
  const ch = new BroadcastChannel('vtuber-studio');
  ch.postMessage({ type: 'model-changed' });
  ch.close();
}
