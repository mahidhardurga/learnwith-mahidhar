import React, {useState} from 'react';
import clsx from 'clsx';
import styles from './lab.module.css';

type Lvl = 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
const LEVELS: Lvl[] = ['READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE'];

interface Outcome {
  bad: boolean;
  result: string;
  why: string;
}
interface Scenario {
  id: string;
  name: string;
  steps: string[];
  outcome: Record<Lvl, Outcome>;
  fix: string;
}

/** PostgreSQL semantics. */
const SCENARIOS: Scenario[] = [
  {
    id: 'nrr',
    name: 'Non-repeatable read',
    steps: ['A: SELECT balance → 100', 'B: UPDATE balance = 200; COMMIT', 'A: SELECT balance again'],
    outcome: {
      'READ COMMITTED': {bad: true, result: 'A reads 100, then 200', why: 'Each statement gets a fresh snapshot, so A sees B’s commit between its two reads.'},
      'REPEATABLE READ': {bad: false, result: 'A reads 100 both times', why: 'One snapshot for the whole transaction.'},
      SERIALIZABLE: {bad: false, result: 'A reads 100 both times', why: 'Snapshot plus conflict detection.'},
    },
    fix: 'Use REPEATABLE READ when a transaction must see a stable view, for example a multi-query report.',
  },
  {
    id: 'lost',
    name: 'Lost update',
    steps: ['A: read balance → 100', 'B: read balance → 100', 'A: UPDATE balance = 110; COMMIT', 'B: UPDATE balance = 110; COMMIT'],
    outcome: {
      'READ COMMITTED': {bad: true, result: 'Final balance 110 (should be 120)', why: 'B’s UPDATE waits for A, then overwrites with a value computed from stale data.'},
      'REPEATABLE READ': {bad: false, result: 'B fails with 40001; retry gives 120', why: 'Row changed after B’s snapshot, so PostgreSQL aborts B with a serialization failure.'},
      SERIALIZABLE: {bad: false, result: 'B fails with 40001; retry gives 120', why: 'Same: the conflict is detected and one side retries.'},
    },
    fix: 'Better still, avoid read-modify-write: UPDATE balance = balance + 10, or use @Version optimistic locking.',
  },
  {
    id: 'skew',
    name: 'Write skew (on-call doctors)',
    steps: ['A: count on-call → 2, so Alice may leave', 'B: count on-call → 2, so Bob may leave', 'A: UPDATE alice SET on_call = false; COMMIT', 'B: UPDATE bob SET on_call = false; COMMIT'],
    outcome: {
      'READ COMMITTED': {bad: true, result: '0 doctors on call', why: 'Each check passed on its own, and the two writes touch different rows.'},
      'REPEATABLE READ': {bad: true, result: '0 doctors on call', why: 'Snapshot isolation does not stop write skew: no single row is written twice.'},
      SERIALIZABLE: {bad: false, result: 'B fails with 40001; on retry B sees 1 on call and refuses', why: 'SSI detects the dangerous read-write dependency cycle and aborts one transaction.'},
    },
    fix: 'Use SERIALIZABLE with retry, lock the rows the decision depends on (SELECT … FOR UPDATE), or encode the rule as a constraint.',
  },
  {
    id: 'phantom',
    name: 'Check-then-insert (double booking)',
    steps: ['A: SELECT bookings overlapping 10:00 → none', 'B: SELECT bookings overlapping 10:00 → none', 'A: INSERT booking 10:00; COMMIT', 'B: INSERT booking 10:00; COMMIT'],
    outcome: {
      'READ COMMITTED': {bad: true, result: 'Two bookings at 10:00', why: 'Both checks read rows that did not exist yet.'},
      'REPEATABLE READ': {bad: true, result: 'Two bookings at 10:00', why: 'The snapshot does not conflict with a concurrent insert of a different row.'},
      SERIALIZABLE: {bad: false, result: 'B fails with 40001', why: 'SSI tracks the predicate read and aborts one transaction.'},
    },
    fix: 'Let the database enforce it: a unique or exclusion constraint serialises the inserts at any isolation level.',
  },
];

/** Pick an anomaly and an isolation level to see what each transaction observes (PostgreSQL behaviour). */
export function IsolationLab(): React.JSX.Element {
  const [sid, setSid] = useState(SCENARIOS[0].id);
  const [level, setLevel] = useState<Lvl>('READ COMMITTED');
  const sc = SCENARIOS.find((s) => s.id === sid)!;
  const out = sc.outcome[level];

  return (
    <section className={styles.panel} aria-label="Isolation lab">
      <div className={styles.panelHead}>
        <strong>Isolation anomaly lab</strong>
        <span className={styles.score}>PostgreSQL behaviour</span>
      </div>
      <div className={styles.controls}>
        <select className={styles.input} value={sid} onChange={(e) => setSid(e.target.value)} aria-label="Scenario">
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {LEVELS.map((l) => (
          <button key={l} type="button" className={clsx(styles.ghost, level === l && styles.primary)} onClick={() => setLevel(l)}>
            {l.toLowerCase()}
          </button>
        ))}
      </div>
      <ol className={styles.timeline}>
        {sc.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <div className={clsx(styles.service, out.bad ? styles.serviceBad : styles.serviceGood)} aria-live="polite">
        <span>{out.bad ? 'Anomaly happens' : 'Anomaly prevented'}</span>
        <b>{out.result}</b>
        <span>{out.why}</span>
      </div>
      <p className={styles.note}>{sc.fix}</p>
    </section>
  );
}
