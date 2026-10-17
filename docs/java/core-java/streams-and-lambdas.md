---
title: Streams and Lambdas - Laziness, Collectors and Parallel Pitfalls
sidebar_label: "Streams and lambdas"
description: How lambdas compile, how stream pipelines execute lazily, collectors like groupingBy and toMap, Optional guidelines, and when parallel streams hurt, with senior-level pitfalls.
keywords: [java streams, lambda expressions, collectors groupingBy, flatMap, parallel streams, Optional, functional interfaces, invokedynamic, stream gatherers]
sidebar_position: 9
---

# Streams and Lambdas

<Outcomes items={[
  "Explain lazy evaluation in stream pipelines",
  "Pick collectors such as groupingBy and toMap with merge functions",
  "Know when parallel streams hurt"
]} />

## Lambdas under the hood

A lambda is an instance of a **functional interface** (one abstract method). It is compiled to a private synthetic method plus an `invokedynamic` call site; the first execution links it via `LambdaMetafactory`, which spins an implementing class at runtime. It is **not** an anonymous inner class: no extra `.class` file, and `this` inside a lambda refers to the **enclosing** instance.

```java
Function<String, Integer> length = String::length;          // method reference
Supplier<List<String>> factory = ArrayList::new;
BiFunction<Integer, Integer, Integer> add = Integer::sum;
Runnable r = () -> System.out.println(this);                 // 'this' = the enclosing object
```

Captured local variables must be **effectively final**. The rule exists because lambdas may run on other threads later, and copying a changing local would be misleading; mutate state via an object or `AtomicInteger` if you must (and think twice).

Core functional interfaces: `Function<T,R>`, `Predicate<T>`, `Consumer<T>`, `Supplier<T>`, `UnaryOperator<T>`, `BiFunction`, and primitive specialisations (`IntFunction`, `ToLongFunction`...) that avoid boxing.

## Stream pipelines are lazy

A pipeline has a **source**, zero or more **intermediate** operations (lazy, return a stream) and one **terminal** operation (triggers execution). Nothing happens until the terminal operation.

```java
List<String> names = people.stream()
        .filter(p -> p.age() >= 18)          // intermediate
        .map(Person::name)                   // intermediate
        .sorted()                            // intermediate, stateful
        .limit(10)                           // intermediate, short-circuiting
        .toList();                           // terminal (Java 16+, unmodifiable)
```

Elements flow through the stages **one at a time** (vertical processing), except at stateful barriers like `sorted` and `distinct`, which must see everything first.

```java
Stream.of("a", "b", "c")
      .peek(s -> System.out.println("peek " + s))
      .anyMatch(s -> s.equals("a"));          // prints only "peek a": short-circuits
```

| Operation kind | Examples | Notes |
| --- | --- | --- |
| Stateless intermediate | `filter`, `map`, `flatMap`, `peek` | Parallelise well |
| Stateful intermediate | `sorted`, `distinct`, `limit`/`skip` (ordered) | Buffer or coordinate |
| Short-circuit terminal | `findFirst`, `anyMatch`, `allMatch` | Stop early (also on infinite streams) |
| Terminal | `collect`, `reduce`, `forEach`, `count`, `toList` | A stream can be consumed **once** |

`peek` is for debugging only; it may be skipped (e.g. `count()` on a sized stream can skip the pipeline entirely in newer JDKs).

## Collectors worth knowing

```java
record Order(String customer, String status, BigDecimal total) { }

Map<String, List<Order>> byCustomer = orders.stream()
        .collect(Collectors.groupingBy(Order::customer));

Map<String, BigDecimal> revenue = orders.stream()
        .collect(Collectors.groupingBy(Order::customer,
                 Collectors.mapping(Order::total, Collectors.reducing(BigDecimal.ZERO, BigDecimal::add))));

Map<Boolean, Long> paidCount = orders.stream()
        .collect(Collectors.partitioningBy(o -> o.status().equals("PAID"), Collectors.counting()));

Map<String, Order> latestPerCustomer = orders.stream()
        .collect(Collectors.toMap(Order::customer, o -> o,
                 (a, b) -> a.total().compareTo(b.total()) >= 0 ? a : b));   // merge function required for duplicates

String csv = names.stream().collect(Collectors.joining(", ", "[", "]"));

DoubleSummaryStatistics stats = orders.stream()
        .collect(Collectors.summarizingDouble(o -> o.total().doubleValue()));
```

