import { useEffect, useRef } from 'react';
import { Card, Switch } from '../ui';
import { settings, status, toast } from '../../state/store';
import { useStore } from '../../state/createStore';
import { engineRef } from '../../hooks/engine';
import { describeError } from '../../utils/errors';

export function TrackingPanel() {
  const active = useStore(status, (s) => s.trackingActive);
  const loading = useStore(status, (s) => s.trackingLoading);
  const mirror = useStore(settings, (s) => s.mirrorTracking);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const v = engineRef.current?.tracker.videoElement;
    if (!active || !v || !holder.current) return;
    v.className = 'cam-preview';
    holder.current.appendChild(v);
    return () => v.remove();
  }, [active]);

  return (
    <>
      <Card title="Webcam face tracking" right={<span className={`tag ${active ? '' : 'miss'}`}>{active ? 'on' : 'off'}</span>}>
        <p>
          Optional. Uses MediaPipe Face Landmarker <b>locally in your browser</b> to drive head rotation, blinking, mouth and smiles. Video is
          never uploaded.
        </p>
        {active ? (
          <button className="btn danger" onClick={() => engineRef.current?.stopTracking()}>
            Stop tracking
          </button>
        ) : (
          <button
            className="btn primary"
            disabled={loading}
            onClick={() => engineRef.current?.startTracking().catch((e) => toast(describeError(e), 'error', 9000))}
          >
            {loading ? 'Loading model…' : '📷 Start face tracking'}
          </button>
        )}
        <div ref={holder} />
        <Switch label="Mirror" hint="Avatar moves like a mirror image of you" checked={mirror} onChange={(v) => settings.set({ mirrorTracking: v })} />
        <p className="hint">
          Needs a webcam and, the first time, an internet connection to download the ~3.7 MB face model from Google's CDN. For offline use,
          save <code>face_landmarker.task</code> into <code>public/mediapipe/</code>.
        </p>
      </Card>
    </>
  );
}
