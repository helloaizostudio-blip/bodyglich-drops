import { LiveClient, base64ToArrayBuffer, type LiveMessage } from './LiveClient';
import { audioEngine } from '../audio/AudioEngine';
import { settings, status, toast } from '../state/store';
import { createStore } from '../state/createStore';
import { withEngine } from '../hooks/engine';
import { describeError } from '../utils/errors';

export interface ChatLine {
  id: number;
  user: string;
  text: string;
}
export const chat = createStore<{ lines: ChatLine[] }>({ lines: [] });
let chatId = 0;

function handle(msg: LiveMessage) {
  switch (msg.type) {
    case 'expression':
      settings.set({ expression: msg.name, ...(msg.intensity != null ? { expressionIntensity: msg.intensity } : {}) });
      break;
    case 'speak':
      if (msg.audio) {
        audioEngine.enqueueRemoteAudio(base64ToArrayBuffer(msg.audio)).catch((e) => toast(`Remote audio: ${describeError(e)}`, 'error'));
      } else if (msg.url) {
        audioEngine.playClip(msg.url).catch((e) => toast(describeError(e), 'error'));
      } else if (msg.text) {
        withEngine((en) => en.tts.speak(msg.text!));
      }
      break;
    case 'stop':
      audioEngine.stopRemoteAudio();
      audioEngine.stopClip();
      withEngine((en) => en.tts.stop());
      break;
    case 'stats':
      settings.set({
        ...(typeof msg.viewers === 'number' ? { viewers: msg.viewers } : {}),
        ...(typeof msg.subscribers === 'number' ? { subscribers: msg.subscribers } : {}),
      });
      break;
    case 'title':
      settings.set({ streamTitle: msg.text.slice(0, 120) });
      break;
    case 'camera':
      settings.set({ cameraPreset: msg.preset });
      break;
    case 'chat': {
      const line = { id: ++chatId, user: msg.user.slice(0, 32), text: msg.text.slice(0, 280) };
      chat.set((s) => ({ lines: [...s.lines.slice(-5), line] }));
      window.setTimeout(() => chat.set((s) => ({ lines: s.lines.filter((l) => l.id !== line.id) })), 15000);
      break;
    }
  }
}

export const liveClient = new LiveClient({
  onMessage: handle,
  onStatus(s, detail) {
    status.set({ wsStatus: s });
    if (s === 'error' && detail) toast(detail, 'error');
    if (s === 'connected') toast('Connected to live bridge', 'success', 2500);
  },
});
