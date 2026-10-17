import React, {useState} from 'react';
import styles from './lab.module.css';

const WINDOWS = [
  {label: '4,000', value: 4_000},
  {label: '8,000', value: 8_000},
  {label: '32,000', value: 32_000},
  {label: '128,000', value: 128_000},
  {label: '1,000,000', value: 1_000_000},
];

const SAMPLE = 'Summarise the following support ticket in two sentences for a non-technical reader. The customer says the invoice shows the wrong company name and wants it fixed before the end of the month.';

const money = (n: number): string => (n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);

/** Paste text to see an approximate token count, window usage and cost (4 characters per token). */
export function TokenCostLab(): React.JSX.Element {
  const [text, setText] = useState(SAMPLE);
  const [windowSize, setWindowSize] = useState(8_000);
  const [inPrice, setInPrice] = useState(3);
  const [outPrice, setOutPrice] = useState(15);
  const [outTokens, setOutTokens] = useState(500);
  const [calls, setCalls] = useState(100_000);

  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const tokens = Math.ceil(chars / 4);
  const used = tokens + outTokens;
  const pct = Math.min(100, (used / windowSize) * 100);
  const perCall = (tokens / 1_000_000) * inPrice + (outTokens / 1_000_000) * outPrice;
  const fits = used <= windowSize;

  return (
    <section className={styles.panel} aria-label="Token and cost lab">
      <div className={styles.panelHead}>
        <strong>Token and cost estimator</strong>
        <span className={styles.score}>estimate: 4 characters per token</span>
      </div>
      <textarea
        className={styles.input}
        style={{width: '100%', minHeight: '6.5rem', borderRadius: 16, resize: 'vertical'}}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Text to measure"
      />
      <div className={styles.controls} style={{marginTop: '0.7rem'}}>
        <label className={styles.slider}>Context window
          <select className={styles.input} value={windowSize} onChange={(e) => setWindowSize(+e.target.value)}>
            {WINDOWS.map((w) => (
              <option key={w.value} value={w.value}>{w.label} tokens</option>
            ))}
          </select>
        </label>
        <label className={styles.slider}>Reserved for the answer: <b>{outTokens}</b>
          <input type="range" min={0} max={4000} step={100} value={outTokens} onChange={(e) => setOutTokens(+e.target.value)} />
        </label>
      </div>
      <div className={styles.controls}>
        <label className={styles.slider}>Input price, $ per million
          <input className={styles.input} type="number" min={0} step={0.5} value={inPrice} onChange={(e) => setInPrice(Math.max(0, +e.target.value))} />
        </label>
        <label className={styles.slider}>Output price, $ per million
          <input className={styles.input} type="number" min={0} step={0.5} value={outPrice} onChange={(e) => setOutPrice(Math.max(0, +e.target.value))} />
        </label>
        <label className={styles.slider}>Calls per month
          <input className={styles.input} type="number" min={0} step={1000} value={calls} onChange={(e) => setCalls(Math.max(0, +e.target.value))} />
        </label>
      </div>
      <p className={styles.hint}>The prices are examples you can change, not a real quote.</p>

      <div className={styles.services}>
        <div className={styles.service}><span>Characters / words</span><b>{chars.toLocaleString('en-US')} / {words.toLocaleString('en-US')}</b></div>
        <div className={styles.service}><span>Estimated input tokens</span><b>{tokens.toLocaleString('en-US')}</b></div>
        <div className={`${styles.service} ${fits ? styles.serviceGood : styles.serviceBad}`}>
          <span>Window used (input + answer)</span><b>{pct.toFixed(1)}% {fits ? 'fits' : 'does not fit'}</b>
        </div>
        <div className={styles.service}><span>Cost of one call</span><b>{money(perCall)}</b></div>
        <div className={styles.service}><span>Cost per month</span><b>{money(perCall * calls)}</b></div>
      </div>
    </section>
  );
}
