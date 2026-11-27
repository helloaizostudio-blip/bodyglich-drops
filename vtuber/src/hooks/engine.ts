import type { AvatarEngine } from '../character/AvatarEngine';

/** The single engine instance, created by <Viewport/>. Panels call into it on user events only. */
export const engineRef: { current: AvatarEngine | null } = { current: null };

export function withEngine<T>(fn: (e: AvatarEngine) => T): T | undefined {
  return engineRef.current ? fn(engineRef.current) : undefined;
}
