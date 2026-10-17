---
title: Java, Spring Boot and Microservices Interview Study Roadmap
sidebar_label: "Study roadmap"
description: A structured study plan for Java backend interviews - what to learn in what order at fresher, 3-5 years and senior levels, with weekly schedules, practice methods, mock interview tips and a final-week checklist linked to this guide.
keywords: [java interview preparation plan, backend engineer study roadmap, senior java developer roadmap, spring boot learning path, microservices study plan, system design preparation, interview preparation schedule]
sidebar_position: 1
---

# Study Roadmap

Preparation fails when it is **random**: ten Kafka videos, no SQL, no practice out loud. This roadmap orders topics by **interview weight** and **prerequisites**, with time estimates and links to the pages that cover each topic.

## How to use it

1. Pick your **level** and a **timeline** (4, 8 or 12 weeks).
2. Study each topic in three passes: **read** (understand), **explain** (close the page, teach it aloud or write it), **apply** (small code, question bank, mock interview).
3. Track weak spots; revisit them with spaced repetition (1 day, 1 week, 1 month).
4. Keep a **personal question log**: every question you failed or hesitated on.
5. Combine learning with **project stories** ([behavioural](behavioral-star.md)).

## Topic priority map

| Priority | Topics | Why |
| --- | --- | --- |
| **Must know** (asked almost always) | Core Java and collections, concurrency basics, Spring DI/Boot, REST, SQL, JPA basics, one system design | Interviewers screen on these first |
| **High value** | HashMap/ConcurrentHashMap internals, transactions, N+1, Spring AOP, microservices patterns, Kafka basics, caching, Docker/Kubernetes basics | Differentiates 3-5 year candidates |
| **Senior differentiators** | JVM/GC tuning and diagnostics, distributed consistency (saga/outbox/idempotency), resilience design, security architecture, data scaling, observability, deployment strategies, trade-off reasoning, leadership stories | What senior loops focus on |
| **Nice to have** | GraalVM, reactive programming, gRPC, service mesh, event sourcing, specific cloud services | Depends on the job description |

## Fresher (0-2 years): 6-8 weeks

| Week | Focus | Study | Practice |
| --- | --- | --- | --- |
| 1 | Java fundamentals | OOP, strings, exceptions, [collections](../java/core-java/collections-framework.md), [equals/hashCode](../java/core-java/equals-hashcode.md) | Write small programs; [fresher questions 1-24](questions-fresher.md) |
| 2 | Java 8+ and concurrency basics | [Streams and lambdas](../java/core-java/streams-and-lambdas.md), [modern Java](../java/core-java/modern-java.md), [threads](../java/concurrency-jvm/threads-basics.md), `synchronized`/`volatile` | Stream exercises; [coding problems 1-6](coding-problems.md) |
| 3 | Algorithms and data structures | Arrays, strings, hashing, stacks, recursion, sorting, binary search | 3-4 easy problems/day by pattern |
| 4 | SQL and databases | Joins, group by, indexes, [SQL patterns](../databases/sql-patterns.md), ACID | Write 20 queries on a sample schema |
| 5 | Spring core | [IoC/DI](../spring/core/ioc-and-dependency-injection.md), [bean scopes](../spring/core/bean-lifecycle-and-scopes.md), `@Component`/`@Bean` | Build a small CRUD app |
| 6 | Spring Boot + REST + JPA | [Boot overview](../spring/boot/overview.md), [configuration](../spring/boot/configuration.md), [JPA basics](../spring/data/jpa-basics.md), [validation](../spring/boot/validation.md), [exception handling](../spring/boot/exception-handling.md) | Add validation, pagination, tests |
| 7 | Testing + tooling | [JUnit/Mockito](../spring/boot/testing-basics.md), Git, Maven, Docker basics | Unit-test your CRUD app |
| 8 | Mock interviews | [Questions 1-35](questions-fresher.md), explain your project | 2-3 mocks with feedback |

**Project**: one clean REST service (users/orders) with validation, JPA, tests, Docker. Be able to draw it and defend each choice.

## 3-5 Years: 8-10 weeks

