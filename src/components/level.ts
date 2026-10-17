import {useCallback, useSyncExternalStore} from 'react';
import {LEVELS, relevance, PAGE_BY_PATH, type Level, type LevelPref, type Relevance} from '@site/src/data/levels';

const KEY = 'lw-level-v1';
const EVENT = 'lw-level-change';

function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? 'all';
  } catch {
    return 'all';
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

function normalise(raw: string): LevelPref {
  return raw === 'beginner' || raw === 'mid' || raw === 'senior' ? raw : 'all';
}

/** The experience level the visitor is preparing for. Kept only in this browser's localStorage. */
export function useLevel() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => 'all');
  const level = normalise(raw);

  const setLevel = useCallback((next: LevelPref) => {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* storage unavailable: the choice just is not remembered */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return {level, setLevel, chosen: level !== 'all', info: LEVELS.find((l) => l.id === level)};
}

/** Relevance of a page (by permalink) for a level preference; unknown pages count as core. */
export function pageRelevance(pref: LevelPref, path: string): Relevance {
  const meta = PAGE_BY_PATH[path];
  return meta ? relevance(pref, meta.level) : 'core';
}

export function pageLevel(path: string): Level | undefined {
  return PAGE_BY_PATH[path]?.level;
}
