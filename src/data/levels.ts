import pagesJson from './pages.json';

export type Level = 'beginner' | 'mid' | 'senior';
export type LevelPref = Level | 'all';
export type Relevance = 'core' | 'review' | 'stretch' | 'later';

export interface LevelInfo {
  id: Level;
  label: string;
  years: string;
  emoji: string;
  color: string;
  blurb: string;
  questions: {to: string; count: number};
}

export const LEVELS: LevelInfo[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    years: '0-2 years',
    emoji: '🌱',
    color: '#34d399',
    blurb: 'Fundamentals, Spring Boot basics, SQL and a clean CRUD project.',
    questions: {to: '/toolkit/questions-fresher', count: 35},
  },
  {
    id: 'mid',
    label: 'Mid-level',
    years: '3-5 years',
    emoji: '🚀',
    color: '#7c5cff',
    blurb: 'Internals, transactions, microservices patterns, Kafka and Docker.',
    questions: {to: '/toolkit/questions-mid-level', count: 35},
  },
  {
    id: 'senior',
    label: 'Senior',
    years: '5+ years',
    emoji: '🧠',
    color: '#f472b6',
    blurb: 'Failure modes, consistency, scaling, system design and leadership.',
    questions: {to: '/toolkit/questions-senior', count: 30},
  },
];

export const RELEVANCE_LABEL: Record<Relevance, string> = {
  core: 'Core for your level',
  review: 'Review (you probably know this)',
  stretch: 'Stretch (next level up)',
  later: 'Later (advanced topic)',
};

const RANK: Record<Level, number> = {beginner: 0, mid: 1, senior: 2};

/** How relevant a page written at `pageLevel` is for someone preparing at `pref`. */
export function relevance(pref: LevelPref, pageLevel: Level): Relevance {
  if (pref === 'all') return 'core';
  const d = RANK[pageLevel] - RANK[pref];
  if (d === 0) return 'core';
  if (d < 0) return 'review';
  return d === 1 ? 'stretch' : 'later';
}

export interface PageMeta {
  path: string;
  title: string;
  /** The level at which this topic becomes core interview material. */
  level: Level;
}

/** Single source of truth (also read by the build-time section plugin): every guide page, its short title and target level. */
export const PAGES: PageMeta[] = pagesJson as PageMeta[];

export const PAGE_BY_PATH: Record<string, PageMeta> = Object.fromEntries(PAGES.map((p) => [p.path, p]));

export interface PlanWeek {
  title: string;
  focus: string;
  pages: string[];
  practice: string;
}

