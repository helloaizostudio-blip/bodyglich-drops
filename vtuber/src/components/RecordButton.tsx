import { useRef, useState } from 'react';
import { ReelRecorder, type RecordingResult } from '../livestream/ReelRecorder';
import { engineRef } from '../hooks/engine';
import { useAnimationFrame } from '../hooks/useAnimationFrame';
import { toast } from '../state/store';
import { describeError } from '../utils/errors';

/** Floating "record a 9:16 reel" control with a live timer and the crop guide. */
export function RecordButton() {
  const rec = useRef<ReelRecorder | null>(null);
  const [state, setState] = useState<'idle' | 'recording' | 'done'>('idle');
  const [result, setResult] = useState<{ url: string; r: RecordingResult } | null>(null);
  const timer = useRef<HTMLSpanElement>(null);

  useAnimationFrame(() => {
    if (state === 'recording' && timer.current && rec.current) {
      const s = Math.floor(rec.current.elapsed());
      timer.current.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }
  });

  const start = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      rec.current ??= new ReelRecorder(engine);
      if (result) URL.revokeObjectURL(result.url);
      setResult(null);
      await rec.current.start();
      setState('recording');
    } catch (e) {
      toast(describeError(e), 'error', 8000);
    }
  };

  const stop = async () => {
    if (!rec.current) return;
    const r = await rec.current.stop();
    setResult({ url: URL.createObjectURL(r.blob), r });
    setState('done');
  };

  return (
    <>
      {state === 'recording' && <div className="reel-guide" aria-hidden />}
      <div className="rec-dock">
        {state === 'recording' ? (
          <button className="btn rec-btn on" onClick={stop}>
            <i className="rec-dot" /> Stop · <span ref={timer}>0:00</span>
          </button>
        ) : (
          <button className="btn rec-btn" onClick={start} title="Record a vertical 9:16 reel with your mic">
            <i className="rec-dot" /> Record reel
          </button>
        )}
        {state === 'done' && result && (
          <div className="rec-result">
            <video src={result.url} controls playsInline />
            <div className="row">
              <a className="btn primary sm" href={result.url} download={`miyu-reel-${Date.now()}.${result.r.extension}`}>
                ⬇ Save {result.r.extension.toUpperCase()}
              </a>
              <button
                className="btn sm"
                onClick={() => {
                  URL.revokeObjectURL(result.url);
                  setResult(null);
                  setState('idle');
                }}
              >
                Discard
              </button>
            </div>
            {result.r.extension === 'webm' && <p className="hint">Saved as WebM: open it in CapCut and export as MP4 for Instagram.</p>}
          </div>
        )}
      </div>
    </>
  );
}
