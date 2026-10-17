---
title: Java 8 to 25 - Features Every Senior Developer Should Know
sidebar_label: "Java 8 to 25 features"
description: A release-by-release tour of important Java features from Java 8 to Java 25 LTS - lambdas, modules, var, records, sealed classes, pattern matching, virtual threads, sequenced collections and what to adopt.
keywords: [java 8 features, java 11, java 17, java 21, java 25, records, sealed classes, pattern matching, text blocks, switch expressions, LTS versions]
sidebar_position: 10
---

# Java 8 to 25: What Matters

New LTS releases arrive every two years: **8, 11, 17, 21, 25**. Interviewers often ask "what is new since Java 8?" and "which features would you actually adopt?". This page groups features by value, not just by number. Always check the JEP status for your exact JDK; some features are previews in one release and final in the next.

<Outcomes items={[
  "Place the main features on the Java 8, 17, 21 and 25 timeline",
  "Choose between records, sealed types and pattern matching",
  "Plan a migration between LTS releases"
]} />

## Timeline (LTS in bold)

| Release | Headline features |
| --- | --- |
| **8** (2014) | Lambdas, streams, `Optional`, default methods, `java.time`, `CompletableFuture` |
| 9 | Modules (JPMS), `List.of/Set.of/Map.of`, private interface methods, `Flow` API |
| 10 | `var` for locals |
| **11** (2018) | `HttpClient`, `String` helpers (`isBlank`, `strip`, `lines`, `repeat`), `var` in lambdas, single-file launch |
| 12-13 | Switch expressions (preview), text blocks (preview), `Collectors.teeing` |
| 14 | Switch expressions final, helpful `NullPointerException` messages |
| 15 | Text blocks final, `ZGC` production, hidden classes |
| 16 | **Records** final, pattern matching for `instanceof` final, `Stream.toList()`, strong encapsulation of JDK internals begins |
| **17** (2021) | **Sealed classes** final, strong encapsulation default, new `RandomGenerator` API |
| 18 | UTF-8 by default, simple web server `jwebserver` |
| 19-20 | Virtual threads and structured concurrency (preview), record patterns (preview) |
| **21** (2023) | **Virtual threads**, **pattern matching for `switch`** and **record patterns** final, **sequenced collections**, generational ZGC |
| 22-24 | Unnamed variables/patterns `_` final (22), foreign function & memory API final (22), stream gatherers final (24), class-file API, ahead-of-time class loading (24) |
| **25** (2025) | Scoped values, module import declarations, compact source files and instance `main`, flexible constructor bodies, compact object headers, generational Shenandoah (all final in 25) |

## Language features worth adopting

### `var` (10)

Local variable type inference. Use when the type is obvious from the right-hand side; avoid when it hides meaning.

```java
var orders = orderRepository.findByStatus("NEW");        // ok
var x = compute();                                       // unclear: avoid
```

### Switch expressions (14)

```java
int days = switch (month) {
    case FEB -> 28;
    case APR, JUN, SEP, NOV -> 30;
    default -> 31;
};
```

No fall-through, exhaustive for enums/sealed types, and usable as an expression. `yield` returns a value from a block.

### Text blocks (15)

```java
String json = """
        {
          "name": "%s",
          "active": true
        }
        """.formatted(name);
```

Incidental indentation is stripped by the position of the closing delimiter.

### Records (16)

Transparent immutable data carriers: the compiler generates the constructor, accessors, `equals`, `hashCode`, `toString`.

```java
public record Money(BigDecimal amount, String currency) {
    public Money {                                   // compact constructor: validation
        Objects.requireNonNull(amount);
        if (amount.signum() < 0) throw new IllegalArgumentException("negative");
    }
    public Money plus(Money other) { return new Money(amount.add(other.amount), currency); }
}
```

Limits: records are **shallowly** immutable (a `List` component can still be mutated; copy defensively with `List.copyOf`), cannot extend classes, and are poor JPA entities (no no-arg constructor, final fields). Excellent for DTOs, value objects, events, map keys, `@ConfigurationProperties`.

### Sealed classes and interfaces (17)

Restrict which types may extend or implement a type, enabling exhaustive pattern matching (see [OOP and design](oop-and-design.md)).

### Pattern matching (16 → 21)

```java
if (obj instanceof String s && s.length() > 3) {         // type test + binding (16)
    use(s);
}

String describe(Object o) {
    return switch (o) {                                   // pattern switch (21)
        case null -> "null";
        case Integer i when i > 100 -> "big int " + i;    // guarded pattern
        case Integer i -> "int " + i;
        case String s -> "string " + s;
        case Point(int x, int y) -> "point " + x + "," + y;   // record pattern, deconstruction
        default -> "other";
    };
}
```

### Unnamed variables (22)

`_` for values you must declare but do not use: `catch (IOException _)`, `case Circle _ ->`, `(a, _) -> a`.

### Java 25 additions

- **Module import declarations**: `import module java.base;` brings in all exported packages of a module.
- **Compact source files and instance `main`**: a source file can contain just `void main() { ... }`, lowering the barrier for scripts and teaching.
- **Flexible constructor bodies**: statements (validation, argument preparation) may appear before `super(...)`/`this(...)` as long as they do not use the instance under construction.
- **Scoped values**: immutable, inheritable-by-child-threads context, a better alternative to `ThreadLocal` for virtual threads.
- Structured concurrency remained in preview as of Java 25; check your JDK.

