---
title: "Java internals and concurrency interview questions"
sidebar_label: "Java internals and concurrency"
description: "How the JVM, memory, threads and collections work underneath."
---

# Java internals and concurrency

How the JVM, memory, threads and collections work underneath. Answer each question in two parts: a clear definition first, then a tiny example or why it matters.

**36. How does `HashMap` work internally?**
Array of buckets indexed by `(n-1) & (h ^ h>>>16)`; collisions chain into linked lists that treeify at 8 nodes (table ≥ 64); resize at 0.75 load doubles the table. Equal keys need consistent `equals`/`hashCode`. ([HashMap internals](../../java/core-java/hashmap-internals.md))

**37. `ConcurrentHashMap` vs `synchronizedMap`?**
CHM uses CAS plus per-bucket locking and lock-free reads, so it scales; `synchronizedMap` has one lock for everything. CHM offers atomic `compute`/`merge`; compound check-then-act sequences still need those methods. ([ConcurrentHashMap](../../java/core-java/concurrenthashmap.md))

**38. What is the Java Memory Model and happens-before?**
It defines when one thread's writes are visible to another. Visibility needs a happens-before edge: lock release/acquire, volatile write/read, thread start/join, concurrent collections. Without one you have a data race. ([Memory model](../../java/concurrency-jvm/memory-model.md))

**39. `volatile` vs `synchronized` vs atomics?**
`volatile`: visibility and ordering for a single variable, no atomic compound actions. `synchronized`/locks: mutual exclusion plus visibility. Atomics (`AtomicInteger`, `LongAdder`): lock-free atomic single-variable updates via CAS. ([Locks](../../java/concurrency-jvm/synchronization-and-locks.md))

**40. What is a deadlock and how do you prevent it?**
Threads each hold a lock the other needs. Break one of the four conditions: impose a global lock order, use `tryLock` with timeouts, hold fewer locks, or redesign with message passing. Diagnose with thread dumps. ([Threads](../../java/concurrency-jvm/threads-basics.md))

**41. How does `ThreadPoolExecutor` decide between core threads, queue and max threads?**
Core threads first, then enqueue, then extra threads up to max only when the queue is full, then reject. An unbounded queue means max is never used. Use bounded queues and name threads. ([Executors](../../java/concurrency-jvm/executors.md))

**42. `thenApply` vs `thenCompose` in `CompletableFuture`; what's the default executor risk?**
`thenApply` maps a value; `thenCompose` flattens a function returning a future. `supplyAsync` without an executor uses the shared common pool, which blocking calls can starve. ([CompletableFuture](../../java/concurrency-jvm/completablefuture.md))

**43. How does garbage collection work and which collector would you choose?**
Generational collection exploits short-lived objects; G1 is the balanced default, ZGC gives sub-millisecond pauses, Parallel maximises throughput. Choose by measuring latency and throughput. ([GC](../../java/concurrency-jvm/garbage-collection.md))

**44. Common causes of memory leaks in Java and how to find them?**
Unbounded caches/static collections, unregistered listeners, `ThreadLocal`s in pools, classloader leaks. Heap dump plus Eclipse MAT dominator tree and GC-root paths. ([JVM diagnostics](../../java/concurrency-jvm/jvm-tuning-diagnostics.md))

**45. Streams: `map` vs `flatMap`, and when are parallel streams a bad idea?**
`flatMap` flattens nested streams. Parallel streams use the shared common pool: bad for small data, blocking I/O, or shared mutable state. ([Streams](../../java/core-java/streams-and-lambdas.md))

**46. Explain generics type erasure and PECS.**
Type arguments are removed after compile-time checking, so no `new T()` or `instanceof List<String>`. PECS: use `? extends T` for producers you read from and `? super T` for consumers you write to. ([Generics](../../java/core-java/generics.md))

**47. How do you design an immutable class?**
Final class and fields, no setters, defensive copies in and out, no `this` escape; records are shallowly immutable. ([Immutability](../../java/core-java/immutability.md))
