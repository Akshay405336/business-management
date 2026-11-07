type LeaveDataListener = () => void;

const listeners = new Set<LeaveDataListener>();

export function notifyLeaveDataChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeLeaveDataChanged(listener: LeaveDataListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
