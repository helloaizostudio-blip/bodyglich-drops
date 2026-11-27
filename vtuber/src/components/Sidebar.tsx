import { useState } from 'react';
import { CharacterPanel } from './panels/CharacterPanel';
import { ExpressionPanel } from './panels/ExpressionPanel';
import { AnimationPanel } from './panels/AnimationPanel';
import { VoicePanel } from './panels/VoicePanel';
import { CameraPanel } from './panels/CameraPanel';
import { StreamPanel } from './panels/StreamPanel';
import { TrackingPanel } from './panels/TrackingPanel';

const TABS = [
  { id: 'character', icon: '🧍‍♀️', label: 'Model', el: <CharacterPanel /> },
  { id: 'expressions', icon: '😊', label: 'Face', el: <ExpressionPanel /> },
  { id: 'animation', icon: '✨', label: 'Motion', el: <AnimationPanel /> },
  { id: 'voice', icon: '🎙️', label: 'Voice', el: <VoicePanel /> },
  { id: 'camera', icon: '🎥', label: 'Camera', el: <CameraPanel /> },
  { id: 'tracking', icon: '📷', label: 'Track', el: <TrackingPanel /> },
  { id: 'stream', icon: '📡', label: 'Stream', el: <StreamPanel /> },
] as const;

export function Sidebar() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>(() => {
    try {
      return (localStorage.getItem('vtuber-studio.tab') as never) || 'character';
    } catch {
      return 'character';
    }
  });
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];
  return (
    <aside className="sidebar">
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === tab}
            className={t.id === tab ? 'active' : ''}
            onClick={() => {
              setTab(t.id);
              try {
                localStorage.setItem('vtuber-studio.tab', t.id);
              } catch {
                /* ignore */
              }
            }}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="panel-scroll" role="tabpanel">
        {current.el}
      </div>
    </aside>
  );
}
