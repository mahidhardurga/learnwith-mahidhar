import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import {useLocation} from '@docusaurus/router';
import {useDocsSidebar} from '@docusaurus/plugin-content-docs/client';
import {LEVELS, type Relevance} from '@site/src/data/levels';
import {pageLevel, pageRelevance, useLevel} from '@site/src/components/level';
import {setExpandAll, useExpandAll} from '@site/src/components/LevelContent';

const FOR_YOU: Record<Relevance, string> = {
  core: 'Core for you',
  review: 'Refresher for you',
  stretch: 'Stretch for you',
  later: 'Advanced for you',
};

interface SidebarNode {
  type: string;
  href?: string;
  label?: string;
  items?: SidebarNode[];
}

/** Every page in a node, in reading order (depth-first). */
function flatten(items: SidebarNode[]): SidebarNode[] {
  return items.flatMap((i) => {
    if (i.type === 'link') return [i];
    // A category can itself link to a doc (e.g. the Microservices overview); it comes first.
    const own = i.href && !i.href.startsWith('/category/') ? [{type: 'link', href: i.href, label: i.label}] : [];
    return [...own, ...(i.items ? flatten(i.items) : [])];
  });
}

/** The top-level section (Java, Microservices, ...) that holds this page, as an ordered list of its pages. */
function findSection(items: SidebarNode[], href: string): {category?: string; docs: SidebarNode[]} | null {
  for (const i of items) {
    const docs = flatten([i]);
    if (docs.some((d) => d.href === href)) return {category: i.type === 'category' ? i.label : undefined, docs};
  }
  return null;
}

/** One sticky bar under the breadcrumbs: where you are in the topic, reading time, and how the page fits your level. */
export default function LevelChip(): React.JSX.Element | null {
  // DocBreadcrumbs also renders on category index pages, where no doc context exists: use the URL.
  const {pathname} = useLocation();
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const {level, chosen} = useLevel();
  const expanded = useExpandAll();
  const sidebar = useDocsSidebar();
  const [minutes, setMinutes] = useState<number | null>(null);
  // Every new page starts with the level-based view.
  useEffect(() => setExpandAll(false), [path]);
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.theme-doc-markdown');
    setMinutes(el ? Math.max(2, Math.round((el.textContent ?? '').split(/\s+/).length / 200)) : null);
  }, [path]);

  // How far through this page the reader has scrolled (0..1); fills the current segment of the bar.
  const [read, setRead] = useState(0);
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector<HTMLElement>('.theme-doc-markdown');
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const seen = window.scrollY + window.innerHeight - top;
      setRead(Math.min(1, Math.max(0, seen / el.offsetHeight)));
    };
    const onScroll = measure;
    measure();
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [path, expanded, level]);

  const pl = pageLevel(path);
  if (!pl) return null;
  const plInfo = LEVELS.find((l) => l.id === pl)!;
  const rel = pageRelevance(level, path);

  const found = sidebar ? findSection(sidebar.items as SidebarNode[], path) : null;
  const index = found ? found.docs.findIndex((d) => d.href === path) : -1;
  const hasLesson = found !== null && index >= 0 && found.docs.length > 1;

  return (
    <div className={clsx('lw-chip', chosen && `lw-chip--${rel}`)}>
      {hasLesson && found && (
        <>
          <span className="lw-chip__step">
            {found.category ? `${found.category} · ` : ''}Topic {index + 1} of {found.docs.length}
          </span>
          <span
            className="lw-chip__bar"
            role="progressbar"
            aria-label="Progress through this section"
            aria-valuemin={0}
            aria-valuemax={found.docs.length}
            aria-valuenow={index + read}>
            {found.docs.map((d, i) => (
              <b key={d.href} title={d.label}>
                <i style={{width: i < index ? '100%' : i === index ? `${Math.round(read * 100)}%` : '0%'}} />
              </b>
            ))}
          </span>
        </>
      )}
      {minutes !== null && <span>{minutes} min read</span>}
      <span className="lw-chip__sep" aria-hidden="true" />
      {chosen && <strong>{FOR_YOU[rel]}</strong>}
      <span>{chosen ? '·' : ''} {plInfo.label} topic</span>
      {chosen && (
        <button type="button" className="lw-chip__btn" onClick={() => setExpandAll(!expanded)}>
          {expanded ? 'Back to my level view' : 'Show all sections'}
        </button>
      )}
    </div>
  );
}
