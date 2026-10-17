import React from 'react';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {useProgress} from './progress';

export default function MarkComplete(): React.JSX.Element | null {
  const {metadata} = useDoc();
  const {done, toggle} = useProgress();
  const isDone = done.has(metadata.permalink);

  return (
    <div className="lw-markdone">
      <p>{isDone ? 'Nice. This page is marked as done.' : 'Finished this page? Track your progress (saved only in your browser).'}</p>
      <button type="button" data-done={isDone} onClick={() => toggle(metadata.permalink)}>
        {isDone ? '✓ Done (click to undo)' : 'Mark as done'}
      </button>
    </div>
  );
}
