import React from 'react';
import {LEVELS, type LevelPref} from '@site/src/data/levels';
import {useLevel} from '@site/src/components/level';

/** Compact level switcher for the navbar (a native select keeps it accessible and mobile friendly). */
export default function NavbarLevel(): React.JSX.Element {
  const {level, setLevel, info} = useLevel();
  return (
    <label className="lw-nav-level" title="Adapts the guide to the experience level you are preparing for">
      <span className="lw-nav-level__icon" aria-hidden="true">{info?.emoji ?? '🎯'}</span>
      <span className="lw-nav-level__label">Level</span>
      <select value={level} onChange={(e) => setLevel(e.target.value as LevelPref)} aria-label="Experience level">
        <option value="all">Everything</option>
        {LEVELS.map((l) => (
          <option key={l.id} value={l.id}>{l.label}</option>
        ))}
      </select>
    </label>
  );
}
