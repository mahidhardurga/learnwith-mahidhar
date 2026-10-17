---
title: SQL Patterns for Backend Engineers - Joins, Window Functions, CTEs and Upserts
sidebar_label: "SQL patterns"
description: Practical SQL every senior backend developer should write fluently - join semantics, anti-joins, window functions for top-N and running totals, CTEs, upserts, keyset pagination and set-based updates.
keywords: [sql window functions, row_number top n per group, cte, upsert merge, anti join not exists, keyset pagination, sql joins interview, group by having, sql interview questions]
sidebar_position: 2
---

# SQL Patterns for Backend Engineers

Interviews and real systems both reward set-based thinking: express *what* you want, let the optimiser decide *how*. The queries below were run against a real database engine (H2 in PostgreSQL-compatibility mode) to confirm results.

Sample data used below:

```sql
CREATE TABLE customers (id INT PRIMARY KEY, name VARCHAR(50));
CREATE TABLE orders (id INT PRIMARY KEY, customer_id INT, status VARCHAR(10), total DECIMAL(10,2), placed_at DATE);

INSERT INTO customers VALUES (1,'alice'),(2,'bob'),(3,'carol');
INSERT INTO orders VALUES
 (1,1,'PAID',100,'2025-01-01'),(2,1,'PAID',50,'2025-01-05'),(3,1,'NEW',30,'2025-02-01'),
 (4,2,'PAID',70,'2025-01-03'),(5,2,'PAID',20,'2025-01-09');
-- carol has no orders
```

<Outcomes items={[
  "Use joins, anti-joins and window functions correctly",
  "Write upserts and keyset pagination",
  "Handle NULL semantics and read an execution plan"
]} />

## Joins: semantics matter

| Join | Returns |
| --- | --- |
| `INNER JOIN` | Rows with a match on both sides |
| `LEFT JOIN` | All left rows, matched right rows or NULLs |
| `RIGHT JOIN` | Mirror image (rarely needed) |
| `FULL OUTER JOIN` | All rows from both sides |
| `CROSS JOIN` | Cartesian product (every pair) |

```sql
-- Customers and their order counts, including customers with none
SELECT c.name, COUNT(o.id) AS orders
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.name
ORDER BY c.name;
-- alice 3, bob 2, carol 0
```

Two classic traps:

- **`COUNT(*)` vs `COUNT(o.id)`** in a left join: `COUNT(*)` counts the NULL-extended row as 1, so carol would show 1. Count the right-side column.
- **Filtering the right side in `WHERE` turns a left join into an inner join**: `WHERE o.status = 'PAID'` removes carol (NULL status). Put right-side conditions in the `ON` clause to keep unmatched left rows:

```sql
SELECT c.name, COUNT(o.id)
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'PAID'
GROUP BY c.name;           -- carol still appears with 0
```

## Anti-joins and semi-joins

"Customers with **no** orders":

```sql
SELECT c.name FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);     -- carol

SELECT c.name FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;                                                       -- same result
```

Prefer `NOT EXISTS`. **`NOT IN` is dangerous**: if the subquery returns any `NULL`, `NOT IN` yields no rows at all (three-valued logic). `EXISTS` ("semi-join") is also the efficient way to ask "has at least one".

## Aggregation: `GROUP BY`, `HAVING`

```sql
SELECT customer_id, SUM(total) AS spent
FROM orders
WHERE status = 'PAID'            -- filters rows BEFORE grouping
GROUP BY customer_id
HAVING SUM(total) > 100          -- filters groups AFTER aggregation
ORDER BY spent DESC;
-- customer 1: 150
```

Every selected column must be in `GROUP BY` or aggregated (strict engines enforce this).

## Window functions

Compute across related rows **without collapsing them**.

```sql
-- Latest order per customer (top-1 per group)
SELECT customer_id, id, placed_at FROM (
  SELECT o.*, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY placed_at DESC, id DESC) AS rn
  FROM orders o
) t
WHERE rn = 1;
-- (1, order 3), (2, order 5)

-- Running total per customer
SELECT customer_id, placed_at, total,
       SUM(total) OVER (PARTITION BY customer_id ORDER BY placed_at
                        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running
FROM orders;

-- Compare to the previous row, and rank
SELECT id, total,
       LAG(total) OVER (PARTITION BY customer_id ORDER BY placed_at) AS previous_total,
       RANK() OVER (ORDER BY total DESC) AS rank_by_total,
       DENSE_RANK() OVER (ORDER BY total DESC) AS dense_rank
FROM orders;
```

