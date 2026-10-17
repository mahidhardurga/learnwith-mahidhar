import React, {useState} from 'react';
import clsx from 'clsx';
import styles from './lab.module.css';

interface Chunk {
  source: string;
  text: string;
}

const CHUNKS: Chunk[] = [
  {source: 'refunds.md', text: 'Refunds are possible within 30 days of purchase with a receipt.'},
  {source: 'shipping.md', text: 'Standard shipping takes 3 to 5 working days.'},
  {source: 'warranty.md', text: 'Products have a one year warranty against defects.'},
  {source: 'password.md', text: 'To reset your password, use the link on the sign in page.'},
  {source: 'contact.md', text: 'Support is open on working days from 9 to 17.'},
];

const STOP = new Set(['a', 'an', 'the', 'is', 'are', 'can', 'i', 'my', 'of', 'to', 'in', 'do', 'how', 'what', 'many', 'does', 'it']);

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w && !STOP.has(w))
      .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w)),
  );
}

const SAMPLES = ['How many days do I have to ask for a refund?', 'How do I reset my password?', 'Do you sell gift cards?'];

/** A toy RAG: keyword matching stands in for embeddings so it runs in the browser. */
export function RagLab(): React.JSX.Element {
  const [question, setQuestion] = useState(SAMPLES[0]);
  const [k, setK] = useState(2);

  const q = words(question);
  const scored = CHUNKS.map((c) => ({chunk: c, score: [...words(c.text)].filter((w) => q.has(w)).length}))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);
  const top = scored.slice(0, k);

  const sources = top.length ? top.map((h) => `[${h.chunk.source}] ${h.chunk.text}`).join('\n') : '(no documents found)';
  const prompt = `Answer using only the documents below. Cite the source in brackets.\nIf the documents do not contain the answer, say you do not know.\n\nDocuments:\n${sources}\n\nQuestion: ${question}`;

  return (
    <section className={styles.panel} aria-label="RAG lab">
      <div className={styles.panelHead}>
        <strong>RAG lab</strong>
        <span className={styles.score}>keyword matching stands in for embeddings</span>
      </div>
      <div className={styles.controls}>
        <input className={styles.input} style={{flex: '1 1 18rem'}} value={question} onChange={(e) => setQuestion(e.target.value)} aria-label="Question" />
        <label className={styles.slider}>Chunks to keep (k): <b>{k}</b>
          <input type="range" min={1} max={4} value={k} onChange={(e) => setK(+e.target.value)} />
        </label>
      </div>
      <div className={styles.controls}>
        {SAMPLES.map((s) => (
          <button key={s} type="button" className={styles.ghost} onClick={() => setQuestion(s)}>{s}</button>
        ))}
      </div>

      <div className={styles.hint}>1. Retrieve: the knowledge base, scored against the question</div>
      <div className={styles.design} style={{display: 'grid', gap: '0.4rem', margin: 0, padding: 0, listStyle: 'none'}}>
        {CHUNKS.map((c) => {
          const score = [...words(c.text)].filter((w) => q.has(w)).length;
          const used = top.some((h) => h.chunk.source === c.source);
          return (
            <div key={c.source} className={clsx(styles.service, used && styles.serviceGood)}>
              <span>{c.source} · score {score}{used ? ' · sent to the model' : ''}</span>
              <b style={{fontWeight: 500}}>{c.text}</b>
            </div>
          );
        })}
      </div>

      <div className={styles.hint} style={{marginTop: '0.9rem'}}>2. Build the prompt that the model receives</div>
      <pre className={styles.trace} style={{whiteSpace: 'pre-wrap', margin: 0}}>{prompt}</pre>
      {top.length === 0 && <p className={styles.note}>Nothing matched, so the prompt says so, and its rule lets the model answer "I do not know" instead of guessing.</p>}
    </section>
  );
}
