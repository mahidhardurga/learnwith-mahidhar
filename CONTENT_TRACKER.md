# Content Tracker

Status values: **planned** → **drafted** → **reviewed**.
"Drafted" = written, links resolve, `npm run build` passes. "Reviewed" = you have read it and signed it off. **Nothing is "reviewed" yet**: every page below needs your read-through.

**Code verification legend**

- ✔ run = the code or claim was compiled/executed during drafting (Java 26 JDK for plain Java; a scratch Spring Boot 3.5.6 / Java 21 project for Spring, JPA, Security, Kafka; H2 for SQL; throwaway Docker containers for the Dockerfile and the Redis Lua script).
- ◐ partly = some snippets run, the rest are illustrative.
- ○ illustrative = shown for structure; **not executed** (needs infrastructure not available here, such as Eureka, a gateway, Argo, a Kubernetes cluster, a real payment/notification provider).

Docs-only site; every technology is a top-level sidebar section and its topics are sub-sections (folders under `docs/`, labelled by `_category_.json`).

## Site pages

| Page | Path | Status |
| --- | --- | --- |
| Home / intro | `docs/intro.md` | drafted |
| About | `src/pages/about.md` | drafted |
| Contact | `src/pages/contact.md` | drafted (**confirm the email address**) |
| Privacy Policy | `src/pages/privacy-policy.md` | drafted (must be updated before Phase 2: ads/analytics/cookies) |

## 1. Java (`docs/java/`): 18 pages

| Page | Status | Code |
| --- | --- | --- |
| core-java/oop-and-design | drafted | ✔ run (CountingSet, sealed switch) |
| core-java/hashmap-internals | drafted | ✔ run (LRU, mutable key, `newHashMap`) |
| core-java/concurrenthashmap | drafted | ○ illustrative |
| core-java/collections-framework | drafted | ✔ run (CME, views vs copies, sequenced) |
| core-java/generics | drafted | ✔ run (PECS, capture, erasure) |
| core-java/streams-and-lambdas | drafted | ✔ run (collectors, toMap duplicates) |
| core-java/modern-java | drafted | ◐ partly |
| core-java/exceptions | drafted | ✔ run (suppressed, finally return) |
| core-java/immutability | drafted | ✔ run (leak, compact constructor) |
| core-java/equals-hashcode | drafted | ✔ run (asymmetry, BigDecimal HashSet/TreeSet) |
| concurrency-jvm/threads-basics | drafted | ✔ run (interrupt flag) |
| concurrency-jvm/executors | drafted | ✔ run (pool decision order, unbounded queue, CallerRuns) |
| concurrency-jvm/completablefuture | drafted | ✔ run (compose, allOf, timeouts, exceptions) |
| concurrency-jvm/synchronization-and-locks | drafted | ✔ run (atomics, tryLock, StampedLock, bounded buffer) |
| concurrency-jvm/memory-model | drafted | ○ conceptual |
| concurrency-jvm/garbage-collection | drafted | ○ conceptual |
| concurrency-jvm/jvm-tuning-diagnostics | drafted | ○ conceptual |
| concurrency-jvm/virtual-threads | drafted | ✔ run (10,000 virtual threads in about 1.1 s) |

## 2. Spring Framework (`docs/spring/`): 25 pages

| Page | Status | Code |
| --- | --- | --- |
| core/ioc-and-dependency-injection | drafted | ✔ run (circular deps, ObjectProvider) |
| core/bean-lifecycle-and-scopes | drafted | ✔ run (exact callback order, prototype-in-singleton) |
| core/aop-and-proxies | drafted | ✔ run (CGLIB vs JDK proxy, self-invocation) |
| core/configuration-profiles-conditions | drafted | ✔ run (`proxyBeanMethods`, profiles, conditions) |
| core/application-events | drafted | ✔ run (sync listeners, `@TransactionalEventListener`) |
| boot/overview | drafted | ○ |
| boot/auto-configuration | drafted | ✔ run (custom auto-config) |
| boot/starters | drafted | ○ Maven snippets |
| boot/configuration | drafted | ✔ run (properties record validation) |
| boot/actuator | drafted | ○ |
| boot/exception-handling | drafted | ✔ run |
| boot/validation | drafted | ✔ run |
| boot/testing-basics | drafted | ✔ run |
| boot/testing-slices-testcontainers | drafted | ◐ `@WebMvcTest` run; Testcontainers not run |
| data/jpa-basics | drafted | ✔ run |
| data/n-plus-one-lazy-loading | drafted | ✔ run (6 vs 1 vs 1 statements) |
| data/transactions | drafted | ✔ run (REQUIRES_NEW, rollback rules, self-invocation) |
| data/locking | drafted | ✔ run (optimistic conflict) |
| data/sql-tuning-indexing | drafted | ○ |
| data/caching | drafted | ◐ `@Cacheable`/evict run; Redis/Caffeine/L2 not |
| security/security-architecture | drafted | ✔ run (401 vs 403, rules order) |
| security/jwt | drafted | ✔ run (expiry, issuer, tamper rejection) |
| security/oauth2-oidc | drafted | ○ (RestClient interceptor snippet not compiled) |
| security/method-security | drafted | ✔ run (IDOR blocked, self-invocation) |
| security/common-vulnerabilities | drafted | ○ |