- `ROW_NUMBER` is unique per row; `RANK` leaves gaps after ties (1,1,3); `DENSE_RANK` does not (1,1,2).
- Always give the window a deterministic `ORDER BY` (add a tiebreaker such as `id`) or results are non-reproducible.
- Window functions run **after** `WHERE`/`GROUP BY` and cannot be used in `WHERE`; wrap in a subquery or CTE to filter on them.

## CTEs (`WITH`)

```sql
WITH paid AS (
    SELECT customer_id, SUM(total) AS spent
    FROM orders WHERE status = 'PAID'
    GROUP BY customer_id
)
SELECT c.name, p.spent
FROM customers c
JOIN paid p ON p.customer_id = c.id
WHERE p.spent > 100;                                  -- alice 150
```

CTEs name intermediate steps for readability. In PostgreSQL 12+ they are inlined unless referenced multiple times or marked `MATERIALIZED`; do not assume they are optimisation fences. **Recursive CTEs** walk hierarchies:

```sql
WITH RECURSIVE chain(id, depth) AS (
    SELECT 1, 1
    UNION ALL
    SELECT id + 1, depth + 1 FROM chain WHERE depth < 5
)
SELECT * FROM chain;                                  -- 1..5: use for org charts, category trees, graph traversal
```

## Upsert (insert or update)

Race-free, single-statement "create or update". Syntax is database specific.

```sql
-- PostgreSQL
INSERT INTO page_views (page, views) VALUES ('home', 1)
ON CONFLICT (page) DO UPDATE SET views = page_views.views + 1;

-- MySQL
INSERT INTO page_views (page, views) VALUES ('home', 1)
ON DUPLICATE KEY UPDATE views = views + 1;

-- Standard SQL (H2, Oracle, SQL Server, PostgreSQL 15+)
MERGE INTO page_views t
USING (VALUES ('home', 1)) s(page, views) ON t.page = s.page
WHEN MATCHED THEN UPDATE SET views = t.views + s.views
WHEN NOT MATCHED THEN INSERT (page, views) VALUES (s.page, s.views);
```

This replaces the broken "SELECT then INSERT or UPDATE" pattern that races under concurrency (needs a unique constraint on the key). Idempotent consumers use `INSERT ... ON CONFLICT DO NOTHING` on a processed-message table (see [Outbox and idempotency](../microservices/data-consistency/outbox-idempotency.md)).

## Pagination

```sql
-- Offset: simple but O(offset) for deep pages
SELECT * FROM orders ORDER BY id LIMIT 20 OFFSET 40;

-- Keyset (seek): constant cost per page, needs a unique ordered key
SELECT * FROM orders WHERE id > :lastSeenId ORDER BY id LIMIT 20;

-- Keyset on a non-unique sort key: use a tuple comparison
SELECT * FROM orders
WHERE (placed_at, id) > (:lastPlacedAt, :lastId)
ORDER BY placed_at, id LIMIT 20;
```

## Set-based work beats row-by-row

```sql
-- One statement updates a million rows; a Java loop issues a million round trips
UPDATE orders SET status = 'CANCELLED'
WHERE status = 'NEW' AND placed_at < CURRENT_DATE - 30;

-- Update from another table
UPDATE orders o SET total = (SELECT SUM(i.quantity * i.unit_price) FROM order_items i WHERE i.order_id = o.id)
WHERE o.status = 'NEW';

-- Batch insert from a query
INSERT INTO order_archive SELECT * FROM orders WHERE placed_at < DATE '2024-01-01';
```

For very large changes process in **batches** (`LIMIT` with a loop, by primary key ranges) to keep transactions short and avoid long locks and replication lag.

## Handling `NULL`

