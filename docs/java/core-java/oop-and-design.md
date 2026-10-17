---
title: OOP and Design Principles in Java
sidebar_label: "OOP and design principles"
description: Beyond the four pillars - composition over inheritance, SOLID with Java examples, interfaces versus abstract classes, sealed hierarchies and the design patterns senior interviews actually probe.
keywords: [java oop, solid principles, composition over inheritance, liskov substitution, design patterns java, sealed classes, interface vs abstract class]
sidebar_position: 1
---

# OOP and Design Principles

<Outcomes items={[
  "Argue composition over inheritance with a concrete example",
  "Spot a Liskov Substitution violation in code",
  "Choose between an interface and an abstract class, and use sealed types"
]} />

## The pillars, with the senior-level angle

| Pillar | Textbook | What a senior should add |
| --- | --- | --- |
| Encapsulation | Private fields, getters | Protect **invariants**, not fields. An object should never be observable in an invalid state. Prefer behaviour (`order.cancel()`) over getters/setters |
| Abstraction | Interfaces, abstract classes | Depend on what a collaborator *does*, so implementations can change |
| Inheritance | `extends` | A strong coupling. Use for true is-a with stable base classes; otherwise compose |
| Polymorphism | Overriding | Dynamic dispatch through `invokevirtual`/`invokeinterface`; JIT inlines monomorphic call sites, so a hierarchy with one hot implementation is still fast |

## Composition over inheritance

Inheritance exposes the superclass's implementation details to the subclass (the *fragile base class* problem). The classic illustration:

```java
class CountingSet<E> extends HashSet<E> {
    private int added;

    @Override public boolean add(E e) { added++; return super.add(e); }

    @Override public boolean addAll(Collection<? extends E> c) {
        added += c.size();
        return super.addAll(c);          // HashSet.addAll calls add() -> counted twice!
    }

    int added() { return added; }
}
```

`addAll` of three elements reports six, because `AbstractCollection.addAll` calls the overridable `add`. The subclass depends on an undocumented implementation detail. Composition avoids it:

```java
class CountingSet<E> implements Set<E> {          // or extend ForwardingSet from Guava
    private final Set<E> delegate = new HashSet<>();
    private int added;

    @Override public boolean add(E e) { added++; return delegate.add(e); }
    @Override public boolean addAll(Collection<? extends E> c) { added += c.size(); return delegate.addAll(c); }
    // ...remaining Set methods delegate
}
```

Rules of thumb: design for inheritance (document self-use, provide hooks) **or prohibit it** (`final`, sealed). Prefer interfaces plus delegation. Use inheritance for framework extension points (template method) and genuine type hierarchies.

## Interface or abstract class?

| | Interface | Abstract class |
| --- | --- | --- |
| State (instance fields) | No | Yes |
| Multiple inheritance of type | Yes | No (single superclass) |
| Constructor | No | Yes |
| Default behaviour | `default` methods (Java 8+) | Concrete methods |
| Evolving the API | Adding a `default` method is source/binary compatible | Adding abstract methods breaks subclasses |

Default methods can create the **diamond problem**: if two interfaces provide the same default, the class must override and may pick one with `A.super.hello()`. A class method always wins over an interface default.

Modern preference: interfaces for contracts (often **sealed**), abstract classes only when you need shared state or a template with protected hooks.

## SOLID, concretely

**S: Single Responsibility.** One reason to change. `OrderService` that validates, prices, persists, sends email and renders PDFs has five. Split by reason for change, not by "one method per class".

**O: Open/Closed.** Extend behaviour without editing tested code. Replace a growing `switch (paymentType)` with a strategy:

```java
public interface PaymentMethod {
    PaymentResult charge(Money amount);
}
// New payment type = new class, registered as a Spring bean; callers inject List<PaymentMethod> or Map<String, PaymentMethod>.
```

Do not pre-build abstractions for variation that has not appeared: wait for the second or third case.

**L: Liskov Substitution.** A subtype must be usable wherever the supertype is, without surprising callers. Violations: throwing `UnsupportedOperationException` for an inherited method, strengthening preconditions, weakening postconditions, changing meaning of return values. The `Square extends Rectangle` example fails because `setWidth` on a square also changes height, breaking code that assumes independent dimensions. `List.of(...).add(...)` is a real-world LSP smell in the JDK itself; immutable collections are better modelled as distinct types.

**I: Interface Segregation.** Small, role-focused interfaces. A `Repository` with 20 methods forces every test double to implement them all; Spring Data's approach of composing fragment interfaces is an example of the principle.

**D: Dependency Inversion.** High-level policy depends on abstractions, and wiring happens at the edge (composition root: Spring). Constructor injection makes dependencies explicit and the class testable without a container.

## Sealed hierarchies and algebraic data types (Java 17+)

When the set of subtypes is closed and known, model it explicitly and let the compiler check exhaustiveness:

