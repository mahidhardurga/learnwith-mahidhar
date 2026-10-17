---
title: CompletableFuture - Composition, Error Handling and Pitfalls
sidebar_label: "CompletableFuture"
description: Compose asynchronous work with CompletableFuture - thenApply vs thenCompose, combining futures, allOf and anyOf, exception handling, timeouts, executor choice, and the mistakes that cause thread starvation.
keywords: [CompletableFuture, thenCompose vs thenApply, allOf, exceptionally handle, async executor, orTimeout, java asynchronous programming, future composition]
sidebar_position: 5
---

# CompletableFuture

<Outcomes items={[
  "Chain async steps with thenApply, thenCompose and thenCombine",
  "Handle errors with exceptionally and handle",
  "Run work on a chosen executor"
]} />

## Creating

```java
CompletableFuture<String> cf = CompletableFuture.supplyAsync(() -> fetch(id), ioExecutor);   // value-returning
CompletableFuture<Void> cv = CompletableFuture.runAsync(() -> audit(id), ioExecutor);
CompletableFuture<String> done = CompletableFuture.completedFuture("x");
CompletableFuture<String> manual = new CompletableFuture<>();
manual.complete("later");                      // or completeExceptionally(ex)
```

**Always pass an executor** for blocking or I/O work. Without one, tasks run on `ForkJoinPool.commonPool()`, which is sized to the CPU count, is shared JVM-wide, and is starved by blocking calls.

## Transform and chain

| Method | Input → Output | Analogy |
| --- | --- | --- |
| `thenApply(f)` | `T → U` | `map` |
| `thenCompose(f)` | `T → CompletableFuture<U>` | `flatMap` |
| `thenAccept(c)` | `T → void` | consume |
| `thenRun(r)` | no input | side effect |
| `thenCombine(other, f)` | two futures → `V` | zip |

```java
CompletableFuture<Order> order = CompletableFuture.supplyAsync(() -> loadOrder(id), ioPool);

CompletableFuture<Invoice> invoice = order
        .thenApply(o -> o.customerId())                       // sync transform: T -> U
        .thenCompose(cid -> CompletableFuture.supplyAsync(() -> loadCustomer(cid), ioPool))   // async step: returns a future
        .thenCombine(CompletableFuture.supplyAsync(() -> loadTaxRules(), ioPool),
                     (customer, tax) -> new Invoice(customer, tax));
```

Using `thenApply` with a function that returns a `CompletableFuture` gives `CompletableFuture<CompletableFuture<U>>`; use `thenCompose` to flatten (the same idea as `map` vs `flatMap`).

### Sync vs `Async` variants and which thread runs the callback

`thenApply(f)` runs `f` on the thread that **completes** the previous stage (or on the caller if it is already complete). `thenApplyAsync(f)` submits `f` to the common pool; `thenApplyAsync(f, executor)` to your executor. If a stage completes on a Netty event loop or a small I/O pool and your callback does heavy or blocking work, it hogs that thread; hop to an appropriate executor with the `Async` variant.

## Combining many futures

```java
List<CompletableFuture<Price>> futures = skus.stream()
        .map(sku -> CompletableFuture.supplyAsync(() -> priceOf(sku), ioPool))
        .toList();

CompletableFuture<Void> all = CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new));
CompletableFuture<List<Price>> prices = all.thenApply(v -> futures.stream().map(CompletableFuture::join).toList());
```

`allOf` returns `Void`, so collect results with `join()` after completion (it will not block, since all are done). `anyOf` completes with the first result (typed `Object`). Note: if one future in `allOf` fails, the combined future completes exceptionally **after all** have completed; it does not cancel the others.

## Error handling

| Method | Behaviour |
| --- | --- |
| `exceptionally(ex -> fallback)` | Recover from failure with a value |
| `handle((value, ex) -> ...)` | Always called; handle success and failure, can transform |
| `whenComplete((value, ex) -> ...)` | Side effect (logging); passes the original outcome through |

```java
CompletableFuture<Price> price = CompletableFuture
        .supplyAsync(() -> remotePrice(sku), ioPool)
        .orTimeout(500, TimeUnit.MILLISECONDS)                 // Java 9+: completes exceptionally with TimeoutException
        .exceptionally(ex -> Price.cachedOrDefault(sku));      // graceful fallback

CompletableFuture<String> described = price
        .handle((p, ex) -> ex == null ? "price " + p : "unavailable: " + root(ex).getMessage());
```

Exceptions are wrapped: a failure in an earlier stage reaches later stages as a `CompletionException` wrapping the real cause, while `get()` throws `ExecutionException`. Unwrap with `ex.getCause()` (or a helper that walks the chain). `join()` throws unchecked `CompletionException`. `completeOnTimeout(default, 500, MILLISECONDS)` supplies a default instead of failing.

If you attach no error handler and nobody calls `join`/`get`, the exception is silently lost, just like an unobserved `submit`.

## Patterns

**Parallel aggregation (fan-out / fan-in)**:

