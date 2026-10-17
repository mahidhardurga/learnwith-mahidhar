import React, {useState} from 'react';
import styles from './lab.module.css';

interface Event {
  kind: 'decide' | 'tool' | 'answer' | 'stopped';
  text: string;
}

interface Scenario {
  id: string;
  name: string;
  task: string;
  /** Each step is one model decision: either a tool call (with its result) or the final answer. */
  steps: ({think: string; tool: string; result: string; failResult?: string} | {think: string; final: string})[];
  failFinal: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'refund',
    name: 'Refund an order',
    task: 'Refund order 42 if it is eligible.',
    steps: [
      {think: 'I need the order details first.', tool: 'lookup_order("42")', result: 'paid 59.00, delivered 12 days ago'},
      {think: 'It is within the 30 day refund window, so I can refund it.', tool: 'refund("42", 59.00)', result: 'refund created', failResult: 'error: payment service unavailable'},
      {think: 'The refund is done. I can answer.', final: 'Order 42 has been refunded (59.00).'},
    ],
    failFinal: 'I could not refund order 42: the payment service is unavailable. Nothing was changed.',
  },
  {
    id: 'weather',
    name: 'Look up the weather',
    task: 'What is the weather in Paris?',
    steps: [
      {think: 'I need current weather data.', tool: 'weather("Paris")', result: '18C, cloudy', failResult: 'error: weather service timed out'},
      {think: 'I have the data. I can answer.', final: 'It is 18C and cloudy in Paris.'},
    ],
    failFinal: 'I could not get the weather: the service timed out.',
  },
];

function buildEvents(sc: Scenario, toolFails: boolean, limit: number): Event[] {
  const events: Event[] = [];
  let model = 0;
  for (let i = 0; i < sc.steps.length; i++) {
    const step = sc.steps[i];
    if (model >= limit) {
      events.push({kind: 'stopped', text: `Stopped: the limit of ${limit} model step${limit === 1 ? '' : 's'} was reached before the task finished.`});
      return events;
    }
    model += 1;
    events.push({kind: 'decide', text: `Step ${model}. Model: "${step.think}"`});
    if ('final' in step) {
      events.push({kind: 'answer', text: `Final answer: ${step.final}`});
      return events;
    }
    const failed = toolFails && step.failResult !== undefined;
    events.push({kind: 'tool', text: `Your code runs ${step.tool} and returns: ${failed ? step.failResult : step.result}`});
    if (failed) {
      if (model >= limit) {
        events.push({kind: 'stopped', text: `Stopped: the limit of ${limit} model step${limit === 1 ? '' : 's'} was reached.`});
      } else {
        model += 1;
        events.push({kind: 'decide', text: `Step ${model}. Model: "The tool failed, so I will not guess. I will report it."`});
        events.push({kind: 'answer', text: `Final answer: ${sc.failFinal}`});
      }
      return events;
    }
  }
  return events;
}

/** Step through an agent loop; make a tool fail or lower the step limit to see how it stops. */
export function AgentLab(): React.JSX.Element {
  const [sid, setSid] = useState(SCENARIOS[0].id);
  const [toolFails, setToolFails] = useState(false);
  const [limit, setLimit] = useState(5);
  const [shown, setShown] = useState(0);

  const sc = SCENARIOS.find((s) => s.id === sid)!;
  const events = buildEvents(sc, toolFails, limit);
  const done = shown >= events.length;
  const reset = () => setShown(0);

  return (
    <section className={styles.panel} aria-label="Agent lab">
      <div className={styles.panelHead}>
        <strong>Agent loop lab</strong>
        <span className={styles.score}>scripted model, no API key needed</span>
      </div>
      <div className={styles.controls}>
        <select className={styles.input} value={sid} onChange={(e) => { setSid(e.target.value); reset(); }} aria-label="Task">
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <label className={styles.toggle}>
          <input type="checkbox" checked={toolFails} onChange={(e) => { setToolFails(e.target.checked); reset(); }} /> A tool fails
        </label>
        <label className={styles.slider}>Step limit: <b>{limit}</b>
          <input type="range" min={1} max={6} value={limit} onChange={(e) => { setLimit(+e.target.value); reset(); }} />
        </label>
      </div>
      <p className={styles.hint}>Task: {sc.task}</p>
      <div className={styles.controls}>
        <button className={styles.primary} type="button" disabled={done} onClick={() => setShown((n) => n + 1)}>{shown === 0 ? 'Start' : 'Next'}</button>
        <button className={styles.ghost} type="button" disabled={done} onClick={() => setShown(events.length)}>Run to the end</button>
        <button className={styles.ghost} type="button" onClick={reset}>Reset</button>
      </div>
      <ol className={styles.timeline} aria-live="polite">
        {shown === 0 && <li className={styles.empty}>Press Start. Each step is one model call followed by your code running a tool.</li>}
        {events.slice(0, shown).map((e, i) => (
          <li key={i} style={{color: e.kind === 'stopped' ? '#ff453a' : undefined, fontWeight: e.kind === 'answer' ? 650 : undefined}}>{e.text}</li>
        ))}
      </ol>
    </section>
  );
}