## API and platform features

- **`java.time`** (8): immutable, thread-safe date/time; replace `Date`/`Calendar` and `SimpleDateFormat` (not thread-safe).
- **`HttpClient`** (11): HTTP/2, async, `CompletableFuture`-based.
- **Sequenced collections** (21): `getFirst()`, `getLast()`, `reversed()` across lists, deques, linked sets/maps and sorted sets.
- **Virtual threads** (21): see [Virtual threads](../concurrency-jvm/virtual-threads.md).
- **Foreign Function & Memory API** (22): safe, fast native interop replacing JNI and `sun.misc.Unsafe` use cases.
- **Vector API**: still incubating; SIMD in Java.
- **Helpful NPE messages** (14/15): the message names the null variable or call chain.
- **`Stream.toList()`**, `Collectors.teeing`, `String.formatted`, `Objects.requireNonNullElse`, `Optional.orElseThrow()`, `Map.entry`.

## JVM and runtime changes

| Area | Change |
| --- | --- |
| GC | G1 default since 9; ZGC production since 15, generational ZGC in 21 (default mode in 23+); Shenandoah in OpenJDK builds; Parallel GC still available |
| Class sharing | AppCDS and dynamic archives reduce startup (Spring Boot 3.3+ supports CDS; GraalVM native image is another route) |
| Containers | The JVM is container-aware (cgroup limits): sizes heap from container memory (`-XX:MaxRAMPercentage`) |
| Strong encapsulation | `--illegal-access` removed; reflective access to JDK internals needs `--add-opens` |
| Removed/deprecated | Applets, Nashorn, Security Manager (deprecated for removal), CMS, `finalize` (deprecated for removal) |

## Migration notes (8 → 17 → 21)

- Jakarta EE namespace switch (`javax.*` → `jakarta.*`) arrives with Spring Boot 3 / Spring Framework 6, which require **Java 17+**.
- Libraries using deep reflection (older mocking, serialization, bytecode libraries) may need updates or `--add-opens`.
- Test on the target JDK in CI; use `jdeps` to find internal API use and `jdeprscan` for deprecated APIs.
- Default charset is UTF-8 from Java 18, which can change behaviour of code relying on the platform default.

## Check yourself

<Checkpoint questions={[
  {
    "q": "What are records mainly for?",
    "options": [
      "Concise immutable data carriers with generated equals, hashCode and toString",
      "Replacing all classes",
      "Mutable beans with setters",
      "Multi-threading"
    ],
    "answer": 0,
    "why": "A record declares its components once and the compiler generates the boilerplate. Components are final."
  },
  {
    "q": "Which of these is a Java 21 feature?",
    "options": [
      "Lambdas",
      "Virtual threads (final)",
      "The module system",
      "var for local variables"
    ],
    "answer": 1,
    "why": "Lambdas arrived in Java 8, modules in 9 and var in 10. Virtual threads became final in 21."
  },
  {
    "q": "Why do many teams jump from one LTS release to the next?",
    "options": [
      "Non-LTS releases cannot run Spring",
      "LTS releases are the only ones with new features",
      "LTS releases get long-term updates, so you upgrade on a predictable schedule",
      "LTS versions are free while others are paid"
    ],
    "answer": 2,
    "why": "Non-LTS releases are supported for six months only. LTS lines (8, 11, 17, 21, 25) get updates for years."
  }
]} />

## Common interview questions

**1. What are the main features introduced after Java 8 that you actually use?**
Strong answer: records for DTOs/value objects, switch expressions, text blocks, `var`, sealed types plus pattern matching for domain results, `HttpClient`, `Stream.toList()`, virtual threads for I/O-heavy services, and sequenced collections; mention that you choose them for clarity and safety, not novelty.

**2. Records vs Lombok `@Value`?**
Records are language-level, standard, support pattern matching and deconstruction, and need no annotation processor; Lombok offers more customisation (builders, inheritance) but is a build-time dependency.

**3. What is a sealed class for?**
To restrict the permitted subtypes so the compiler can verify exhaustive `switch`es and the domain model is closed and explicit.

**4. What are virtual threads at a glance?**
JVM-managed lightweight threads that make blocking-style code scale to hundreds of thousands of concurrent tasks (details in the concurrency section).

**5. Which GC would you choose on Java 21?**
G1 as the safe default; generational ZGC for very low pause requirements and large heaps; Parallel GC for batch throughput. Decide with measurements (see [GC](../concurrency-jvm/garbage-collection.md)).

**6. What changed in Java 17 that affects frameworks?**
Strong encapsulation of JDK internals by default; `--add-opens` is needed for libraries doing deep reflection. Spring Boot 3 requires Java 17+.

**7. What is the preview feature process?**
Features ship as preview (need `--enable-preview`) for one or more releases to gather feedback and are then finalised, changed or dropped. Do not depend on previews in production libraries.

## Pitfalls

- Using `var` where it obscures types.
- Treating record components as deeply immutable.
- Records as JPA entities.
- Enabling preview features in production builds.
- Migrating the JDK without updating libraries (Lombok, ByteBuddy, Mockito, ASM, Hibernate).

## Key takeaways

- Know the LTS line: 8, 11, 17, 21, 25.
- Adopt records, sealed types, pattern matching, switch expressions, text blocks, virtual threads.
- Java 17+ is the baseline for modern Spring.
- Verify what is preview versus final for your JDK.
