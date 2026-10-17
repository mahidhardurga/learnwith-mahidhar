---
title: Spring Application Events - Listeners, Async and Transactional Events
sidebar_label: "Application events"
description: Publish and handle events with ApplicationEventPublisher and @EventListener, ordering, conditions, async listeners, @TransactionalEventListener phases, built-in lifecycle events, and when to use messaging instead.
keywords: [spring application events, "@EventListener", ApplicationEventPublisher, "@TransactionalEventListener", AFTER_COMMIT, async events, ApplicationReadyEvent, domain events]
sidebar_position: 5
---

# Application Events

<Outcomes items={[
  "Publish and listen to application events",
  "Explain that listeners are synchronous by default",
  "Use @TransactionalEventListener correctly"
]} />

## Publishing and listening

```java
record OrderPlaced(long orderId, String customerEmail) { }       // events can be plain objects (Spring 4.2+)

@Service
class OrderService {
    private final ApplicationEventPublisher events;
    OrderService(ApplicationEventPublisher events) { this.events = events; }

    @Transactional
    public void place(Order order) {
        // ... save ...
        events.publishEvent(new OrderPlaced(order.id(), order.email()));
    }
}

@Component
class EmailNotifier {
    @EventListener
    void on(OrderPlaced event) { /* send confirmation */ }
}

@Component
class LoyaltyService {
    @EventListener
    @Order(1)                                                      // ordering among listeners
    void on(OrderPlaced event) { /* add points */ }
}
```

Listener methods can return a value, which is **published as a new event** (chaining), take generic events (`EntityCreated<Customer>` with resolvable generics), and filter with SpEL: `@EventListener(condition = "#event.orderId() > 100")`.

## Synchronous by default: the crucial fact

`publishEvent` invokes listeners **in the publisher's thread, one after another, before it returns**. Consequences, all confirmed in a test:

- Listeners run on the same thread (`main` in my test, the request thread in a web app).
- They run **inside the publisher's transaction** if there is one.
- **A listener exception propagates to the publisher** and can abort the business operation (and roll back its transaction).
- A slow listener slows the publisher.

That is usually what you want for in-process orchestration, and a trap if you expected fire-and-forget.

## Asynchronous listeners

```java
@Configuration
@EnableAsync
class AsyncConfig { }

@Component
class AnalyticsListener {
    @Async                                                          // runs on a TaskExecutor thread
    @EventListener
    void on(OrderPlaced event) { /* send to analytics */ }
}
```

Now the publisher does not wait and does not see listener exceptions (handle them with `AsyncUncaughtExceptionHandler`). The listener has **no access to the publisher's transaction, security context or MDC** unless you propagate them, and may run before the publisher's transaction commits (seeing no data!). Bound the executor (see [Executors](../../java/concurrency-jvm/executors.md)).

## Transaction-bound events

Sending an email inside the transaction fires even if the transaction later rolls back, and a listener querying the new order may not see uncommitted data from another thread. Use `@TransactionalEventListener`:

```java
@Component
class OrderEventHandler {
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void afterCommit(OrderPlaced event) { /* notify: only if the order is really committed */ }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_ROLLBACK)
    void afterRollback(OrderPlaced event) { /* compensate */ }
}
```

Phases: `BEFORE_COMMIT`, `AFTER_COMMIT` (default), `AFTER_ROLLBACK`, `AFTER_COMPLETION`. If there is **no active transaction** when the event is published, the listener is **not invoked at all** unless `fallbackExecution = true`.

Careful with `AFTER_COMMIT` listeners that need to write to the database: the original transaction is committed but its resources may still be bound, so a plain `@Transactional` in the listener **joins nothing and does not start a new transaction by default**. Mark such a listener `@Transactional(propagation = Propagation.REQUIRES_NEW)` (Spring 6.1+ requires `REQUIRES_NEW` or `NOT_SUPPORTED` for `@TransactionalEventListener` methods that are also `@Transactional`).

`AFTER_COMMIT` is still **not reliable delivery**: if the process dies right after commit, the event is lost. For guaranteed publication to other services use the [transactional outbox](../../microservices/data-consistency/outbox-idempotency.md).

## Built-in lifecycle events

