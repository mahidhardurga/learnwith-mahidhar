import React from 'react';
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
      description="Free interview preparation for Java, Spring Boot, microservices, GenAI, databases, Kafka and system design: a short definition and example code for every topic.">
      <header className={styles.hero}>
        <p className={styles.eyebrow}>{total} topics · plain words · example code</p>
        <h1 className={styles.title}>
          Understand it.<br />
          <span className={styles.titleSoft}>Then defend it in the interview.</span>
        </h1>
        <p className={styles.subtitle}>Pick a tech stack. Every topic is a short definition and example code.</p>
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
      </main>
    </Layout>
  );
}
