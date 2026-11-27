import { Card, Seg, Slider, Switch } from '../ui';
import { settings, type EyeMode } from '../../state/store';
import { useStore } from '../../state/createStore';
import { withEngine } from '../../hooks/engine';

export function AnimationPanel() {
  const s = useStore(settings, (x) => x);
  return (
    <>
      <Card title="Idle life">
        <Switch label="Breathing" checked={s.breathing} onChange={(v) => settings.set({ breathing: v })} />
        <Switch label="Random blinking" hint="2–6 s intervals, occasional double blinks" checked={s.autoBlink} onChange={(v) => settings.set({ autoBlink: v })} />
        <Switch label="Head & body drift" checked={s.idleMotion} onChange={(v) => settings.set({ idleMotion: v })} />
        <Slider label="Motion amount" value={s.idleIntensity} min={0} max={2} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => settings.set({ idleIntensity: v })} />
        <Switch label="Talking head motion" hint="Nods and tilts driven by your voice" checked={s.talkMotion} onChange={(v) => settings.set({ talkMotion: v })} />
        <button className="btn" onClick={() => withEngine((e) => e.blink.trigger())}>
          Blink now (B)
        </button>
      </Card>
      <Card title="Eyes">
        <Seg<EyeMode>
          value={s.eyeMode}
          onChange={(v) => settings.set({ eyeMode: v })}
          options={[
            { value: 'camera', label: 'Look at camera' },
            { value: 'mouse', label: 'Follow cursor' },
            { value: 'wander', label: 'Wander' },
          ]}
        />
        <p className="hint">Natural micro-saccades are always layered on top. VRM eye bones / look-at expressions are driven automatically.</p>
      </Card>
    </>
  );
}
