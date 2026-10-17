import React, {useState} from 'react';
import styles from './lab.module.css';

interface Bucket {
  tokens: number;
  now: number; // seconds of simulated time
  last: number;
  log: {t: number; allowed: boolean; tokens: number}[];
}

const fresh = (capacity: number): Bucket => ({tokens: capacity, now: 0, last: 0, log: []});

/** Lazy refill, exactly like the TokenBucket class on this page: tokens = min(capacity, tokens + elapsed * rate). */
function acquire(b: Bucket, capacity: number, rate: number): Bucket {
  const tokens = Math.min(capacity, b.tokens + (b.now - b.last) * rate);
  const allowed = tokens >= 1;
  const left = allowed ? tokens - 1 : tokens;
  return {...b, tokens: left, last: b.now, log: [...b.log, {t: b.now, allowed, tokens: left}].slice(-60)};
}

/** Fire requests and move a simulated clock to see bursts, steady-state rate and recovery. */
export function TokenBucketLab(): React.JSX.Element {
  const [capacity, setCapacity] = useState(5);
  const [rate, setRate] = useState(2);
  const [b, setB] = useState<Bucket>(() => fresh(5));

  const setCap = (v: number) => {
    setCapacity(v);
    setB(fresh(v));
  };
  const setRt = (v: number) => {
    setRate(v);
    setB(fresh(capacity));
  };
  const shown = Math.min(capacity, b.tokens + (b.now - b.last) * rate);
  const allowed = b.log.filter((l) => l.allowed).length;

  return (
    <section className={styles.panel} aria-label="Token bucket lab">
      <div className={styles.panelHead}>
        <strong>Token bucket lab</strong>
        <span className={styles.score}>clock: {b.now.toFixed(1)}s · {allowed} allowed · {b.log.length - allowed} rejected</span>
      </div>
      <div className={styles.controls}>
        <label className={styles.slider}>Capacity (burst size): <b>{capacity}</b>
          <input type="range" min={1} max={10} value={capacity} onChange={(e) => setCap(+e.target.value)} />
        </label>
        <label className={styles.slider}>Refill rate: <b>{rate} tokens/s</b>
          <input type="range" min={1} max={5} value={rate} onChange={(e) => setRt(+e.target.value)} />
        </label>
      </div>
      <div className={styles.controls}>
        <button className={styles.primary} type="button" onClick={() => setB((x) => acquire(x, capacity, rate))}>Send 1 request</button>
        <button
          className={styles.ghost}
          type="button"
          onClick={() =>
            setB((x) => {
              let cur = x;
              for (let i = 0; i < 10; i++) cur = acquire(cur, capacity, rate);
              return cur;
            })
          }>
          Burst of 10
        </button>
        <button className={styles.ghost} type="button" onClick={() => setB((x) => ({...x, now: x.now + 0.5}))}>Wait 0.5s</button>
        <button className={styles.ghost} type="button" onClick={() => setB((x) => ({...x, now: x.now + 1}))}>Wait 1s</button>
        <button className={styles.ghost} type="button" onClick={() => setB(fresh(capacity))}>Reset</button>
      </div>
      <p className={styles.hint}>Try a burst of 10: the first <code>capacity</code> pass, the rest get 429. Wait one second and send again: only <code>rate</code> requests pass.</p>

      <div className={styles.laneBody} aria-label="Tokens in the bucket">
        {Array.from({length: capacity}, (_, i) => {
          const fill = Math.max(0, Math.min(1, shown - i));
          return (
            <span key={i} className={styles.rec} style={{background: `color-mix(in srgb, var(--ifm-color-primary) ${Math.round(fill * 100)}%, var(--lw-surface-2))`}} title={`${fill.toFixed(2)} of a token`}>
              {fill >= 1 ? '●' : ''}
            </span>
          );
        })}
        <span className={styles.hint} style={{margin: 0}}>{shown.toFixed(2)} tokens</span>
      </div>

      <div className={styles.laneBody} style={{marginTop: '0.6rem'}} aria-label="Recent requests" aria-live="polite">
        {b.log.length === 0 && <span className={styles.empty}>no requests yet</span>}
        {b.log.map((l, i) => (
          <span key={i} className={styles.rec} style={{background: l.allowed ? '#2f9e44' : '#e03131'}} title={`t=${l.t}s ${l.allowed ? 'allowed' : '429 rejected'}`}>
            {l.allowed ? '✓' : '✕'}
          </span>
        ))}
      </div>
    </section>
  );
}
