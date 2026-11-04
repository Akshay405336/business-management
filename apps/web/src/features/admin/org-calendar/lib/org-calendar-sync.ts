type OrgCalendarSyncListener = () => void;

let generation = 0;
const listeners = new Set<OrgCalendarSyncListener>();

export function getOrgCalendarSyncGeneration(): number {
  return generation;
}

/** Call after organisation calendar mutations so task and attendance views refresh. */
export function notifyOrgCalendarChanged(): void {
  generation += 1;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeOrgCalendarSync(listener: OrgCalendarSyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
