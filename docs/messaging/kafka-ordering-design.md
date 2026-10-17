---
title: Kafka Ordering, Partitioning Keys, Retries and Dead-Letter Topics
sidebar_label: "Kafka ordering and error handling"
description: Design Kafka event flows that stay correct - key selection and partition skew, ordering guarantees and pitfalls, retry and dead-letter strategies with Spring Kafka, non-blocking retries, schema evolution and idempotent consumers.
keywords: [kafka ordering, kafka partition key, partition skew, dead letter topic, DefaultErrorHandler, RetryableTopic, poison pill, schema registry avro compatibility, kafka event design, spring kafka retry]
sidebar_position: 3
---

# Ordering, Partitioning and Error-Handling Design

<Outcomes items={[
  "State exactly what ordering Kafka guarantees",
  "Choose keys and avoid hot partitions",
  "Design retry and dead-letter handling"
]} />

## Ordering: what you actually get

- Records in **one partition** are strictly ordered by offset, and a single consumer reads them in that order.
- **No ordering across partitions**, even within the same topic.
- Therefore: **choose the key so that all events that must be ordered relative to each other share a key** (usually the aggregate id: `orderId`, `accountId`).

I verified on an embedded broker: sending 6 messages for each of 5 keys, every key's messages all landed in a **single partition** and arrived in the order sent (`msg0 … msg5`), as seen by one consumer.

```java
// all events for an order go to one partition, preserving their order
kafkaTemplate.send("order-events", order.id(), toJson(new OrderShipped(order.id())));
```

### Where ordering breaks

| Cause | Fix |
| --- | --- |
| Producer retries with `max.in.flight > 1` and no idempotence | `enable.idempotence=true` (default in modern clients) |
| Adding partitions later: new records for the same key may map to a different partition | Over-provision partitions up front; to add, create a new topic and migrate, or accept a drain period |
| Different keys for related events (`orderCreated` keyed by `orderId`, `paymentTaken` keyed by `paymentId`) | Use one key for the entity whose order matters, or tolerate and resolve with versions/timestamps |
| Multiple threads processing one partition's records in parallel inside a consumer | Process a partition sequentially, or partition work by key onto worker queues with ordered handling per key |
| Retry topics (non-blocking retries) | A retried message is delayed behind newer ones: ordering is deliberately given up |
| Multiple producers publishing the same key from different services | Single writer per aggregate, or version numbers to detect stale events |

Design events to **tolerate disorder** where cheap: include an aggregate **version/sequence** and `occurredAt`, make handlers ignore stale events (`if (event.version <= stored.version) skip`), and prefer idempotent absolute-state events ("OrderStatusChanged to SHIPPED, version 7") over relative deltas when possible.

## Key choice and partition skew

The default partitioner hashes the key (murmur2) modulo the partition count. Pitfalls:

- **Low-cardinality or skewed keys** create **hot partitions**. In my test, 5 keys spread over 3 partitions used only **2** partitions, leaving one consumer idle: a small key space cannot balance. Real-world: one huge tenant or a celebrity user dominates a partition, and the single consumer for it lags.
- **Null keys** use sticky/round-robin partitioning: good balance, no ordering.
- Mitigations: a higher-cardinality key, **key salting** (`customerId + "-" + (n % 4)`) when per-customer order does not matter across sub-streams, or a custom `Partitioner`.
- Choose the partition count with headroom: it caps consumer parallelism per group.

## Error handling in consumers

A consumer that throws repeatedly on the same record must not block the partition forever (**poison pill**), nor silently drop data.

### Blocking retries then a dead-letter topic (DLT)

Spring Kafka's `DefaultErrorHandler` retries the failed record in place (the partition pauses behind it, preserving order), then **recovers**: publishes it to a dead-letter topic and moves on.

```java
@Bean
DefaultErrorHandler errorHandler(KafkaOperations<Object, Object> template) {
    var recoverer = new DeadLetterPublishingRecoverer(template);                // sends to <topic>-dlt, same partition
    var handler = new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, 3L));   // 3 retries, 1 s apart
    handler.addNotRetryableExceptions(JsonParseException.class, ValidationException.class);   // retrying will not help
    return handler;
}
```