- `toMap` throws `IllegalStateException` on duplicate keys unless you supply a merge function, and `NullPointerException` on null values.
- `groupingBy` returns a `HashMap` by default; pass a map factory (`TreeMap::new`) for ordering.
- `Collectors.teeing` (Java 12) computes two results in one pass and combines them.
- Custom collectors implement supplier/accumulator/combiner/finisher; for new intermediate operations Java 24 finalised **Stream Gatherers** (`Gatherers.windowFixed`, `windowSliding`, `scan`, `fold`, and `Gatherer` for custom ones).

### `flatMap`, `reduce`, primitives

```java
List<String> words = lines.stream()
        .flatMap(line -> Arrays.stream(line.split("\\s+")))
        .toList();

int sum = IntStream.rangeClosed(1, 100).sum();          // no boxing
int total = list.stream().mapToInt(Integer::intValue).sum();
```

`reduce` needs an **associative** accumulator and an identity that is neutral, otherwise parallel results differ from sequential.

## Parallel streams: use sparingly

`parallelStream()` splits the source (via `Spliterator`) and runs on the **common ForkJoinPool**, sized to `cores - 1` and **shared by the whole JVM**.

Use it only when all hold:

1. A large data set (rule of thumb: tens of thousands of elements) **and** meaningful CPU work per element (microseconds, not nanoseconds).
2. A splittable source (`ArrayList`, arrays, ranges; **not** `LinkedList`, `Stream.iterate`, or `BufferedReader.lines`).
3. Stateless, non-interfering, side-effect-free operations.
4. No blocking I/O inside the pipeline: blocking tasks starve the common pool for everyone (including other parallel streams, `CompletableFuture.supplyAsync` without an executor, and unrelated libraries).

```java
// BROKEN: shared mutable state in a parallel stream
List<Integer> out = new ArrayList<>();
IntStream.range(0, 1000).parallel().forEach(out::add);     // lost updates / exceptions

// Correct: let collect() handle the combining
List<Integer> ok = IntStream.range(0, 1000).parallel().boxed().toList();
```

Measure with JMH before and after; parallel streams are often slower for small or I/O-bound workloads. For controlled parallelism run the stream inside your own `ForkJoinPool` or, better for I/O, use virtual threads or an executor (see [Virtual threads](../concurrency-jvm/virtual-threads.md)).

## `Optional`: guidelines

`Optional<T>` models "a result that may be absent" in **return types**. Do not use it for fields, method parameters, collection elements or `Serializable` classes.

```java
String city = user.map(User::address)
                  .map(Address::city)
                  .filter(c -> !c.isBlank())
                  .orElse("unknown");

user.orElseThrow(() -> new UserNotFoundException(id));       // preferred over get()
user.ifPresentOrElse(this::greet, this::askToRegister);
```

- `orElse(x)` evaluates `x` eagerly; use `orElseGet(() -> expensive())` when it is costly.
- Never call `get()` without `isPresent()`; prefer `orElseThrow()`.
- Do not return `null` from a method that returns `Optional`.
- Use `OptionalInt`/`OptionalLong` for primitives.

## Style and performance notes

- Streams are about **clarity**, not speed. A simple `for` loop is faster in hot paths, with no allocation of lambdas, pipeline stages and boxed values.
- Avoid side effects in `map`/`filter`; keep side effects in `forEach` only at the end.
- Beware stream reuse: `IllegalStateException: stream has already been operated upon or closed`.
- Streams that wrap resources (`Files.lines`, `Files.walk`) must be closed with try-with-resources.
- Checked exceptions inside lambdas do not compose; wrap them or write a small functional interface that throws, rather than hiding them with sneaky throws.