```java
public sealed interface PaymentResult permits Approved, Declined, Pending { }
public record Approved(String authCode) implements PaymentResult { }
public record Declined(String reason) implements PaymentResult { }
public record Pending(Duration retryAfter) implements PaymentResult { }

static String describe(PaymentResult r) {
    return switch (r) {                      // no default: adding a new subtype breaks compilation here
        case Approved a -> "approved " + a.authCode();
        case Declined d -> "declined: " + d.reason();
        case Pending p  -> "retry in " + p.retryAfter();
    };
}
```

This replaces visitor-pattern boilerplate and "stringly typed" status codes. Use it for results, commands and events.

## Patterns you will be asked about

| Pattern | Use | Java/Spring reality |
| --- | --- | --- |
| **Strategy** | Swap algorithms | A lambda or Spring bean map |
| **Factory / Builder** | Complex construction | Static factories, `Builder` for many optional parameters; records with compact constructors for validation |
| **Singleton** | One instance | Prefer Spring singleton scope. Hand-written: enum singleton (serialization/reflection safe) or holder idiom. Double-checked locking needs `volatile` |
| **Decorator** | Add behaviour around an object | `InputStream` wrappers; Spring AOP proxies |
| **Observer** | Notify subscribers | Spring `ApplicationEvent`, reactive streams |
| **Template Method** | Fixed algorithm with hooks | `JdbcTemplate`, `AbstractRoutingDataSource` |
| **Proxy** | Control access | JDK/CGLIB proxies behind `@Transactional` |
| **Adapter / Anti-corruption layer** | Translate foreign model | Mapping at service boundaries |

```java
// Thread-safe, lazy, serialization-safe singleton
public enum Registry {
    INSTANCE;
    private final Map<String, String> data = new ConcurrentHashMap<>();
    public void put(String k, String v) { data.put(k, v); }
}
```

## Check yourself

<Checkpoint questions={[
  {
    "q": "A Square extends Rectangle, and code that sets width and height separately now misbehaves. Which principle is broken?",
    "options": [
      "Liskov Substitution",
      "Open/Closed",
      "Interface Segregation",
      "Dependency Inversion"
    ],
    "answer": 0,
    "why": "A subtype must be usable wherever its parent is. Square cannot honour Rectangle's independent width and height."
  },
  {
    "q": "You want to reuse behaviour without tying two classes together permanently. What is the usual advice?",
    "options": [
      "Extend the class and override everything",
      "Prefer composition: hold a collaborator and delegate",
      "Copy the code into both classes",
      "Make every method static"
    ],
    "answer": 1,
    "why": "Composition keeps coupling loose and lets you swap behaviour at runtime; inheritance fixes the relationship at compile time."
  },
  {
    "q": "What do sealed classes (Java 17) give you?",
    "options": [
      "Faster method calls",
      "Automatic immutability",
      "A closed set of permitted subtypes the compiler can check exhaustively",
      "Protection against reflection"
    ],
    "answer": 2,
    "why": "With a sealed hierarchy a switch can be exhaustive without a default branch, which models algebraic data types."
  }
]} />

## Common interview questions

**1. Inheritance vs composition, when do you choose which?**
Inheritance for stable, genuine is-a relationships and framework template points; composition for reuse of behaviour, because it keeps coupling to a public contract instead of implementation details and allows swapping at runtime.

**2. Explain Liskov with a real violation.**
A subclass that throws `UnsupportedOperationException` or tightens preconditions breaks callers that rely on the base contract. `Square`/`Rectangle`, or a `ReadOnlyList extends List` whose `add` throws.

**3. Abstract class vs interface in modern Java?**
Interfaces gained default and static methods, so the difference is state and constructors: abstract classes can hold instance state; interfaces cannot but can be multiply inherited. Prefer interfaces plus composition.

**4. How do you stop a class from being extended or implemented?**
`final` for no subclasses, `sealed ... permits` for a closed set, package-private constructors for package-limited extension.

**5. Does overriding apply to fields and static methods?**
No: fields and static methods are *hidden*, resolved at compile time by reference type. Only instance methods are dynamically dispatched.

**6. What does `private` really protect? Can reflection break it?**
`private` is enforced by the compiler and JVM access checks, but `setAccessible(true)` bypasses it unless the module system (`opens`) or a security policy blocks it. Strong encapsulation of JDK internals is enforced since Java 16/17.

**7. How do you avoid over-engineering with these principles?**
Apply abstractions when a second real variation arrives (rule of three), keep modules cohesive, and justify each interface by a consumer or a test boundary.

## Pitfalls

- Deep class hierarchies used purely for code reuse.
- Calling overridable methods from constructors (the subclass runs before its fields are initialised).
- "Anemic" domain models where all logic lives in services and entities are bags of getters.
- Interfaces with exactly one implementation created "just in case".
- Using `instanceof` chains where a sealed type and `switch` would be checked by the compiler.

## Key takeaways

- Encapsulate invariants; prefer composition and interfaces.
- Liskov is about behaviour contracts, not just method signatures.
- Use sealed types and records for closed domain variants; let the compiler check exhaustiveness.
- Patterns are vocabulary: know the intent and where the JDK and Spring already apply them.
