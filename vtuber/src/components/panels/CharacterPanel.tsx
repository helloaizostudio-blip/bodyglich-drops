import { useRef, useState } from 'react';
import { Card } from '../ui';
import { settings, status, toast } from '../../state/store';
import { useStore } from '../../state/createStore';
import { describeError } from '../../utils/errors';
import { loadModelUrl, loadUserModel, resetToPlaceholder, SAMPLE_VRM_URL } from '../../vrm/modelLibrary';

export function CharacterPanel() {
  const model = useStore(status, (s) => s.model);
  const hairColor = useStore(settings, (s) => s.hairColor);
  const eyeColor = useStore(settings, (s) => s.eyeColor);
  const fileInput = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');

  const run = (p: Promise<unknown>) => p.catch((e) => toast(describeError(e), 'error', 9000));

  return (
    <>
      <Card title="Avatar model">
        <div className="dropzone" onClick={() => fileInput.current?.click()} role="button" tabIndex={0}>
          <b>Upload .vrm model</b>
          Click or drag & drop onto the stage · VRM 0.x and 1.0
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".vrm,.glb"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void run(loadUserModel(f));
            e.target.value = '';
          }}
        />
        <div className="row">
          <input className="grow" type="url" placeholder="https://…/avatar.vrm" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="btn" disabled={!url} onClick={() => run(loadModelUrl(url))}>
            Load
          </button>
        </div>
        <div className="row wrap">
          <button className="btn sm" onClick={() => run(loadModelUrl(SAMPLE_VRM_URL))} title={SAMPLE_VRM_URL}>
            Try three-vrm sample (online)
          </button>
          {model?.kind === 'vrm' && (
            <button className="btn sm danger" onClick={() => run(resetToPlaceholder())}>
              Use placeholder
            </button>
          )}
        </div>
        <p className="hint">
          No avatar yet? Create one for free in <a href="https://vroid.com/en/studio" target="_blank" rel="noreferrer">VRoid Studio</a>{' '}
          (long brown hair, blue eyes…) and export as VRM, or download one you have rights to from{' '}
          <a href="https://hub.vroid.com/en" target="_blank" rel="noreferrer">VRoid Hub</a>. Put a file in <code>public/models/</code> and
          open <code>?model=/models/name.vrm</code> to auto-load it (useful for OBS).
        </p>
      </Card>

      {model && (
        <Card title="Model info" right={<span className={`tag ${model.kind === 'vrm' ? '' : 'miss'}`}>{model.kind === 'vrm' ? model.version : 'placeholder'}</span>}>
          <dl className="kv">
            <dt>Name</dt>
            <dd title={model.name}>{model.name}</dd>
            {model.author && (
              <>
                <dt>Author</dt>
                <dd title={model.author}>{model.author}</dd>
              </>
            )}
            {model.license && (
              <>
                <dt>License</dt>
                <dd title={model.license}>{model.license}</dd>
              </>
            )}
            <dt>Spring joints</dt>
            <dd>{model.kind === 'vrm' ? model.springBones : 'GPU sway (approx.)'}</dd>
          </dl>
          <div className="lbl">Expressions available</div>
          <div className="tags">
            {model.supported.map((e) => (
              <span key={e} className="tag">
                {e}
              </span>
            ))}
          </div>
          {model.missing.length > 0 && (
            <>
              <div className="lbl">Missing (skipped gracefully)</div>
              <div className="tags">
                {model.missing.map((e) => (
                  <span key={e} className="tag miss">
                    {e}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {model?.kind === 'placeholder' && (
        <Card title="Placeholder look">
          <p>Colours for the temporary stand-in. Real avatars get their look from the VRM file.</p>
          <div className="row">
            <span className="grow">Hair colour</span>
            <input type="color" value={hairColor} onChange={(e) => settings.set({ hairColor: e.target.value })} aria-label="Hair colour" />
          </div>
          <div className="row">
            <span className="grow">Eye colour</span>
            <input type="color" value={eyeColor} onChange={(e) => settings.set({ eyeColor: e.target.value })} aria-label="Eye colour" />
          </div>
        </Card>
      )}
    </>
  );
}
