import React, {useCallback, useEffect, useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import {CATEGORIES, FLASHCARDS, type Category, type Flashcard} from '@site/src/data/flashcards';
import styles from './styles.module.css';

type Filter = Category | 'All';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Render `backticked` fragments as inline code. */
function withCode(text: string): React.ReactNode[] {
  return text.split('`').map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : <React.Fragment key={i}>{part}</React.Fragment>));
}

export default function Flashcards(): React.JSX.Element {
  const [filter, setFilter] = useState<Filter>('All');
  const [seed, setSeed] = useState(0);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [again, setAgain] = useState(0);

  const deck: Flashcard[] = useMemo(() => {
    const pool = filter === 'All' ? FLASHCARDS : FLASHCARDS.filter((c) => c.category === filter);
    return seed === 0 ? pool : shuffle(pool);
  }, [filter, seed]);

  // Shuffle once on the client so the server-rendered HTML stays deterministic.
  useEffect(() => setSeed(1), []);

  const card = deck[index % Math.max(deck.length, 1)];
  const finished = index >= deck.length;

  const next = useCallback(
    (wasKnown: boolean) => {
      if (wasKnown) setKnown((n) => n + 1);
      else setAgain((n) => n + 1);
      setFlipped(false);
      setIndex((i) => i + 1);
    },
    [],
  );

  const restart = (f: Filter = filter) => {
    setFilter(f);
    setSeed((s) => s + 1);
    setIndex(0);
    setFlipped(false);
    setKnown(0);
    setAgain(0);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (finished) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setFlipped((f) => !f);
    } else if (flipped && e.key === 'ArrowRight') {
      next(true);
    } else if (flipped && e.key === 'ArrowLeft') {
      next(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.chips} role="tablist" aria-label="Quiz topics">
        {(['All', ...CATEGORIES] as Filter[]).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={filter === c}
            className={clsx(styles.chip, filter === c && styles.chipActive)}
            onClick={() => restart(c)}>
            {c}
          </button>
        ))}
      </div>

      {finished ? (
        <div className={styles.done}>
          <div className={styles.doneEmoji} aria-hidden="true">🎉</div>
          <h3>Round complete</h3>
          <p>
            You knew <strong>{known}</strong> and want to revisit <strong>{again}</strong> of {deck.length}.
          </p>
          <button type="button" className={styles.primary} onClick={() => restart()}>Shuffle and go again</button>
        </div>
      ) : (
        <>
          <div className={styles.meta}>
            <span>Card {index + 1} / {deck.length}</span>
            <span className={styles.tag}>{card.category}</span>
          </div>
          <div
            className={clsx(styles.card, flipped && styles.flipped)}
            role="button"
            tabIndex={0}
            aria-label={flipped ? 'Answer shown. Press space to hide it.' : 'Press space or click to reveal the answer.'}
            onClick={() => setFlipped((f) => !f)}
            onKeyDown={onKey}>
            <div className={styles.face}>
              <div className={styles.label}>Question</div>
              <p className={styles.question}>{withCode(card.question)}</p>
              <div className={styles.hint}>Think of your answer, then click or press Space</div>
            </div>
            <div className={clsx(styles.face, styles.back)}>
              <div className={styles.label}>Answer</div>
              <p className={styles.answer}>{withCode(card.answer)}</p>
              <Link to={card.link} className={styles.more} onClick={(e) => e.stopPropagation()}>
                Read the full explanation →
              </Link>
            </div>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.ghost} disabled={!flipped} onClick={() => next(false)}>
              ✗ Need to review
            </button>
            <button type="button" className={styles.primary} disabled={!flipped} onClick={() => next(true)}>
              ✓ I knew it
            </button>
          </div>
        </>
      )}
    </div>
  );
}
