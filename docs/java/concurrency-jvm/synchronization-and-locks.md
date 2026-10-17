---
title: synchronized, volatile, Atomics and Locks in Java
sidebar_label: "synchronized, volatile, locks"
description: Monitors and synchronized, what volatile does and does not do, CAS and atomic classes, LongAdder, ReentrantLock, ReadWriteLock, StampedLock, and coordination utilities like Semaphore, CountDownLatch and CyclicBarrier.
keywords: [synchronized vs ReentrantLock, volatile keyword, AtomicInteger CAS, LongAdder, ReadWriteLock, StampedLock, CountDownLatch, Semaphore, ABA problem, java locks]
sidebar_position: 2
---

# synchronized, volatile, Atomics and Locks

Shared mutable state needs two guarantees: **atomicity** (a compound action is not interleaved) and **visibility** (a write by one thread becomes visible to others, in a defined order). Each tool provides a different mix.

| Tool | Atomicity | Visibility / ordering | Blocking |
| --- | --- | --- | --- |
| `synchronized` | Yes (critical section) | Yes | Yes |
| `volatile` | Only single reads/writes | Yes | No |
| Atomic classes (CAS) | Yes, single variable | Yes | No (lock-free) |
| `ReentrantLock` & friends | Yes | Yes | Yes (with options) |

<Outcomes items={[
  "Choose between synchronized, volatile, atomics and ReentrantLock",
  "Explain compare-and-swap",
  "Use coordination utilities such as CountDownLatch and Semaphore"
]} />

## `synchronized`

Every object has an **intrinsic lock** (monitor). `synchronized` acquires it on entry and releases it on exit (normal or exceptional). It is **reentrant**: a thread holding the lock can enter other synchronized blocks on the same object.

```java
class Counter {
    private int count;
    public synchronized void increment() { count++; }   // locks 'this'
    public synchronized int get() { return count; }     // reads need the same lock for visibility
}

private final Object lock = new Object();                // prefer a private lock object over 'this'
void work() { synchronized (lock) { ... } }

static synchronized void util() { ... }                  // locks Counter.class
```

Why a private lock: if you synchronise on `this`, outside code can also synchronise on your object and interfere or deadlock with you.

