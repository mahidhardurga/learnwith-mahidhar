import React from 'react';
import clsx from 'clsx';
import {LEVELS, type LevelPref} from '@site/src/data/levels';
import {useLevel} from '@site/src/components/level';
import styles from './styles.module.css';

const OPTIONS: {id: LevelPref; label: string; sub: string; emoji: string; color: string}[] = [
  ...LEVELS.map((l) => ({id: l.id as LevelPref, label: l.label, sub: l.years, emoji: l.emoji, color: l.color})),
  {id: 'all', label: 'Show everything', sub: 'no filtering', emoji: '🌐', color: '#22d3ee'},
];

export default function LevelPicker({compact = false}: {compact?: boolean}): React.JSX.Element {
  const {level, setLevel} = useLevel();
  return (
    <div className={clsx(styles.wrap, compact && styles.compact)} role="radiogroup" aria-label="Choose your experience level">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={level === o.id}
          className={clsx(styles.opt, level === o.id && styles.active)}
          style={{['--c' as string]: o.color}}
          onClick={() => setLevel(o.id)}>
          <span className={styles.emoji} aria-hidden="true">{o.emoji}</span>
          <span className={styles.text}>
            <strong>{o.label}</strong>
            <small>{o.sub}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
