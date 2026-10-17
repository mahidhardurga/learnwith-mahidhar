import React, {useState} from 'react';
import clsx from 'clsx';
import styles from './lab.module.css';

interface Entry {
  key: string;
  hash: number;
}
interface MapState {
  table: Entry[][];
  tree: boolean[];
  size: number;
}
interface Trace {
  key: string;
  hashCode: number;
  spread: number;
  index: number;
  note: string;
}

const LOAD = 0.75;

function hashCodeOf(key: string): number {
  if (/^-?\d{1,9}$/.test(key)) return parseInt(key, 10); // behaves like an Integer key
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0; // String.hashCode
  return h;
}
const spread = (h: number): number => h ^ (h >>> 16);
const indexFor = (hash: number, n: number): number => (hash & (n - 1)) >>> 0;
const bin = (n: number, bits: number): string => (n >>> 0).toString(2).padStart(32, '0').slice(32 - bits);

const fresh = (): MapState => ({table: Array.from({length: 16}, () => []), tree: Array(16).fill(false), size: 0});

function resize(m: MapState): MapState {
  const n = m.table.length * 2;
  const table: Entry[][] = Array.from({length: n}, () => []);
  m.table.forEach((chain) => chain.forEach((e) => table[indexFor(e.hash, n)].push(e)));
  const tree = table.map((chain, i) => {
    const lo = i & (m.table.length - 1);
    return m.tree[lo] && chain.length > 6;
  });
  return {table, tree, size: m.size};
}

function put(m: MapState, key: string): {state: MapState; trace: Trace} {
  const hc = hashCodeOf(key);
  const hash = spread(hc);
  const idx = indexFor(hash, m.table.length);
  const trace: Trace = {key, hashCode: hc, spread: hash, index: idx, note: ''};
  const chain = m.table[idx];
  if (chain.some((e) => e.hash === hash && e.key === key)) {
    trace.note = 'Key already present: the value is replaced, size does not change.';
    return {state: m, trace};
  }
  const priorLength = chain.length;
  let state: MapState = {
    table: m.table.map((c, i) => (i === idx ? [...c, {key, hash}] : c)),
    tree: [...m.tree],
    size: m.size + 1,
  };
  trace.note = priorLength === 0 ? 'Empty bucket: new node stored.' : `Bucket already holds ${priorLength}: collision, node appended to the chain tail.`;
  if (priorLength >= 8) {
    if (m.table.length < 64) {
      state = resize(state);
      trace.note = `Chain would exceed 8 but the table has only ${m.table.length} buckets (< 64): resize instead of treeify.`;
      return {state, trace};
    }
    state.tree[idx] = true;
    trace.note = 'Chain exceeded 8 and the table has 64+ buckets: this bucket became a red-black tree.';
  }
  if (state.size > state.table.length * LOAD) {
    state = resize(state);
    trace.note += ` Size ${state.size} passed the threshold, so the table doubled to ${state.table.length}.`;
  }
  return {state, trace};
}

/** Type keys and watch them hash, collide, treeify and trigger a resize in a model of java.util.HashMap. */
export function HashMapLab(): React.JSX.Element {
  const [map, setMap] = useState<MapState>(fresh);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [key, setKey] = useState('apple');

  const add = (k: string) => {
    const clean = k.trim();
    if (!clean) return;
    const r = put(map, clean);
    setMap(r.state);
    setTrace(r.trace);
  };
  const addMany = (keys: string[]) => {
    let m = map;
    let t: Trace | null = null;
    keys.forEach((k) => {
      const r = put(m, k);
      m = r.state;
      t = r.trace;
    });
    setMap(m);
    setTrace(t);
  };
  const reset = () => {
    setMap(fresh());
    setTrace(null);
  };

  const n = map.table.length;
  const bits = Math.log2(n);
  const threshold = Math.floor(n * LOAD);
  const longest = Math.max(...map.table.map((c) => c.length));

  return (
    <section className={styles.panel} aria-label="HashMap lab">
      <div className={styles.panelHead}>
        <strong>HashMap lab</strong>
        <span className={styles.score}>capacity {n} · size {map.size} · resizes at &gt; {threshold}</span>
      </div>
      <form
        className={styles.controls}
        onSubmit={(e) => {
          e.preventDefault();
          add(key);
        }}>
        <input className={styles.input} value={key} onChange={(e) => setKey(e.target.value)} aria-label="Key to put" placeholder="a key, e.g. apple or 42" />
        <button className={styles.primary} type="submit">put(key)</button>
        <button type="button" className={styles.ghost} onClick={() => addMany(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen'])}>
          Add 13 words
        </button>
        <button type="button" className={styles.ghost} onClick={() => addMany(Array.from({length: 9}, (_, i) => String((i + 1) * n)))}>
          Force a collision pile-up
        </button>
        <button type="button" className={styles.ghost} onClick={reset}>Reset</button>
      </form>
      <p className={styles.hint}>Keys that look like numbers act as <code>Integer</code> keys; anything else uses <code>String.hashCode()</code>. Multiples of the capacity all land in bucket 0.</p>

      {trace && (
        <div className={styles.trace} aria-live="polite">
          <div className={styles.traceRow}><span>key</span><code>"{trace.key}"</code></div>
          <div className={styles.traceRow}><span>hashCode()</span><code>{trace.hashCode}</code></div>
          <div className={styles.traceRow}><span>h ^ (h &gt;&gt;&gt; 16)</span><code>{trace.spread}</code></div>
          <div className={styles.traceRow}>
            <span>index = hash &amp; {n - 1}</span>
            <code>…{bin(trace.spread, Math.max(bits, 4))} → bucket {trace.index}</code>
          </div>
          <p className={styles.note}>{trace.note}</p>
        </div>
      )}

      <div className={styles.buckets} style={{gridTemplateColumns: n > 16 ? 'repeat(auto-fill, minmax(150px, 1fr))' : undefined}}>
        {map.table.map((chain, i) => (
          <div key={i} className={clsx(styles.bucket, trace && trace.index === i && styles.bucketHot)}>
            <span className={styles.bucketIdx}>[{i}]</span>
            <div className={styles.chain}>
              {chain.length === 0 && <span className={styles.empty}>empty</span>}
              {chain.map((e) => (
                <span key={e.key} className={clsx(styles.chip, map.tree[i] && styles.chipTree)} title={`hash ${e.hash}`}>{e.key}</span>
              ))}
              {map.tree[i] && <span className={styles.badge}>tree</span>}
            </div>
          </div>
        ))}
      </div>
      <p className={styles.hint}>Longest chain: {longest}. Lookups walk one chain, which is why a good <code>hashCode()</code> keeps it short.</p>
    </section>
  );
}