JVM implementation detail (useful for "how does synchronized perform?" questions): uncontended locks are cheap (HotSpot's lightweight locking via CAS on the object header); contended locks inflate to heavyweight monitors that park threads. Biased locking was removed (disabled in JDK 15, removed in 18). Before Java 24, a virtual thread blocked in `synchronized` **pinned** its carrier thread; JDK 24 (JEP 491) largely removed that limitation (see [Virtual threads](virtual-threads.md)).

`wait()/notify()/notifyAll()` coordinate threads on a monitor condition; always wait in a loop and notify while holding the lock. Prefer higher-level utilities (`BlockingQueue`, `Condition`, `CountDownLatch`) over raw wait/notify.

## `volatile`

A `volatile` field gives **visibility** and **ordering**: a write happens-before every subsequent read of that field, and it prevents certain reorderings. It does **not** make compound operations atomic.

```java
private volatile boolean running = true;          // correct use: a stop flag
void stop() { running = false; }
void loop() { while (running) { ... } }           // without volatile the JIT may hoist the read: infinite loop

private volatile int hits;
void hit() { hits++; }                            // BROKEN: read-modify-write is three steps; updates are lost
```

Good uses: one-writer flags, safely publishing an **immutable** object by reference (`volatile Config config`), the double-checked locking field. For counters use `AtomicInteger` or `LongAdder`. Details of why in [Memory model](memory-model.md).

```java
// Double-checked locking is correct only with volatile
class Lazy {
    private static volatile Heavy instance;
    static Heavy get() {
        Heavy h = instance;
        if (h == null) {
            synchronized (Lazy.class) {
                h = instance;
                if (h == null) instance = h = new Heavy();
            }
        }
        return h;
    }
}
// Simpler: the initialization-on-demand holder idiom, thread-safe through class initialization
class LazyHolder { private static class H { static final Heavy I = new Heavy(); } static Heavy get() { return H.I; } }
```

## Atomics and CAS

**Compare-and-swap** (CPU instruction) updates a variable only if it still holds the expected value, so threads can update without locking.

```java
AtomicInteger counter = new AtomicInteger();
counter.incrementAndGet();
counter.updateAndGet(x -> Math.min(x + 1, 100));           // retried in a CAS loop until it succeeds
counter.compareAndSet(5, 6);

AtomicReference<Config> ref = new AtomicReference<>(Config.defaults());
ref.updateAndGet(c -> c.withTimeout(Duration.ofSeconds(2)));   // lock-free copy-on-write of an immutable value
```

- The update function may be **called several times** under contention; keep it pure.
- **ABA problem**: a value changes A → B → A and a CAS wrongly succeeds. Solve with `AtomicStampedReference`/`AtomicMarkableReference` (version stamp) when the intermediate change matters.
- Under heavy contention CAS loops spin and waste CPU. **`LongAdder`** keeps striped cells and sums them on read: much better for high-contention counters and metrics (at the cost of a slightly stale `sum()` and more memory). Use `AtomicLong` when you need exact compare-and-set semantics.
- `VarHandle` (Java 9) exposes fine-grained access modes (`getAcquire`, `setRelease`) for advanced lock-free code.

## `ReentrantLock` and `Condition`

```java
private final ReentrantLock lock = new ReentrantLock();

void update() {
    lock.lock();
    try {
        // critical section
    } finally {
        lock.unlock();                                     // always in finally
    }
}

boolean tryUpdate() throws InterruptedException {
    if (lock.tryLock(100, TimeUnit.MILLISECONDS)) {        // bounded wait: avoids deadlock
        try { /* ... */ return true; } finally { lock.unlock(); }
    }
    return false;
}
```

Compared with `synchronized`:

| Feature | `synchronized` | `ReentrantLock` |
| --- | --- | --- |
| Release | Automatic | Manual in `finally` |
| Try / timed / interruptible acquire | No | `tryLock`, `tryLock(timeout)`, `lockInterruptibly` |
| Fairness option | No | `new ReentrantLock(true)` (longest-waiting first; lower throughput) |
| Multiple conditions | One wait set | Many `Condition`s (`newCondition()`) |
| Introspection | None | `isLocked`, `getQueueLength`, etc. |

A bounded buffer with two conditions:

```java
class BoundedBuffer<T> {
    private final Queue<T> q = new ArrayDeque<>();
    private final int capacity;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();

    BoundedBuffer(int capacity) { this.capacity = capacity; }

    void put(T item) throws InterruptedException {
        lock.lock();
        try {
            while (q.size() == capacity) notFull.await();
            q.add(item);
            notEmpty.signal();
        } finally { lock.unlock(); }
    }

    T take() throws InterruptedException {
        lock.lock();
        try {
            while (q.isEmpty()) notEmpty.await();
            T item = q.remove();
            notFull.signal();
            return item;
        } finally { lock.unlock(); }
    }
}
```

In real code just use `ArrayBlockingQueue`; the example shows the mechanics.

## Read-write locks and `StampedLock`

`ReentrantReadWriteLock` allows many readers or one writer: worthwhile only when reads dominate **and** the critical section is long enough to offset the overhead. It can starve writers or readers depending on mode, and lock **downgrading** (write → read) is supported while **upgrading** is not (deadlock).

`StampedLock` adds **optimistic reads**: read without locking, then validate that no write intervened.

```java
class Point {
    private final StampedLock sl = new StampedLock();
    private double x, y;

    double distanceFromOrigin() {
        long stamp = sl.tryOptimisticRead();
        double cx = x, cy = y;
        if (!sl.validate(stamp)) {                    // a writer got in: fall back to a real read lock
            stamp = sl.readLock();
            try { cx = x; cy = y; } finally { sl.unlockRead(stamp); }
        }
        return Math.hypot(cx, cy);
    }
    void move(double dx, double dy) {
        long stamp = sl.writeLock();
        try { x += dx; y += dy; } finally { sl.unlockWrite(stamp); }
    }
}
```

`StampedLock` is **not reentrant** and does not support conditions; misuse (unlock with a wrong stamp) is easy.

## Coordination utilities

| Utility | Purpose |
| --- | --- |
| `CountDownLatch(n)` | One-shot: threads wait until the count reaches zero (start gate, "all workers done") |
| `CyclicBarrier(n)` | Reusable: n threads wait for each other at a point, optionally running an action |
| `Semaphore(permits)` | Limit concurrent access to a resource (connection limiter, bulkhead) |
| `Phaser` | Flexible, dynamic multi-phase barrier |
| `Exchanger` | Two threads swap objects |
| `BlockingQueue` | Producer-consumer hand-off |

```java
Semaphore limit = new Semaphore(20);                      // at most 20 concurrent calls to a fragile service
void call() throws InterruptedException {
    limit.acquire();
    try { remote.call(); } finally { limit.release(); }
}
```

## Choosing

1. **Avoid sharing**: confinement, immutability, message passing (`BlockingQueue`, actors).
2. Simple state: an immutable snapshot in a `volatile` or `AtomicReference`.
3. Counters/flags: `AtomicXxx`, `LongAdder`, `volatile`.
4. Compound invariants over several fields: one lock (`synchronized` or `ReentrantLock`) guarding **all** of them, always the same lock.
5. Lock-free structures only when measurements prove locks are the bottleneck.

## Check yourself

<Checkpoint questions={[
  {
    "q": "Is count++ on a volatile int thread-safe?",
    "options": [
      "No, volatile gives visibility but the increment is read-modify-write",
      "Yes, volatile makes it atomic",
      "Yes on 64-bit JVMs",
      "Only inside a loop"
    ],
    "answer": 0,
    "why": "Use AtomicInteger or synchronize. volatile alone cannot make compound actions atomic."
  },
  {
    "q": "What does compare-and-swap do?",
    "options": [
      "Locks the object",
      "Updates a value only if it still equals the expected one, atomically",
      "Copies memory between threads",
      "Sorts two values"
    ],
    "answer": 1,
    "why": "CAS is the lock-free primitive behind atomics. Failed attempts retry."
  },
  {
    "q": "You need up to N threads inside a section at once. Which tool fits?",
    "options": [
      "CountDownLatch",
      "volatile",
      "Semaphore",
      "ThreadLocal"
    ],
    "answer": 2,
    "why": "A Semaphore holds N permits. A latch is a one-shot gate and cannot be reused."
  }
]} />

## Common interview questions

**1. `synchronized` vs `ReentrantLock`?**
`ReentrantLock` adds timed/interruptible/try acquisition, fairness and multiple conditions, but needs manual `unlock` in `finally`; `synchronized` is simpler and automatically released. Prefer `synchronized` unless you need those features.

**2. What does `volatile` guarantee? Is `volatile int count; count++` safe?**
Visibility and ordering of reads/writes of that variable. `count++` is not atomic; use `AtomicInteger`/`LongAdder`.

**3. What is CAS and what is the ABA problem?**
An atomic hardware compare-and-set. ABA is a value changing A→B→A so a CAS cannot detect the intermediate change; use stamped references.

**4. `AtomicLong` vs `LongAdder`?**
`AtomicLong` has a single contended cell (exact CAS operations); `LongAdder` stripes updates across cells to reduce contention, ideal for high-throughput counters where an approximate-at-read sum is fine.

**5. How do you avoid deadlock with locks?**
Global lock ordering, `tryLock` with timeouts, fewer nested locks, shorter critical sections, or restructure to message passing.

**6. What is a reentrant lock?**
A lock that the owning thread can acquire again without blocking; it keeps a hold count and releases when the count returns to zero.

**7. `CountDownLatch` vs `CyclicBarrier`?**
A latch is one-shot and releases waiters when the count hits zero; a barrier is reusable and makes all parties wait for each other.

**8. Is double-checked locking safe?**
Only if the field is `volatile` (Java 5+). Prefer the holder idiom or an enum.

**9. Why is `ReadWriteLock` not always faster?**
Acquiring read locks still updates shared lock state (cache-line contention); with short critical sections or frequent writes it can be slower than a plain lock.

## Pitfalls

- Forgetting `unlock()` in `finally`.
- Different locks guarding the same data (no mutual exclusion at all).
- Using a `volatile` counter.
- Holding locks while calling unknown code (callbacks) or doing I/O.
- Synchronising on strings, boxed values or other shared/cached objects.
- Unbounded waits without timeouts.

## Key takeaways

- Atomicity and visibility are separate concerns; know what each primitive gives.
- Prefer immutability, confinement and high-level utilities over hand-rolled locking.
- `volatile` is for flags and safe publication, not for compound updates.
- Use `LongAdder` for hot counters and `tryLock` timeouts to prevent deadlocks.
