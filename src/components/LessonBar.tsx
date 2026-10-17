import React, {useEffect, useState} from 'react';
import {useLocation} from '@docusaurus/router';
import {useDocsSidebar} from '@docusaurus/plugin-content-docs/client';
import {findSection, type SidebarNode} from '@site/src/components/lessonNav';

/** One sticky bar under the breadcrumbs: where you are in the section, reading progress and reading time. */
export default function LessonBar(): React.JSX.Element | null {
  // DocBreadcrumbs also renders on category index pages, where no doc context exists: use the URL.
  const {pathname} = useLocation();
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const sidebar = useDocsSidebar();
  const [minutes, setMinutes] = useState<number | null>(null);
  const [read, setRead] = useState(0);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.theme-doc-markdown');
    setMinutes(el ? Math.max(2, Math.round((el.textContent ?? '').split(/\s+/).length / 200)) : null);
  }, [path]);

  // How far through this page the reader has scrolled (0..1); fills the current segment of the bar.
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector<HTMLElement>('.theme-doc-markdown');
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const seen = window.scrollY + window.innerHeight - top;
      setRead(Math.min(1, Math.max(0, seen / el.offsetHeight)));
    };
    measure();
    window.addEventListener('scroll', measure, {passive: true});
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [path]);

  const found = sidebar ? findSection(sidebar.items as SidebarNode[], path) : null;
  const index = found ? found.docs.findIndex((d) => d.href === path) : -1;
  if (!found || index < 0 || found.docs.length < 2) return null;

  return (
    <div className="lw-chip">
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
      {minutes !== null && <span>{minutes} min read</span>}
    </div>
  );
}
