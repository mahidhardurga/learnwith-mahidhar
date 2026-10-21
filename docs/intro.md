---
slug: /guide
title: Java, Spring Boot & Microservices Interview Prep
description: A free study guide for Java, Spring Boot, microservices, database, Kafka, DevOps and system design interviews, with plain explanations, tested code, diagrams and model answers.
keywords: [java interview questions, spring boot interview, microservices interview, system design interview, interview preparation]
sidebar_position: 0
---

# Java, Spring Boot & Microservices Interview Prep

This guide teaches you **how the technology really works**, then shows how interviewers test it. Every topic starts with a short definition in plain words.

Every page has a short intro, concepts explained plainly, code examples, Mermaid diagrams, common interview questions with model answers, pitfalls and key takeaways. Code samples were compiled and run wherever they could be (the Java, SQL, Spring, Kafka and Redis examples were executed; infrastructure manifests are illustrations, and each page says so when something was not run).

## What is inside

| Section | What you will learn | Start with |
| --- | --- | --- |
| **Java** | Collections internals, generics, streams, Java 8 to 25 features, concurrency, memory model, GC, JVM diagnostics, virtual threads | [HashMap internals](java/core-java/hashmap-internals.md) |
| **Spring Framework** | IoC and AOP, bean lifecycle, Spring Boot internals, testing, JPA, transactions, locking, caching, Spring Security, JWT and OAuth2 | [Spring Boot overview](spring/boot/overview.md) |
| **Microservices** | Decomposition, gateway, discovery, config, Resilience4j, saga, CQRS, outbox and idempotency, observability | [Microservices overview](microservices/overview.md) |
| **Databases** | Relational design, ACID and MVCC, SQL patterns, replication and sharding, NoSQL and Redis, zero-downtime migrations | [ACID and MVCC](databases/acid-isolation-mvcc.md) |
| **Messaging** | Kafka architecture, consumer groups and delivery semantics, ordering and dead-letter design, RabbitMQ | [Kafka fundamentals](messaging/kafka-fundamentals.md) |
| **AI and LLMs** | LLM basics, tokens and cost, prompt and context engineering, embeddings, RAG, AI agents | [What is an LLM](ai/foundations/what-is-an-llm.md) |
| **DevOps and Cloud** | Docker for Java, Kubernetes, CI/CD, twelve-factor apps, deployment strategies | [Docker for Java](devops/docker-for-java.md) |
| **System Design** | A framework and worked designs: URL shortener, rate limiter, order processing, notification service, trade-offs | [Approach and estimation](system-design/approach-and-estimation.md) |
| **Interview Toolkit** | 100 interview questions, STAR answers, 16 coding problems with tested solutions, cheat sheets | [Cheat sheets](toolkit/cheat-sheets.md) |

## Where to start

- New to the stack: begin with [OOP](java/core-java/oop-and-design.md), the [collections framework](java/core-java/collections-framework.md) and [Spring IoC](spring/core/ioc-and-dependency-injection.md), then try the [interview questions](toolkit/interview-questions.md).
- Going deeper: [Spring internals](spring/core/aop-and-proxies.md), [transactions](spring/data/transactions.md) and [microservices patterns](microservices/data-consistency/saga.md).
- Architecture and trade-offs: [JVM diagnostics](java/concurrency-jvm/jvm-tuning-diagnostics.md), [distributed consistency](microservices/data-consistency/outbox-idempotency.md), [system design](system-design/approach-and-estimation.md) and [behavioural stories](toolkit/behavioral-star.md).
- Short on time: skim the [cheat sheets](toolkit/cheat-sheets.md).

## How to use a page

1. Read once for the concepts.
2. Close it and explain the topic aloud, then try the interview questions.
3. Re-read the **pitfalls**: this is where most candidates lose marks.
4. Reproduce one example yourself (an N+1, a deadlock, a stuck consumer) and break it deliberately.

Found an error or want a topic added? [Contact me](/contact).