```java
try (Stream<String> lines = Files.lines(path)) {
    long errors = lines.filter(l -> l.contains("ERROR")).count();
}
```

## Check yourself

<Checkpoint questions={[
  {
    "q": "When does the code inside map() in stream.map(f).filter(g) run?",
    "options": [
      "Only when a terminal operation is invoked",
      "Immediately when map is called",
      "When the stream is created",
      "Never, map is a no-op"
    ],
    "answer": 0,
    "why": "Intermediate operations are lazy. Nothing happens until a terminal operation such as collect or forEach."
  },
  {
    "q": "Collectors.toMap throws IllegalStateException on some input. What is the usual cause?",
    "options": [
      "A null value in the stream source",
      "Duplicate keys with no merge function",
      "The map is too large",
      "The stream is parallel"
    ],
    "answer": 1,
    "why": "Provide a merge function: toMap(key, value, (a, b) -> a)."
  },
  {
    "q": "Which workload suits parallelStream()?",
    "options": [
      "Blocking I/O calls to a remote service",
      "Small lists of a few items",
      "CPU-bound work over a large, easily split source",
      "Operations that update shared mutable state"
    ],
    "answer": 2,
    "why": "Parallel streams share the common ForkJoinPool. Blocking calls starve it and small inputs cost more in overhead than they save."
  }
]} />

## Common interview questions

**1. What does "streams are lazy" mean?**
Intermediate operations only build a pipeline description; work happens at the terminal operation and elements are pulled through the stages one by one, enabling short-circuiting and fusion.

**2. Difference between `map` and `flatMap`?**
`map` transforms each element to one element; `flatMap` transforms each element to a stream and flattens the results into a single stream.

**3. When should you use a parallel stream?**
Large, CPU-bound, stateless computations on splittable sources, after measuring. Avoid with blocking I/O, small data, shared mutable state, or ordered/stateful operations.

**4. `findFirst` vs `findAny`?**
`findFirst` respects encounter order; `findAny` may return any element and is cheaper in parallel.

**5. How is a lambda different from an anonymous class?**
Lambdas compile via `invokedynamic`, have no separate class file at compile time, and `this` refers to the enclosing instance; anonymous classes create a new type with their own `this`.

**6. What does effectively final mean and why does it exist?**
A local variable never reassigned after initialisation; lambdas capture values (not variables), so allowing reassignment would be ambiguous and unsafe across threads.

**7. Why can `toMap` throw, and how do you handle it?**
Duplicate keys raise `IllegalStateException`; supply a merge function. Null values raise `NullPointerException`; filter them or use `groupingBy`/`HashMap.merge`.

**8. `Optional.orElse` vs `orElseGet`?**
`orElse` evaluates its argument eagerly even when a value is present; `orElseGet` calls the supplier only when empty.

**9. What are Stream Gatherers?**
A Java 24 final API that lets you define custom intermediate stream operations (windowing, scanning, folding) via `stream.gather(...)`, complementing collectors which only customise terminal operations.

## Pitfalls

- Using `parallelStream()` by reflex, or with blocking calls in the common pool.
- Mutating external state from lambdas.
- `Optional` as a field or parameter; calling `get()` blindly.
- Boxing in numeric pipelines (use `mapToInt` and friends).
- Re-consuming a stream; not closing I/O-backed streams.
- Overlong stream chains that are less readable than a loop.

## Key takeaways

- Pipelines are lazy and pull-based; terminal operations trigger them.
- Know `groupingBy`, `toMap` (merge function!), `partitioningBy`, `teeing`.
- Parallel streams share the common pool and need CPU-heavy, stateless, splittable work.
- `Optional` is for return values only.
