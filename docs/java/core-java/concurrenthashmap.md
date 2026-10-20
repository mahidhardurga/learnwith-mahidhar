---
title: ConcurrentHashMap Internals and Atomic Operations
sidebar_label: "ConcurrentHashMap"
description: How ConcurrentHashMap achieves concurrency in Java 8+ with CAS and per-bin locking, why compound operations need compute/merge, weakly consistent iterators, size counting, and common misuse.
keywords: [concurrenthashmap internals, concurrenthashmap vs hashmap, computeIfAbsent, merge, CAS, thread safe map, LongAdder, weakly consistent iterator]
sidebar_position: 5
hide_table_of_contents: true
---

# ConcurrentHashMap

<Outcomes items={[
  "Explain how ConcurrentHashMap achieves thread safety without one global lock",
  "Use compute and merge for atomic per-key updates",
  "Know what it does not guarantee"
]} />

## How the design evolved

| Version | Concurrency control |
| --- | --- |
| Java 5-7 | Table split into **segments** (default 16), each a lock; threads working on different segments run in parallel |
| Java 8+ | No segments. **CAS** to insert into an empty bucket, **`synchronized` on the first node of the bucket** for collisions. Concurrency scales with the number of buckets |

Java 8 design in short:

- **Reads (`get`) take no lock.** Table slots and node `val`/`next` fields are `volatile`, so a reader sees a consistent snapshot of a node.
- **Insert into an empty bin**: `compareAndSet` the slot from `null` to a new node; on failure, retry.
- **Insert into a non-empty bin**: `synchronized (firstNode) { ... }` then walk and append or replace. Only threads hitting the same bucket contend.
- **Bins treeify** like `HashMap` (8 nodes, table ≥ 64).
- **Resize is cooperative**: threads that arrive during a resize help transfer buckets, marking moved bins with a `ForwardingNode`.
- **Size** is not a single counter (that would be a contention point). It uses a base value plus an array of `CounterCell`s, the same idea as `LongAdder`. `size()` sums them, and the result is an estimate under concurrent updates. Use `mappingCount()` for a `long`.

## Restrictions that surprise people

- **No `null` keys or values.** With concurrent reads, `get` returning `null` must unambiguously mean "absent"; allowing null values would make `containsKey` + `get` racy to disambiguate.
- **Iterators are weakly consistent**: they never throw `ConcurrentModificationException`, reflect the state at some point at or after creation, and may or may not show updates made while iterating.
- **`size()` and `isEmpty()` are estimates** when concurrent writes happen.

## Atomic per-key operations

A thread-safe map does not make a **sequence** of calls atomic:

```java
// BROKEN: check-then-act race. Two threads can both see null and both put.
if (!map.containsKey(key)) {
    map.put(key, expensiveValue());
}

// BROKEN: lost updates; two threads read the same count and both write count + 1.
map.put(word, map.get(word) + 1);
```

Use the atomic methods, which lock only the relevant bin:

```java
Map<String, Integer> counts = new ConcurrentHashMap<>();

counts.merge(word, 1, Integer::sum);                       // atomic increment

counts.computeIfAbsent(key, k -> loadFromDb(k));           // atomic "get or create"
counts.compute(key, (k, v) -> v == null ? 1 : v + 1);      // atomic read-modify-write
counts.putIfAbsent(key, 0);
counts.replace(key, expected, newValue);                   // CAS-style conditional update
```

Rules for the remapping functions (`compute*`, `merge`):

- They run **while holding the bin lock**, so keep them short, side-effect free and non-blocking. A slow function blocks all other updates to that bin (and other keys that share it).
- They must **not modify the same map** (directly or indirectly). A recursive `computeIfAbsent` on the same map can deadlock or throw `IllegalStateException: Recursive update`. The Fibonacci memoisation with `computeIfAbsent` calling itself is the classic trap (fixed in Java 9 for detection, but still not allowed).
- The function may be invoked once per call, but for `computeIfAbsent` it is guaranteed to be applied at most once for a missing key.

### Many-values-per-key

```java
Map<String, Set<String>> index = new ConcurrentHashMap<>();
index.computeIfAbsent(tag, t -> ConcurrentHashMap.newKeySet()).add(docId);
```

The value collection must also be thread-safe, because the lock is released after `computeIfAbsent` returns.

## Bulk operations

CHM offers parallel bulk methods with a **parallelism threshold**: `forEach`, `search`, `reduce`, each in key/value/entry/`Map.Entry` variants.

```java
long total = map.reduceValuesToLong(1_000, Integer::longValue, 0L, Long::sum);
```

Pass `Long.MAX_VALUE` to force sequential execution, or `1` for maximum parallelism. They use the common `ForkJoinPool`.