| Event | When |
| --- | --- |
| `ContextRefreshedEvent` | Context fully initialised (may fire more than once with hierarchies) |
| `ContextStartedEvent` / `ContextClosedEvent` | `start()` / `close()` |
| `ApplicationStartingEvent`, `ApplicationEnvironmentPreparedEvent` | Very early (use `spring.factories` listeners, not beans) |
| `ApplicationStartedEvent` | Context refreshed, runners not yet called |
| `ApplicationReadyEvent` | Runners finished: application ready to serve (warm-up, registration with discovery) |
| `AvailabilityChangeEvent` | Liveness/readiness state changes (Kubernetes probes) |
| `ApplicationFailedEvent` | Startup failed |

```java
@EventListener(ApplicationReadyEvent.class)
void warmUp() { /* populate caches after startup without blocking context refresh */ }
```

## Domain events with Spring Data

Aggregate roots can collect domain events and let Spring Data publish them on save:

```java
class Order extends AbstractAggregateRoot<Order> {
    void confirm() {
        this.status = Status.CONFIRMED;
        registerEvent(new OrderConfirmed(id));          // published when the repository saves this aggregate
    }
}
```

This keeps the domain model free of infrastructure while allowing other components to react.

## Events vs messaging

| | Spring events | Message broker (Kafka, RabbitMQ) |
| --- | --- | --- |
| Scope | One JVM | Across services |
| Delivery guarantee | None (in-memory) | Durable, at-least-once |
| Failure handling | Exception propagates (sync) or is lost (async) | Retry, dead-letter, replay |
| Latency | Method-call speed | Network |
| Use for | Decoupling modules in a modular monolith, post-commit hooks | Integration between services, durable workflows |

A common architecture: domain event inside the service → handler writes an **outbox** row in the same transaction → relay publishes to the broker.

## Check yourself

<Checkpoint questions={[
  {
    "q": "By default, a @EventListener runs...",
    "options": [
      "Synchronously in the publisher's thread",
      "On a new thread",
      "After the application ends",
      "Only in a separate JVM"
    ],
    "answer": 0,
    "why": "Add @Async if you want asynchronous handling. A slow or failing listener otherwise affects the publisher."
  },
  {
    "q": "You want to send an email only after the database transaction commits. Which fits?",
    "options": [
      "@EventListener",
      "@TransactionalEventListener (phase AFTER_COMMIT)",
      "@PostConstruct",
      "@Scheduled"
    ],
    "answer": 1,
    "why": "Without it the email could be sent for a transaction that later rolls back."
  },
  {
    "q": "When should you use a message broker instead of Spring events?",
    "options": [
      "When the consumer is in the same method",
      "Never",
      "When the consumer is another service or must survive a crash",
      "Only for logging"
    ],
    "answer": 2,
    "why": "Spring events are in-process and not durable. Use Kafka or RabbitMQ across processes."
  }
]} />

## Common interview questions

**1. Are Spring events synchronous?**
Yes by default: listeners run sequentially in the publisher's thread, in its transaction, and their exceptions propagate. Use `@Async` or an `ApplicationEventMulticaster` with an executor for async delivery.

**2. How do you make a listener run only after the transaction commits?**
`@TransactionalEventListener(phase = AFTER_COMMIT)`. It is skipped when no transaction is active (unless `fallbackExecution = true`).

**3. How do you order listeners?**
`@Order` on the listener methods or implementing `Ordered`; lower values run first.

**4. Are Spring events a replacement for Kafka?**
No: in-process, non-durable, no retries or replay. They suit intra-application decoupling, not cross-service integration.

**5. What happens if a listener throws?**
For synchronous listeners the exception propagates to `publishEvent` and may roll back the surrounding transaction; for async listeners it goes to the async exception handler.

**6. Where do you put startup logic that must run after the application is ready?**
`ApplicationReadyEvent` listener or an `ApplicationRunner`, rather than `@PostConstruct` which blocks context refresh.

**7. Why might an async `AFTER_COMMIT` listener not find the data it needs?**
`@Async` listeners combined with plain `@EventListener` may run before commit; use `@TransactionalEventListener` (after commit) to guarantee visibility.

## Pitfalls

- Assuming async delivery and being surprised by exceptions and latency.
- Plain `@EventListener` for side effects (emails) that must only happen on commit.
- `@TransactionalEventListener` without an active transaction silently doing nothing.
- Treating events as durable delivery.
- Large event graphs creating hidden control flow that is hard to trace; name events by business facts and keep the number of listeners understandable.
- Unbounded async executors.

## Key takeaways

- Events are synchronous in-process notifications by default, in the publisher's transaction and thread.
- Use `@TransactionalEventListener(AFTER_COMMIT)` for effects that depend on a successful commit.
- Make delivery durable through an outbox and a broker, not Spring events.
- Use `ApplicationReadyEvent` for post-startup work.
