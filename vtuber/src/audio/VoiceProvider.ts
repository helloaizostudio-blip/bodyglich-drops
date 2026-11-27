/**
 * Contract for plugging an AI voice assistant into the avatar.
 *
 * The browser never talks to an AI vendor directly — API keys must stay on a
 * server. The intended flow is:
 *
 *   viewer chat / mic ─► your backend (holds API keys)
 *                          ├─ LLM generates a reply (+ optional emotion tag)
 *                          └─ TTS renders audio
 *                        ─► WebSocket bridge ─► this app
 *                              { type: "expression", name: "happy" }
 *                              { type: "speak", audio: "<base64 wav/mp3>" }
 *                              { type: "speak", url: "https://…/reply.mp3" }
 *
 * `LiveClient` (src/livestream/LiveClient.ts) implements the receiving side.
 * A reference relay lives in server/bridge.mjs.
 */
export interface VoiceProvider {
  readonly name: string;
  /** Called when the avatar should say something. Resolve when audio is queued. */
  speak(text: string): Promise<void>;
  stop(): void;
}
