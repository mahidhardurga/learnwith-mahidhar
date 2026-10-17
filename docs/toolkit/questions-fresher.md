---
title: "Java and Spring Interview Questions: Foundations (Questions 1-35)"
sidebar_label: "Foundations (1-35)"
description: Thirty-five core Java, Spring, REST and SQL interview questions covering the fundamentals, each with a clear model answer and links to the deeper topic pages.
keywords: [java interview questions for freshers, spring boot interview questions freshers, core java basics, oops interview questions, jdk jre jvm, string vs stringbuilder, rest api basics, sql joins]
sidebar_position: 2
---

# Interview Questions: Foundations (1-35)

At this level interviewers check **fundamentals and clarity**: do you understand the concepts, can you explain them simply and write small correct programs? Answer in two parts: **definition**, then a **tiny example or why it matters**. Links point to the deeper pages for when you want more.

## Core Java

**1. JDK vs JRE vs JVM?**
The **JVM** executes bytecode. The **JRE** is the JVM plus the core class libraries needed to run programs. The **JDK** is the JRE plus development tools (`javac`, `jar`, debugger). Since Java 11 there is no separate JRE download; vendors ship JDKs and (optionally) runtime-only images.

**2. Why is Java called platform independent?**
`javac` compiles source to **bytecode**, which any platform's JVM can run: "write once, run anywhere". The JVM is platform specific; the bytecode is not.

**3. Why is `String` immutable? `String` vs `StringBuilder` vs `StringBuffer`?**
Immutability enables the string pool, cached hash codes, thread safety and safe use as map keys. `StringBuilder` is a mutable, non-thread-safe builder (use it in loops); `StringBuffer` is the synchronised legacy equivalent. ([Immutability](../java/core-java/immutability.md))

**4. `==` vs `equals()`?**
`==` compares primitives by value and references by identity; `equals()` compares logical content when overridden (`String`, `Integer`...). `new String("a") == "a"` is false but `.equals` is true.

**5. `final`, `finally`, `finalize`?**
`final`: a constant variable, a method that cannot be overridden or a class that cannot be extended. `finally`: a block that runs after try/catch for cleanup. `finalize()`: a deprecated, unreliable pre-GC hook; do not use it (use try-with-resources or `Cleaner`).

**6. The four pillars of OOP?**
**Encapsulation** (hide state behind methods), **abstraction** (expose what, hide how), **inheritance** (reuse and specialise through `extends`), **polymorphism** (one interface, many behaviours via overriding/overloading). ([OOP and design](../java/core-java/oop-and-design.md))

**7. Abstract class vs interface?**
Abstract classes can hold state and constructors and allow one superclass; interfaces define contracts, allow multiple implementation and (since Java 8) `default`/`static` methods. Prefer interfaces for capabilities, abstract classes for shared state/template code.

**8. Method overloading vs overriding?**
Overloading: same name, different parameters, resolved at **compile time**. Overriding: a subclass redefines an inherited method with the same signature, resolved at **runtime** (dynamic dispatch). Use `@Override`.

**9. What does `static` mean?**
It belongs to the class, not an instance: shared variables, utility methods, static blocks, nested classes. Static methods cannot access instance members directly and cannot be overridden (only hidden).

**10. Checked vs unchecked exceptions?**
Checked exceptions (`IOException`) must be caught or declared; unchecked (`RuntimeException` subclasses like `NullPointerException`) need not. Errors (`OutOfMemoryError`) signal JVM problems. ([Exceptions](../java/core-java/exceptions.md))

**11. Stack vs heap memory?**
The **stack** is per thread, holds method frames, local primitives and references, and is freed when methods return. The **heap** is shared, holds objects, and is reclaimed by the garbage collector.

**12. What is garbage collection?**
Automatic reclamation of objects that are no longer reachable from any live reference. You cannot force it (`System.gc()` is only a hint). ([GC](../java/concurrency-jvm/garbage-collection.md))

**13. `ArrayList` vs `LinkedList`?**
`ArrayList` is array-backed: fast random access, amortised O(1) append. `LinkedList` is a doubly linked list: O(1) insert at a known node but O(n) access and more memory. `ArrayList` is the default. ([Collections](../java/core-java/collections-framework.md))

**14. `HashMap` vs `Hashtable`? How does a `HashSet` work?**
`HashMap` is unsynchronised, allows one null key; `Hashtable` is a legacy synchronised map without nulls. `HashSet` wraps a `HashMap` using elements as keys. ([HashMap internals](../java/core-java/hashmap-internals.md))

**15. What is the `equals`/`hashCode` contract?**
Equal objects must have equal hash codes; override both together using the same fields. Otherwise hash-based collections misbehave. ([equals/hashCode](../java/core-java/equals-hashcode.md))

**16. `Comparable` vs `Comparator`?**
`Comparable` defines a class's natural order (`compareTo`); a `Comparator` is an external ordering, composable: `Comparator.comparing(Person::name).thenComparing(Person::age)`.

