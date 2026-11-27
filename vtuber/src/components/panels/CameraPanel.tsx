import { Card, Seg, Slider } from '../ui';
import { settings, type Background, type CameraPreset, type Quality } from '../../state/store';
import { useStore } from '../../state/createStore';
import { withEngine } from '../../hooks/engine';

export function CameraPanel() {
  const s = useStore(settings, (x) => x);
  return (
    <>
      <Card title="Framing">
        <Seg<CameraPreset>
          value={s.cameraPreset}
          onChange={(v) => {
            settings.set({ cameraPreset: v });
            withEngine((e) => e.cam.frame(v));
          }}
          options={[
            { value: 'face', label: 'Face' },
            { value: 'bust', label: 'Bust' },
            { value: 'upper', label: 'Waist up' },
            { value: 'full', label: 'Full body' },
          ]}
        />
        <Slider label="Field of view" value={s.fov} min={15} max={60} step={1} format={(v) => `${v}°`} onChange={(v) => settings.set({ fov: v })} />
        <Slider label="Model rotation" value={s.modelRotation} min={-180} max={180} step={1} format={(v) => `${v}°`} onChange={(v) => settings.set({ modelRotation: v })} />
        <button className="btn" onClick={() => withEngine((e) => e.cam.frame(s.cameraPreset))}>
          Reset camera
        </button>
        <p className="hint">Drag to orbit · right-drag to pan · scroll / pinch to zoom.</p>
      </Card>
      <Card title="Background">
        <Seg<Background>
          value={s.background}
          onChange={(v) => settings.set({ background: v })}
          options={[
            { value: 'gradient', label: 'Studio' },
            { value: 'transparent', label: 'Transparent' },
            { value: 'green', label: 'Green' },
            { value: 'solid', label: 'Solid' },
          ]}
        />
        {s.background === 'solid' && (
          <div className="row">
            <span className="grow">Colour</span>
            <input type="color" value={s.bgColor} onChange={(e) => settings.set({ bgColor: e.target.value })} aria-label="Background colour" />
          </div>
        )}
        {s.background === 'transparent' && (
          <p className="hint">True transparency is visible in OBS browser sources. Window capture needs green screen + chroma key instead.</p>
        )}
      </Card>
      <Card title="Graphics">
        <div className="lbl">Quality</div>
        <Seg<Quality>
          value={s.quality}
          onChange={(v) => settings.set({ quality: v })}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
          ]}
        />
        <div className="lbl">Frame rate cap</div>
        <Seg<number>
          value={s.maxFps}
          onChange={(v) => settings.set({ maxFps: v as 0 | 30 | 60 })}
          options={[
            { value: 30, label: '30' },
            { value: 60, label: '60' },
            { value: 0, label: 'Unlimited' },
          ]}
        />
        <p className="hint">Low = reduced resolution, no shadows. High = up to 2× pixel ratio + soft shadows.</p>
        <button
          className="btn"
          onClick={() => {
            const url = withEngine((e) => e.snapshot());
            if (!url) return;
            const a = document.createElement('a');
            a.href = url;
            a.download = `avatar-${Date.now()}.png`;
            a.click();
          }}
        >
          📸 Save snapshot (PNG)
        </button>
      </Card>
    </>
  );
}
