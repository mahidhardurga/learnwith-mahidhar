---
title: Immutability in Java - Design, Records and Safe Publication
sidebar_label: "Immutability"
description: How to build truly immutable classes, defensive copying, shallow versus deep immutability, unmodifiable views, String immutability and interning, and why immutability underpins thread safety.
keywords: [java immutability, immutable class, defensive copy, records immutable, safe publication, String pool, final fields, unmodifiable collections]
sidebar_position: 6
hide_table_of_contents: true
---

# Immutability

<Outcomes items={[
  "List the rules for an immutable class",
  "Explain shallow versus deep immutability",
  "Describe why immutable objects are safe to share between threads"
]} />

## Why it matters

- **Thread safety**: no mutable state means no races and no locks. `final` fields also get special visibility guarantees in the Java Memory Model (see [Memory model](../concurrency-jvm/memory-model.md)).
- **Safe sharing**: pass references freely, cache, use as `HashMap` keys with stable hash codes.
- **Failure atomicity**: an object is never half-updated.
- **Easier reasoning**: no spooky action at a distance.

Cost: modifications create new objects (garbage). For small value objects this is cheap thanks to escape analysis and young-generation GC; for large structures use persistent data structures or builders.

## Recipe for an immutable class

1. Make the class `final` (or use a private constructor/sealed) so subclasses cannot add mutability.
2. Make all fields `private final`.
3. No setters; "modifying" methods return new instances.
4. **Defensively copy mutable inputs** in the constructor.
5. **Defensively copy or wrap mutable state on output.**
6. Do not let `this` escape from the constructor.

```java
public final class Booking {
    private final String id;
    private final LocalDate start;
    private final List<String> guests;

    public Booking(String id, LocalDate start, List<String> guests) {
        this.id = Objects.requireNonNull(id);
        this.start = Objects.requireNonNull(start);
        this.guests = List.copyOf(guests);           // copy in: later changes to the caller's list do not affect us
    }

    public List<String> guests() { return guests; }  // already immutable, safe to return

    public Booking withStart(LocalDate newStart) {   // "wither" returns a new instance
        return new Booking(id, newStart, guests);
    }
}
```

`Date`, arrays and `StringBuilder` are mutable: copy them (`new Date(d.getTime())`, `array.clone()`) or, better, use `java.time` types and immutable collections.

### The classic leak

```java
public final class Broken {
    private final List<String> items;
    public Broken(List<String> items) { this.items = items; }          // stores the caller's reference
    public List<String> items() { return items; }                      // hands it back too
}
List<String> list = new ArrayList<>(List.of("a"));
Broken b = new Broken(list);
list.add("b");                                                          // b changed: it was never immutable
```

`final` makes the **reference** constant, not the **object** it points to.

## Shallow vs deep

| | |
| --- | --- |
| **Shallow** immutable | Its own fields cannot change, but it may reference mutable objects |
| **Deep** immutable | Everything reachable is immutable |

Records are **shallowly** immutable:

```java
record Team(String name, List<String> members) {
    Team {
        members = List.copyOf(members);              // compact constructor makes it deeply immutable
    }
}
```

Without the copy, `team.members().add("x")` would work on an `ArrayList` component.

## `Collections.unmodifiableList` vs `List.copyOf`

```java
List<String> source = new ArrayList<>(List.of("a", "b"));
List<String> view = Collections.unmodifiableList(source);   // a VIEW: later changes to source show through
List<String> copy = List.copyOf(source);                    // an independent immutable copy
source.add("c");
view.size();   // 3
copy.size();   // 2
```

Use views to expose read-only access to your own internal collection; use copies to take ownership of input.

## `String` immutability

`String` is immutable, which enables:

- **String pool and interning**: literals share one instance (`"a" == "a"` is true; `new String("a") == "a"` is false). `intern()` returns the pooled instance (the pool lives on the heap since Java 7).
- **Cached hash code**: computed once, so strings are ideal map keys.
- **Security**: file paths and class names cannot be changed after validation.
- **Thread safety**.

Pitfalls: building strings in loops with `+=` creates many objects (the compiler optimises simple concatenation with `invokedynamic`, but not inside loops); use `StringBuilder`. Keep passwords in `char[]` so they can be wiped, since a `String` stays in memory until GC.

## Safe publication

