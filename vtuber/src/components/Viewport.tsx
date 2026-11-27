import { useEffect, useRef, useState } from 'react';
import { AvatarEngine } from '../character/AvatarEngine';
import { engineRef } from '../hooks/engine';
import { settings, status, toast } from '../state/store';
import { useStore } from '../state/createStore';
import { EXPRESSIONS, EXPRESSION_NAMES } from '../expressions/presets';
import { StreamOverlay } from './StreamOverlay';
import { describeError } from '../utils/errors';
import { loadUserModel, restoreInitialModel } from '../vrm/modelLibrary';

export function Viewport() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const model = useStore(status, (s) => s.model);
  const loading = useStore(status, (s) => s.loading);
  const streamMode = useStore(status, (s) => s.streamMode);
  const isPopout = useStore(status, (s) => s.isPopout);
  const expression = useStore(settings, (s) => s.expression);

  useEffect(() => {
    if (!canvas.current || !wrap.current) return;
    let engine: AvatarEngine;
    try {
      engine = new AvatarEngine(canvas.current, wrap.current);
    } catch (e) {
      setFatal(describeError(e));
      return;
    }
    engineRef.current = engine;
    if (import.meta.env.DEV) (window as unknown as { __engine: AvatarEngine }).__engine = engine;
    void restoreInitialModel(engine);
    const onModelChanged = () => void restoreInitialModel(engine);
    window.addEventListener('vtuber:model-changed', onModelChanged);
    return () => {
      window.removeEventListener('vtuber:model-changed', onModelChanged);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) loadUserModel(f).catch((err) => toast(describeError(err), 'error', 8000));
  };

  if (fatal) {
    return (
      <div className="viewport" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="card" style={{ maxWidth: 440 }}>
          <h3>Rendering unavailable</h3>
          <p>{fatal}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrap}
      className={`viewport ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <canvas ref={canvas} tabIndex={0} aria-label="3D avatar viewport" />

      {streamMode && <StreamOverlay />}

      {!streamMode && model?.kind === 'placeholder' && (
        <div className="badge-placeholder">
          <b>TEMPORARY PLACEHOLDER</b> — not the final character. Load a <code>.vrm</code> avatar
          <span className="long"> (e.g. made in VRoid Studio) for production-quality rendering, spring-bone hair physics and full facial
          expressions. This stand-in exists so you can test expressions, blinking and lip-sync</span>.
        </div>
      )}

      {!streamMode && (
        <div className="quickbar" role="toolbar" aria-label="Expressions">
          {EXPRESSION_NAMES.map((n, i) => (
            <button key={n} className={expression === n ? 'active' : ''} onClick={() => settings.set({ expression: n })} title={`${EXPRESSIONS[n].label} (${i + 1})`}>
              <span>{EXPRESSIONS[n].emoji}</span>
              <small>{EXPRESSIONS[n].label}</small>
              <kbd>{i + 1}</kbd>
            </button>
          ))}
        </div>
      )}

      {streamMode && !isPopout && (
        <button className="btn sm exit-stream" onClick={() => status.set({ streamMode: false })}>
          Exit stream mode (Esc)
        </button>
      )}

      {loading && (
        <div className="loading">
          <div>
            <div className="spinner" />
            {loading}
          </div>
        </div>
      )}
    </div>
  );
}
