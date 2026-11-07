export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  if (error instanceof Error && /signal is aborted|request was aborted|aborted without reason/i.test(error.message)) {
    return true;
  }
  return false;
}
