---
title: Relational Database Design - Normalization, Keys and Constraints
sidebar_label: "Relational design"
description: Design relational schemas that stay correct and fast - normal forms, primary key strategies (sequence, UUID, UUIDv7), constraints, data types, denormalization trade-offs, soft deletes and multi-tenancy.
keywords: [database normalization, primary key uuid vs sequence, foreign keys, constraints, denormalization, soft delete, multi tenancy database, schema design, third normal form]
sidebar_position: 1
---

# Relational Database Design

<Outcomes items={[
  "Normalise a design to third normal form and know when to denormalise",
  "Choose keys and constraints",
  "Pick correct data types for money and time"
]} />

## Normalisation: why and how far

Normalisation removes redundancy so each fact is stored **once**, preventing update, insert and delete anomalies.

| Form | Rule | Violation example |
| --- | --- | --- |
| **1NF** | Atomic values, no repeating groups | A `phones` column holding `"123,456"` |
| **2NF** | 1NF + every non-key column depends on the **whole** key | In `order_items(order_id, product_id, product_name)`, `product_name` depends only on `product_id` |
| **3NF** | 2NF + no non-key column depends on another non-key column (**no transitive dependency**) | `employees(id, dept_id, dept_name)`: `dept_name` depends on `dept_id` |
| **BCNF** | Every determinant is a candidate key | Rare edge cases of overlapping candidate keys |

Rule of thumb: model to **3NF**, then denormalise **deliberately** where measured read patterns demand it.

```sql
-- Normalised
CREATE TABLE customers (
    id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email   VARCHAR(255) NOT NULL UNIQUE,
    name    VARCHAR(200) NOT NULL
);
CREATE TABLE orders (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    status      VARCHAR(20) NOT NULL CHECK (status IN ('NEW','PAID','SHIPPED','CANCELLED')),
    placed_at   TIMESTAMP NOT NULL
);
CREATE TABLE order_items (
    order_id   BIGINT NOT NULL REFERENCES orders(id),
    line_no    INT    NOT NULL,
    sku        VARCHAR(40) NOT NULL,
    quantity   INT    NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL,                 -- price AT TIME OF ORDER: intentional snapshot, not redundancy
    PRIMARY KEY (order_id, line_no)
);
```

Note the **snapshot** columns: copying the unit price into the order line is not a normalisation violation, because it is a different fact (the price charged then), while the product's current price may change. Distinguish duplicated data from historical facts.

### When to denormalise

- Read-heavy paths where joins dominate and the data changes rarely (precomputed totals, a `customer_name` copy in a reporting table).
- Aggregates maintained for speed (order total, counters), updated in the same transaction, by trigger, or asynchronously via events.
- Reporting/analytics: use separate read models or a warehouse ([CQRS](../microservices/data-consistency/cqrs-event-sourcing.md)) instead of distorting the transactional schema.

Every denormalised copy needs an **owner and an update rule**; otherwise it drifts.

## Keys

**Primary key** uniquely identifies a row; make it **immutable** and **meaningless** (a surrogate key) unless a natural key is truly stable.

| Strategy | Pros | Cons |
| --- | --- | --- |
| Auto-increment / identity / sequence (`BIGINT`) | Compact, index-friendly (sequential inserts append to the B-tree), human-readable | Reveals counts/order, needs coordination across shards, enumerable (always authorise!) |
| **Random UUID (v4)** | Generate anywhere, no coordination, hard to guess | 16 bytes; random inserts fragment B-tree indexes and thrash caches |
| **UUIDv7 / ULID / Snowflake** | Time-ordered: globally unique **and** index-friendly | Embeds creation time; needs a library (UUIDv7 in recent databases/libraries) |
| Natural key (email, ISBN) | Meaningful | Changes (emails change), non-uniqueness surprises; use as a **unique constraint** instead |
| Composite key | Models association tables naturally (`order_id, line_no`) | Awkward as foreign keys elsewhere |

Use `BIGINT` for ids (`INT` overflows at ~2.1 billion and fixing it later means a rewrite). In JPA prefer `SEQUENCE` generation with an allocation size for batching (see [JPA basics](../spring/data/jpa-basics.md)). Never expose sequential ids as the only protection of a resource.

## Constraints are your last line of defence

Application validation can be bypassed by other services, scripts and bugs; the database is the only place that sees every write.

| Constraint | Use |
| --- | --- |
| `NOT NULL` | Make absence an explicit design choice; default to `NOT NULL` |
| `UNIQUE` | Natural keys, "one active subscription per customer" (partial unique indexes: `WHERE active`) |
| `FOREIGN KEY` | Referential integrity; choose `ON DELETE` behaviour deliberately (RESTRICT by default; CASCADE only for true ownership) |
| `CHECK` | Domain rules (`quantity > 0`, status values) |
| Exclusion constraints (PostgreSQL) | No overlapping ranges (room bookings) |

Foreign keys cost a little on writes and are sometimes dropped at massive scale or in sharded designs, but the default for a transactional system should be to **have them**, and to index the referencing column (databases do not do it automatically except in some engines), or deletes and joins become slow.

## Data types

