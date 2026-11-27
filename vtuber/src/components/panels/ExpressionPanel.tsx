import { Card, Slider } from '../ui';
import { settings, status } from '../../state/store';
import { useStore } from '../../state/createStore';
import { EXPRESSIONS, EXPRESSION_NAMES } from '../../expressions/presets';

export function ExpressionPanel() {
  const expression = useStore(settings, (s) => s.expression);
  const intensity = useStore(settings, (s) => s.expressionIntensity);
  const speed = useStore(settings, (s) => s.transitionSpeed);
  const auto = useStore(settings, (s) => s.autoExpressionFromVoice);
  const model = useStore(status, (s) => s.model);

  return (
    <>
      <Card title="Expressions" right={<span className="tag">keys 1–8</span>}>
        <div className="expr-grid">
          {EXPRESSION_NAMES.map((n) => (
            <button key={n} className={n === expression ? 'active' : ''} onClick={() => settings.set({ expression: n })}>
              <span>{EXPRESSIONS[n].emoji}</span>
              {EXPRESSIONS[n].label}
            </button>
          ))}
        </div>
        <Slider label="Intensity" value={intensity} min={0} max={1} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => settings.set({ expressionIntensity: v })} />
        <Slider label="Transition speed" value={speed} min={1} max={20} step={0.5} format={(v) => (v < 4 ? 'slow' : v < 10 ? 'natural' : 'snappy')} onChange={(v) => settings.set({ transitionSpeed: v })} />
        <label className="switch">
          <span>
            Smile while talking
            <small>Adds a light, friendly smile whenever voice is detected</small>
          </span>
          <input type="checkbox" checked={auto} onChange={(e) => settings.set({ autoExpressionFromVoice: e.target.checked })} />
          <i />
        </label>
      </Card>
      <Card title="How expressions map">
        <p>
          Each emotion blends standard VRM presets (<code>happy</code>, <code>angry</code>, <code>sad</code>, <code>relaxed</code>,{' '}
          <code>surprised</code>) plus head motion. If your model defines a custom clip with the same name (e.g. <code>excited</code>,{' '}
          <code>confused</code>, <code>laughing</code>) it is used instead.
          {model?.kind === 'vrm' && model.missing.length > 0 && ' Presets your model lacks are skipped automatically.'}
        </p>
      </Card>
    </>
  );
}
