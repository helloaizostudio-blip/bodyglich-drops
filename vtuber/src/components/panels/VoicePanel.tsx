import { useEffect, useRef, useState } from 'react';
import { Card, Slider } from '../ui';
import { LevelMeter } from '../LevelMeter';
import { settings, status, toast } from '../../state/store';
import { useStore } from '../../state/createStore';
import { audioEngine } from '../../audio/AudioEngine';
import { withEngine } from '../../hooks/engine';
import { describeError } from '../../utils/errors';

export function VoicePanel() {
  const mic = useStore(status, (s) => s.micActive);
  const playing = useStore(status, (s) => s.audioPlaying);
  const tts = useStore(status, (s) => s.ttsSpeaking);
  const gain = useStore(settings, (s) => s.lipSyncGain);
  const thr = useStore(settings, (s) => s.vadThreshold);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [device, setDevice] = useState('');
  const [text, setText] = useState('Hi everyone! Welcome to the stream~ How is your day going?');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => setVoices(withEngine((e) => e.tts.voices()) ?? []);
    refresh();
    if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => {
      if ('speechSynthesis' in window) speechSynthesis.removeEventListener('voiceschanged', refresh);
    };
  }, []);

  const startMic = async (id?: string) => {
    try {
      await audioEngine.startMic(id || undefined);
      setDevices(await audioEngine.listMicrophones());
    } catch (e) {
      toast(describeError(e), 'error', 8000);
    }
  };

  return (
    <>
      <Card title="Microphone" right={<span className={`tag ${mic ? '' : 'miss'}`}>{mic ? 'live' : 'off'}</span>}>
        <div className="row">
          {mic ? (
            <button className="btn danger grow" onClick={() => audioEngine.stopMic()}>
              Stop microphone
            </button>
          ) : (
            <button className="btn primary grow" onClick={() => startMic(device)}>
              🎙️ Start microphone
            </button>
          )}
        </div>
        {devices.length > 1 && (
          <select
            value={device}
            onChange={(e) => {
              setDevice(e.target.value);
              void startMic(e.target.value);
            }}
            aria-label="Microphone device"
          >
            <option value="">Default device</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        )}
        <div className="lbl">
          Voice level <span>amber line = activity threshold</span>
        </div>
        <LevelMeter threshold={thr} />
        <Slider label="Lip-sync sensitivity" value={gain} min={0.5} max={3} format={(v) => `×${v.toFixed(1)}`} onChange={(v) => settings.set({ lipSyncGain: v })} />
        <Slider label="Voice activity threshold" value={thr} min={0.02} max={0.5} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => settings.set({ vadThreshold: v })} />
        <p className="hint">Mic audio is analysed locally only — it is never played back or uploaded.</p>
      </Card>

      <Card title="Audio clip playback">
        <div className="row">
          <button className="btn grow" onClick={() => fileRef.current?.click()}>
            ▶ Play audio file…
          </button>
          {playing && (
            <button className="btn danger" onClick={() => audioEngine.stopClip()}>
              Stop
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) audioEngine.playClip(f).catch((err) => toast(describeError(err), 'error'));
            e.target.value = '';
          }}
        />
        <p className="hint">Any mp3 / wav / ogg — e.g. pre-recorded lines or AI-generated speech. The mouth follows the audio.</p>
      </Card>

      <Card title="Text to speech (browser)">
        <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Text to speak" />
        {voices.length > 0 && (
          <select value={voice} onChange={(e) => setVoice(e.target.value)} aria-label="Voice">
            <option value="">Default voice</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        )}
        <div className="row">
          <button
            className="btn primary grow"
            disabled={!text.trim()}
            onClick={async () => {
              try {
                await audioEngine.ensureContext();
                withEngine((e) => e.tts.speak(text, { voiceURI: voice || undefined }));
              } catch (err) {
                toast(describeError(err), 'error');
              }
            }}
          >
            💬 Speak
          </button>
          {tts && (
            <button className="btn danger" onClick={() => withEngine((e) => e.tts.stop())}>
              Stop
            </button>
          )}
        </div>
        <p className="hint">
          Browsers don't expose speech-synthesis audio, so lip-sync here is <b>approximated</b> from word timing. For accurate lip-sync, send real
          TTS audio through the live bridge (Stream tab).
        </p>
      </Card>

      <Card title="AI voice assistant">
        <p>
          The app is ready to be driven by an AI: your <b>server</b> (which keeps API keys secret) generates replies + speech and pushes{' '}
          <code>{'{type:"speak", audio}'}</code> and <code>{'{type:"expression"}'}</code> messages over WebSocket. Audio flows through the same
          lip-sync analyser. See <code>server/bridge.mjs</code> and the README. No AI service is connected by default.
        </p>
      </Card>
    </>
  );
}
