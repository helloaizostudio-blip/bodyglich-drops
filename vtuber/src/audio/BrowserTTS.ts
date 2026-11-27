import type { Viseme } from '../expressions/presets';

/**
 * Browser speechSynthesis wrapper.
 *
 * Limitation: browsers do not expose TTS audio to Web Audio, so lip-sync is
 * *approximated* from word-boundary events and a synthetic syllable envelope.
 * For accurate lip-sync, route a real TTS provider's audio through the
 * WebSocket bridge (see server/bridge.mjs) — it then flows through the
 * analyser like any other source.
 */
export class BrowserTTS {
  speaking = false;
  private t = 0;
  private wordPulse = 0;
  private vowel: Viseme = 'aa';
  private onState: (speaking: boolean) => void;

  constructor(onState: (speaking: boolean) => void) {
    this.onState = onState;
  }

  get supported() {
    return 'speechSynthesis' in window;
  }

  voices(): SpeechSynthesisVoice[] {
    return this.supported ? speechSynthesis.getVoices() : [];
  }

  speak(text: string, opts: { voiceURI?: string; rate?: number; pitch?: number } = {}) {
    if (!this.supported) throw new Error('Speech synthesis is not supported in this browser.');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = this.voices().find((v) => v.voiceURI === opts.voiceURI);
    if (voice) u.voice = voice;
    u.rate = opts.rate ?? 1;
    u.pitch = opts.pitch ?? 1.25;
    u.onstart = () => this.set(true);
    u.onend = () => this.set(false);
    u.onerror = () => this.set(false);
    u.onboundary = (e) => {
      this.wordPulse = 1;
      const word = text.slice(e.charIndex, e.charIndex + (e.charLength || 6)).toLowerCase();
      const m = word.match(/[aeiouy]/);
      const map: Record<string, Viseme> = { a: 'aa', e: 'ee', i: 'ih', o: 'oh', u: 'ou', y: 'ih' };
      this.vowel = m ? map[m[0]] : 'aa';
    };
    speechSynthesis.speak(u);
  }

  stop() {
    if (this.supported) speechSynthesis.cancel();
    this.set(false);
  }

  private set(v: boolean) {
    if (this.speaking !== v) {
      this.speaking = v;
      this.onState(v);
    }
  }

  /** Synthetic mouth envelope while speaking. */
  frame(dt: number): { level: number; viseme: Viseme } | null {
    if (!this.speaking) return null;
    this.t += dt;
    this.wordPulse = Math.max(0, this.wordPulse - dt * 2.5);
    const syllable = Math.max(0, Math.sin(this.t * 22)) * 0.55 + Math.max(0, Math.sin(this.t * 13.7)) * 0.3;
    return { level: Math.min(1, 0.25 + syllable * 0.6 + this.wordPulse * 0.3), viseme: this.vowel };
  }
}
