import { describeError } from '../utils/errors';

type Listener = () => void;

/**
 * Central Web Audio graph.
 *
 *   mic ──────────────┐
 *   <audio> file ─────┼──► analyser ──► (lip-sync)
 *   remote voice PCM ─┘        └──────► speakers (playback sources only)
 *
 * Every voice source — microphone, uploaded clip, or a future AI voice
 * stream — goes through the same analyser so lip-sync is source-agnostic.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  private playbackGain: GainNode | null = null;
  private recordDest: MediaStreamAudioDestinationNode | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private mediaEl: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private remoteCursor = 0;
  private remoteSources = new Set<AudioBufferSourceNode>();
  private listeners = new Set<Listener>();
  micDeviceId: string | undefined;

  get micActive() {
    return !!this.micStream;
  }
  get playing() {
    return (!!this.mediaEl && !this.mediaEl.paused) || this.remoteSources.size > 0;
  }

  onChange(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.listeners.forEach((l) => l());
  }

  /** Must be called from a user gesture the first time (autoplay policy). */
  async ensureContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) throw new Error('Web Audio API is not supported in this browser.');
      this.ctx = new Ctx({ latencyHint: 'interactive' });
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.35;
      this.playbackGain = this.ctx.createGain();
      this.playbackGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    return this.ctx;
  }

  async listMicrophones(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'audioinput');
  }

  async startMic(deviceId?: string): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access requires a secure context (https:// or localhost).');
    }
    const ctx = await this.ensureContext();
    this.stopMic();
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (e) {
      throw new Error(`Microphone: ${describeError(e)}`);
    }
    this.micDeviceId = deviceId;
    this.micSource = ctx.createMediaStreamSource(this.micStream);
    this.micSource.connect(this.analyser!); // analysed only — never routed to speakers (no feedback)
    if (this.recordDest) this.micSource.connect(this.recordDest);
    this.micStream.getAudioTracks()[0]?.addEventListener('ended', () => this.stopMic());
    this.emit();
  }

  stopMic() {
    this.micSource?.disconnect();
    this.micSource = null;
    this.micStream?.getTracks().forEach((t) => t.stop());
    const wasActive = !!this.micStream;
    this.micStream = null;
    if (wasActive) this.emit();
  }

  /** Play an audio file/URL through the lip-sync analyser. */
  async playClip(src: string | Blob): Promise<void> {
    const ctx = await this.ensureContext();
    this.stopClip();
    const el = new Audio();
    el.crossOrigin = 'anonymous';
    el.src = typeof src === 'string' ? src : URL.createObjectURL(src);
    el.addEventListener('ended', () => this.emit());
    el.addEventListener('pause', () => this.emit());
    el.addEventListener('play', () => this.emit());
    this.mediaEl = el;
    this.mediaSource = ctx.createMediaElementSource(el);
    this.mediaSource.connect(this.analyser!);
    this.mediaSource.connect(this.playbackGain!);
    try {
      await el.play();
    } catch (e) {
      throw new Error(`Playback failed: ${describeError(e)}`);
    }
  }

  stopClip() {
    if (this.mediaEl) {
      this.mediaEl.pause();
      if (this.mediaEl.src.startsWith('blob:')) URL.revokeObjectURL(this.mediaEl.src);
    }
    this.mediaSource?.disconnect();
    this.mediaSource = null;
    this.mediaEl = null;
    this.emit();
  }

  /**
   * Queue an encoded audio chunk (wav/mp3/ogg) from a remote voice source —
   * e.g. AI text-to-speech relayed by the backend bridge. Chunks are played
   * back-to-back without gaps.
   */
  async enqueueRemoteAudio(data: ArrayBuffer): Promise<void> {
    const ctx = await this.ensureContext();
    const buffer = await ctx.decodeAudioData(data.slice(0));
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.analyser!);
    src.connect(this.playbackGain!);
    const start = Math.max(ctx.currentTime + 0.02, this.remoteCursor);
    src.start(start);
    this.remoteCursor = start + buffer.duration;
    this.remoteSources.add(src);
    src.onended = () => {
      this.remoteSources.delete(src);
      this.emit();
    };
    this.emit();
  }

  stopRemoteAudio() {
    this.remoteSources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    this.remoteSources.clear();
    this.remoteCursor = 0;
    this.emit();
  }

  /**
   * Audio for recordings: microphone + clip/remote playback mixed together.
   * The mic goes only into the recording, never to the speakers.
   */
  async getRecordingStream(): Promise<MediaStream> {
    const ctx = await this.ensureContext();
    if (!this.recordDest) {
      this.recordDest = ctx.createMediaStreamDestination();
      this.playbackGain!.connect(this.recordDest);
      this.micSource?.connect(this.recordDest);
    }
    return this.recordDest.stream;
  }

  setVolume(v: number) {
    if (this.playbackGain) this.playbackGain.gain.value = v;
  }

  dispose() {
    this.stopMic();
    this.stopClip();
    this.stopRemoteAudio();
    void this.ctx?.close();
    this.ctx = null;
  }
}

export const audioEngine = new AudioEngine();