/** Week-by-week study plans (the same tracks as the Study Roadmap page, as data). */
export const PLANS: Record<Level, PlanWeek[]> = {
  beginner: [
    {title: 'Week 1: Java fundamentals', focus: 'OOP, collections, exceptions, equals/hashCode', pages: ['/java/core-java/oop-and-design', '/java/core-java/collections-framework', '/java/core-java/equals-hashcode', '/java/core-java/exceptions'], practice: 'Write small programs; answer questions 1-24 aloud.'},
    {title: 'Week 2: Modern Java and threads', focus: 'Streams, lambdas, Java 8+ features, thread basics', pages: ['/java/core-java/streams-and-lambdas', '/java/core-java/modern-java', '/java/concurrency-jvm/threads-basics'], practice: 'Solve coding problems 1-6 and stream exercises.'},
    {title: 'Week 3: Algorithms warm-up', focus: 'Hashing, stacks, sliding window, sorting patterns', pages: ['/toolkit/coding-problems'], practice: '3-4 easy problems a day, by pattern.'},
    {title: 'Week 4: SQL and databases', focus: 'Joins, group by, indexes, schema design', pages: ['/databases/sql-patterns', '/databases/relational-design'], practice: 'Write 20 queries on a sample schema.'},
    {title: 'Week 5: Spring core', focus: 'IoC, dependency injection, beans and scopes', pages: ['/spring/core/ioc-and-dependency-injection', '/spring/core/bean-lifecycle-and-scopes'], practice: 'Build a small CRUD app with constructor injection.'},
    {title: 'Week 6: Spring Boot, REST and JPA', focus: 'Starters, configuration, validation, errors, JPA', pages: ['/spring/boot/overview', '/spring/boot/starters', '/spring/boot/configuration', '/spring/data/jpa-basics', '/spring/boot/validation', '/spring/boot/exception-handling'], practice: 'Add validation, pagination and error handling to your app.'},
    {title: 'Week 7: Testing and containers', focus: 'JUnit, Mockito, Docker basics', pages: ['/spring/boot/testing-basics', '/devops/docker-for-java'], practice: 'Unit-test your app and containerise it.'},
    {title: 'Week 8: Mock interviews', focus: 'Question bank and revision', pages: ['/toolkit/questions-fresher', '/toolkit/cheat-sheets'], practice: '2-3 mock interviews; explain your project in two minutes.'},
  ],
  mid: [
    {title: 'Week 1: Collections internals', focus: 'HashMap, ConcurrentHashMap, generics, immutability', pages: ['/java/core-java/hashmap-internals', '/java/core-java/concurrenthashmap', '/java/core-java/generics', '/java/core-java/immutability'], practice: 'Explain each aloud; write an LRU cache.'},
    {title: 'Week 2: Concurrency', focus: 'Executors, CompletableFuture, locks', pages: ['/java/concurrency-jvm/executors', '/java/concurrency-jvm/completablefuture', '/java/concurrency-jvm/synchronization-and-locks'], practice: 'Solve the producer-consumer and odd/even thread problems.'},
    {title: 'Week 3: JVM', focus: 'GC and memory', pages: ['/java/concurrency-jvm/garbage-collection', '/java/concurrency-jvm/jvm-tuning-diagnostics'], practice: 'Read a GC log; take a heap dump of a toy leak.'},
    {title: 'Week 4: Spring internals', focus: 'Lifecycle, AOP, events, auto-configuration', pages: ['/spring/core/bean-lifecycle-and-scopes', '/spring/core/aop-and-proxies', '/spring/core/application-events', '/spring/core/configuration-profiles-conditions', '/spring/boot/auto-configuration'], practice: 'Write a custom aspect and a custom starter.'},
    {title: 'Week 5: The data layer', focus: 'Transactions, N+1, tuning, caching', pages: ['/spring/data/transactions', '/spring/data/n-plus-one-lazy-loading', '/spring/data/sql-tuning-indexing', '/spring/data/caching'], practice: 'Reproduce and fix an N+1; read EXPLAIN plans.'},
    {title: 'Week 6: Microservices core', focus: 'Decomposition, gateway, discovery, config, resilience', pages: ['/microservices/overview', '/microservices/communication/service-communication', '/microservices/infrastructure/api-gateway', '/microservices/infrastructure/service-discovery', '/microservices/infrastructure/config-server', '/microservices/resilience/resilience4j'], practice: 'Two services with a circuit breaker between them.'},
    {title: 'Week 7: Consistency and messaging', focus: 'Saga, outbox, Kafka', pages: ['/microservices/data-consistency/saga', '/microservices/data-consistency/outbox-idempotency', '/messaging/kafka-fundamentals', '/messaging/kafka-consumers-offsets'], practice: 'Build an idempotent consumer with a dead-letter topic.'},
    {title: 'Week 8: Security and DevOps', focus: 'Spring Security, JWT, Kubernetes, CI/CD', pages: ['/spring/security/security-architecture', '/spring/security/jwt', '/spring/security/common-vulnerabilities', '/devops/docker-for-java', '/devops/kubernetes-basics', '/devops/ci-cd'], practice: 'Secure an API with JWT; deploy it locally.'},
    {title: 'Week 9: Algorithms and design basics', focus: 'Patterns, first system designs', pages: ['/toolkit/coding-problems', '/system-design/approach-and-estimation', '/system-design/url-shortener'], practice: 'One medium problem daily; one design a week.'},
    {title: 'Week 10: Mock interviews', focus: 'Question bank and stories', pages: ['/toolkit/questions-mid-level', '/toolkit/behavioral-star', '/toolkit/cheat-sheets'], practice: '3-4 mocks with honest feedback.'},
  ],
  senior: [
    {title: 'Weeks 1-2: Gap audit', focus: 'Find what you cannot explain in two minutes', pages: ['/toolkit/cheat-sheets', '/toolkit/questions-mid-level'], practice: 'Mark every weak topic; fix those first.'},
    {title: 'Week 3: Performance and the JVM', focus: 'GC, memory model, diagnostics, virtual threads', pages: ['/java/concurrency-jvm/garbage-collection', '/java/concurrency-jvm/jvm-tuning-diagnostics', '/java/concurrency-jvm/memory-model', '/java/concurrency-jvm/virtual-threads'], practice: 'Prepare a real performance-win story with numbers.'},
    {title: 'Week 4: Distributed data', focus: 'Isolation, sharding, NoSQL, migrations, locking', pages: ['/databases/acid-isolation-mvcc', '/databases/replication-sharding', '/databases/nosql-and-redis', '/databases/schema-migrations', '/spring/data/locking'], practice: 'Explain write skew and a shard-key choice aloud.'},
    {title: 'Week 5: Distributed patterns', focus: 'Saga, CQRS, outbox, Kafka design, RabbitMQ', pages: ['/microservices/data-consistency/saga', '/microservices/data-consistency/cqrs-event-sourcing', '/microservices/data-consistency/outbox-idempotency', '/messaging/kafka-ordering-design', '/messaging/rabbitmq-basics'], practice: 'Sketch an order flow with failure paths.'},
    {title: 'Week 6: Resilience and delivery', focus: 'Resilience, observability, deployments', pages: ['/microservices/resilience/resilience4j', '/microservices/observability', '/devops/deployment-strategies', '/devops/twelve-factor'], practice: 'Describe how you would debug latency spikes.'},
    {title: 'Week 7: Security architecture', focus: 'OAuth2, method security, vulnerabilities', pages: ['/spring/security/oauth2-oidc', '/spring/security/method-security', '/spring/security/common-vulnerabilities'], practice: 'Design auth across microservices.'},
    {title: 'Weeks 8-9: System design practice', focus: 'Framework, worked designs, trade-offs', pages: ['/system-design/approach-and-estimation', '/system-design/rate-limiter', '/system-design/order-processing', '/system-design/notification-service', '/system-design/tradeoffs', '/system-design/url-shortener'], practice: 'Two timed designs a week, aloud.'},
    {title: 'Week 10: Leadership stories', focus: 'STAR answers with numbers', pages: ['/toolkit/behavioral-star'], practice: 'Write 6-8 stories and rehearse under three minutes.'},
    {title: 'Week 11: Mock interviews', focus: 'Senior question bank', pages: ['/toolkit/questions-senior'], practice: 'Mock system design and behavioural rounds.'},
    {title: 'Week 12: Polish', focus: 'Weak spots and company research', pages: ['/toolkit/study-roadmap', '/toolkit/cheat-sheets'], practice: 'Final revision and questions to ask the interviewer.'},
  ],
};