## 3. Microservices (`docs/microservices/`): 10 pages

| Page | Status | Code |
| --- | --- | --- |
| overview | drafted | ○ |
| infrastructure/api-gateway | drafted | ○ |
| infrastructure/service-discovery | drafted | ○ |
| infrastructure/config-server | drafted | ○ |
| communication/service-communication | drafted | ○ |
| resilience/resilience4j | drafted | ○ |
| data-consistency/saga | drafted | ✔ run (orchestrator state machine) |
| data-consistency/cqrs-event-sourcing | drafted | ✔ run (event-sourced aggregate) |
| data-consistency/outbox-idempotency | drafted | ○ |
| observability/observability | drafted | ○ |

## 4. Databases (`docs/databases/`): 6 pages

| Page | Status | Code |
| --- | --- | --- |
| relational-design | drafted | ○ (DDL illustrative) |
| acid-isolation-mvcc | drafted | ○ (PostgreSQL/MySQL behaviour from documentation, not executed) |
| sql-patterns | drafted | ✔ run (18 queries on H2 in PostgreSQL mode) |
| replication-sharding | drafted | ✔ run (consistent hashing remap 18.6% vs 80%, in system-design code) |
| nosql-and-redis | drafted | ○ |
| schema-migrations | drafted | ○ |

## 5. Messaging (`docs/messaging/`): 4 pages

| Page | Status | Code |
| --- | --- | --- |
| kafka-fundamentals | drafted | ○ config illustrative |
| kafka-consumers-offsets | drafted | ✔ run (group partition split, independent groups) on embedded Kafka |
| kafka-ordering-design | drafted | ✔ run (key to partition ordering, retries, dead-letter `-dlt` topic) |
| rabbitmq-basics | drafted | ○ no broker available |

## 6. DevOps & Cloud (`docs/devops/`): 5 pages

| Page | Status | Code |
| --- | --- | --- |
| docker-for-java | drafted | ✔ run (layered image, non-root, heap 384 MiB at 512 MiB limit, SIGTERM, exit 143) |
| kubernetes-basics | drafted | ○ manifests not applied to a cluster |
| ci-cd | drafted | ○ workflow not executed |
| twelve-factor | drafted | ○ |
| deployment-strategies | drafted | ○ Argo Rollouts manifest not applied |

## 7. System Design (`docs/system-design/`): 6 pages

| Page | Status | Code |
| --- | --- | --- |
| approach-and-estimation | drafted | n/a |
| url-shortener | drafted | ✔ run (Base62, Snowflake IDs) |
| rate-limiter | drafted | ✔ run (token bucket, sliding window; Redis Lua script on real Redis 7) |
| order-processing | drafted | ✔ run (state machine) |
| notification-service | drafted | ✔ run (jittered backoff) |
| tradeoffs | drafted | n/a |

## 8. Interview Toolkit (`docs/toolkit/`): 7 pages

| Page | Status | Notes |
| --- | --- | --- |
| questions-fresher | drafted | Questions 1-35 |
| questions-mid-level | drafted | Questions 36-70 |
| questions-senior | drafted | Questions 71-100 |
| behavioral-star | drafted | Worked examples are fictional and labelled as such |
| coding-problems | drafted | ✔ run: 16 problems, 24 test checks |
| cheat-sheets | drafted | |

## Totals

82 pages including the intro (about 109,000 words), 61 Mermaid diagrams, 100 interview questions with model answers, 16 coding problems.

## Open items

