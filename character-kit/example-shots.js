// BODY GLITCH host v2: motion test. Shows the new Host + Buddy (src/core/host.js), the studio (src/core/studio.js) and
// the motion kit (src/core/motion.js). Copy the patterns into your own shots.
import * as THREE from 'three';
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import { Host, Buddy } from './core/host.js';
import { studio } from './core/studio.js';
import { track, drag, alive, breathe, mouthFor, hop, spring, bump, wobble, drift, blink, popIn } from './core/motion.js';
import { pill } from './core/look2d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(30);
  const LOOK = { aperture: 0.0028, maxblur: 0.011, bloom: 0.32, bloomThreshold: 0.82, vignette: 0.4, warm: 0.015, exposure: 1.02 };

  const ST = studio(E), host = new Host({}), blip = new Buddy({});
  ST.scene.add(host.group, blip.group);
  const FACE = V3(0, 1.36, 0.05);
  const place = (hx = 0, bx = 9, hturn = 0) => { host.group.position.set(hx, 0, 0); host.group.rotation.y = hturn; host.hips.position.y = 0.72; blip.group.position.set(bx, 0, 0.1); };
  const shoot = (focus, extra = {}) => E.render(ST.scene, cam, { ...LOOK, focus, ...extra });
  const REST = { shL: [4, 0, 9], shR: [4, 0, 9], elL: 16, elR: 16, smile: 0.6 };

  // 1 · hello: push in on a full-body shot, anticipation → big wave → settle
  { const st = cut(0);
    const act = track([
      { t: 0, pose: { ...REST, spine: [0, -14, 0], head: [4, -18, 0], look: [-0.6, -0.2], smile: 0.2 } },
      { t: 0.25, d: 0.45, pose: { ...REST, spine: [-2, 0, 0], head: [-3, 0, 0], brow: [0.7, 0], lid: -0.25, smile: 0.9 } },                       // notices the camera
      { t: 0.6, d: 0.22, ease: eio, pose: { ...REST, spine: [4, 0, -3], head: [5, 0, 0], shR: [0, 0, 2], elR: 30, brow: [0.2, 0], smile: 0.9, squash: -0.05 } },   // dips first (anticipation)
      { t: 0.82, d: 0.55, pose: { ...REST, spine: [-3, 0, 5], head: [-4, 0, -6], shR: [10, 0, 142], elR: 62, brow: [0.8, 0], smile: 1, lid: -0.1, squash: 0.04 } }, // arm up
      { t: 1.4, d: 0.3, pose: { ...REST, spine: [-3, 0, 5], head: [-4, 0, -6], shR: [10, 0, 142], elR: 62, brow: [0.8, 0], smile: 1, squash: 0 } },
      { t: 2.05, d: 0.6, pose: { ...REST, spine: [0, 0, 0], head: [-2, 0, 0], brow: [0.3, 0], smile: 0.8 } },
    ]);
    add({ id: 'S01', at: st, note: 'full body push-in: notice the camera, dip, wave, settle', draw(lt, d, t, blit) {
      place(0); const p = drag(act, lt), wav = bump(seg(lt, 0.95, 2.1));
      p.elR = (p.elR ?? 12) + Math.sin((lt - 0.95) * 13) * 22 * wav; p.shR = [p.shR[0], p.shR[1], p.shR[2] + Math.sin((lt - 0.95) * 13 + 0.8) * 7 * wav];
      host.pose(alive(p, t, { talk: mouthFor(t, 0) })); breathe(host, t);
      cam.position.copy(lerpV(V3(0.5, 1.15, 3.9), V3(0.2, 1.18, 3.05), eio(lt / d))); cam.lookAt(0, 0.9, 0); shoot(cam.position.distanceTo(V3(0, 1.1, 0))); blit();
    } });
    cue(st + 0.82, 'whoosh'); cue(st + 0.3, 'pop', { gain: 0.5 }); }

  // 2 · the sculpt: slow orbit at chest height, he pushes his glasses up
  { const st = cut(1);
    const act = track([
      { t: 0, pose: { ...REST, head: [0, 14, 0], smile: 0.5 } },
      { t: 0.3, d: 0.6, pose: { ...REST, head: [3, 8, 2], shR: [62, 0, 22], elR: 138, smile: 0.3, brow: [-0.2, 0] } },                               // hand to the glasses
      { t: 0.95, d: 0.22, pose: { ...REST, head: [-3, 8, 2], shR: [66, 0, 22], elR: 142, smile: 0.4, brow: [0.5, 0], lid: 0.3 } },                   // push
      { t: 1.3, d: 0.6, pose: { ...REST, head: [-2, -10, -2], smile: 0.8, brow: [0.2, 0] } },
    ]);
    add({ id: 'S02', at: st, note: 'orbit close on the upper body, pushes glasses up', draw(lt, d, t, blit) {
      place(0); host.pose(alive(drag(act, lt), t, { seed: 2, talk: mouthFor(t, 1) })); breathe(host, t);
      const a = lerp(-0.55, 0.5, eio(lt / d)); cam.position.set(Math.sin(a) * 1.75, 1.3, Math.cos(a) * 1.75); cam.lookAt(0, 1.17, 0); shoot(1.62, { aperture: 0.004 }); blit();
    } });
    cue(st, 'whoosh'); }

  // 3 · the face: surprise → suspicion → delight
  { const st = cut(2);
    const act = track([
      { t: 0, pose: { ...REST, smile: 0.5 } },
      { t: 0.15, d: 0.35, pose: { ...REST, head: [-7, 0, 0], brow: [1, 0.3], lid: -0.4, mouth: 0.75, smile: 0, headSquash: 0.07 } },
      { t: 0.95, d: 0.4, pose: { ...REST, head: [5, -13, 7], brow: { L: [-0.7, -0.8], R: [0.9, 0] }, lid: 0.42, look: [0.7, 0], smile: -0.5, headSquash: -0.03 } },
      { t: 1.8, d: 0.45, pose: { ...REST, head: [-4, 5, -5], brow: [0.6, 0.2], lid: 0.5, smile: 1, mouth: 0.5, headSquash: 0.03 } },
    ]);
    add({ id: 'S03', at: st, note: 'face close-up: surprised, suspicious, delighted', draw(lt, d, t, blit) {
      place(0); host.pose(alive(drag(act, lt), t, { seed: 4, amt: 0.6 })); breathe(host, t);
      cam.position.copy(lerpV(V3(-0.2, 1.4, 1.2), V3(0.14, 1.38, 0.98), eio(lt / d))); cam.lookAt(0, 1.35, 0.03); shoot(cam.position.distanceTo(FACE), { aperture: 0.005 }); blit();
    } });
    cue(st + 0.15, 'pop'); cue(st + 0.95, 'pop', { gain: 0.4 }); cue(st + 1.8, 'pop', { gain: 0.7 }); }

  // 4 · Blip arrives: two hops in from the right, a landing jiggle, a wave. The host does a take and points.
  { const st = cut(3), H1 = 0.1, H2 = 0.95, BX = 0.33;
    const act = track([
      { t: 0, pose: { ...REST, head: [0, 0, 0] } },
      { t: 0.25, d: 0.3, pose: { ...REST, spine: [-4, 14, -3], head: [6, 30, 0], look: [0.8, -0.5], brow: [1, 0.2], lid: -0.4, mouth: 0.5, smile: 0, shL: [8, 0, 26], shR: [8, 0, 26], elL: 40, elR: 40, squash: 0.03 } },
      { t: 1.25, d: 0.5, pose: { ...REST, spine: [3, 16, -4], head: [14, 30, 4], look: [0.6, -0.7], brow: [0.5, 0], smile: 1, shR: [38, 0, 30], elR: 48, shL: [4, 0, 12], elL: 30 } },
    ]);
    add({ id: 'S04', at: st, note: 'two-shot: Blip hops in, lands, waves; host reacts and presents him', draw(lt, d, t, blit) {
      place(-0.24);
      const a = hop(lt - H1, { x0: 1.5, x1: 0.9, h: 0.34 }), b = hop(lt - H2, { x0: 0.9, x1: BX, h: 0.42 }), h = lt < H2 ? a : b, landed = b.land;
      const wave = bump(seg(landed, 0.35, 1.5));
      blip.group.position.set(h.x, 0, 0.12);
      blip.set({ y: h.y, squash: h.squash, turn: lerp(-55, -24, eo(seg(lt, 0.9, 1.6))), tilt: [h.air * 9, 0], armL: 14 + h.air * 60 + wave * (128 + Math.sin(landed * 15) * 22), armR: 14 + h.air * 60,
        lean: (landed > 0 ? wobble(landed / 0.9, 2.4, 3.5) * 34 : -h.air * 24) + drift(t, 3, 1.2) * 4, lid: Math.max(blink(t, 5), 0), look: [-0.5 * seg(landed, 0, 0.3), 0.5 * seg(landed, 0, 0.3)], mouth: h.air * 0.6 + wave * 0.5, glow: 1.6 + bump(seg(landed, 0, 0.5)) * 3 });
      host.pose(alive(drag(act, lt), t, { seed: 6, talk: mouthFor(t, 3) })); breathe(host, t);
      cam.position.copy(lerpV(V3(0.2, 0.95, 4.3), V3(0.12, 0.9, 3.9), eio(lt / d))); cam.lookAt(0.05, 0.62, 0); shoot(cam.position.distanceTo(V3(0, 1, 0))); blit();
    } });
    cue(st + H1 + 0.16 + 0.55, 'pop', { gain: 0.6 }); cue(st + H2 + 0.16 + 0.55, 'pop'); cue(st + H2, 'whoosh'); }

  // 5 · sign-off: both face the camera, Blip bounces, the host opens his arms; slow pull-back
  { const st = cut(4);
    const act = track([
      { t: 0, pose: { ...REST, spine: [0, 8, 0], head: [4, 14, 0], smile: 0.9 } },
      { t: 0.2, d: 0.25, ease: eio, pose: { ...REST, spine: [5, 0, 0], head: [6, 0, 0], shL: [10, 0, 4], shR: [10, 0, 4], elL: 50, elR: 50, smile: 0.9, squash: -0.05 } },
      { t: 0.45, d: 0.55, pose: { ...REST, spine: [-4, 0, 0], head: [-5, 0, 0], shL: [34, 0, 38], shR: [34, 0, 38], elL: 78, elR: 78, brow: [0.8, 0], smile: 1, mouth: 0.4, squash: 0.03 } },
      { t: 1.9, d: 0.7, pose: { ...REST, spine: [0, 0, 0], head: [-2, 0, 3], shL: [6, 0, 14], shR: [6, 0, 14], elL: 20, elR: 20, smile: 1, brow: [0.3, 0] } },
    ]);
    add({ id: 'S05', at: st, note: 'sign-off two-shot: arms open, Blip bounces, pull back', draw(lt, d, t, blit) {
      place(-0.24); const per = 0.78, n = Math.floor((lt - 0.3) / per), h = lt > 0.3 && n < 3 ? hop(lt - 0.3 - n * per, { d: 0.42, h: 0.2 + 0.08 * (n === 1), pre: 0.12 }) : hop(lt - 0.3 - 2 * per, { d: 0.42, h: 0.2, pre: 0.12 });
      blip.group.position.set(0.33, 0, 0.12);
      blip.set({ y: h.y, squash: h.squash, turn: -8, armL: 14 + h.air * 130, armR: 14 + h.air * 130, lean: h.land > 0 ? wobble(h.land / 0.8, 2.4, 3.5) * 30 : -h.air * 22, lid: -h.air * 0.2, mouth: h.air * 0.9, look: [-0.2, 0.2], glow: 1.6 + h.air * 2.5 });
      host.pose(alive(drag(act, lt), t, { seed: 8, talk: mouthFor(t, 4) })); breathe(host, t);
      cam.position.copy(lerpV(V3(0.02, 0.9, 3.9), V3(0.1, 0.95, 4.35), eio(lt / d))); cam.lookAt(0.05, 0.62, 0); shoot(cam.position.distanceTo(V3(0, 1, 0))); blit();
      pill('HOST V2', 800, 520, popIn(lt - 0.6), '#FFD43B', 'rgba(12,14,20,0.8)', 58);
    } });
    cue(st, 'whoosh'); cue(st + 0.6, 'pop'); }

  return { shots: S, cues: CUES };
}