An object that is correctly constructed can still be seen **partially constructed** by another thread if it is shared through a data race. Immutable objects with all `final` fields are safe even then: the JMM guarantees a thread seeing the reference also sees the final fields as set in the constructor. For mutable objects, publish via `volatile`, `final`, a lock, or a concurrent collection.

```java
class Holder {
    private volatile Config config = Config.defaults();       // immutable Config swapped atomically

    void reload() { config = Config.load(); }                 // readers see the old or the new, never a mix
    Config current() { return config; }
}
```

An immutable snapshot behind a `volatile` (or `AtomicReference`) is a simple, powerful pattern for read-mostly configuration and routing tables.

## Builders and "withers" for larger objects

```java
public record Order(String id, List<Line> lines, Status status) {
    public Order { lines = List.copyOf(lines); }
    public Order withStatus(Status s) { return new Order(id, lines, s); }
}
```

For many optional fields, a builder collects mutable state, then `build()` produces the immutable object. Lombok's `@With`/`@Builder` or IDE tooling avoid boilerplate; records plus `withX` methods are sufficient for small types.

## Immutability and JPA / frameworks

JPA entities are inherently mutable (dirty checking, proxies, no-arg constructors); keep **immutability for value objects, DTOs, events and configuration**, and map between them. Use `@Embeddable` records carefully (support depends on the Hibernate version) and `@Immutable` for read-only entities.

## Check yourself

<Checkpoint questions={[
  {
    "q": "A class has all final fields but one field is a mutable List. Is the class immutable?",
    "options": [
      "No, callers can still change the list contents (shallow immutability only)",
      "Yes, final guarantees immutability",
      "Yes, as long as there are no setters",
      "Yes, if the list is private"
    ],
    "answer": 0,
    "why": "final fixes the reference, not the referenced object. Copy defensively with List.copyOf and never expose the internal list."
  },
  {
    "q": "Why can immutable objects be shared across threads without locks?",
    "options": [
      "The JVM copies them per thread",
      "Their state never changes after construction, so there is nothing to race on",
      "They are always stored in thread-local memory",
      "Synchronisation is added automatically"
    ],
    "answer": 1,
    "why": "With safe publication, final fields give a consistent view to every thread."
  },
  {
    "q": "Which is the best way to build an immutable class with many optional fields?",
    "options": [
      "Telescoping constructors with every combination",
      "Public mutable fields plus documentation",
      "A builder (or withers) that produces the final object",
      "Setters that throw after the first call"
    ],
    "answer": 2,
    "why": "Builders keep construction readable, and the built object stays immutable."
  }
]} />

## Common interview questions

**1. How do you create an immutable class?**
Final class, private final fields, no setters, defensive copies of mutable inputs and outputs, and no escaping `this`. Return new instances for changes.

**2. Is a class with a `final List` field immutable?**
No. The reference is final, but the list's contents can change unless it is an immutable list copied from the input and never exposed in mutable form.

**3. Are records immutable?**
Shallowly. Component fields are final, but mutable components (lists, arrays, dates) stay mutable unless copied in the compact constructor.

**4. Why is `String` immutable?**
Thread safety, string pool sharing, cached hash codes, and security of values used as identifiers and paths.

**5. `String` vs `StringBuilder` vs `StringBuffer`?**
`String` is immutable; `StringBuilder` is a mutable, unsynchronised builder; `StringBuffer` is the synchronised legacy version (rarely needed).

**6. How does `final` relate to the memory model?**
After the constructor completes, other threads that obtain the reference see correctly initialised `final` fields, even without synchronisation (provided `this` did not escape).

**7. When is immutability a poor fit?**
Large, frequently updated structures where copying cost dominates (use mutable with confinement or persistent structures), and ORM entities.

## Pitfalls

- Believing `final` makes objects immutable.
- Storing and returning caller-supplied collections or arrays directly.
- Records with mutable components and no copying.
- Letting `this` escape in a constructor (registering a listener, starting a thread).
- Using `Collections.unmodifiableX` when an independent copy was needed.

## Key takeaways

- Immutability = no setters + defensive copies + final class + no escaping `this`.
- `final` is about references; deep immutability needs immutable components.
- An immutable snapshot behind a volatile reference is a robust concurrency pattern.
- Use immutable value objects, mutable entities where frameworks demand them.