I ran this against an embedded broker: a `poison` payload was attempted **3 times** (the initial try plus two retries), then published to the dead-letter topic, and the records **after** it in the partition were processed normally. Notes from that run:

- In Spring Kafka 3.x the default dead-letter topic name is **`<original-topic>-dlt`** (earlier versions used `.DLT`); a listener subscribed to the wrong name sees nothing. Pass a destination resolver to customise.
- The recoverer copies headers describing the original topic, partition, offset and the exception, which you need for diagnosis and replay.
- **Do not retry non-transient errors** (deserialisation, validation); send them straight to the DLT.
- Deserialisation failures happen *before* your listener: wrap the deserializer in `ErrorHandlingDeserializer`, or one malformed record blocks the consumer forever.

```yaml
spring:
  kafka:
    consumer:
      value-deserializer: org.springframework.kafka.support.serializer.ErrorHandlingDeserializer
      properties:
        spring.deserializer.value.delegate.class: org.springframework.kafka.support.serializer.JsonDeserializer
```

### Non-blocking retries (retry topics)

Blocking retries with long backoffs stall the partition (lag, rebalances). `@RetryableTopic` moves failures to **delayed retry topics** and continues:

```java
@RetryableTopic(attempts = "4", backoff = @Backoff(delay = 1000, multiplier = 2.0),
                dltStrategy = DltStrategy.FAIL_ON_ERROR)
@KafkaListener(topics = "payments")
void listen(PaymentRequested event) { process(event); }

@DltHandler
void dead(PaymentRequested event) { alertAndPark(event); }
```

Topology: `payments` → `payments-retry-0` → `payments-retry-1` → … → `payments-dlt`. Trade-off: **ordering is lost** for retried records, and you operate more topics. Use blocking retries when order matters and failures are brief; retry topics for slow/long-backoff dependencies where throughput matters.

### Operating a DLT

A DLT is a **queue of work for humans**, not a graveyard:

- Alert on arrivals and on age; include enough context to diagnose.
- Provide a **replay tool** (publish DLT records back to the main topic after the fix) and make handlers idempotent so replay is safe.
- Distinguish transient (retry soon), poison (needs a code fix) and bad-data (needs correction) failures.
- Set a retention for the DLT long enough for investigation.

## Idempotent consumers

At-least-once delivery means **duplicates will happen** (rebalances, retries, producer retries after timeouts, replays). Make the consumer's effect idempotent:

```java
@Transactional
public void handle(PaymentRequested e) {
    int inserted = jdbc.update("INSERT INTO processed_events(event_id) VALUES (?) ON CONFLICT DO NOTHING", e.eventId());
    if (inserted == 0) return;                       // already processed: skip
    ledger.apply(e);                                 // business effect in the same DB transaction
}
```

Include a unique **event id** in every message (a UUID assigned at the source, preserved across retries and the outbox). More in [Outbox and idempotency](../microservices/data-consistency/outbox-idempotency.md).

## Event design

- **Events** state facts in the past tense (`OrderPlaced`) that consumers react to; **commands** request an action (`ChargePayment`) and have one intended handler. Use separate topics and naming.
- **Event-carried state transfer** (include enough data) reduces call-backs to the producer but couples schemas; **notification events** (just ids) keep events small but force consumers to fetch data.
- Envelope: `eventId`, `eventType`, `occurredAt`, `aggregateId`, `version`, `schemaVersion`, trace id header, payload.
- Keep topics **per business event stream**, not per consumer.

### Schema evolution

Producers and consumers deploy independently, so the format must evolve compatibly. Use **Avro/Protobuf/JSON Schema with a schema registry** to enforce compatibility rules:

| Mode | Allowed changes | Upgrade order |
| --- | --- | --- |
| **Backward** (default) | Delete fields, add optional fields with defaults | Upgrade consumers first |
| **Forward** | Add fields, delete optional ones | Upgrade producers first |
| **Full** | Both | Any order |