- **Review**: nothing is marked "reviewed" yet. Suggested order: Spring Boot and Microservices (written first), then the rest.
- Contact email on `src/pages/contact.md` is `learnwithmahidhar@gmail.com` (confirmed by the owner).
- Replace the default Docusaurus logo, favicon and social card in `static/img/`.
- Some pages state version-sensitive facts (Java 25 features, Spring Boot 3.5/4 differences, Kafka 4.0 KRaft, Kubernetes behaviour). Re-check against current docs before publishing, and re-check yearly.
- Before **Phase 2** (AdSense, analytics, cookie consent, affiliate links): update the Privacy Policy, add `ads.txt`, and swizzle layout components for ad slots (see README).
- No git repository exists yet; nothing has been committed or pushed.

## Build notes

- `mermaid` is pinned to the 11.x line in `package.json`. With Mermaid 12.2 (what `@docusaurus/theme-mermaid` resolved by default) some diagrams silently failed to render on a hard page load even though `npm run build` passed. After pinning 11.17.2 all 61 diagrams were verified to render on a production build.
- `npm run build` does **not** catch Mermaid render problems; after adding diagrams, open the pages (or re-run a render sweep) as well.
- A doc whose file name equals its folder name (`microservices/observability/observability.md`) is served at the folder URL (`/microservices/observability`).
- Interactive pilot (HashMap, Saga, Kafka fundamentals): each has `<Outcomes>`, a hands-on lab (`<HashMapLab/>`, `<SagaLab/>`, `<KafkaLab/>`) and a `<Checkpoint>` self-test, in `src/components/Interactive/`. Headings starting "Try it" and "Check yourself" are never collapsed. The lesson header (topic N of M, reading time) comes from `src/theme/DocItem/Content`. Core Java was re-ordered as a course (OOP, collections, equals/hashCode, HashMap, ConcurrentHashMap, immutability, generics, exceptions, streams, modern Java). Rolled out to every content page (75): each has an `<Outcomes>` card and a 3-question `<Checkpoint>` (the reference pages `intro`, `study-roadmap`, `cheat-sheets` and the three `questions-*` banks have none). Extra labs: `<CircuitBreakerLab/>` (resilience4j), `<TokenBucketLab/>` (rate limiter), `<IsolationLab/>` (ACID and isolation, PostgreSQL behaviour). Reading order was fixed in Core Java, Concurrency and JVM, Spring Boot, Microservices data consistency, Databases and DevOps. The quiz answers were written for this site and are worth a skim during review.

## Ten-part lessons, one version for everyone, Apple-style UI (latest)

- Experience levels (beginner, mid, senior) and the study plan were removed. There is one version of every page, and the Definition is written in short, plain words (2-3 sentences).
- Every topic follows the ten parts in a fixed order (see README). 76 pages have a written definition, why it exists and when to use it, and many have system design notes. All wording was written for this site and is worth a read when reviewing each page.
- Example code (part 4) and System design (part 5) come from sections a page already had, and are skipped otherwise. Adding standalone examples and design notes to the pages that lack them is a sensible follow-up.
- The three question banks keep their file names (and URLs) but are now titled Foundations (1-35), Applied (36-70) and Advanced (71-100).
- UI: Apple-style neutrals, system font stack, translucent navbar, numbered part headers, redesigned home page. Colours and spacing are tokens at the top of `src/css/custom.css`.

## AI and LLMs section (first batch of 8)

New top-level section at `docs/ai/` (sidebar position 6): Foundations (what is an LLM, tokens and context window, credits, pricing and cost), Prompting (prompt engineering, context engineering), Retrieval (embeddings and vector databases, RAG), Agents (AI agents). Written provider-neutral with short Java snippets; every snippet was compiled and run (outputs shown on the pages) using stand-in models, since real model calls need an API key. Labs: `TokenCostLab`, `RagLab`, `AgentLab`. Eight quiz cards were added under the "AI" category.

Second batch (11 more topics): fine-tuning and model choice; structured output and tool calling; MCP; multi-agent patterns; guardrails and safety; prompt injection and security; evals and testing; observability, latency and caching; Spring AI and LangChain4j; and two system design pages (design a RAG chatbot, design an AI agent platform). New groups: Safety and security, Production. New lab: `GuardrailLab`. The AI section now has 19 pages.

Verification: every runnable Java snippet was compiled and run (outputs on the pages). The Spring AI snippet was compiled against Spring AI 1.1.8 (the chat, tool, structured output and vector store code also compiled against 2.0.1; the vector-store advisor moved module there) and the LangChain4j snippet against 1.22.0. Neither was run against a live model, which needs an API key, and the pages say so. Library APIs change quickly: recheck those two pages when you upgrade versions. Model names, prices and context sizes are never quoted as facts.