- `NULL = NULL` is unknown, not true: use `IS NULL`, `IS NOT DISTINCT FROM`.
- Aggregates ignore NULLs (`AVG` of `1,NULL,3` is 2); `COUNT(*)` counts rows, `COUNT(col)` non-null values.
- `COALESCE(x, 0)` supplies defaults; NULLs sort first or last depending on the engine (`NULLS LAST`).

## Reading the plan

Get into the habit of `EXPLAIN (ANALYZE, BUFFERS)` for anything on a hot path (see [SQL tuning and indexing](../spring/data/sql-tuning-indexing.md)). Common rewrites: replace correlated subqueries with joins or window functions, replace `OR` conditions on different columns with `UNION ALL`, push filters before joins, and select only needed columns.

## Check yourself

<Checkpoint questions={[
  {
    "q": "You want customers who have no orders. Which pattern is safest?",
    "options": [
      "NOT EXISTS (or a LEFT JOIN ... IS NULL)",
      "NOT IN with a nullable subquery",
      "INNER JOIN",
      "GROUP BY customer"
    ],
    "answer": 0,
    "why": "NOT IN returns no rows if the subquery yields a NULL. NOT EXISTS avoids that trap."
  },
  {
    "q": "Which function ranks rows within groups without collapsing them?",
    "options": [
      "GROUP BY",
      "A window function such as ROW_NUMBER() OVER (PARTITION BY ...)",
      "DISTINCT",
      "HAVING"
    ],
    "answer": 1,
    "why": "Window functions keep each row and add computed columns."
  },
  {
    "q": "What does NULL = NULL evaluate to?",
    "options": [
      "True",
      "False always",
      "Unknown (not true)",
      "0"
    ],
    "answer": 2,
    "why": "Use IS NULL. Comparisons with NULL yield unknown."
  }
]} />

## Common interview questions

**1. Difference between `WHERE` and `HAVING`?**
`WHERE` filters rows before grouping; `HAVING` filters groups after aggregation.

**2. `INNER` vs `LEFT JOIN`, and what happens if you filter the right table in `WHERE`?**
Inner returns matches only; left keeps all left rows. A `WHERE` condition on right-table columns discards the NULL-extended rows, effectively making it an inner join; use `ON` conditions instead.

**3. How do you find the second highest salary (or top N per group)?**
`DENSE_RANK() OVER (ORDER BY salary DESC)` and filter on rank 2; per group add `PARTITION BY`. Alternatively `OFFSET 1 LIMIT 1` over distinct salaries.

**4. `ROW_NUMBER` vs `RANK` vs `DENSE_RANK`?**
Unique sequence vs ties share a rank with gaps vs ties share a rank without gaps.

**5. Why is `NOT IN` risky?**
With a NULL in the subquery, the predicate becomes unknown for every row and returns nothing; use `NOT EXISTS`.

**6. How do you delete duplicate rows?**
Rank duplicates with `ROW_NUMBER() OVER (PARTITION BY key_columns ORDER BY id)` and delete rows with `rn > 1` (or `DELETE ... USING` self-join), then add a unique constraint.

**7. How do you implement upsert safely?**
A single `INSERT ... ON CONFLICT`/`MERGE` backed by a unique constraint, never select-then-insert.

**8. What is a correlated subquery and when is it a problem?**
A subquery referencing the outer row, conceptually executed per row; often rewritable as a join or window function; optimisers can unnest some but not all.

**9. How do you find gaps or consecutive sequences?**
`LAG`/`LEAD` to compare neighbours, or the "row_number minus value" islands technique.

## Pitfalls

- `COUNT(*)` with left joins; filters in `WHERE` that cancel outer joins.
- `NOT IN` with nullable subqueries.
- Non-deterministic window ordering.
- Offset pagination on large tables.
- Row-by-row updates from application loops.
- Implicit type conversions that prevent index use.
- `SELECT *` in application queries.

## Key takeaways

- Think in sets; use `EXISTS`, window functions and CTEs rather than loops and correlated queries.
- Know join semantics, NULL logic and ranking functions cold.
- Upserts need a unique key; keyset pagination for deep paging.
- Verify plans with `EXPLAIN ANALYZE` on realistic data.
