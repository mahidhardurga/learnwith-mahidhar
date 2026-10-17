import React from 'react';

interface Props {
  question: string;
  children?: React.ReactNode;
}

/** One interview question: the question stays visible and the model answer opens on click. */
export default function InterviewQA({question, children}: Props): React.JSX.Element {
  return (
    <details className="lw-qa">
      <summary>
        <strong className="lw-qa__q">{question}</strong>
        <span className="lw-qa__chev" aria-hidden="true" />
      </summary>
      <div className="lw-qa__body">{children}</div>
    </details>
  );
}