- **Money**: `NUMERIC/DECIMAL(precision, scale)` (`BigDecimal` in Java) or integer minor units (cents). **Never** `FLOAT`/`DOUBLE`.
- **Time**: store instants in UTC (`TIMESTAMP WITH TIME ZONE` / `timestamptz`, or UTC `TIMESTAMP`) and convert at the edge; use `DATE` for pure dates. Avoid storing local times without zones.
- **Text**: `VARCHAR(n)` with sensible limits; `TEXT` for unbounded content; collation and case-sensitivity matter for uniqueness (`citext` or functional unique indexes on `lower(email)`).
- **Booleans/enums**: `BOOLEAN`, or constrained `VARCHAR`/lookup table; database enum types are awkward to change. In JPA store enums `@Enumerated(EnumType.STRING)`, never `ORDINAL`.
- **JSON** (`jsonb` in PostgreSQL): good for sparse, schemaless attributes and event payloads; poor for data you filter and join on constantly (index with GIN or extract columns). Do not use it to avoid modelling.
- **Large blobs**: store files in object storage, keep the URL/metadata in the table.

## Auditing, soft deletes and history

- **Audit columns**: `created_at`, `updated_at`, `created_by`, `version` (optimistic lock).
- **Soft delete** (`deleted_at` flag) preserves data and enables undelete, but every query must filter it (use a view, Hibernate `@SQLRestriction`, or partial indexes), unique constraints must account for deleted rows, and GDPR "erase" requirements may demand real deletion. Prefer an **archive/history table** or event log when you need history.
- **Temporal tables / history tables** via triggers or CDC for audit trails.

## Multi-tenancy models

| Model | Isolation | Cost |
| --- | --- | --- |
| Database per tenant | Strongest | Highest operations cost, connection management |
| Schema per tenant | Strong | Migration across many schemas |
| **Shared tables with `tenant_id`** | Logical | Cheapest; every query must be scoped (Hibernate `@TenantId`/filters, PostgreSQL row-level security as a safety net); composite indexes lead with `tenant_id` |

A missing `tenant_id` predicate is a data leak; enforce at a single layer and test it.

## Schema design checklist for reviews

1. Every table has a primary key; ids are `BIGINT`/UUIDv7 and never reused.
2. Every foreign key is indexed; delete behaviour is explicit.
3. `NOT NULL`, `UNIQUE` and `CHECK` encode the business rules.
4. Money is decimal; time is UTC; enums are strings.
5. Indexes serve the real queries (see [SQL tuning](../spring/data/sql-tuning-indexing.md)); no redundant indexes.
6. Growth: which tables get huge, and how will you archive or partition them?
7. Migration plan is backwards compatible ([Schema migrations](schema-migrations.md)).
8. PII is identified, minimised, encrypted where needed, and deletable.

## Check yourself

<Checkpoint questions={[
  {
    "q": "Why store money as DECIMAL rather than FLOAT?",
    "options": [
      "Floating point cannot represent many decimal fractions exactly",
      "DECIMAL is smaller",
      "FLOAT is not supported",
      "DECIMAL is faster in every case"
    ],
    "answer": 0,
    "why": "Use DECIMAL (or integer minor units) to avoid rounding errors."
  },
  {
    "q": "What does a foreign key guarantee?",
    "options": [
      "Faster queries",
      "A referenced row exists in the parent table",
      "Unique values",
      "Encryption"
    ],
    "answer": 1,
    "why": "Constraints in the database protect integrity no matter which application writes."
  },
  {
    "q": "What is the main goal of normalisation?",
    "options": [
      "Make queries shorter",
      "Use fewer tables always",
      "Avoid duplicated facts that cause update anomalies",
      "Hide data"
    ],
    "answer": 2,
    "why": "Each fact lives in one place. Denormalise deliberately for read performance."
  }
]} />

## Common interview questions

**1. What is normalisation and why do we do it?**
Structuring tables so each fact is stored once, removing redundancy and update/insert/delete anomalies; commonly to 3NF.

**2. When would you denormalise?**
When measured read performance demands it and the data changes rarely, with a clear mechanism to keep copies consistent; or in separate read models for reporting.

**3. Sequence ids vs UUIDs?**
Sequences: compact and index-friendly but need coordination and are guessable. Random UUIDs: decentralised but fragment indexes; time-ordered UUIDv7/ULID combine uniqueness with index locality.

**4. Why use database constraints if the application validates?**
Multiple writers, bugs and concurrency (race conditions) bypass application checks; constraints are enforced for every write and are the only reliable guard for uniqueness.

**5. Why not use `FLOAT` for money?**
Binary floating point cannot represent most decimal fractions exactly, causing rounding errors; use `DECIMAL`/integers.

**6. How do you model many-to-many?**
An association table with foreign keys to both sides and a composite primary key (plus extra attributes of the relationship).

**7. What are the trade-offs of soft deletes?**
Easy recovery and history, but every query/unique constraint must handle the flag, data volume grows, and legal deletion may still be required.

**8. How do you choose a multi-tenancy model?**
By isolation, compliance and scale needs: database-per-tenant for strict isolation, shared schema with `tenant_id` for many small tenants, with row-level safeguards.

## Pitfalls

- `INT` primary keys on tables that will grow.
- Missing indexes on foreign keys.
- Relying on application-level uniqueness checks.
- Storing money in doubles and times without zones.
- `ON DELETE CASCADE` everywhere (accidental mass deletion).
- `EnumType.ORDINAL` in JPA.
- JSON columns as an escape from modelling.

## Key takeaways

- Normalise to 3NF; denormalise deliberately and own every copy.
- Surrogate immutable keys; prefer time-ordered ids when using UUIDs.
- Push invariants into constraints; index foreign keys.
- Use correct types: decimals for money, UTC for time.
