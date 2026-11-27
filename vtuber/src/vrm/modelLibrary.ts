import type { AvatarEngine } from '../character/AvatarEngine';
import { engineRef } from '../hooks/engine';
import { status, toast } from '../state/store';
import { idbDelete, idbGet, idbPut } from '../utils/idb';
import { describeError } from '../utils/errors';
import { broadcastModelChanged } from '../livestream/WindowSync';

const KEY = 'last-model';

/**
 * Publicly hosted sample from the official three-vrm repository. Fetched by
 * the viewer's browser at runtime (not bundled). Check the model's own
 * license metadata (shown after loading) before using it on stream.
 */
export const SAMPLE_VRM_URL =
  'https://pixiv.github.io/three-vrm/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';

/** Load a user-supplied file and remember it for reloads / the pop-out window. */
export async function loadUserModel(file: File) {
  const engine = engineRef.current;
  if (!engine) return;
  await engine.loadVRM(file, file.name);
  toast(`Loaded ${status.get().model?.name ?? file.name}`, 'success');
  warnMissing();
  try {
    await idbPut(KEY, { blob: file, name: file.name });
    broadcastModelChanged();
  } catch {
    toast('Model loaded, but it could not be cached for next time (storage unavailable).', 'info');
  }
}

export async function loadModelUrl(url: string) {
  const engine = engineRef.current;
  if (!engine) return;
  const name = decodeURIComponent(url.split('/').pop() || 'model.vrm');
  await engine.loadVRM(url, name);
  toast(`Loaded ${status.get().model?.name ?? name}`, 'success');
  warnMissing();
  try {
    await idbPut(KEY, { url, name });
    broadcastModelChanged();
  } catch {
    /* ignore */
  }
}

export async function resetToPlaceholder() {
  engineRef.current?.usePlaceholder();
  try {
    await idbDelete(KEY);
    broadcastModelChanged();
  } catch {
    /* ignore */
  }
}

function warnMissing() {
  const m = status.get().model;
  if (m && m.missing.length) {
    toast(`This model lacks ${m.missing.length} standard expression(s) (${m.missing.slice(0, 5).join(', ')}${m.missing.length > 5 ? '…' : ''}). Those will be skipped.`, 'info', 7000);
  }
}

/** Startup order: ?model= URL → cached last model → placeholder. */
export async function restoreInitialModel(engine: AvatarEngine) {
  const param = new URLSearchParams(location.search).get('model');
  try {
    if (param) {
      await engine.loadVRM(param, decodeURIComponent(param.split('/').pop() || 'model.vrm'));
      return;
    }
    const cached = await idbGet<{ blob?: Blob; url?: string; name: string }>(KEY).catch(() => undefined);
    if (cached?.blob) {
      await engine.loadVRM(cached.blob, cached.name);
      return;
    }
    if (cached?.url) {
      await engine.loadVRM(cached.url, cached.name);
      return;
    }
  } catch (e) {
    toast(`Could not load model: ${describeError(e).replace(/\.$/, '')}. Showing the placeholder instead.`, 'error', 9000);
  }
  if (!engine.avatar || engine.avatar.kind !== 'placeholder') engine.usePlaceholder();
}
