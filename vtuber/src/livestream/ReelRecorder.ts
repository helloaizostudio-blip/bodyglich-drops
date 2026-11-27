import type { AvatarEngine } from '../character/AvatarEngine';
import { audioEngine } from '../audio/AudioEngine';

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  extension: 'mp4' | 'webm';
  seconds: number;
}

const OUT_W = 1080;
const OUT_H = 1920;

/** Picks the best format this browser can record. MP4 uploads straight to Instagram. */
function pickMimeType(): { mime: string; ext: 'mp4' | 'webm' } {
  const candidates: [string, 'mp4' | 'webm'][] = [
    ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'mp4'],
    ['video/mp4;codecs=avc1,mp4a', 'mp4'],
    ['video/webm;codecs=vp9,opus', 'webm'],
    ['video/webm;codecs=vp8,opus', 'webm'],
    ['video/webm', 'webm'],
  ];
  for (const [mime, ext] of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) return { mime, ext };
  }
  throw new Error('This browser cannot record video. Try Chrome or Safari.');
}

/**
 * Records a vertical 9:16 reel (1080×1920, 30 fps) of the avatar plus the
 * microphone / playback audio. The centre of the 3D view is cropped to 9:16,
 * so frame the character with the camera presets before recording.
 */
export class ReelRecorder {
  private crop = document.createElement('canvas');
  private ctx2d: CanvasRenderingContext2D;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;
  private copy = (src: HTMLCanvasElement) => this.drawFrame(src);

  constructor(private engine: AvatarEngine) {
    this.crop.width = OUT_W;
    this.crop.height = OUT_H;
    this.ctx2d = this.crop.getContext('2d')!;
  }

  get recording() {
    return this.recorder?.state === 'recording';
  }

  private drawFrame(src: HTMLCanvasElement) {
    const sw = src.width;
    const sh = src.height;
    const target = OUT_W / OUT_H;
    let cw = sw;
    let ch = sh;
    if (sw / sh > target) cw = sh * target;
    else ch = sw / target;
    const sx = (sw - cw) / 2;
    const sy = (sh - ch) / 2;
    // Transparent backgrounds would become black in video; paint a backdrop first.
    this.ctx2d.fillStyle = '#1a1026';
    this.ctx2d.fillRect(0, 0, OUT_W, OUT_H);
    this.ctx2d.drawImage(src, sx, sy, cw, ch, 0, 0, OUT_W, OUT_H);
  }

  async start(): Promise<void> {
    if (this.recording) return;
    const { mime } = pickMimeType();
    const audio = await audioEngine.getRecordingStream();
    this.engine.afterRender.add(this.copy);
    const video = this.crop.captureStream(30);
    const stream = new MediaStream([...video.getVideoTracks(), ...audio.getAudioTracks()]);
    this.chunks = [];
    this.recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 160_000 });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size) this.chunks.push(e.data);
    };
    this.recorder.start(250);
    this.startedAt = performance.now();
  }

  elapsed() {
    return this.recording ? (performance.now() - this.startedAt) / 1000 : 0;
  }

  stop(): Promise<RecordingResult> {
    const rec = this.recorder;
    if (!rec) return Promise.reject(new Error('Not recording.'));
    const seconds = this.elapsed();
    return new Promise((resolve) => {
      rec.onstop = () => {
        this.engine.afterRender.delete(this.copy);
        rec.stream.getVideoTracks().forEach((t) => t.stop());
        const mimeType = rec.mimeType || 'video/webm';
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        resolve({ blob: new Blob(this.chunks, { type: mimeType }), mimeType, extension, seconds });
        this.recorder = null;
      };
      rec.stop();
    });
  }
}
