import {useCallback, useMemo, useSyncExternalStore} from 'react';

const KEY = 'lw-progress-v1';
const EVENT = 'lw-progress-change';

function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? '[]';
  } catch {
    return '[]';
  }
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENT, callback);
  };
}

function parse(raw: string): string[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Reading progress, kept only in this browser's localStorage (never sent anywhere). */
export function useProgress() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => '[]');
  const done = useMemo(() => new Set(parse(raw)), [raw]);

  const toggle = useCallback((path: string) => {
    const next = new Set(parse(readRaw()));
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    try {
      window.localStorage.setItem(KEY, JSON.stringify([...next]));
    } catch {
      /* storage unavailable (private mode): progress simply is not remembered */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return {done, toggle};
}
