---
title: "Spring and persistence interview questions"
sidebar_label: "Spring and persistence"
description: "Transactions, proxies, JPA performance and testing in Spring applications."
---

# Spring and persistence

Transactions, proxies, JPA performance and testing in Spring applications. Answer each question in two parts: a clear definition first, then a tiny example or why it matters.

**48. Describe the Spring bean lifecycle.**
Instantiate → inject → Aware callbacks → BPP before-init (`@PostConstruct`) → `afterPropertiesSet` → init method → BPP after-init (proxies) → use → `@PreDestroy` → `destroy`. ([Lifecycle](../../spring/core/bean-lifecycle-and-scopes.md))

**49. How does Spring AOP work and why does self-invocation break `@Transactional`?**
Beans are wrapped in JDK/CGLIB proxies whose interceptors run advice; an internal `this.method()` call bypasses the proxy, so no advice runs. ([AOP](../../spring/core/aop-and-proxies.md))

**50. Explain `@Transactional` propagation, isolation and rollback rules.**
`REQUIRED` joins or creates, `REQUIRES_NEW` suspends and starts a new one, `NESTED` uses savepoints. Default rollback is for runtime exceptions only; use `rollbackFor` for checked ones. Isolation controls anomalies like dirty/non-repeatable/phantom reads. ([Transactions](../../spring/data/transactions.md))

**51. What is the N+1 problem and how do you fix it?**
One query for parents plus one lazy query per parent. Fix with `join fetch`, entity graphs, batch fetching or projections; detect by counting statements. ([N+1](../../spring/data/n-plus-one-lazy-loading.md))

**52. What causes `LazyInitializationException`?**
Accessing a lazy association after the session closed. Fetch within the transaction or map to DTOs; do not switch to EAGER as a fix.

**53. How does Spring Boot auto-configuration work?**
`@EnableAutoConfiguration` loads candidates from `AutoConfiguration.imports`; conditional annotations decide which apply; your beans win via `@ConditionalOnMissingBean`. Debug with `--debug`. ([Auto-configuration](../../spring/boot/auto-configuration.md))

**54. How do you handle exceptions and validation in a REST API?**
`@RestControllerAdvice` with typed `@ExceptionHandler`s returning `ProblemDetail`, and Bean Validation (`@Valid`, constraints) on DTOs mapped to 400 responses. ([Exception handling](../../spring/boot/exception-handling.md), [Validation](../../spring/boot/validation.md))

**55. How do you test a Spring Boot application?**
Plain unit tests with Mockito; slice tests (`@WebMvcTest`, `@DataJpaTest`); integration tests with Testcontainers; few full `@SpringBootTest` end-to-end. ([Testing](../../spring/boot/testing-basics.md))

**56. How does Spring Security work, and how do you secure an API with JWT?**
A filter chain builds an `Authentication` stored in the `SecurityContext`; authorisation rules and method security decide access. As a resource server it validates JWT signature, issuer, audience and expiry and maps scopes to authorities. ([Architecture](../../spring/security/security-architecture.md), [JWT](../../spring/security/jwt.md))

**57. SQL indexing: how do you speed up a slow query?**
Read `EXPLAIN ANALYZE`, check for scans/sorts, add a composite index matching equality-then-range-then-sort columns, avoid functions on indexed columns, reduce selected columns, and verify with realistic data. ([SQL tuning](../../spring/data/sql-tuning-indexing.md))

**58. Caching strategies and pitfalls?**
Cache-aside with TTL, eviction on write, stampede protection, caching immutable values; beware staleness and unbounded size. ([Caching](../../spring/data/caching.md))