```java
record Dashboard(User user, List<Order> orders, Recommendations recs) { }

CompletableFuture<User> user = CompletableFuture.supplyAsync(() -> users.find(id), ioPool);
CompletableFuture<List<Order>> orders = CompletableFuture.supplyAsync(() -> orderClient.recent(id), ioPool);
CompletableFuture<Recommendations> recs = CompletableFuture
        .supplyAsync(() -> recommender.forUser(id), ioPool)
        .completeOnTimeout(Recommendations.empty(), 300, TimeUnit.MILLISECONDS);   // optional data degrades gracefully

Dashboard d = user.thenCombine(orders, (u, o) -> new Object[]{u, o})
                  .thenCombine(recs, (uo, r) -> new Dashboard((User) uo[0], (List<Order>) uo[1], r))
                  .get(2, TimeUnit.SECONDS);
```

The total latency is the slowest branch, not the sum. Pair this with [bulkheads and circuit breakers](../../microservices/resilience/resilience4j.md) for each remote call.

**Retry with delay**: `CompletableFuture.delayedExecutor(1, SECONDS)` (Java 9) to schedule the next attempt asynchronously instead of sleeping a thread.

**Cancellation**: `cancel(true)` on a `CompletableFuture` completes it with `CancellationException` but does **not** interrupt the underlying running task, because there is no link to the thread. Design cooperative cancellation if needed.

## Pitfalls

- **Blocking inside the common pool** (`supplyAsync` without executor around JDBC/HTTP calls): starves unrelated work.
- **Calling `join()`/`get()` inside a pool task waiting for another task on the same pool**: thread-starvation deadlock when the pool is saturated.
- **Forgetting timeouts**: add `orTimeout`/`get(timeout)`; unbounded waits turn slow dependencies into hangs.
- **Swallowed exceptions**: always end chains with a handler or a joined result.
- **Thread-unsafe shared state** mutated in callbacks.
- **Losing context** (MDC, security, tracing) across threads: wrap executors with context propagation.
- **Over-complex chains**: deep nesting is hard to debug and trace. For many I/O calls on Java 21+, plain blocking code on **virtual threads** is simpler and often clearer.

## `CompletableFuture` vs reactive vs virtual threads

| | Style | Best for |
| --- | --- | --- |
| `CompletableFuture` | Callback composition, one value | A handful of parallel calls, scatter/gather |
| Reactive (Reactor/RxJava) | Streams with back-pressure | Streaming, high fan-in/out, backpressure-sensitive pipelines |
| Virtual threads | Straight-line blocking code | Request-per-thread services with lots of blocking I/O |

## Check yourself

<Checkpoint questions={[
  {
    "q": "You have a function returning a CompletableFuture. Which method avoids a nested future?",
    "options": [
      "thenCompose",
      "thenApply",
      "thenAccept",
      "join"
    ],
    "answer": 0,
    "why": "thenCompose is flatMap for futures. thenApply would produce CompletableFuture<CompletableFuture<T>>."
  },
  {
    "q": "Which method runs whether the stage succeeded or failed and can change the result?",
    "options": [
      "thenApply",
      "handle",
      "exceptionally only runs on success",
      "thenRun"
    ],
    "answer": 1,
    "why": "handle receives both the result and the throwable. exceptionally runs only on failure."
  },
  {
    "q": "Why pass your own Executor to *Async methods in a server?",
    "options": [
      "Async methods require an executor to compile",
      "It makes the code synchronous",
      "The default common pool is shared and can be starved by blocking tasks",
      "Executors are faster than the common pool by definition"
    ],
    "answer": 2,
    "why": "Blocking calls on the common pool hurt unrelated work. Use a dedicated bounded pool."
  }
]} />

## Common interview questions

**1. `thenApply` vs `thenCompose`?**
`thenApply` maps a value synchronously to another value; `thenCompose` is for a function that returns another `CompletableFuture`, flattening nested futures, like `map` vs `flatMap`.

**2. `thenApply` vs `thenApplyAsync`?**
The non-async version runs the function on the thread completing the previous stage (or the caller); the async version schedules it on an executor (common pool by default).

**3. How do you run several calls in parallel and combine results?**
Start each with `supplyAsync(..., executor)`, then `thenCombine` for two or `allOf` plus `join` for many.

**4. How do you handle exceptions and timeouts?**
`exceptionally`/`handle`/`whenComplete` for failures, `orTimeout`/`completeOnTimeout` for deadlines; remember exceptions arrive wrapped in `CompletionException`.

**5. What executor does `supplyAsync` use by default and why is it a problem?**
The common `ForkJoinPool`, sized to cores minus one and shared by the JVM; blocking tasks there starve everything else, so provide a dedicated executor for I/O.

**6. Does `cancel(true)` stop the running task?**
No. It completes the future exceptionally but there is no interrupt of the computing thread.

**7. `get()` vs `join()`?**
`get()` throws checked `InterruptedException` and `ExecutionException`; `join()` throws unchecked `CompletionException` and cannot be interrupted.

**8. How does this compare with virtual threads?**
Virtual threads allow simple blocking code with the same scalability for I/O-bound work, reducing the need for callback chains; `CompletableFuture` remains useful for explicit fan-out/fan-in.

## Key takeaways

- `thenCompose` flattens, `thenCombine` joins two, `allOf` joins many.
- Always supply an executor for blocking work, and add timeouts and handlers.
- Exceptions are wrapped; unobserved failures vanish.
- Prefer clarity: for many sequential I/O calls, virtual threads may read better than long chains.
