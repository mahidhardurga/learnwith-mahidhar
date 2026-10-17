import React, {useState} from 'react';
import clsx from 'clsx';
import styles from './lab.module.css';

export interface CheckQuestion {
  q: string;
  options: string[];
  /** Index of the correct option. */
  answer: number;
  /** Shown after answering. */
  why: string;
}

/** A short self-test: pick an answer, get instant feedback and an explanation, see your score. */
export function Checkpoint({title = 'Check yourself', questions}: {title?: string; questions: CheckQuestion[]}): React.JSX.Element {
  const [picked, setPicked] = useState<(number | null)[]>(() => questions.map(() => null));
  const answered = picked.filter((p) => p !== null).length;
  const correct = picked.filter((p, i) => p === questions[i].answer).length;

  return (
    <section className={styles.panel} aria-label={title}>
      <div className={styles.panelHead}>
        <strong>{title}</strong>
        <span className={styles.score} aria-live="polite">
          {answered === 0 ? `${questions.length} questions` : `${correct}/${questions.length} correct`}
        </span>
      </div>
      {questions.map((item, qi) => {
        const choice = picked[qi];
        const done = choice !== null;
        return (
          <div key={qi} className={styles.question}>
            <p className={styles.qText}>
              <span className={styles.qNum}>{qi + 1}</span>
              {item.q}
            </p>
            <div className={styles.options} role="group" aria-label={item.q}>
              {item.options.map((opt, oi) => (
                <button
                  key={oi}
                  type="button"
                  disabled={done}
                  className={clsx(
                    styles.option,
                    done && oi === item.answer && styles.optionRight,
                    done && choice === oi && oi !== item.answer && styles.optionWrong,
                  )}
                  onClick={() => setPicked((p) => p.map((v, i) => (i === qi ? oi : v)))}>
                  {opt}
                </button>
              ))}
            </div>
            {done && (
              <p className={clsx(styles.why, choice === item.answer ? styles.whyRight : styles.whyWrong)}>
                <strong>{choice === item.answer ? 'Correct. ' : 'Not quite. '}</strong>
                {item.why}
              </p>
            )}
          </div>
        );
      })}
      {answered === questions.length && (
        <div className={styles.panelFoot}>
          <span>{correct === questions.length ? 'Perfect. Move on to the next topic.' : 'Re-read the sections you missed, then try again.'}</span>
          <button type="button" className={styles.ghost} onClick={() => setPicked(questions.map(() => null))}>
            Try again
          </button>
        </div>
      )}
    </section>
  );
}

/** "After this page you can..." card shown at the top of a lesson. */
export function Outcomes({items}: {items: string[]}): React.JSX.Element {
  return (
    <aside className={styles.outcomes} aria-label="What you will learn">
      <div className={styles.outcomesHead}>After this page you can</div>
      <ul>
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </aside>
  );
}
