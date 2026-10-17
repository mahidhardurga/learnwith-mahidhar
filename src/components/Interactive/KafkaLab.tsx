import React, {useState} from 'react';
import clsx from 'clsx';
import {partitionFor} from './kafkaHash';
import styles from './lab.module.css';

interface Msg {
  key: string;
  seq: number;
}

const KEYS = ['cust-1', 'cust-2', 'cust-3', 'cust-4', 'cust-5'];
const COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#d6336c', '#0c8599', '#f08c00', '#5c7cfa'];

/** Range-assignor style split: contiguous partitions, the first (p % c) consumers get one extra. */
function assign(partitions: number, consumers: number): number[][] {
  const base = Math.floor(partitions / consumers);
  const extra = partitions % consumers;
  const out: number[][] = [];
  let next = 0;
  for (let c = 0; c < consumers; c++) {
    const count = base + (c < extra ? 1 : 0);
    out.push(Array.from({length: count}, () => next++));
  }
  return out;
}

/** Send keyed messages, then change partition and consumer counts to see ordering and scaling rules. */
export function KafkaLab(): React.JSX.Element {
  const [partitions, setPartitions] = useState(3);
  const [consumers, setConsumers] = useState(2);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [key, setKey] = useState('cust-1');

  const send = (keys: string[]) => {
    setMsgs((m) => {
      let seq = m.length;
      return [...m, ...keys.map((k) => ({key: k, seq: seq++}))];
    });
  };

  const lanes: Msg[][] = Array.from({length: partitions}, () => []);
  msgs.forEach((m) => lanes[partitionFor(m.key, partitions)].push(m));
  const groups = assign(partitions, consumers);
  const colorOf = (k: string) => COLORS[Math.max(0, KEYS.indexOf(k)) % COLORS.length] ?? '#868e96';
  const idle = Math.max(0, consumers - partitions);

  return (
    <section className={styles.panel} aria-label="Kafka lab">
      <div className={styles.panelHead}>
        <strong>Partitions and consumer group lab</strong>
        <span className={styles.score}>{msgs.length} records sent</span>
      </div>
      <div className={styles.controls}>
        <label className={styles.slider}>Partitions: <b>{partitions}</b>
          <input type="range" min={1} max={8} value={partitions} onChange={(e) => setPartitions(+e.target.value)} />
        </label>
        <label className={styles.slider}>Consumers in group: <b>{consumers}</b>
          <input type="range" min={1} max={8} value={consumers} onChange={(e) => setConsumers(+e.target.value)} />
        </label>
      </div>
      <div className={styles.controls}>
        <select className={styles.input} value={key} onChange={(e) => setKey(e.target.value)} aria-label="Record key">
          {KEYS.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <button className={styles.primary} type="button" onClick={() => send([key])}>Send record with this key</button>
        <button className={styles.ghost} type="button" onClick={() => send(Array.from({length: 12}, (_, i) => KEYS[(i * 7 + 3) % KEYS.length]))}>Send 12 mixed</button>
        <button className={styles.ghost} type="button" onClick={() => setMsgs([])}>Clear</button>
      </div>
      <p className={styles.hint}>The partition is <code>murmur2(key) % partitions</code>, the same function Kafka's default partitioner uses. Changing the partition count re-maps keys (try it), which is why you size topics up front.</p>

      <div className={styles.lanes}>
        {lanes.map((lane, p) => {
          const owner = groups.findIndex((g) => g.includes(p));
          return (
            <div key={p} className={styles.lane}>
              <div className={styles.laneLabel}>
                <b>P{p}</b>
                <span>read by C{owner + 1}</span>
              </div>
              <div className={styles.laneBody}>
                {lane.length === 0 && <span className={styles.empty}>no records</span>}
                {lane.map((m, i) => (
                  <span key={m.seq} className={styles.rec} style={{background: colorOf(m.key)}} title={`${m.key}, offset ${i}`}>
                    {i}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className={styles.legend}>
        {KEYS.map((k) => (
          <span key={k}><i style={{background: colorOf(k)}} /> {k}</span>
        ))}
        <span className={styles.legendNote}>number = offset inside the partition</span>
      </p>

      <div className={styles.consumers}>
        {groups.map((g, c) => (
          <div key={c} className={clsx(styles.consumer, g.length === 0 && styles.consumerIdle)}>
            <b>C{c + 1}</b>
            <span>{g.length === 0 ? 'idle: no partition left' : `reads ${g.map((p) => `P${p}`).join(', ')}`}</span>
          </div>
        ))}
      </div>
      {idle > 0 && <p className={styles.note}>{idle} consumer{idle > 1 ? 's are' : ' is'} idle. Within one group a partition has at most one consumer, so partitions cap your parallelism.</p>}
      <p className={styles.hint}>Same key, same partition: records with the same key keep their order. Different keys have no order guarantee relative to each other.</p>
    </section>
  );
}
