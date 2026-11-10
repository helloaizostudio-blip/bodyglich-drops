import { useSyncExternalStore } from "react";

export type ClockSnapshot = { time: number; playing: boolean };

/**
 * Playback position of the in-browser preview. It lives outside React state so the player can
 * advance it every animation frame, while the UI (scrubber, playhead) only re-renders about ten
 * times a second through `useClock`.
 */
export class PreviewClock {
  /** Precise position in seconds. Read this from animation-frame code. */
  now = 0;
  playing = false;
  duration = 0;
  private snapshot: ClockSnapshot = { time: 0, playing: false };
  private listeners = new Set<() => void>();
  private lastPublish = 0;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  publish() {
    this.lastPublish = performance.now();
    if (this.snapshot.time === this.now && this.snapshot.playing === this.playing) return;
    this.snapshot = { time: this.now, playing: this.playing };
    for (const listener of this.listeners) listener();
  }

  seek(time: number) {
    this.now = Math.min(this.duration, Math.max(0, time));
    this.publish();
  }

  setPlaying(playing: boolean) {
    this.playing = playing && this.duration > 0;
    this.publish();
  }

  setDuration(duration: number) {
    this.duration = Math.max(0, duration);
    if (this.now > this.duration) this.now = this.duration;
    if (this.duration === 0) this.playing = false;
    this.publish();
  }

  /** Moves forward by `seconds`; stops at the end. */
  advance(seconds: number) {
    this.now = Math.min(this.duration, this.now + Math.max(0, seconds));
    if (this.now >= this.duration) this.playing = false;
    if (!this.playing || performance.now() - this.lastPublish >= 100) this.publish();
  }
}

export function useClock(clock: PreviewClock): ClockSnapshot {
  return useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getSnapshot);
}
