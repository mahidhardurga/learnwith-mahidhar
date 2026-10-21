import fs from 'node:fs';
import path from 'node:path';
import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

type Item = Record<string, unknown>;

/** Sub-topics per topic page: {"java/core-java/oop-and-design": {label, subs: ["encapsulation", ...]}}. */
type DocRef = string | {id: string; label: string};
const SUBTOPICS = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/subtopics.json'), 'utf8')) as Record<
  string,
  {label: string; subs?: string[]; versions?: {label: string; items: DocRef[]}[]}
>;

const docItem = (ref: DocRef): Item => (typeof ref === 'string' ? {type: 'doc', id: ref} : {type: 'doc', id: ref.id, label: ref.label});

/** A doc, or a category (linked to the topic page) holding its sub-topics. */
function topicItem(id: string): Item {
  const sub = SUBTOPICS[id];
  if (!sub) return {type: 'doc', id};
  if (sub.versions) {
    // a topic whose sub-topics are grouped by Java version (Java 8, Java 9, ...)
    return {
      type: 'category',
      label: sub.label,
      link: {type: 'doc', id},
      items: sub.versions.map((v) => ({
        type: 'category',
        label: v.label,
        link: {type: 'generated-index', description: `What ${v.label.replace(/ \(LTS\)/, '')} added to Java, with a definition and an example for each feature.`},
        items: v.items.map(docItem),
      })),
    };
  }
  return {type: 'category', label: sub.label, link: {type: 'doc', id}, items: (sub.subs ?? []).map((s) => ({type: 'doc', id: `${id}/${s}`}))};
}

const DOCS = path.join(__dirname, 'docs');

/** Prefix every name with a folder, to build doc ids such as "java/core-java/oop-and-design". */
const ids = (folder: string, names: string[]): string[] => names.map((n) => `${folder}/${n}`);

/**
 * Sections that are grouped by hand. The files stay where they are, so URLs do not change.
 * Sections not listed here (AI) use their folders as groups.
 */
const GROUPS: Record<string, {label: string; ids: string[]}[]> = {
  java: [
    {label: 'Language basics', ids: ids('java/core-java', ['oop-and-design', 'generics', 'exceptions', 'immutability', 'modern-java'])},
    {label: 'Collections', ids: ids('java/core-java', ['collections-framework', 'equals-hashcode', 'hashmap-internals', 'concurrenthashmap'])},
    {label: 'Concurrency', ids: ids('java/concurrency-jvm', ['threads-basics', 'synchronization-and-locks', 'memory-model', 'executors', 'completablefuture', 'virtual-threads'])},
    {label: 'JVM', ids: ids('java/concurrency-jvm', ['garbage-collection', 'jvm-tuning-diagnostics'])},
  ],
  spring: [
    {
      label: 'Core container',
      ids: ids('spring/core', ['ioc-and-dependency-injection', 'bean-lifecycle-and-scopes', 'configuration-profiles-conditions', 'aop-and-proxies', 'application-events']),
    },
    {label: 'Spring Boot', ids: ids('spring/boot', ['overview', 'starters', 'auto-configuration', 'configuration', 'actuator'])},
    {label: 'REST and testing', ids: ids('spring/boot', ['validation', 'exception-handling', 'testing-basics', 'testing-slices-testcontainers'])},
    {label: 'Data and JPA', ids: ids('spring/data', ['jpa-basics', 'n-plus-one-lazy-loading', 'sql-tuning-indexing', 'caching'])},
    {label: 'Transactions and locking', ids: ids('spring/data', ['transactions', 'locking'])},
    {
      label: 'Security',
      ids: ids('spring/security', ['security-architecture', 'jwt', 'oauth2-oidc', 'method-security', 'common-vulnerabilities']),
    },
  ],
  microservices: [
    {
      label: 'Services and the edge',
      ids: ['microservices/overview', ...ids('microservices/infrastructure', ['api-gateway', 'service-discovery', 'config-server']), 'microservices/communication/service-communication'],
    },
    {label: 'Resilience and observability', ids: ['microservices/resilience/resilience4j', 'microservices/observability/observability']},
    {label: 'Data consistency', ids: ids('microservices/data-consistency', ['saga', 'outbox-idempotency', 'cqrs-event-sourcing'])},
  ],
  databases: [
    {label: 'Relational databases', ids: ids('databases', ['relational-design', 'sql-patterns', 'schema-migrations', 'acid-isolation-mvcc'])},
    {label: 'Scaling and NoSQL', ids: ids('databases', ['replication-sharding', 'nosql-and-redis'])},
  ],
  messaging: [
    {label: 'Kafka', ids: ids('messaging', ['kafka-fundamentals', 'kafka-consumers-offsets', 'kafka-ordering-design'])},
    {label: 'RabbitMQ', ids: ids('messaging', ['rabbitmq-basics'])},
  ],
  devops: [
    {label: 'Cloud-native basics', ids: ids('devops', ['twelve-factor', 'docker-for-java', 'kubernetes-basics'])},
    {label: 'Delivery', ids: ids('devops', ['ci-cd', 'deployment-strategies'])},
  ],
  'system-design': [
    {label: 'Approach', ids: ids('system-design', ['approach-and-estimation', 'tradeoffs'])},
    {label: 'Classic designs', ids: ids('system-design', ['url-shortener', 'rate-limiter', 'order-processing', 'notification-service'])},
    {label: 'AI designs', ids: ids('system-design', ['design-a-rag-chatbot', 'design-an-ai-agent-platform'])},
  ],
  toolkit: [
    {label: 'Interview questions', ids: ids('toolkit', ['questions-fresher', 'questions-mid-level', 'questions-senior'])},
    {label: 'Practice and reference', ids: ids('toolkit', ['coding-problems', 'behavioral-star', 'cheat-sheets'])},
  ],
};

interface CategoryFile {
  label: string;
  position?: number;
  link?: Record<string, unknown>;
}

/** One top-level section per folder in docs/, ordered by the "position" in its _category_.json. */
function sections(): Item[] {
  const found = fs
    .readdirSync(DOCS, {withFileTypes: true})
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(DOCS, d.name, '_category_.json')))
    .map((d) => {
      const meta = JSON.parse(fs.readFileSync(path.join(DOCS, d.name, '_category_.json'), 'utf8')) as CategoryFile;
      return {dir: d.name, meta};
    })
    .sort((a, b) => (a.meta.position ?? 99) - (b.meta.position ?? 99));

  return found.map(({dir, meta}) => {
    const groups = GROUPS[dir];
    const items: Item[] = groups
      ? groups.map((g) => ({type: 'category', label: g.label, items: g.ids.map((id) => topicItem(id))}))
      : [{type: 'autogenerated', dirName: dir}];
    return {type: 'category', label: meta.label, link: meta.link, items};
  });
}

const sidebars: SidebarsConfig = {
  mainSidebar: [{type: 'doc', id: 'intro'}, ...sections()] as SidebarsConfig[string],
};

export default sidebars;
