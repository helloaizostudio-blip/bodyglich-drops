import { useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { Viewport } from './components/Viewport';
import { Sidebar } from './components/Sidebar';
import { Toasts } from './components/Toasts';
import { settings, status } from './state/store';
import { useStore } from './state/createStore';
import { useHotkeys } from './hooks/useHotkeys';
import { audioEngine } from './audio/AudioEngine';
import { startWindowSync } from './livestream/WindowSync';

export default function App() {
  const streamMode = useStore(status, (s) => s.streamMode);
  const background = useStore(settings, (s) => s.background);
  const bgOverride = useStore(status, (s) => s.bgOverride);
  useHotkeys();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'stream') status.set({ streamMode: true, isPopout: true });
    if (params.get('transparent') === '1') status.set({ bgOverride: 'transparent' });
    const stopSync = startWindowSync();
    const off = audioEngine.onChange(() => status.set({ micActive: audioEngine.micActive, audioPlaying: audioEngine.playing }));
    return () => {
      stopSync();
      off();
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('transparent-mode', streamMode && (bgOverride ?? background) === 'transparent');
  }, [streamMode, background, bgOverride]);

  return (
    <div className={`app ${streamMode ? 'stream' : ''}`}>
      <TopBar />
      <Viewport />
      <Sidebar />
      <Toasts />
    </div>
  );
}