**17. What are wrapper classes and autoboxing pitfalls?**
`Integer`, `Long`... wrap primitives for use in collections; boxing is automatic. Pitfalls: `==` on boxed values (only -128..127 are cached), `NullPointerException` when unboxing `null`, and performance cost in hot loops.

**18. Is Java pass-by-value or pass-by-reference?**
Always pass-by-value. For objects, the **reference** is copied, so a method can mutate the object but cannot make the caller's variable point elsewhere.

**19. How do you create a thread? `Runnable` vs `Thread`?**
Implement `Runnable` (or `Callable`) and hand it to a `Thread` or, better, an `ExecutorService`; extending `Thread` ties the task to the thread type. Call `start()`, not `run()`. ([Threads](../java/concurrency-jvm/threads-basics.md))

**20. What does `synchronized` do?**
Acquires an object's monitor so only one thread executes the guarded block at a time, and guarantees visibility of changes. It can be on a method or a block. ([Synchronization](../java/concurrency-jvm/synchronization-and-locks.md))

**21. What does `volatile` do?**
Guarantees that writes are visible to other threads and prevents certain reorderings. It does not make `count++` atomic.

**22. What is a lambda expression and a functional interface?**
A lambda is a short anonymous function: `(a, b) -> a + b`. It implements a **functional interface** (exactly one abstract method), such as `Runnable`, `Comparator`, `Function`. ([Streams and lambdas](../java/core-java/streams-and-lambdas.md))

**23. What are streams?**
A pipeline API for processing collections declaratively: source, intermediate operations (`filter`, `map`), terminal operation (`collect`, `forEach`). They are lazy and do not modify the source.

**24. What is `Optional`?**
A container that may or may not hold a value, used as a return type to avoid `null`: `findUser(id).map(User::name).orElse("guest")`. Avoid it for fields and parameters.

## Spring and Spring Boot

**25. What are IoC and Dependency Injection?**
IoC means the framework controls object creation and wiring; DI is how: the container injects an object's dependencies (constructor, setter, field) instead of the object creating them. ([IoC/DI](../spring/core/ioc-and-dependency-injection.md))

**26. `@Component`, `@Service`, `@Repository`, `@Controller`?**
All register a bean through component scanning. `@Service` marks business logic, `@Repository` the persistence layer (adds exception translation), `@Controller`/`@RestController` web handlers.

**27. What does `@Autowired` do, and why prefer constructor injection?**
It asks Spring to inject a dependency. Constructor injection makes dependencies required and final, simplifies unit testing, and exposes circular dependencies early.

**28. What are bean scopes?**
`singleton` (default, one per container), `prototype` (new each time), and web scopes `request`, `session`, `application`. ([Lifecycle and scopes](../spring/core/bean-lifecycle-and-scopes.md))

**29. Spring vs Spring Boot?**
Spring is the framework (IoC, AOP, MVC, data access). Spring Boot adds starters, auto-configuration, an embedded server, Actuator and externalised configuration so you can run an app with `java -jar`. ([Boot overview](../spring/boot/overview.md))

**30. What does `@SpringBootApplication` do?**
It combines `@SpringBootConfiguration`, `@EnableAutoConfiguration` and `@ComponentScan` on the main class.

**31. How do you configure a Spring Boot application?**
`application.properties`/`application.yml`, environment variables, command-line arguments, profiles (`application-dev.yml`) and `@ConfigurationProperties`. ([Configuration](../spring/boot/configuration.md))

## REST, JPA and SQL

**32. HTTP methods and status codes; what is idempotent?**
GET (read), POST (create), PUT (replace), PATCH (partial update), DELETE. Idempotent methods (GET, PUT, DELETE) give the same result when repeated. Common codes: 200, 201, 204, 400, 401, 403, 404, 409, 500.

**33. `@Controller` vs `@RestController`; `@PathVariable` vs `@RequestParam` vs `@RequestBody`?**
`@RestController` = `@Controller` + `@ResponseBody` (returns data, not views). `@PathVariable` reads `/users/{id}`, `@RequestParam` reads `?page=2`, `@RequestBody` binds the JSON body to an object.

**34. What are JPA, Hibernate and Spring Data JPA?**
JPA is the persistence specification, Hibernate an implementation, Spring Data JPA generates repositories on top (`interface UserRepository extends JpaRepository<User, Long>`). ([JPA basics](../spring/data/jpa-basics.md))

**35. SQL joins, primary vs foreign key, and ACID?**
`INNER JOIN` returns matches; `LEFT JOIN` keeps all left rows. A primary key uniquely identifies a row; a foreign key references another table's key. ACID: atomicity, consistency, isolation, durability. ([SQL patterns](../databases/sql-patterns.md), [ACID](../databases/acid-isolation-mvcc.md))

## Tips for these questions

- Say "I don't know, but I'd approach it by..." rather than guessing.
- Prepare one project end to end: architecture, a bug you fixed, one trade-off you made.
- Practise explaining concepts in **one minute** with a small example.
- Know your resume: every technology listed can be asked about.
- Next level: [mid-level questions](questions-mid-level.md) and the [cheat sheets](cheat-sheets.md).