Never rename or retype a field in place; add a new one and deprecate the old across releases (the same expand/contract idea as [schema migrations](../databases/schema-migrations.md)). With plain JSON, tolerate unknown fields (`FAIL_ON_UNKNOWN_PROPERTIES=false`) and treat missing fields as defaults.

## Kafka and the outbox

To publish an event atomically with a database change, write it to an **outbox table** in the same transaction and let a relay (polling or Debezium CDC) publish it, keyed by aggregate id so per-aggregate order survives. See [Outbox](../microservices/data-consistency/outbox-idempotency.md) and [Saga](../microservices/data-consistency/saga.md).

## Testing

- **Unit**: handlers with plain objects.
- **Integration**: Testcontainers `KafkaContainer` (or `@EmbeddedKafka` for quick tests) with `@ServiceConnection`; assert via Awaitility, never `Thread.sleep`.
- Test the failure paths: poison message → DLT, duplicate delivery → single effect, consumer restart mid-batch, out-of-order versions.

## Check yourself

<Checkpoint questions={[
  {
    "q": "How do you keep all events for one order in sequence?",
    "options": [
      "Use the order id as the record key",
      "Use a random key",
      "Use a single consumer thread only",
      "Use more topics"
    ],
    "answer": 0,
    "why": "Same key goes to the same partition, which is ordered."
  },
  {
    "q": "One customer produces 80% of traffic and one partition is overloaded. What is this?",
    "options": [
      "A rebalance",
      "A hot partition caused by key skew",
      "A leader election",
      "A compaction"
    ],
    "answer": 1,
    "why": "Pick a better key or add a salt where per-key order allows it."
  },
  {
    "q": "A record keeps failing and blocks the partition. What is a common approach?",
    "options": [
      "Retry forever",
      "Drop it silently",
      "Retry a bounded number of times, then publish it to a dead-letter topic",
      "Delete the topic"
    ],
    "answer": 2,
    "why": "DLTs keep the stream moving and preserve the failed record for inspection."
  }
]} />

## Common interview questions

**1. How do you guarantee ordering in Kafka?**
Use a key so related events share a partition; one consumer processes a partition sequentially; enable idempotent producers; avoid anything that reorders (parallel processing within a partition, retry topics).

**2. What causes hot partitions and how do you fix them?**
Skewed or low-cardinality keys. Use higher-cardinality keys, salting where ordering permits, or a custom partitioner; monitor per-partition lag.

**3. What is a poison pill and how do you handle it?**
A record that always fails processing (bad payload or bug). Use `ErrorHandlingDeserializer`, bounded retries, not-retryable classification and a dead-letter topic so the partition keeps moving.

**4. Blocking vs non-blocking retries?**
Blocking retries preserve order but stall the partition; retry topics keep throughput but lose ordering and add topics. Choose based on whether order or throughput matters.

**5. How do you evolve message schemas safely?**
Schema registry with compatibility rules (backward by default), add optional fields with defaults, never repurpose fields, deploy consumers before producers for backward compatibility.

**6. How do you make consumers idempotent?**
Unique event ids with a dedup table updated in the same transaction as the effect, natural idempotent operations, and conditional updates.

**7. What happens when you add partitions to a live topic?**
New records for existing keys may map to different partitions, breaking per-key ordering during the transition; plan capacity ahead or migrate to a new topic.

**8. How would you design order events across services?**
Key by `orderId`, events as past-tense facts with version and id, outbox for atomic publish, idempotent consumers, DLT with alerting and replay tooling.

## Pitfalls

- Expecting global ordering or assuming retries preserve order.
- Keying by a low-cardinality value.
- No `ErrorHandlingDeserializer`: one bad record halts the consumer.
- Infinite retry loops on non-transient errors.
- A DLT nobody monitors.
- Breaking schema changes in place.
- Dual writes to database and Kafka without an outbox.

## Key takeaways

- Order is per partition; the key is your ordering design.
- Bounded retries, classify errors, and use a monitored DLT with a replay path.
- Assume duplicates: carry event ids and make handlers idempotent.
- Evolve schemas compatibly and design events as facts.
