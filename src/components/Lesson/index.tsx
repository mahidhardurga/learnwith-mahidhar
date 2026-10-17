import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import {useLocation} from '@docusaurus/router';
import {useDocsSidebar} from '@docusaurus/plugin-content-docs/client';
import {findSection, type SidebarNode} from '@site/src/components/lessonNav';
import LESSONS from '@site/src/data/lessons.json';
import styles from './styles.module.css';

interface LessonData {
  def?: string;
  why?: string;
  use?: string[];
  avoid?: string[];
  design?: string[];
}

const DATA = LESSONS as Record<string, LessonData>;

/** Tiny inline markup: `code` and **bold**. Paragraphs are separated by blank lines. */
function inline(text: string): React.ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function Text({text}: {text: string}): React.JSX.Element {
  return (
    <>
      {text.split(/\n\n+/).map((p, i) => (
        <p key={i}>{inline(p)}</p>
      ))}
    </>
  );
}

/** One of the ten numbered parts of a lesson. */
export function LessonSlot({n, title, id, children}: {n: string; title: string; id: string; children?: React.ReactNode}): React.JSX.Element {
  return (
    <section className={styles.slot} data-slot={n}>
      <Heading as="h2" id={id} className={styles.slotTitle}>
        <span className={styles.slotNum} aria-hidden="true">{n.padStart(2, '0')}</span>
        {title}
      </Heading>
      <div className={styles.slotBody}>{children}</div>
    </section>
  );
}

/** The definition: short, plain and self-contained. */
export function LessonDefinition({path}: {path: string}): React.JSX.Element | null {
  const def = DATA[path]?.def;
  return def ? <div className={styles.def}><Text text={def} /></div> : null;
}

export function LessonWhy({path}: {path: string}): React.JSX.Element | null {
  const why = DATA[path]?.why;
  return why ? <div className={styles.why}><Text text={why} /></div> : null;
}

export function LessonDesign({path}: {path: string}): React.JSX.Element | null {
  const items = DATA[path]?.design;
  if (!items?.length) return null;
  return (
    <ul className={styles.design}>
      {items.map((t) => (
        <li key={t}>{inline(t)}</li>
      ))}
    </ul>
  );
}

export function LessonWhen({path}: {path: string}): React.JSX.Element | null {
  const {use, avoid} = DATA[path] ?? {};
  if (!use?.length && !avoid?.length) return null;
  return (
    <div className={styles.when}>
      {use?.length ? (
        <div className={clsx(styles.whenCol, styles.whenUse)}>
          <h3>Use it when</h3>
          <ul>{use.map((t) => <li key={t}>{inline(t)}</li>)}</ul>
        </div>
      ) : null}
      {avoid?.length ? (
        <div className={clsx(styles.whenCol, styles.whenAvoid)}>
          <h3>Think twice when</h3>
          <ul>{avoid.map((t) => <li key={t}>{inline(t)}</li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}

/** A card linking to the next topic in the same section. */
export function NextTopic(): React.JSX.Element | null {
  const {pathname} = useLocation();
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const sidebar = useDocsSidebar();
  const found = sidebar ? findSection(sidebar.items as SidebarNode[], path) : null;
  if (!found) return null;
  const i = found.docs.findIndex((d) => d.href === path);
  const next = i >= 0 ? found.docs[i + 1] : undefined;
  if (!next?.href) return null;
  return (
    <Link to={next.href} className={styles.next}>
      <span>Next topic</span>
      <strong>{next.label}</strong>
      <span aria-hidden="true" className={styles.nextArrow}>→</span>
    </Link>
  );
}
