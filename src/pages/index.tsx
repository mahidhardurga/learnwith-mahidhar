import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {useAllDocsData} from '@docusaurus/plugin-content-docs/client';
import styles from './index.module.css';

interface Topic {
  title: string;
  blurb: string;
  prefix: string;
  to: string;
}

const TOPICS: Topic[] = [
  {title: 'Java and the JVM', blurb: 'Collections internals, concurrency, the memory model, GC and virtual threads.', prefix: 'java/', to: '/category/java'},
  {title: 'Spring', blurb: 'IoC and AOP, Boot, JPA, transactions, caching, security, JWT and OAuth2.', prefix: 'spring/', to: '/category/spring-framework'},
  {title: 'Microservices', blurb: 'Gateway, resilience, saga, CQRS, outbox and observability.', prefix: 'microservices/', to: '/microservices/overview'},
  {title: 'Databases', blurb: 'Schema design, isolation and MVCC, SQL, sharding, NoSQL and migrations.', prefix: 'databases/', to: '/category/databases'},
  {title: 'Messaging', blurb: 'Kafka and RabbitMQ: groups, delivery, ordering and dead letters.', prefix: 'messaging/', to: '/category/messaging'},
  {title: 'AI and LLMs', blurb: 'Tokens, prompts, context, embeddings, RAG and AI agents in plain words.', prefix: 'ai/', to: '/category/ai-and-llms'},
  {title: 'DevOps and cloud', blurb: 'Docker, Kubernetes, CI/CD, twelve-factor and deployment strategies.', prefix: 'devops/', to: '/category/devops--cloud'},
  {title: 'System design', blurb: 'URL shortener, rate limiter, orders, notifications and trade-offs.', prefix: 'system-design/', to: '/category/system-design'},
  {title: 'Interview toolkit', blurb: 'Questions by level, STAR answers, coding problems and cheat sheets.', prefix: 'toolkit/', to: '/category/interview-toolkit'},
];

const PARTS = [
  ['01', 'Definition', 'One idea, three levels of depth'],
  ['02', 'Why it exists', 'The problem it was built to solve'],
  ['03', 'How it works', 'The mental model, with diagrams'],
  ['04', 'Example code', 'Tested code you can run'],
  ['05', 'System design', 'Scale, failure and operations'],
  ['06', 'When to use it', 'And when to think twice'],
  ['07', 'Common mistakes', 'What goes wrong in practice'],
  ['08', 'Interview questions', 'With model answers'],
  ['09', 'Check yourself', 'Labs and quizzes'],
  ['10', 'Key takeaways', 'And the next topic'],
];

const LABS: {title: string; blurb: string; to: string}[] = [
  {title: 'HashMap', blurb: 'Hash keys, watch collisions, resizing and treeification.', to: '/java/core-java/hashmap-internals'},
  {title: 'Circuit breaker', blurb: 'Trip it, wait it out, close it again.', to: '/microservices/resilience/resilience4j'},
  {title: 'Saga', blurb: 'Fail a payment and watch the compensation run.', to: '/microservices/data-consistency/saga'},
  {title: 'Kafka partitions', blurb: 'Keys, partitions and consumer groups, live.', to: '/messaging/kafka-fundamentals'},
  {title: 'Token bucket', blurb: 'Bursts, refill and 429s on a simulated clock.', to: '/system-design/rate-limiter'},
  {title: 'Isolation levels', blurb: 'Which anomaly each level allows, side by side.', to: '/databases/acid-isolation-mvcc'},
];

function usePageCounts() {
  const all = useAllDocsData();
  const docs = Object.values(all)[0]?.versions[0]?.docs ?? [];
  const real = docs.filter((d) => d.id !== 'intro' && !d.path.startsWith('/category/'));
  return {total: real.length, byPrefix: (prefix: string) => real.filter((d) => d.id.startsWith(prefix)).length};
}

export default function Home(): React.JSX.Element {
  const {total, byPrefix} = usePageCounts();

  return (
    <Layout
      title="Java, Spring Boot & Microservices Interview Prep"
      description="Free, in-depth interview preparation for Java, Spring Boot, microservices, databases, Kafka and system design, with tested code, diagrams, interactive labs and model answers.">
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Java · Spring Boot · Microservices</p>
        <h1 className={styles.title}>
          Understand it.<br />
          <span className={styles.titleSoft}>Then defend it in the interview.</span>
        </h1>
        <p className={styles.subtitle}>
          {total} topics, each explained the same way: what it is, why it exists, how it works, working code and the questions interviewers ask.
        </p>
        <div className={styles.actions}>
          <Link className={clsx(styles.btn, styles.btnPrimary)} to="/java/core-java/oop-and-design">Start learning</Link>
          <a className={clsx(styles.btn, styles.btnGhost)} href="#topics">Browse topics</a>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.section} aria-labelledby="method">
          <h2 id="method" className={styles.h2}>Every topic, the same ten parts.</h2>
          <p className={styles.lead}>Learn in a fixed order. When a part does not apply to a topic, it is skipped and the numbering stays put.</p>
          <ol className={styles.parts}>
            {PARTS.map(([n, t, d]) => (
              <li key={n} className={styles.part}>
                <span className={styles.partNum}>{n}</span>
                <strong>{t}</strong>
                <span>{d}</span>
              </li>
            ))}
          </ol>
        </section>

        <section id="topics" className={styles.section} aria-labelledby="topics-h">
          <h2 id="topics-h" className={styles.h2}>Pick a topic.</h2>
          <div className={styles.grid}>
            {TOPICS.map((t) => (
              <Link key={t.title} to={t.to} className={styles.card}>
                <h3>{t.title}</h3>
                <p>{t.blurb}</p>
                <span className={styles.count}>
                  {byPrefix(t.prefix)} topics
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className={clsx(styles.section, styles.labs)} aria-labelledby="labs-h">
          <h2 id="labs-h" className={styles.h2}>Learn by doing.</h2>
          <p className={styles.lead}>Interactive labs sit inside the topics. Poke the model until the concept clicks.</p>
          <div className={styles.labGrid}>
            {LABS.map((l) => (
              <Link key={l.title} to={l.to} className={styles.lab}>
                <strong>{l.title}</strong>
                <span>{l.blurb}</span>
              </Link>
            ))}
          </div>
          <div className={styles.actions}>
            <Link className={clsx(styles.btn, styles.btnPrimary)} to="/quiz">Take the quick quiz</Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
