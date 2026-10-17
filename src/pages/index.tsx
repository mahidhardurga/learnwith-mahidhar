import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {useAllDocsData} from '@docusaurus/plugin-content-docs/client';
import LevelPicker from '@site/src/components/LevelPicker';
import {useLevel} from '@site/src/components/level';
import {PAGES, relevance} from '@site/src/data/levels';
import styles from './index.module.css';

interface Topic {
  title: string;
  blurb: string;
  prefix: string;
  to: string;
}

const TOPICS: Topic[] = [
  {title: 'Java and JVM', blurb: 'Collections internals, concurrency, memory model, GC, virtual threads.', prefix: 'java/', to: '/category/java'},
  {title: 'Spring', blurb: 'IoC and AOP, Boot, JPA, transactions, caching, security, JWT, OAuth2.', prefix: 'spring/', to: '/category/spring-framework'},
  {title: 'Microservices', blurb: 'Gateway, resilience, saga, CQRS, outbox, observability.', prefix: 'microservices/', to: '/microservices/overview'},
  {title: 'Databases', blurb: 'Schema design, isolation and MVCC, SQL, sharding, NoSQL, migrations.', prefix: 'databases/', to: '/category/databases'},
  {title: 'Messaging', blurb: 'Kafka and RabbitMQ: groups, delivery, ordering, dead letters.', prefix: 'messaging/', to: '/category/messaging'},
  {title: 'DevOps and Cloud', blurb: 'Docker, Kubernetes, CI/CD, twelve-factor, deployments.', prefix: 'devops/', to: '/category/devops--cloud'},
  {title: 'System design', blurb: 'URL shortener, rate limiter, orders, notifications, trade-offs.', prefix: 'system-design/', to: '/category/system-design'},
  {title: 'Interview toolkit', blurb: 'Questions by level, STAR answers, coding problems, cheat sheets.', prefix: 'toolkit/', to: '/category/interview-toolkit'},
];

function usePageCounts() {
  const all = useAllDocsData();
  const docs = Object.values(all)[0]?.versions[0]?.docs ?? [];
  const real = docs.filter((d) => d.id !== 'intro' && !d.path.startsWith('/category/'));
  return {total: real.length, byPrefix: (prefix: string) => real.filter((d) => d.id.startsWith(prefix)).length};
}

export default function Home(): React.JSX.Element {
  const {level, chosen, info} = useLevel();
  const {total, byPrefix} = usePageCounts();
  const coreFor = (prefix: string) =>
    PAGES.filter((p) => p.path.startsWith('/' + prefix.replace(/\/$/, '')) && relevance(level, p.level) === 'core').length;

  return (
    <Layout
      title="Java, Spring Boot & Microservices Interview Prep"
      description="Free, in-depth interview preparation for Java, Spring Boot, microservices, databases, Kafka and system design, with tested code, diagrams and model answers.">
      <header className={styles.hero}>
        <div className="container">
          <h1 className={styles.title}>Java, Spring Boot and Microservices interview prep</h1>
          <p className={styles.subtitle}>
            Clear explanations, code that was actually run, and the follow-up questions interviewers ask. {total} pages, 100 practice questions.
          </p>

          <div className={styles.step}>
            <div className={styles.stepLabel}>
              <span className={styles.stepNum}>1</span> Choose your level <small>(optional, changes what the guide shows first)</small>
            </div>
            <LevelPicker />
          </div>

          <div className={styles.step}>
            <div className={styles.stepLabel}>
              <span className={styles.stepNum}>2</span> Start learning
            </div>
            <div className={styles.actions}>
              <Link className={clsx(styles.btn, styles.btnPrimary)} to="/my-plan">
                {chosen ? `Open my ${info?.label} plan` : 'See a study plan'}
              </Link>
              <a className={clsx(styles.btn, styles.btnSecondary)} href="#topics">Browse topics</a>
              <Link className={clsx(styles.btn, styles.btnSecondary)} to="/quiz">Take the quiz</Link>
            </div>
          </div>
        </div>
      </header>

      <main className={clsx('container', styles.main)}>
        <h2 id="topics" className={styles.h2}>Topics</h2>
        <div className={styles.grid}>
          {TOPICS.map((t) => (
            <Link key={t.title} to={t.to} className={styles.card}>
              <h3>{t.title}</h3>
              <p>{t.blurb}</p>
              <span className={styles.count}>
                {chosen ? `${coreFor(t.prefix)} core for you · ${byPrefix(t.prefix)} pages` : `${byPrefix(t.prefix)} pages`}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </Layout>
  );
}
