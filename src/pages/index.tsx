import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {useAllDocsData} from '@docusaurus/plugin-content-docs/client';
import styles from './index.module.css';

interface Stack {
  title: string;
  mark: string;
  color: string;
  blurb: string;
  prefix: string;
  to: string;
}

const STACKS: Stack[] = [
  {title: 'Java', mark: 'Jv', color: '#e8590c', blurb: 'Collections internals, concurrency, the memory model, GC and virtual threads.', prefix: 'java/', to: '/category/java'},
  {title: 'Spring', mark: 'Sp', color: '#2f9e44', blurb: 'IoC and AOP, Boot, JPA, transactions, caching, security, JWT and OAuth2.', prefix: 'spring/', to: '/category/spring-framework'},
  {title: 'Microservices', mark: 'Ms', color: '#7048e8', blurb: 'Gateway, resilience, saga, CQRS, outbox and observability.', prefix: 'microservices/', to: '/microservices/overview'},
  {title: 'GenAI and LLMs', mark: 'AI', color: '#d6336c', blurb: 'Tokens, prompts, context, embeddings, RAG and AI agents in plain words.', prefix: 'ai/', to: '/category/ai-and-llms'},
  {title: 'Databases', mark: 'Db', color: '#1c7ed6', blurb: 'Schema design, isolation and MVCC, SQL, sharding, NoSQL and migrations.', prefix: 'databases/', to: '/category/databases'},
  {title: 'Messaging', mark: 'Mq', color: '#0c8599', blurb: 'Kafka and RabbitMQ: groups, delivery, ordering and dead letters.', prefix: 'messaging/', to: '/category/messaging'},
  {title: 'DevOps and cloud', mark: 'Do', color: '#4263eb', blurb: 'Docker, Kubernetes, CI/CD, twelve-factor and deployment strategies.', prefix: 'devops/', to: '/category/devops--cloud'},
  {title: 'System design', mark: 'Sd', color: '#f08c00', blurb: 'URL shortener, rate limiter, orders, notifications and trade-offs.', prefix: 'system-design/', to: '/category/system-design'},
  {title: 'Interview toolkit', mark: 'Tk', color: '#868e96', blurb: 'Interview questions, STAR answers, coding problems and cheat sheets.', prefix: 'toolkit/', to: '/category/interview-toolkit'},
];

const LABS: {title: string; blurb: string; to: string}[] = [
  {title: 'HashMap', blurb: 'Hash keys, watch collisions, resizing and treeification.', to: '/java/core-java/hashmap-internals'},
  {title: 'Circuit breaker', blurb: 'Trip it, wait it out, close it again.', to: '/microservices/resilience/resilience4j'},
  {title: 'Saga', blurb: 'Fail a payment and watch the compensation run.', to: '/microservices/data-consistency/saga'},
  {title: 'Kafka partitions', blurb: 'Keys, partitions and consumer groups, live.', to: '/messaging/kafka-fundamentals'},
  {title: 'Token bucket', blurb: 'Bursts, refill and 429s on a simulated clock.', to: '/system-design/rate-limiter'},
  {title: 'Isolation levels', blurb: 'Which anomaly each level allows, side by side.', to: '/databases/acid-isolation-mvcc'},
  {title: 'Token cost', blurb: 'See how text becomes tokens and what a request costs.', to: '/ai/foundations/tokens-and-context-window'},
  {title: 'RAG', blurb: 'Retrieve the right chunks and watch the answer improve.', to: '/ai/retrieval/rag'},
  {title: 'AI agent', blurb: 'Step an agent through tools and decisions.', to: '/ai/agents/ai-agents'},
  {title: 'Guardrails', blurb: 'Try unsafe inputs against input and output checks.', to: '/ai/safety/guardrails-and-safety'},
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
      title="Java, Spring Boot, Microservices & GenAI Interview Prep"
      description="Free interview preparation for Java, Spring Boot, microservices, GenAI, databases, Kafka and system design, with plain explanations, tested code, interactive labs and model answers.">
      <header className={styles.hero}>
        <p className={styles.eyebrow}>{total} topics · plain words · working code</p>
        <h1 className={styles.title}>
          Understand it.<br />
          <span className={styles.titleSoft}>Then defend it in the interview.</span>
        </h1>
        <p className={styles.subtitle}>Pick a tech stack and start with the basics. Each topic explains what it is, why it exists and how to use it.</p>
      </header>

      <main className={styles.main}>
        <section id="stacks" className={styles.stacks} aria-labelledby="stacks-h">
          <h2 id="stacks-h" className={styles.h2}>Choose a tech stack.</h2>
          <div className={styles.grid}>
            {STACKS.map((s) => (
              <Link key={s.title} to={s.to} className={styles.card} style={{['--c' as string]: s.color}}>
                <span className={styles.mark} aria-hidden="true">{s.mark}</span>
                <h3>{s.title}</h3>
                <p>{s.blurb}</p>
                <span className={styles.count}>
                  {byPrefix(s.prefix)} topics <span aria-hidden="true">→</span>
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