## When not to use it

- Operations spanning several keys (transfer between two accounts) need an external lock or a different design. CHM guarantees atomicity per key only.
- Heavy contention on a single hot key: all updates serialise on that bin. Consider `LongAdder`/`ConcurrentHashMap<K, LongAdder>` for counters:

```java
ConcurrentHashMap<String, LongAdder> hits = new ConcurrentHashMap<>();
hits.computeIfAbsent(url, u -> new LongAdder()).increment();
```

- Need sorted concurrent access: `ConcurrentSkipListMap`.
- Mostly-read tiny map that changes rarely: an immutable map swapped through a `volatile` reference (copy-on-write) can be simpler and faster.

## CHM vs the alternatives

| | `HashMap` | `Hashtable` / `synchronizedMap` | `ConcurrentHashMap` |
| --- | --- | --- | --- |
| Thread-safe | No | Yes (one lock) | Yes (fine-grained) |
| Reads block? | n/a | Yes | No |
| Null keys/values | Yes | No / Yes | No |
| Iterator | Fail-fast | Fail-fast | Weakly consistent |
| Compound ops atomic | No | Only if you lock externally | Via `compute`/`merge` |

## Check yourself

<Checkpoint questions={[
  {
    "q": "Two threads run: if (!map.containsKey(k)) map.put(k, v). Is this safe on a ConcurrentHashMap?",
    "options": [
      "No, the check and the put are two separate operations",
      "Yes, each call is atomic so the pair is atomic",
      "Yes, but only on Java 8+",
      "Only if the map is declared volatile"
    ],
    "answer": 0,
    "why": "Individual operations are atomic, a sequence is not. Use putIfAbsent, computeIfAbsent or merge."
  },
  {
    "q": "Which operation counts words atomically?",
    "options": [
      "map.put(word, map.get(word) + 1)",
      "map.merge(word, 1, Integer::sum)",
      "synchronized(map) around a get and put on a plain HashMap is faster",
      "map.size() before and after"
    ],
    "answer": 1,
    "why": "merge performs the read-modify-write atomically for that key."
  },
  {
    "q": "Does ConcurrentHashMap allow null keys or values?",
    "options": [
      "Yes, null keys only",
      "Yes, null values only",
      "No, both throw NullPointerException",
      "Yes, both"
    ],
    "answer": 2,
    "why": "A null from get() would be ambiguous between absent and mapped-to-null in concurrent code, so nulls are banned."
  }
]} />

## Common interview questions

**1. How does `ConcurrentHashMap` achieve thread safety in Java 8?**
CAS for inserts into empty buckets, `synchronized` on the head node of a bucket for collisions, volatile reads for lock-free `get`, and cooperative resizing. Locking granularity is a single bucket.

**2. Why doesn't it allow null keys or values?**
A `null` result from `get` would be ambiguous (absent or mapped to null), and in a concurrent map you cannot reliably follow up with `containsKey`.

**3. Is `if (!map.containsKey(k)) map.put(k, v)` safe?**
No. Both calls are individually atomic, but the sequence is not. Use `putIfAbsent` or `computeIfAbsent`.

**4. What is the difference between `putIfAbsent` and `computeIfAbsent`?**
`putIfAbsent(k, v)` needs the value already created (and returns the existing value). `computeIfAbsent(k, f)` creates the value lazily and atomically only if absent, and returns the final value.

**5. Does iterating over a CHM throw `ConcurrentModificationException`?**
No; iterators are weakly consistent and tolerate concurrent changes, but they may not reflect them.

**6. How is `size()` computed?**
A striped counter (base + cells) summed on demand; under concurrent mutation it is approximate. `mappingCount()` returns a `long`.

**7. What was wrong with the old segment design?**
Segment count fixed concurrency at creation, memory overhead per segment, and a coarse lock granularity compared with per-bucket locking.

**8. Can two threads update the same key safely?**
Yes if you use `compute`/`merge`/`replace`; the bin lock serialises them, giving atomic per-key read-modify-write.

## Pitfalls

- Check-then-act sequences using separate `get`/`put`.
- Long-running or blocking code in `compute`/`computeIfAbsent`; or modifying the map from inside it.
- Storing non-thread-safe collections as values and mutating them after retrieval.
- Assuming `size()` is exact, or that a CHM makes multi-key invariants safe.
- Using a CHM when a plain immutable snapshot would be simpler.

## Key takeaways

- Per-bucket locking plus CAS and lock-free reads give high read/write concurrency.
- Atomicity is **per key and per call**; use `merge`/`compute*` for compound operations.
- Keep remapping functions short and never touch the same map from inside them.
- Prefer `LongAdder` values for hot counters.
