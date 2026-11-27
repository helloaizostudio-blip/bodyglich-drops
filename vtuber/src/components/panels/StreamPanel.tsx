import { useState } from 'react';
import { Card, Switch } from '../ui';
import { settings, status, toast } from '../../state/store';
import { useStore } from '../../state/createStore';
import { liveClient } from '../../livestream/bridge';

export function StreamPanel() {
  const s = useStore(settings, (x) => x);
  const ws = useStore(status, (x) => x.wsStatus);
  const [copied, setCopied] = useState('');

  const base = `${location.origin}${location.pathname}`;
  const obsUrl = `${base}?mode=stream&transparent=1`;
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      toast('Clipboard unavailable — select and copy manually.', 'info');
    }
  };

  return (
    <>
      <Card title="Stream mode">
        <div className="grid2">
          <button className="btn primary" onClick={() => status.set({ streamMode: true })}>
            Fullscreen avatar
          </button>
          <button
            className="btn"
            onClick={() => {
              const w = window.open(`${base}?mode=stream`, 'vtuber-stream', 'width=1280,height=720');
              if (!w) toast('Pop-up blocked — allow pop-ups for this site.', 'error');
            }}
          >
            Pop-out window
          </button>
        </div>
        <p className="hint">
          The pop-out mirrors this panel's settings live (expressions, camera, overlay). Start the microphone <b>inside the pop-out</b> if it's
          the window you capture.
        </p>
      </Card>

      <Card title="OBS setup">
        <div className="lbl">Browser source URL (transparent)</div>
        <div className="row">
          <input className="grow" type="text" readOnly value={obsUrl} onFocus={(e) => e.target.select()} />
          <button className="btn sm" onClick={() => copy(obsUrl, 'obs')}>
            {copied === 'obs' ? '✓' : 'Copy'}
          </button>
        </div>
        <p className="hint">
          <b>Browser source:</b> paste the URL, set 1920×1080. Add <code>&model=/models/you.vrm</code> to load a model from{' '}
          <code>public/models/</code> (OBS has its own storage and can't see files uploaded here). Enable “Control audio via OBS” only if you
          want clip audio in the stream. Microphone lip-sync inside OBS requires launching OBS with{' '}
          <code>--use-fake-ui-for-media-stream</code>; alternatively use <b>window capture</b> on the pop-out window with the green background
          + a chroma-key filter.
        </p>
      </Card>

      <Card title="Overlay">
        <div className="field">
          <label>Stream title</label>
          <input type="text" value={s.streamTitle} onChange={(e) => settings.set({ streamTitle: e.target.value })} />
        </div>
        <Switch label="LIVE indicator" checked={s.showLive} onChange={(v) => settings.set({ showLive: v })} />
        <Switch label="Mic status" checked={s.showMicStatus} onChange={(v) => settings.set({ showMicStatus: v })} />
        <Switch label="Viewer / subscriber counters" hint="Demo values — not connected to any platform" checked={s.showStats} onChange={(v) => settings.set({ showStats: v })} />
        {s.showStats && (
          <div className="grid2">
            <div className="field">
              <label>Viewers</label>
              <input type="number" min={0} value={s.viewers} onChange={(e) => settings.set({ viewers: Math.max(0, Number(e.target.value) || 0) })} />
            </div>
            <div className="field">
              <label>Subscribers</label>
              <input type="number" min={0} value={s.subscribers} onChange={(e) => settings.set({ subscribers: Math.max(0, Number(e.target.value) || 0) })} />
            </div>
          </div>
        )}
      </Card>

      <Card title="Live bridge (WebSocket)" right={<span className={`tag ${ws === 'connected' ? '' : 'miss'}`}>{ws}</span>}>
        <div className="row">
          <input className="grow" type="text" value={s.wsUrl} onChange={(e) => settings.set({ wsUrl: e.target.value })} aria-label="WebSocket URL" />
          {ws === 'connected' || ws === 'connecting' ? (
            <button className="btn danger" onClick={() => liveClient.disconnect()}>
              Disconnect
            </button>
          ) : (
            <button className="btn" onClick={() => liveClient.connect(s.wsUrl)}>
              Connect
            </button>
          )}
        </div>
        <p className="hint">
          Run <code>npm run bridge</code> for the reference relay. Your bot / AI backend / chat integration then pushes JSON such as{' '}
          <code>{'{"type":"expression","name":"happy"}'}</code>, <code>{'{"type":"speak","text":"Hi!"}'}</code>,{' '}
          <code>{'{"type":"stats","viewers":42}'}</code> or <code>{'{"type":"chat","user":"mika","text":"hi"}'}</code>.
        </p>
        <p className="hint">
          <b>Twitch / YouTube:</b> no platform account is connected. Real viewer counts and chat need your own app credentials (e.g. a Twitch
          Client ID + OAuth token) handled server-side in the bridge — see README.
        </p>
      </Card>
    </>
  );
}
