import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import LevelPicker from '@site/src/components/LevelPicker';
import {useLevel} from '@site/src/components/level';
import {useProgress} from '@site/src/components/progress';
import {LEVELS, PAGE_BY_PATH, PLANS} from '@site/src/data/levels';
import styles from './my-plan.module.css';

export default function MyPlan(): React.JSX.Element {
  const {level, setLevel, info} = useLevel();
  const {done, toggle} = useProgress();

  const plan = level === 'all' ? null : PLANS[level];
  const allPages = plan ? plan.flatMap((w) => w.pages) : [];
  const uniquePages = [...new Set(allPages)];
  const doneCount = uniquePages.filter((p) => done.has(p)).length;
  const pct = uniquePages.length ? Math.round((doneCount / uniquePages.length) * 100) : 0;
  const next = uniquePages.find((p) => !done.has(p));

  return (
    <Layout title="My study plan" description="A week-by-week Java, Spring Boot and microservices interview study plan for your experience level.">
      <main className={clsx('container', styles.page)}>
        <h1 className={styles.h1}>Your study plan</h1>
        <p className={styles.lead}>
          Tell us what you are preparing for. The guide highlights what matters for that level, filters the quiz and builds a week-by-week plan.
          Your choice and progress stay in this browser only.
        </p>

        <LevelPicker />

        {!plan && (
          <div className={styles.empty}>
            <h2>Choose a level to see your plan</h2>
            <p>Not sure? A rough guide:</p>
            <div className={styles.cards}>
              {LEVELS.map((l) => (
                <button key={l.id} type="button" className={styles.card} style={{['--c' as string]: l.color}} onClick={() => setLevel(l.id)}>
                  <span className={styles.cardEmoji}>{l.emoji}</span>
                  <strong>{l.label}</strong>
                  <small>{l.years}</small>
                  <span>{l.blurb}</span>
                  <em>{PLANS[l.id].length} steps</em>
                </button>
              ))}
            </div>
          </div>
        )}

        {plan && info && (
          <>
            <section className={styles.summary} style={{['--c' as string]: info.color}}>
              <div>
                <div className={styles.summaryTitle}>
                  {info.emoji} {info.label} plan <span>({info.years})</span>
                </div>
                <p>
                  {doneCount} of {uniquePages.length} pages done across {plan.length} steps.
                  {next ? ' Continue where you left off.' : ' Everything in this plan is done. Time for mock interviews.'}
                </p>
                <div className={styles.bar}>
                  <div style={{width: `${Math.max(pct, 2)}%`}} />
                </div>
              </div>
              <div className={styles.summaryActions}>
                {next && (
                  <Link className={clsx(styles.btn, styles.btnPrimary)} to={next}>
                    Next: {PAGE_BY_PATH[next]?.title ?? 'continue'} →
                  </Link>
                )}
                <Link className={clsx(styles.btn, styles.btnGhost)} to={info.questions.to}>
                  {info.questions.count} practice questions
                </Link>
              </div>
            </section>

            <ol className={styles.timeline}>
              {plan.map((week, i) => {
                const weekDone = week.pages.filter((p) => done.has(p)).length;
                const complete = weekDone === week.pages.length;
                return (
                  <li key={week.title} className={clsx(styles.week, complete && styles.weekDone)} style={{['--c' as string]: info.color}}>
                    <div className={styles.weekNum}>{complete ? '✓' : i + 1}</div>
                    <div className={styles.weekBody}>
                      <div className={styles.weekHead}>
                        <h2>{week.title}</h2>
                        <span className={styles.weekCount}>{weekDone}/{week.pages.length}</span>
                      </div>
                      <p className={styles.focus}>{week.focus}</p>
                      <ul className={styles.pages}>
                        {week.pages.map((p) => (
                          <li key={p}>
                            <label>
                              <input type="checkbox" checked={done.has(p)} onChange={() => toggle(p)} />
                              <span className={styles.check} aria-hidden="true" />
                            </label>
                            <Link to={p}>{PAGE_BY_PATH[p]?.title ?? p}</Link>
                          </li>
                        ))}
                      </ul>
                      <p className={styles.practice}><strong>Practice:</strong> {week.practice}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <p className={styles.footerNote}>
              Prefer to read everything? <Link to="/guide">Browse the full guide</Link> or switch to "Show everything" above. The{' '}
              <Link to="/toolkit/study-roadmap">study roadmap</Link> explains how to practise each week.
            </p>
          </>
        )}
      </main>
    </Layout>
  );
}
