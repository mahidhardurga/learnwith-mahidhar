import React, {useState} from 'react';
import clsx from 'clsx';
import styles from './lab.module.css';

type Verdict = 'ALLOW' | 'NEEDS_APPROVAL' | 'DENY';

const TOOLS = ['lookup_order', 'refund', 'send_email', 'delete_database'];
const ALLOWED = new Set(['lookup_order', 'refund']);
const AUTO_REFUND_LIMIT = 50;

/** Same rules as the Java example on this page. */
function check(tool: string, amount: number): {verdict: Verdict; reason: string} {
  if (!ALLOWED.has(tool)) return {verdict: 'DENY', reason: `${tool} is not on the allowed list, so it is denied by default.`};
  if (tool === 'refund' && amount > AUTO_REFUND_LIMIT) {
    return {verdict: 'NEEDS_APPROVAL', reason: `A refund over ${AUTO_REFUND_LIMIT} is risky, so a person must confirm it first.`};
  }
  return {verdict: 'ALLOW', reason: 'The tool is allowed and within its limits, so it runs.'};
}

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/g;

/** Pick an action the model "asked for" and see the decision your code makes before anything runs. */
export function GuardrailLab(): React.JSX.Element {
  const [tool, setTool] = useState('refund');
  const [amount, setAmount] = useState(20);
  const [text, setText] = useState('Contact asha@example.com for the invoice.');
  const {verdict, reason} = check(tool, amount);

  return (
    <section className={styles.panel} aria-label="Guardrail lab">
      <div className={styles.panelHead}>
        <strong>Guardrail lab</strong>
        <span className={styles.score}>rules run in code, not in the prompt</span>
      </div>
      <div className={styles.controls}>
        <select className={styles.input} value={tool} onChange={(e) => setTool(e.target.value)} aria-label="Tool the model asks to run">
          {TOOLS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <label className={styles.slider}>Amount: <b>{amount}</b>
          <input type="range" min={0} max={500} step={10} value={amount} onChange={(e) => setAmount(+e.target.value)} />
        </label>
      </div>
      <div className={clsx(styles.service, verdict === 'ALLOW' && styles.serviceGood, verdict === 'DENY' && styles.serviceBad, verdict === 'NEEDS_APPROVAL' && styles.serviceWarn)} aria-live="polite">
        <span>Decision</span>
        <b>{verdict}</b>
        <span>{reason}</span>
      </div>
      <p className={styles.hint} style={{marginTop: '1rem'}}>Output check: email addresses are hidden before the answer is shown.</p>
      <input className={styles.input} style={{width: '100%'}} value={text} onChange={(e) => setText(e.target.value)} aria-label="Model output" />
      <p className={styles.note}>{text.replace(EMAIL, '[email hidden]')}</p>
    </section>
  );
}
