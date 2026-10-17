export type Category = 'Java' | 'Spring' | 'Microservices' | 'Data' | 'Messaging' | 'Design' | 'AI';

export interface Flashcard {
  category: Category;
  question: string;
  answer: string;
  /** Page with the full explanation. */
  link: string;
}

export const CATEGORIES: Category[] = ['Java', 'Spring', 'Microservices', 'Data', 'Messaging', 'Design', 'AI'];

export const FLASHCARDS: Flashcard[] = [
  {
    category: 'Java',
    question: 'A HashMap bucket reaches 8 entries. What happens?',
    answer:
      'It treeifies into a red-black tree, but only if the table has at least 64 buckets; otherwise the map resizes instead. The bin turns back into a list at 6 entries. Lookup in a degenerate bucket drops from O(n) to O(log n).',
    link: '/java/core-java/hashmap-internals',
  },
  {
    category: 'Java',
    question: 'Why is `if (!map.containsKey(k)) map.put(k, v)` unsafe on a ConcurrentHashMap?',
    answer:
      'Each call is atomic, but the sequence is not: two threads can both see "absent" and both put. Use putIfAbsent, computeIfAbsent or merge, which are atomic per key.',
    link: '/java/core-java/concurrenthashmap',
  },
  {
    category: 'Java',
    question: 'Does `volatile int count; count++` make the counter thread-safe?',
    answer:
      'No. volatile gives visibility and ordering, but count++ is read-modify-write in three steps, so updates are lost. Use AtomicInteger, or LongAdder for hot counters.',
    link: '/java/concurrency-jvm/synchronization-and-locks',
  },
  {
    category: 'Java',
    question: 'ThreadPoolExecutor: core 8, max 32, unbounded queue. How many threads will it ever run?',
    answer:
      'Eight. New tasks are queued once the core threads are busy, and with an unbounded queue the queue never reports full, so max is never used. Use a bounded queue.',
    link: '/java/concurrency-jvm/executors',
  },
  {
    category: 'Java',
    question: 'Your pod is OOM-killed (exit 137) but heap usage looked fine. Why?',
    answer:
      'Process memory is more than heap: metaspace, thread stacks, direct buffers, code cache and GC structures count against the container limit. Leave headroom, for example MaxRAMPercentage=75.',
    link: '/java/concurrency-jvm/jvm-tuning-diagnostics',
  },
  {
    category: 'Java',
    question: 'What is the danger of a record with a `List` component?',
    answer:
      'Records are only shallowly immutable. A mutable list component can still be changed from outside. Copy it in the compact constructor with List.copyOf.',
    link: '/java/core-java/immutability',
  },
  {
    category: 'Java',
    question: 'When does a virtual thread NOT help?',
    answer:
      'CPU-bound work (parallelism is still bounded by cores) and code that pins its carrier, such as long synchronized I/O blocks before JDK 24. They shine for blocking I/O with high concurrency.',
    link: '/java/concurrency-jvm/virtual-threads',
  },
  {
    category: 'Spring',
    question: 'Why does `@Transactional` do nothing when one method calls another in the same class?',
    answer:
      'Spring applies it through a proxy. A call on this bypasses the proxy, so no advice runs. Move the method to another bean or use TransactionTemplate.',
    link: '/spring/core/aop-and-proxies',
  },
  {
    category: 'Spring',
    question: 'A transactional method throws a checked exception. Is the transaction rolled back?',
    answer:
      'By default no: only RuntimeException and Error roll back. Use @Transactional(rollbackFor = Exception.class) if you want checked exceptions to roll back.',
    link: '/spring/data/transactions',
  },
  {
    category: 'Spring',
    question: 'What is the N+1 problem and the quickest fixes?',
    answer:
      'One query for N parents plus one lazy query per parent. Fix with join fetch, @EntityGraph, default_batch_fetch_size or a projection, and assert the statement count in a test.',
    link: '/spring/data/n-plus-one-lazy-loading',
  },
  {
    category: 'Spring',
    question: 'Prototype bean injected into a singleton: how many instances does the singleton see?',
    answer:
      'One. It is resolved once at construction. Inject ObjectProvider (or use @Lookup or a scoped proxy) to get a fresh instance each time.',
    link: '/spring/core/bean-lifecycle-and-scopes',
  },
  {
    category: 'Spring',
    question: 'Why are circular references rejected by default in Spring Boot?',
    answer:
      'Boot 2.6+ sets allow-circular-references=false because cycles hide design problems. Constructor injection already fails at startup; redesign instead of reaching for @Lazy.',
    link: '/spring/core/ioc-and-dependency-injection',
  },
  {
    category: 'Spring',
    question: '401 vs 403 in Spring Security?',
    answer:
      '401 means unauthenticated (missing or invalid credentials). 403 means authenticated but not allowed. hasRole("ADMIN") checks the authority ROLE_ADMIN.',
    link: '/spring/security/security-architecture',
  },
  {
    category: 'Spring',
    question: 'How do you stop IDOR (insecure direct object reference)?',
    answer:
      'Authorise every object access: scope queries by owner or tenant, or use @PostAuthorize. Return 404 for foreign resources. Hiding or randomising ids is not a defence.',
    link: '/spring/security/method-security',
  },
  {
    category: 'Spring',
    question: 'What must a resource server validate on a JWT?',
    answer:
      'Signature with a configured algorithm and key, exp and nbf, iss and aud. Decoding alone is not verification, and the token header must never choose the algorithm.',
    link: '/spring/security/jwt',
  },
  {
    category: 'Microservices',
    question: 'Why not put the database in a liveness probe?',
    answer:
      'If the database goes down, every pod fails liveness and restarts, turning an outage into a restart storm. Liveness should reflect the process only; readiness can include dependencies.',
    link: '/devops/kubernetes-basics',
  },
  {
    category: 'Microservices',
    question: 'Saga: orchestration or choreography?',
    answer:
      'Choreography (services react to events) suits short, simple flows. Orchestration (an explicit coordinator state machine) is clearer once there are many steps, branching and timeouts.',
    link: '/microservices/data-consistency/saga',
  },
  {
    category: 'Microservices',
    question: 'What problem does the transactional outbox solve?',
    answer:
      'The dual-write problem: updating the database and publishing an event are not atomic. Write the event to an outbox table in the same transaction and let a relay or CDC publish it.',
    link: '/microservices/data-consistency/outbox-idempotency',
  },
  {
    category: 'Microservices',
    question: 'A downstream service is slow. What protects you?',
    answer:
      'Timeouts, a circuit breaker that opens on slow or failing calls, bulkheads limiting concurrency, bounded retries with jitter on idempotent calls, and a deliberate fallback.',
    link: '/microservices/resilience/resilience4j',
  },
  {
    category: 'Microservices',
    question: 'Which Resilience4j aspect is outermost by default?',
    answer:
      'Retry, then CircuitBreaker, RateLimiter, TimeLimiter and Bulkhead innermost. So each retry attempt is recorded by the breaker.',
    link: '/microservices/resilience/resilience4j',
  },
  {
    category: 'Data',
    question: 'What is write skew and which isolation level allows it?',
    answer:
      'Two transactions read overlapping rows, decide, and write different rows, breaking an invariant (both on-call doctors go off duty). Snapshot isolation / repeatable read allows it; use serializable with retry, lock the read set, or a constraint.',
    link: '/databases/acid-isolation-mvcc',
  },
  {
    category: 'Data',
    question: 'Why is `NOT IN (subquery)` risky?',
    answer:
      'If the subquery returns any NULL, the predicate is unknown for every row and you get no results. Use NOT EXISTS.',
    link: '/databases/sql-patterns',
  },
  {
    category: 'Data',
    question: 'Why is OFFSET pagination slow on deep pages and what is the fix?',
    answer:
      'The database must walk and discard all skipped rows. Use keyset pagination: WHERE id > :last ORDER BY id LIMIT n.',
    link: '/databases/sql-patterns',
  },
  {
    category: 'Data',
    question: 'How do you rename a column with zero downtime?',
    answer:
      'Expand and contract: add the new column, write both, backfill in batches, switch reads, stop writing the old one, drop it in a later release.',
    link: '/databases/schema-migrations',
  },
  {
    category: 'Data',
    question: 'Why consistent hashing instead of hash % N for sharding?',
    answer:
      'Changing N with modulo remaps most keys (about 80% moving from 4 to 5 nodes in a test); consistent hashing moves roughly 1/N of them.',
    link: '/databases/replication-sharding',
  },
  {
    category: 'Messaging',
    question: 'What does Kafka guarantee about ordering?',
    answer:
      'Order only within a partition. Use a key (the aggregate id) so related events share a partition, and enable the idempotent producer so retries do not reorder.',
    link: '/messaging/kafka-ordering-design',
  },
  {
    category: 'Messaging',
    question: 'Is Kafka exactly-once?',
    answer:
      'Within Kafka: idempotent producer plus transactions plus read_committed. External side effects (database, HTTP) are not covered, so use at-least-once delivery with idempotent consumers.',
    link: '/messaging/kafka-consumers-offsets',
  },
  {
    category: 'Messaging',
    question: 'What is the maximum parallelism of a consumer group?',
    answer:
      'The number of partitions: each partition is read by exactly one consumer in the group. Extra consumers sit idle.',
    link: '/messaging/kafka-consumers-offsets',
  },
  {
    category: 'Messaging',
    question: 'What is the default dead-letter topic name in Spring Kafka 3?',
    answer:
      '<original-topic>-dlt (older versions used .DLT). A listener on the wrong name sees nothing. A DLT is a work queue for humans: alert, and keep a replay path.',
    link: '/messaging/kafka-ordering-design',
  },
  {
    category: 'Design',
    question: 'Token bucket vs fixed-window rate limiting?',
    answer:
      'Fixed windows let up to 2x the limit through at a boundary. A token bucket allows controlled bursts up to its capacity while enforcing the refill rate on average.',
    link: '/system-design/rate-limiter',
  },
  {
    category: 'Design',
    question: 'How do you avoid charging a customer twice?',
    answer:
      'Idempotency keys at your API and towards the provider, a validated order state machine, treat payment timeouts as unknown and confirm by query or webhook, and reconcile daily.',
    link: '/system-design/order-processing',
  },
  {
    category: 'Design',
    question: 'URL shortener: 301 or 302?',
    answer:
      '301 is cached by browsers (less load, no analytics, hard to change). 302 reaches your service on every click, so you keep analytics and control. Choose 302 when you count clicks or support expiry.',
    link: '/system-design/url-shortener',
  },
  {
    category: 'Design',
    question: 'Why keep a bulk email campaign off the OTP queue?',
    answer:
      'Head-of-line blocking: a 10M-message blast would delay password resets. Use separate topics, queues and workers per priority class and channel.',
    link: '/system-design/notification-service',
  },
  {
    category: 'AI',
    question: 'What does an LLM actually do when it writes an answer?',
    answer:
      'It predicts the next token, adds it to the text, and repeats. It continues text in the most likely way, so it can sound sure while being wrong.',
    link: '/ai/foundations/what-is-an-llm',
  },
  {
    category: 'AI',
    question: 'How does a chatbot appear to remember a conversation?',
    answer:
      'The model is stateless. The application resends the earlier messages with every call, which is why long chats cost more.',
    link: '/ai/foundations/what-is-an-llm',
  },
  {
    category: 'AI',
    question: 'What does the context window limit?',
    answer:
      'The tokens in one call, counting input and output together. A 7,500 token prompt with 1,000 tokens of output does not fit an 8,000 token window.',
    link: '/ai/foundations/tokens-and-context-window',
  },
  {
    category: 'AI',
    question: 'How is the cost of one LLM call worked out?',
    answer:
      'Input tokens times the input price plus output tokens times the output price. Prices are per million tokens, and output usually costs more.',
    link: '/ai/foundations/credits-pricing-cost',
  },
  {
    category: 'AI',
    question: 'What is the difference between prompt engineering and context engineering?',
    answer:
      'Prompt engineering is how you word the instructions. Context engineering is choosing everything the model sees on each call: instructions, tools, documents, history and memory.',
    link: '/ai/prompting/context-engineering',
  },
  {
    category: 'AI',
    question: 'Why embed documents instead of using keyword search only?',
    answer:
      "Embeddings capture meaning, so a question like 'money back' finds a page about refunds. Combine both, since keywords are better for exact codes and names.",
    link: '/ai/retrieval/embeddings-vector-databases',
  },
  {
    category: 'AI',
    question: 'A RAG bot answers wrongly. What do you check first?',
    answer:
      'What was retrieved. If the right chunk is missing, fix chunking, search or filters. If it was retrieved but ignored, fix the prompt or reduce noise.',
    link: '/ai/retrieval/rag',
  },
  {
    category: 'AI',
    question: 'How do you keep an AI agent from looping or costing too much?',
    answer:
      'Set a maximum number of steps, a token or cost budget and a timeout. Use least-privilege tools, approval for risky actions, and log every step.',
    link: '/ai/agents/ai-agents',
  },
  {
    category: 'AI',
    question: 'When should you fine-tune instead of using RAG?',
    answer:
      'Fine-tune to change style, format or a narrow skill. Use RAG for facts that are private or change often. Try a better prompt first.',
    link: '/ai/foundations/fine-tuning-and-model-choice',
  },
  {
    category: 'AI',
    question: 'Who runs a tool when an LLM uses tool calling?',
    answer:
      'Your code. The model only asks for a call with arguments. Your code validates the request, runs the tool and returns the result.',
    link: '/ai/prompting/structured-output-and-tool-calling',
  },
  {
    category: 'AI',
    question: 'What does MCP standardise?',
    answer:
      'How AI applications connect to tools and data. A server exposes tools, resources and prompts over JSON-RPC, and any MCP-capable application can use it.',
    link: '/ai/agents/model-context-protocol',
  },
  {
    category: 'AI',
    question: 'When is a multi-agent design worth it?',
    answer:
      'When one context cannot hold the work, sub-tasks can run in parallel, or parts need different permissions. Otherwise one agent or a workflow is cheaper.',
    link: '/ai/agents/multi-agent-patterns',
  },
  {
    category: 'AI',
    question: 'Why enforce rules in code instead of the prompt?',
    answer:
      'A model can ignore or be tricked out of prompt instructions. A code check before the action runs cannot be talked around.',
    link: '/ai/safety/guardrails-and-safety',
  },
  {
    category: 'AI',
    question: 'What makes a prompt injection serious?',
    answer:
      'A session that has private data, untrusted content and a way to send data out or act. Removing any one of the three greatly reduces the risk.',
    link: '/ai/safety/prompt-injection-and-security',
  },
  {
    category: 'AI',
    question: 'Why do LLM features need evals?',
    answer:
      'Answers vary and small changes shift results across many cases. Running a fixed set of realistic cases and scoring it shows whether a change helped.',
    link: '/ai/production/evals-and-testing',
  },
  {
    category: 'AI',
    question: 'What risk does semantic caching add?',
    answer:
      'A similar but different question can return a wrong stored answer. Use a strict similarity threshold and keep the user or tenant in the cache key.',
    link: '/ai/production/observability-latency-caching',
  },
];
