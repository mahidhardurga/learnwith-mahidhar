import React, {useState} from 'react';
import clsx from 'clsx';
import styles from './lab.module.css';

type CbState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

const WINDOW = 10; // sliding-window-size (count based)
const MIN_CALLS = 5; // minimum-number-of-calls
const THRESHOLD = 50; // failure-rate-threshold, percent
const WAIT = 5; // wait-duration-in-open-state, seconds
const TRIALS = 3; // permitted-number-of-calls-in-half-open-state

interface Cb {
  state: CbState;
  window: boolean[]; // true = failure
  openedAt: number;
  trial: boolean[];
  now: number;
  rejected: number;
  log: string[];
}

const fresh = (): Cb => ({state: 'CLOSED', window: [], openedAt: 0, trial: [], now: 0, rejected: 0, log: []});
const rate = (w: boolean[]): number => (w.length === 0 ? 0 : Math.round((w.filter(Boolean).length / w.length) * 100));

function tick(cb: Cb, seconds: number): Cb {
  const now = cb.now + seconds;
  if (cb.state === 'OPEN' && now - cb.openedAt >= WAIT) {
    return {...cb, now, state: 'HALF_OPEN', trial: [], log: [...cb.log, `t=${now}s wait elapsed: HALF_OPEN`]};
  }
  return {...cb, now};
}

function call(cb: Cb, fails: boolean): Cb {
  if (cb.state === 'OPEN') {
    return {...cb, rejected: cb.rejected + 1, log: [...cb.log, `t=${cb.now}s call rejected instantly (CallNotPermittedException)`]};
  }
  if (cb.state === 'HALF_OPEN') {
    const trial = [...cb.trial, fails];
    if (trial.length < TRIALS) return {...cb, trial, log: [...cb.log, `t=${cb.now}s trial call ${fails ? 'failed' : 'succeeded'} (${trial.length}/${TRIALS})`]};
    if (rate(trial) >= THRESHOLD) {
      return {...cb, state: 'OPEN', openedAt: cb.now, trial: [], log: [...cb.log, `t=${cb.now}s trials failed ${rate(trial)}%: back to OPEN`]};
    }
    return {...cb, state: 'CLOSED', window: [], trial: [], log: [...cb.log, `t=${cb.now}s trials ok: CLOSED, window reset`]};
  }
  const window = [...cb.window, fails].slice(-WINDOW);
  const next = {...cb, window, log: [...cb.log, `t=${cb.now}s call ${fails ? 'failed' : 'succeeded'}`]};
  if (window.length >= MIN_CALLS && rate(window) >= THRESHOLD) {
    return {...next, state: 'OPEN', openedAt: cb.now, log: [...next.log, `failure rate ${rate(window)}% >= ${THRESHOLD}%: OPEN for ${WAIT}s`]};
  }
  return next;
}

/** A model of Resilience4j's count-based circuit breaker: window 10, min 5 calls, 50% threshold, 5s open, 3 trial calls. */
export function CircuitBreakerLab(): React.JSX.Element {
  const [cb, setCb] = useState<Cb>(fresh);
  const [healthy, setHealthy] = useState(true);

  const send = (n: number) =>
    setCb((c) => {
      let cur = c;
      for (let i = 0; i < n; i++) cur = call(cur, !healthy);
      return cur;
    });
  const wait = (s: number) => setCb((c) => tick(c, s));
  const remaining = cb.state === 'OPEN' ? Math.max(0, WAIT - (cb.now - cb.openedAt)) : 0;

  return (
    <section className={styles.panel} aria-label="Circuit breaker lab">
      <div className={styles.panelHead}>
        <strong>Circuit breaker lab</strong>
        <span className={styles.score}>window {WINDOW} · min {MIN_CALLS} calls · opens at {THRESHOLD}% · stays open {WAIT}s</span>
      </div>
      <div className={styles.controls}>
        <label className={styles.toggle}>
          <input type="checkbox" checked={healthy} onChange={(e) => setHealthy(e.target.checked)} /> Downstream service is healthy
        </label>
        <button className={styles.primary} type="button" onClick={() => send(1)}>Send 1 call</button>
        <button className={styles.ghost} type="button" onClick={() => send(5)}>Send 5 calls</button>
        <button className={styles.ghost} type="button" onClick={() => wait(1)}>Wait 1s</button>
        <button className={styles.ghost} type="button" onClick={() => wait(5)}>Wait 5s</button>
        <button className={styles.ghost} type="button" onClick={() => setCb(fresh())}>Reset</button>
      </div>
      <p className={styles.hint}>Untick "healthy", send a few calls and watch the breaker open. Tick it again, wait out the open period and send trial calls.</p>

      <div className={styles.services}>
        <div className={clsx(styles.service, cb.state === 'CLOSED' && styles.serviceGood, cb.state === 'OPEN' && styles.serviceBad, cb.state === 'HALF_OPEN' && styles.serviceWarn)}>
          <span>Breaker state</span>
          <b>{cb.state}{remaining > 0 ? ` (${remaining}s left)` : ''}</b>
        </div>
        <div className={styles.service}>
          <span>Failure rate in window</span>
          <b>{rate(cb.window)}% of {cb.window.length}</b>
        </div>
        <div className={styles.service}>
          <span>Calls rejected without trying</span>
          <b>{cb.rejected}</b>
        </div>
      </div>

      <div className={styles.laneBody} aria-label="Sliding window of recent calls">
        {cb.window.length === 0 && <span className={styles.empty}>window is empty</span>}
        {cb.window.map((f, i) => (
          <span key={i} className={styles.rec} style={{background: f ? '#e03131' : '#2f9e44'}} title={f ? 'failure' : 'success'}>{f ? '✕' : '✓'}</span>
        ))}
      </div>

      <ol className={styles.timeline} aria-live="polite">
        {cb.log.slice(-6).map((l, i) => (
          <li key={`${cb.log.length}-${i}`}>{l}</li>
        ))}
      </ol>
    </section>
  );
}
