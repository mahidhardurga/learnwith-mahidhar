import React, {useState} from 'react';
import clsx from 'clsx';
import styles from './lab.module.css';

type SagaState = 'STARTED' | 'STOCK_RESERVED' | 'PAID' | 'COMPLETED' | 'COMPENSATING' | 'CANCELLED';

/** Same transitions as the OrderSaga class on this page. */
function onEvent(state: SagaState, event: string, id: string): {state: SagaState; command: string | null} {
  switch (state) {
    case 'STARTED':
      if (event === 'OrderCreated') return {state, command: `ReserveStock:${id}`};
      if (event === 'StockReserved') return {state: 'STOCK_RESERVED', command: `ChargePayment:${id}`};
      if (event === 'StockRejected') return {state: 'CANCELLED', command: `CancelOrder:${id}`};
      break;
    case 'STOCK_RESERVED':
      if (event === 'PaymentSucceeded') return {state: 'COMPLETED', command: `ConfirmOrder:${id}`};
      if (event === 'PaymentFailed') return {state: 'COMPENSATING', command: `ReleaseStock:${id}`};
      break;
    case 'COMPENSATING':
      if (event === 'StockReleased') return {state: 'CANCELLED', command: `CancelOrder:${id}`};
      break;
    default:
  }
  return {state, command: null};
}

interface Sim {
  state: SagaState;
  pending: string | null;
  log: {event: string; command: string | null; state: SagaState}[];
  order: string;
  stock: string;
  payment: string;
}


/** Apply the pending event, then let the "world" (services) answer the command with the next event. */
function advance(cur: Sim, id: string, stockOk: boolean, payOk: boolean): Sim {
  if (!cur.pending) return cur;
  const {state, command} = onEvent(cur.state, cur.pending, id);
  const next: Sim = {...cur, state, log: [...cur.log, {event: cur.pending, command, state}], pending: null};
  switch (command?.split(':')[0]) {
    case 'ReserveStock':
      next.pending = stockOk ? 'StockReserved' : 'StockRejected';
      if (stockOk) next.stock = 'reserved';
      break;
    case 'ChargePayment':
      next.pending = payOk ? 'PaymentSucceeded' : 'PaymentFailed';
      next.payment = payOk ? 'charged' : 'failed';
      break;
    case 'ReleaseStock':
      next.pending = 'StockReleased';
      next.stock = 'released (compensated)';
      break;
    case 'ConfirmOrder':
      next.order = 'CONFIRMED';
      break;
    case 'CancelOrder':
      next.order = 'CANCELLED';
      break;
    default:
  }
  return next;
}

const start = (): Sim => ({state: 'STARTED', pending: 'OrderCreated', log: [], order: 'PENDING', stock: 'free', payment: 'none'});

/** Step an order saga forward, and break the payment or the stock to watch compensations run. */
export function SagaLab(): React.JSX.Element {
  const [sim, setSim] = useState<Sim>(start);
  const [stockOk, setStockOk] = useState(true);
  const [payOk, setPayOk] = useState(true);
  const id = 'o-42';

  const step = () => setSim((cur) => advance(cur, id, stockOk, payOk));
  const finished = sim.pending === null;
  const runAll = () =>
    setSim((cur) => {
      let s = cur;
      for (let guard = 0; s.pending && guard < 10; guard++) s = advance(s, id, stockOk, payOk);
      return s;
    });

  return (
    <section className={styles.panel} aria-label="Saga lab">
      <div className={styles.panelHead}>
        <strong>Order saga lab</strong>
        <span className={styles.score}>orchestrator state: <b>{sim.state}</b></span>
      </div>
      <div className={styles.controls}>
        <label className={styles.toggle}>
          <input type="checkbox" checked={stockOk} disabled={sim.log.length > 0} onChange={(e) => setStockOk(e.target.checked)} /> Stock is available
        </label>
        <label className={styles.toggle}>
          <input type="checkbox" checked={payOk} disabled={sim.log.length > 0} onChange={(e) => setPayOk(e.target.checked)} /> Payment succeeds
        </label>
        <button className={styles.primary} type="button" onClick={step} disabled={finished}>
          {sim.log.length === 0 ? 'Start saga' : 'Next step'}
        </button>
        <button className={styles.ghost} type="button" onClick={runAll} disabled={finished}>Run to the end</button>
        <button className={styles.ghost} type="button" onClick={() => setSim(start())}>Reset</button>
      </div>
      <p className={styles.hint}>Set the failures <em>before</em> starting. Untick payment and watch the stock reservation get released.</p>

      <div className={styles.services}>
        <div className={clsx(styles.service, sim.order === 'CONFIRMED' && styles.serviceGood, sim.order === 'CANCELLED' && styles.serviceBad)}>
          <span>Order service</span><b>{sim.order}</b>
        </div>
        <div className={clsx(styles.service, sim.stock === 'reserved' && styles.serviceGood, sim.stock.startsWith('released') && styles.serviceWarn)}>
          <span>Inventory service</span><b>{sim.stock}</b>
        </div>
        <div className={clsx(styles.service, sim.payment === 'charged' && styles.serviceGood, sim.payment === 'failed' && styles.serviceBad)}>
          <span>Payment service</span><b>{sim.payment}</b>
        </div>
      </div>

      <ol className={styles.timeline} aria-live="polite">
        {sim.log.length === 0 && <li className={styles.empty}>Nothing has happened yet. The first event is OrderCreated.</li>}
        {sim.log.map((l, i) => (
          <li key={i}>
            <code>{l.event}</code>
            <span className={styles.arrow}>→</span>
            {l.command ? <code className={styles.cmd}>{l.command.split(':')[0]}</code> : <em>saga finished</em>}
            <span className={styles.stateTag}>{l.state}</span>
          </li>
        ))}
      </ol>
      {finished && sim.log.length > 0 && (
        <p className={styles.note}>
          {sim.order === 'CONFIRMED'
            ? 'Happy path: every local transaction committed.'
            : 'The saga ended in CANCELLED. No distributed rollback happened: each earlier step was undone by a compensating transaction.'}
        </p>
      )}
    </section>
  );
}
