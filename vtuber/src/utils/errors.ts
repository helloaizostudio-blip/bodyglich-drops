export function describeError(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
        return 'Permission denied. Allow access in your browser\'s site settings and try again.';
      case 'NotFoundError':
        return 'No matching device was found (is a microphone / camera connected?).';
      case 'NotReadableError':
        return 'The device is busy or blocked by another application.';
      case 'SecurityError':
        return 'Blocked by browser security. Use https:// or http://localhost.';
      default:
        return `${err.name}: ${err.message}`;
    }
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
