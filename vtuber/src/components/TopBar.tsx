import { settings, status } from '../state/store';
import { useStore } from '../state/createStore';
import { toggleFullscreen } from '../hooks/useHotkeys';

export function TopBar() {
  const mic = useStore(status, (s) => s.micActive);
  const playing = useStore(status, (s) => s.audioPlaying || s.ttsSpeaking);
  const speaking = useStore(status, (s) => s.speaking);
  const ws = useStore(status, (s) => s.wsStatus);
  const fps = useStore(status, (s) => s.fps);
  const tracking = useStore(status, (s) => s.trackingActive);
  const liveSince = useStore(status, (s) => s.liveSince);
  const model = useStore(status, (s) => s.model);
  const showLive = useStore(settings, (s) => s.showLive);

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">✦</div>
        Aiko Studio <small>VTuber</small>
      </div>
      <div className="pills">
        <span className={`pill ${model?.kind === 'vrm' ? 'on' : 'warn'}`} title={model?.name}>
          <i className="dot" /> {model?.kind === 'vrm' ? 'VRM loaded' : 'Placeholder'}
        </span>
        <span className={`pill ${mic ? 'on' : ''}`}>
          <i className="dot" /> Mic {mic ? 'on' : 'off'}
        </span>
        <span className={`pill hide-sm ${speaking ? 'talk' : playing ? 'on' : ''}`}>
          <i className="dot" /> {speaking ? 'Speaking' : playing ? 'Audio playing' : 'Silent'}
        </span>
        <span className={`pill hide-sm ${tracking ? 'on' : ''}`}>
          <i className="dot" /> Tracking {tracking ? 'on' : 'off'}
        </span>
        <span className={`pill hide-sm ${ws === 'connected' ? 'on' : ws === 'error' ? 'err' : ws === 'connecting' ? 'warn' : ''}`}>
          <i className="dot" /> Bridge {ws}
        </span>
        <span className="pill hide-sm">{fps} fps</span>
      </div>
      <div className="spacer" />
      <button className="btn sm" onClick={toggleFullscreen} title="Fullscreen (F)">
        ⛶
      </button>
      <button
        className={`btn sm ${liveSince ? 'live' : ''}`}
        title="Toggles the on-screen LIVE indicator. Actual broadcasting happens in OBS."
        onClick={() => {
          status.set({ liveSince: liveSince ? null : Date.now() });
          if (!showLive) settings.set({ showLive: true });
        }}
      >
        {liveSince ? '● LIVE' : 'Go live'}
      </button>
      <button className="btn sm primary" onClick={() => status.set({ streamMode: true })} title="Stream mode (S)">
        Stream mode
      </button>
    </header>
  );
}
