import React, {useEffect, useState, useSyncExternalStore} from 'react';
import clsx from 'clsx';
import {LEVELS, relevance, type Level, type LevelPref, type Relevance} from '@site/src/data/levels';
import {useLevel} from '@site/src/components/level';
import INTROS from '@site/src/data/level-intros.json';

const RANK: Record<Level, number> = {beginner: 0, mid: 1, senior: 2};

/** Sections collapse when they are above the reader's level, or far below it (a refresher for seniors). */
function isCollapsed(pref: LevelPref, at: Level): boolean {
  if (pref === 'all') return false;
  const d = RANK[at] - RANK[pref];
  return d >= 1 || d <= -2;
}

const BADGE: Record<Relevance, string> = {
  core: '',
  review: 'Refresher',
  stretch: 'Stretch',
  later: 'Advanced',
};

/* ---- "show everything on this page" switch, shared with the level chip ---- */
let expandAll = false;
const listeners = new Set<() => void>();
export function setExpandAll(value: boolean): void {
  expandAll = value;
  listeners.forEach((l) => l());
}
export function useExpandAll(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => expandAll,
    () => false,
  );
}

function levelLabel(at: Level): string {
  return LEVELS.find((l) => l.id === at)?.label ?? at;
}

function useCollapsedState(at: Level, headingId?: string) {
  const {level} = useLevel();
  const forceOpen = useExpandAll();
  const collapsed = isCollapsed(level, at) && !forceOpen;
  // null = follow the level; true/false = the reader toggled this section by hand.
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? !collapsed;

  // A level switch (or "show all") resets any manual choice.
  useEffect(() => setManual(null), [collapsed]);

  // A link to #heading inside a collapsed section must open it.
  useEffect(() => {
    if (!headingId) return undefined;
    const check = () => {
      if (window.location.hash === `#${headingId}`) setManual(true);
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, [headingId]);

  const setOpen = (value: boolean) => {
    if (value !== open) setManual(value);
  };

  return {level, collapsed, open, setOpen, rel: relevance(level, at)};
}

interface SectionProps {
  at: Level;
  title: string;
  /** Beginner-friendly restatement of the section, shown only to beginners. */
  plain?: string;
  children?: React.ReactNode;
}

export function LevelSection({at, title, plain, children}: SectionProps): React.JSX.Element {
  const kids = React.Children.toArray(children);
  const headingIndex = kids.findIndex((k) => React.isValidElement(k));
  const heading = headingIndex >= 0 ? kids[headingIndex] : null;
  const rest = kids.filter((_, i) => i !== headingIndex);
  const headingId = React.isValidElement<{id?: string}>(heading) ? heading.props.id : undefined;
  const {level, collapsed, open, setOpen, rel} = useCollapsedState(at, headingId);
  const note = plain && level === 'beginner' ? <PlainNote text={plain} /> : null;

  if (!collapsed && open) {
    // Same markup as an ungated section, so styling is identical.
    return (
      <div className="lw-sec" data-level={at}>
        {heading}
        {note}
        {rest}
      </div>
    );
  }

  return (
    <details
      className={clsx('lw-sec', 'lw-sec--collapsible', `lw-sec--${rel}`)}
      data-level={at}
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary aria-label={`${title}. ${BADGE[rel] || 'Optional'} section, ${levelLabel(at)} level`}>
        <span className="lw-sec__head">{heading}</span>
        <span className={clsx('lw-badge', `lw-badge--${rel}`)}>{BADGE[rel] || 'Optional'} · {levelLabel(at).toLowerCase()}</span>
        <span className="lw-sec__chev" aria-hidden="true" />
      </summary>
      <div className="lw-sec__body">
        {note}
        {rest}
      </div>
    </details>
  );
}

interface QAProps {
  at: Level;
  question: string;
  children?: React.ReactNode;
}

export function LevelQA({at, question, children}: QAProps): React.JSX.Element {
  const kids = React.Children.toArray(children);
  const {collapsed, open, setOpen, rel} = useCollapsedState(at);

  if (!collapsed && open) {
    return <div className="lw-qa">{kids}</div>;
  }

  const rest = kids.slice(1); // drop the question paragraph: it is shown in the summary
  return (
    <details
      className={clsx('lw-qa', 'lw-qa--collapsible', `lw-sec--${rel}`)}
      data-level={at}
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>
        <strong className="lw-qa__q">{question}</strong>
        <span className={clsx('lw-badge', `lw-badge--${rel}`)}>{BADGE[rel] || 'Optional'} · {levelLabel(at).toLowerCase()}</span>
        <span className="lw-sec__chev" aria-hidden="true" />
      </summary>
      <div className="lw-qa__body">{rest}</div>
    </details>
  );
}

/* ---------- Level-specific introductions and plain-language notes ---------- */

/** Tiny inline markup: `code` and **bold**. Paragraphs are separated by blank lines. */
function inline(text: string): React.ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function Paragraphs({text}: {text: string}): React.JSX.Element {
  return (
    <>
      {text.split(/\n\n+/).map((p, i) => (
        <p key={i}>{inline(p)}</p>
      ))}
    </>
  );
}

function PlainNote({text}: {text: string}): React.JSX.Element {
  return (
    <div className="lw-plain">
      <div className="lw-plain__label">In plain words</div>
      <Paragraphs text={text} />
    </div>
  );
}

interface IntroData {
  beginner?: string;
  senior?: string;
}

const INTRO_DATA = INTROS as Record<string, IntroData>;

/** Beginner: plain-language intro. Senior: what to be ready to defend. Mid-level: nothing extra. */
export function LevelIntro({path}: {path: string}): React.JSX.Element | null {
  const {level} = useLevel();
  const data = INTRO_DATA[path];
  if (!data) return null;
  if (level === 'beginner' && data.beginner) {
    return (
      <aside className="lw-intro lw-intro--beginner">
        <div className="lw-plain__label">Start here: the simple version</div>
        <Paragraphs text={data.beginner} />
      </aside>
    );
  }
  if (level === 'senior' && data.senior) {
    return (
      <aside className="lw-intro lw-intro--senior">
        <div className="lw-plain__label">Senior focus</div>
        <Paragraphs text={data.senior} />
      </aside>
    );
  }
  return null;
}

/** The page's original introduction; beginners get the plain version first and can still open this one. */
export function LevelIntroBody({path, children}: {path: string; children?: React.ReactNode}): React.JSX.Element {
  const {level} = useLevel();
  if (level === 'beginner' && INTRO_DATA[path]?.beginner) {
    return (
      <details className="lw-orig">
        <summary>Show the standard introduction</summary>
        <div>{children}</div>
      </details>
    );
  }
  return <>{children}</>;
}