| Week | Focus | Study | Practice |
| --- | --- | --- | --- |
| 1 | Collections internals | [HashMap](../java/core-java/hashmap-internals.md), [ConcurrentHashMap](../java/core-java/concurrenthashmap.md), [generics](../java/core-java/generics.md), [immutability](../java/core-java/immutability.md) | Explain each aloud; write an LRU cache |
| 2 | Concurrency | [Executors](../java/concurrency-jvm/executors.md), [CompletableFuture](../java/concurrency-jvm/completablefuture.md), [locks](../java/concurrency-jvm/synchronization-and-locks.md), [memory model](../java/concurrency-jvm/memory-model.md) | [Coding problems 14-15](coding-problems.md) |
| 3 | JVM | [GC](../java/concurrency-jvm/garbage-collection.md), [memory and diagnostics](../java/concurrency-jvm/jvm-tuning-diagnostics.md) | Read a GC log; take a heap dump of a toy leak |
| 4 | Spring internals | [Lifecycle](../spring/core/bean-lifecycle-and-scopes.md), [AOP](../spring/core/aop-and-proxies.md), [events](../spring/core/application-events.md), [auto-config](../spring/boot/auto-configuration.md) | Write a custom starter/aspect |
| 5 | Data layer | [Transactions](../spring/data/transactions.md), [N+1](../spring/data/n-plus-one-lazy-loading.md), [locking](../spring/data/locking.md), [SQL tuning](../spring/data/sql-tuning-indexing.md), [caching](../spring/data/caching.md) | Reproduce N+1 and fix it; read `EXPLAIN` plans |
| 6 | Microservices core | [Overview](../microservices/overview.md), [communication](../microservices/communication/service-communication.md), [gateway/discovery/config](../microservices/infrastructure/api-gateway.md), [resilience](../microservices/resilience/resilience4j.md) | Build two services talking with a circuit breaker |
| 7 | Data consistency + messaging | [Saga](../microservices/data-consistency/saga.md), [outbox](../microservices/data-consistency/outbox-idempotency.md), [Kafka](../messaging/kafka-fundamentals.md), [consumers](../messaging/kafka-consumers-offsets.md) | Idempotent consumer with a DLT |
| 8 | Security + DevOps | [Spring Security](../spring/security/security-architecture.md), [JWT](../spring/security/jwt.md), [Docker](../devops/docker-for-java.md), [Kubernetes](../devops/kubernetes-basics.md), [CI/CD](../devops/ci-cd.md) | Secure an API; containerise and deploy locally |
| 9 | Algorithms + design basics | [Coding problems](coding-problems.md), [system design framework](../system-design/approach-and-estimation.md), [URL shortener](../system-design/url-shortener.md) | One medium problem daily; one design weekly |
| 10 | Mocks | [Questions 36-70](questions-mid-level.md) | 3-4 mock interviews |

## Senior (5+ years): 10-12 weeks

Assume mid-level knowledge; go deep on **internals, failure modes, trade-offs, leadership**.

