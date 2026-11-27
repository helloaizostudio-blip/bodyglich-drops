import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';

export type LoadProgress = (fraction: number) => void;

/**
 * Loads a .vrm (VRM 0.x or 1.0) and applies standard optimisations.
 * Throws descriptive errors for the common failure modes.
 */
export async function loadVRM(source: File | Blob | string, onProgress?: LoadProgress): Promise<VRM> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser, { autoUpdateHumanBones: true }));

  let url: string;
  let revoke = false;
  if (typeof source === 'string') {
    url = source;
    // Fetch ourselves so we can give precise errors (404s, HTML fallbacks, CORS).
    let res: Response;
    try {
      res = await fetch(url, { mode: 'cors' });
    } catch {
      throw new Error(`Could not download the model from ${url}. The server may be offline or block cross-origin requests (CORS).`);
    }
    if (!res.ok) throw new Error(`Model not found (HTTP ${res.status}) at ${url}.`);
    if ((res.headers.get('content-type') ?? '').includes('text/html')) {
      throw new Error(`${url} returned a web page instead of a model — check the file path (files go in public/models/).`);
    }
    const buffer = await readWithProgress(res, onProgress);
    source = new Blob([buffer]);
    url = URL.createObjectURL(source);
    revoke = true;
  } else {
    if (source instanceof File && !/\.(vrm|glb)$/i.test(source.name)) {
      throw new Error(`"${source.name}" is not a .vrm file. Export your avatar as VRM (VRoid Studio: Export → VRM).`);
    }
    if (source.size > 300 * 1024 * 1024) throw new Error('This model is larger than 300 MB — reduce texture sizes before loading.');
    url = URL.createObjectURL(source);
    revoke = true;
  }

  try {
    const gltf = await loader.loadAsync(url, (e) => {
      if (e.total) onProgress?.(e.loaded / e.total);
    });
    const vrm = gltf.userData.vrm as VRM | undefined;
    if (!vrm) {
      throw new Error('The file loaded as glTF but contains no VRM data (missing VRMC_vrm / VRM extension).');
    }
    if (!vrm.humanoid) throw new Error('This VRM has no humanoid definition and cannot be animated.');

    // Optimisations recommended by three-vrm.
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons(gltf.scene);
    VRMUtils.rotateVRM0(vrm); // VRM 0.x faces -Z; normalise to +Z.

    vrm.scene.traverse((obj) => {
      // Skinned meshes are often culled incorrectly once bones move.
      obj.frustumCulled = false;
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return vrm;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Failed to fetch|NetworkError|404/.test(msg)) throw new Error(`Could not download the model (${msg}). Check the URL and CORS headers.`);
    if (/Unexpected token|JSON|magic/i.test(msg)) throw new Error('The file is corrupted or not a binary glTF/VRM.');
    throw e;
  } finally {
    if (revoke) URL.revokeObjectURL(url);
  }
}

async function readWithProgress(res: Response, onProgress?: LoadProgress): Promise<ArrayBuffer> {
  const total = Number(res.headers.get('content-length')) || 0;
  if (!res.body || !total || !onProgress) return res.arrayBuffer();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress(Math.min(1, loaded / total));
  }
  const out = new Uint8Array(loaded);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out.buffer;
}
