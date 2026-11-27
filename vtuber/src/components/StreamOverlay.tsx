import { useEffect, useState } from 'react';
import { settings, status } from '../state/store';
import { useStore } from '../state/createStore';
import { chat } from '../livestream/bridge';

const fmt = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString());

function LiveTimer({ since }: { since: number }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.floor((Date.now() - since) / 1000);
  const hh = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return <time>{hh ? `${hh}:` : ''}{mm}:{ss}</time>;
}

/** Stream-ready overlay: LIVE badge, counters, title, mic status, chat. */
export function StreamOverlay() {
  const s = useStore(settings, (x) => x);
  const liveSince = useStore(status, (x) => x.liveSince);
  const mic = useStore(status, (x) => x.micActive);
  const speaking = useStore(status, (x) => x.speaking);
  const lines = useStore(chat, (c) => c.lines);

  return (
    <div className="overlay">
      <div className="ov-top">
        {s.showLive && (
          <span className={`live-badge ${liveSince ? '' : 'offline'}`}>
            {liveSince ? <i className="rec" /> : null}
            {liveSince ? 'LIVE' : 'OFFLINE'}
            {liveSince && <LiveTimer since={liveSince} />}
          </span>
        )}
        {s.showStats && (
          <>
            <span className="ov-chip" title="Demo value — set manually or via the live bridge">
              <span className="ic">👁</span> {fmt(s.viewers)}
            </span>
            <span className="ov-chip" title="Demo value — set manually or via the live bridge">
              <span className="ic">♥</span> {fmt(s.subscribers)} subs
            </span>
          </>
        )}
      </div>
      {lines.length > 0 && (
        <div className="ov-chat">
          {lines.map((l) => (
            <div key={l.id}>
              <b>{l.user}</b>
              {l.text}
            </div>
          ))}
        </div>
      )}
      {s.streamTitle && <div className="ov-title">{s.streamTitle}</div>}
      {s.showMicStatus && (
        <span className="ov-chip ov-mic">
          {mic ? (speaking ? '🎙️ speaking' : '🎙️ mic live') : '🔇 mic off'}
        </span>
      )}
    </div>
  );
}