| Weeks | Focus | Study |
| --- | --- | --- |
| 1-2 | Gaps audit and fundamentals refresh | Skim every [mid-level topic](#3-5-years-8-10-weeks); mark anything you cannot explain in two minutes and fix it |
| 3 | Performance and JVM | [GC](../java/concurrency-jvm/garbage-collection.md), [diagnostics playbooks](../java/concurrency-jvm/jvm-tuning-diagnostics.md), [virtual threads](../java/concurrency-jvm/virtual-threads.md); build a story about a real performance win |
| 4 | Distributed data | [ACID/isolation/MVCC](../databases/acid-isolation-mvcc.md), [replication and sharding](../databases/replication-sharding.md), [NoSQL/Redis](../databases/nosql-and-redis.md), [migrations](../databases/schema-migrations.md) |
| 5 | Distributed systems patterns | [Saga](../microservices/data-consistency/saga.md), [CQRS/ES](../microservices/data-consistency/cqrs-event-sourcing.md), [outbox/idempotency](../microservices/data-consistency/outbox-idempotency.md), [Kafka design](../messaging/kafka-ordering-design.md), [RabbitMQ](../messaging/rabbitmq-basics.md) |
| 6 | Resilience and observability | [Resilience4j](../microservices/resilience/resilience4j.md), [observability](../microservices/observability/observability.md), [deployment strategies](../devops/deployment-strategies.md), [twelve-factor](../devops/twelve-factor.md) |
| 7 | Security architecture | [OAuth2/OIDC](../spring/security/oauth2-oidc.md), [method security](../spring/security/method-security.md), [vulnerabilities](../spring/security/common-vulnerabilities.md) |
| 8-9 | System design practice | [Framework](../system-design/approach-and-estimation.md), [rate limiter](../system-design/rate-limiter.md), [order processing](../system-design/order-processing.md), [notification service](../system-design/notification-service.md), [trade-offs](../system-design/tradeoffs.md); practise 2 designs per week aloud with a timer |
| 10 | Leadership and behavioural | [STAR stories](behavioral-star.md); prepare 6-8 stories with numbers |
| 11 | Mocks | [Senior questions 71-100](questions-senior.md); mock system design and behavioural rounds with experienced peers |
| 12 | Polish | Weak areas, [cheat sheets](cheat-sheets.md), company-specific research |

## Practice methods that work

- **Teach it**: write a one-page explanation or explain to a rubber duck/colleague. If you stumble, you do not know it yet.
- **Build small labs**: reproduce an N+1, a deadlock, a stuck Kafka consumer, a memory leak, a cascading failure. Seeing it break cements understanding.
- **Whiteboard designs** with a timer (45 minutes): requirements, numbers, API/data, architecture, deep dives, trade-offs.
- **Mock interviews**: at least 3-5 with someone who gives honest feedback; record yourself once.
- **Coding practice by pattern**, not volume: 60-100 well-understood problems beat 400 skimmed ones ([patterns](coding-problems.md)).
- **Read production-style material**: your own incident reports, engineering blogs (Netflix, Uber, Stripe, Shopify), postmortems.
- **Keep a decision journal** of trade-offs you made at work; it feeds behavioural and design answers.

## Weekly rhythm (about 10-12 hours/week)

| Day | Time | Activity |
| --- | --- | --- |
| Mon-Thu | 1-1.5 h | One topic: read, explain aloud, code a small example |
| Mon-Fri | 30 min | Coding problems (one pattern) |
| Fri | 1 h | Review the week's weak points; update the question log |
| Sat | 2-3 h | System design or project deep dive (mock if possible) |
| Sun | 1-2 h | Behavioural story practice + rest |

## Interview-day and final-week checklist

**Final week**

- Re-read [cheat sheets](cheat-sheets.md) and your question log.
- Rehearse your 2-minute introduction and project walkthrough.
- Run two full mocks (coding + design + behavioural).
- Prepare questions for the interviewer.
- Sleep, set up your environment (IDE, internet, quiet room) for remote rounds.

**During the interview**

- Clarify before answering; think aloud; structure answers (definition, internals, trade-off, example).
- If stuck, state what you know, make assumptions explicit, and ask for a hint.
- For design: requirements → numbers → API/data → architecture → deep dives → trade-offs ([framework](../system-design/approach-and-estimation.md)).
- For coding: approach and complexity first, then code, then tests with edge cases.
- Admit gaps honestly; show how you would find the answer.

**After**: write down every question you struggled with; update your log; send a short thank-you note.

## Resources to pair with this guide

- Official docs: Spring Boot reference, Hibernate ORM guide, Kafka documentation, PostgreSQL manual: authoritative on details.
- Books: *Effective Java* (Bloch), *Java Concurrency in Practice* (Goetz), *Designing Data-Intensive Applications* (Kleppmann), *Release It!* (Nygard), *Building Microservices* (Newman).
- Practice: your own mini-projects with Testcontainers, plus timed coding practice on a platform of your choice.

## Common interview questions about preparation

**1. How long does it take to prepare for a senior Java role?**
Typically 8-12 weeks of consistent part-time study if your fundamentals are solid; faster if you are actively using these technologies and mainly need practice structuring answers.

**2. Should I focus on coding practice or system design?**
At senior level split roughly: system design and behavioural 50%, deep technical topics 30%, coding patterns 20%; adjust to the companies' loops.

**3. How do I learn topics I don't use at work (Kafka, Kubernetes)?**
Build a small lab (Docker Compose or kind), break it deliberately, and explain failure modes; internals and trade-offs matter more than commands.

## Key takeaways

- Prioritise by interview weight, and study in layers: understand, explain, apply.
- Seniors are judged on internals, failure modes, trade-offs and leadership stories.
- Practise aloud: designs on a timer, mocks with feedback.
- Keep a question log and review it; consistency beats cramming.
