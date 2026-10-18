import React, {useEffect, useState} from 'react';
import styles from './styles.module.css';

const BASE = 'https://abacus.jasoncameron.dev';
const NAMESPACE = 'learnwith-mahidhardurga-in';
const DEFAULT_KEY = 'visitors';
const FORMAT = new Intl.NumberFormat('en-IN');

const isLocal = (): boolean => ['localhost', '127.0.0.1'].includes(window.location.hostname);

/** Fetches the "readers so far" total. Returns null on any failure so the badge stays hidden. */
async function loadCount(): Promise<number | null> {
  try {
    const query = new URLSearchParams(window.location.search);
    // On localhost a separate test key can be counted with ?counterkey=NAME; the real number is never touched.
    const key = isLocal() ? query.get('counterkey') || DEFAULT_KEY : DEFAULT_KEY;

    // The real counter uses the flag "counted"; each local test key gets its own flag so tests behave the same way.
    const flag = isLocal() ? `counted-${key}` : 'counted';

    let counted = false;
    try {
      counted = window.localStorage.getItem(flag) === '1';
    } catch {
      // localStorage can throw when blocked
    }
    const automated = Boolean((navigator as Navigator & {webdriver?: boolean}).webdriver);
    const hit = !counted && !automated && (!isLocal() || query.has('counterkey'));

    const res = await fetch(`${BASE}/${hit ? 'hit' : 'get'}/${NAMESPACE}/${encodeURIComponent(key)}`);
    if (!res.ok && res.status !== 404) return null;
    const value = res.ok ? ((await res.json()) as {value?: number}).value : 0;
    if (typeof value !== 'number') return null;

    // Remember that this browser was counted, so refreshing never inflates the number.
    if (hit) {
      try {
        window.localStorage.setItem(flag, '1');
      } catch {
        // ignore
      }
    }
    return value;
  } catch {
    return null;
  }
}

/** A small "N readers so far" pill for the navbar. Counts each browser once, and stays hidden if the counter is unreachable. */
export default function VisitorCount(): React.JSX.Element {
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCount().then((v) => {
      if (!cancelled) setValue(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.badge} hidden={value === null}>
      <span aria-hidden="true">👥</span>
      <span>
        <span className={styles.number}>{value === null ? '' : FORMAT.format(value)}</span>
        <span className={styles.suffix}> {value === 1 ? 'reader' : 'readers'} so far</span>
      </span>
    </div>
  );
}
