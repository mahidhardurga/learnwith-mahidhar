---
title: equals, hashCode and compareTo - The Contract and Its Traps
sidebar_label: "equals, hashCode, compareTo"
description: The equals/hashCode contract, symmetry and transitivity problems with inheritance, mutable keys, JPA entity identity, consistency with compareTo, and how records and Objects utilities help.
keywords: [equals hashcode contract, java equals symmetric transitive, getClass vs instanceof, hashCode HashMap, compareTo consistent with equals, JPA entity equals, records equals]
sidebar_position: 3
---

# equals, hashCode and compareTo

<Outcomes items={[
  "Write equals and hashCode that obey the contract",
  "Explain why mutable fields in hashCode break HashMap lookups",
  "Keep compareTo consistent with equals"
]} />

## The `equals` contract

For non-null references: **reflexive** (`x.equals(x)`), **symmetric** (`x.equals(y)` ⇔ `y.equals(x)`), **transitive**, **consistent** (same result unless fields used in comparison change), and `x.equals(null)` is false.

And the `hashCode` rule: **equal objects must return equal hash codes**. (Unequal objects may share hash codes; good distribution keeps maps fast.)

A correct implementation:

```java
public final class Money {
    private final BigDecimal amount;
    private final String currency;

    public Money(BigDecimal amount, String currency) {
        this.amount = amount;
        this.currency = currency;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Money other)) return false;
        return amount.compareTo(other.amount) == 0 && currency.equals(other.currency);
    }

    @Override
    public int hashCode() {
        return Objects.hash(amount.stripTrailingZeros(), currency);      // consistent with compareTo-based equals
    }
}
```

Note the subtlety: `BigDecimal.equals` considers scale (`2.0` ≠ `2.00`), while `compareTo` does not. If your `equals` uses `compareTo`, `hashCode` must normalise the scale (`stripTrailingZeros`), or equal objects get different hashes and break the contract. In Java 8+, `stripTrailingZeros` on zero is correct (earlier versions had a bug with `0.0`).

## Inheritance breaks symmetry and transitivity

```java
class Point {
    final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    @Override public boolean equals(Object o) {
        return o instanceof Point p && p.x == x && p.y == y;
    }
    @Override public int hashCode() { return Objects.hash(x, y); }
}

class ColorPoint extends Point {
    final String color;
    ColorPoint(int x, int y, String color) { super(x, y); this.color = color; }
    @Override public boolean equals(Object o) {
        return o instanceof ColorPoint cp && super.equals(cp) && cp.color.equals(color);
    }
}
Point p = new Point(1, 2);
ColorPoint cp = new ColorPoint(1, 2, "red");
p.equals(cp);    // true
cp.equals(p);    // false -> symmetry violated
```

There is **no way** to extend an instantiable class and add a value component while preserving the contract. Options:

1. Use `getClass() != o.getClass()` in `equals`: symmetric and transitive, but violates Liskov (a subclass instance is never equal to a base instance, which breaks code like proxies and anonymous subclasses).
2. **Prefer composition**: `ColorPoint` has a `Point` field plus a colour (Effective Java, Item 10).
3. Make classes `final` or sealed so the question does not arise.

## Mutable keys and `hashCode`

```java
Set<Point> set = new HashSet<>();
MutablePoint p = new MutablePoint(1, 2);
set.add(p);
p.setX(99);                 // hashCode changes
set.contains(p);            // false: looks in the wrong bucket
```

The entry is still in the set but unreachable (and cannot be removed). Use immutable keys, or never mutate fields that participate in `hashCode` while the object is in a hash structure.

## Implementation guidance

- Compare the same fields in `equals` and `hashCode`.
- Use `Objects.equals` for nullable fields, `Double.compare` for doubles (so `NaN` equals `NaN`), `Arrays.equals`/`Arrays.hashCode` for arrays.
- `Objects.hash(a, b, c)` allocates a varargs array and boxes primitives: fine for most code, avoid in hot paths (compute `31 * h + ...` manually or use `Long.hashCode`).
- Do not include fields that change over an object's life, caches, or lazily computed values.
- Keep `hashCode` cheap and stable. `String` caches its hash; cache yours if expensive and the object is immutable.
- **Records** generate `equals`/`hashCode`/`toString` from all components, a good default for value objects. Override if you need normalisation.

```java
public record Isbn(String value) {
    public Isbn { value = value.replace("-", ""); }       // normalise so equality ignores hyphens
}
```

## JPA/Hibernate entities

Entity identity is tricky: the database id is `null` until persisted, entities are mutable, and Hibernate proxies subclass your entity.

Options:

| Strategy | Pros | Cons |
| --- | --- | --- |
| Id-based `equals` (id non-null) with constant `hashCode` (e.g. `getClass().hashCode()`) | Works before and after persist, proxies | All entities in one bucket (poor `HashSet` performance for huge sets) |
| Business/natural key (e.g. ISBN, email) | Stable, meaningful | Needs an immutable unique natural key |
| Default identity (`Object`'s) | Simple, correct within one persistence context | Breaks when comparing detached with managed instances |

Never use Lombok `@Data`/`@EqualsAndHashCode` over all fields on entities: it touches lazy associations (queries, `LazyInitializationException`) and changes `hashCode` when state changes. Use `instanceof` with `Hibernate.getClass`/`HibernateProxy` handling when comparing proxies.

## `compareTo` and consistency with `equals`

`Comparable.compareTo` should be **consistent with equals**: `x.compareTo(y) == 0` ⇔ `x.equals(y)`. If not, sorted collections (`TreeSet`, `TreeMap`) behave differently from hash collections.

```java
Set<BigDecimal> hash = new HashSet<>(List.of(new BigDecimal("2.0"), new BigDecimal("2.00")));   // size 2
Set<BigDecimal> tree = new TreeSet<>(List.of(new BigDecimal("2.0"), new BigDecimal("2.00")));   // size 1
```

Implement comparators with `Comparator.comparing(...)`, never by subtraction (`a - b` overflows for large ints):

```java
Comparator<Person> order = Comparator.comparing(Person::lastName)
                                     .thenComparing(Person::firstName)
                                     .thenComparingInt(Person::age);
```

The comparison must be a total order: antisymmetric, transitive, and consistent. Violating transitivity can make `Arrays.sort`/`List.sort` throw `IllegalArgumentException: Comparison method violates its general contract!`.

## Check yourself

<Checkpoint questions={[
  {
    "q": "Two objects are equal according to equals(). What must be true about their hashCode()?",
    "options": [
      "They must return the same value",
      "They must return different values",
      "Nothing, the two methods are independent",
      "hashCode must be zero"
    ],
    "answer": 0,
    "why": "The contract: equal objects must have equal hash codes. The reverse is not required."
  },
  {
    "q": "You override equals() but forget hashCode(). What is the typical symptom?",
    "options": [
      "A compile error",
      "Equal objects land in different HashMap buckets, so get() fails to find them",
      "equals() stops being called",
      "The object can no longer be serialised"
    ],
    "answer": 1,
    "why": "The default hashCode is identity-based, so equal objects usually hash differently and sit in different buckets."
  },
  {
    "q": "A TreeSet<BigDecimal> contains 1.0 and 2.0. Adding 1.00 does not grow the set but a HashSet would add it. Why?",
    "options": [
      "TreeSet ignores scale by accident",
      "HashSet rejects duplicates by value",
      "compareTo treats 1.0 and 1.00 as equal, while equals does not",
      "BigDecimal is not Comparable"
    ],
    "answer": 2,
    "why": "BigDecimal.compareTo ignores scale but equals does not. That inconsistency makes sorted and hashed sets disagree."
  }
]} />

## Common interview questions

**1. State the `equals`/`hashCode` contract.**
`equals` is reflexive, symmetric, transitive, consistent and null-safe; equal objects must have equal hash codes. Unequal objects may collide.

**2. What happens if you override `equals` but not `hashCode`?**
Equal objects land in different buckets, so `HashMap.get`/`HashSet.contains` fail to find "equal" keys and duplicates appear.

**3. `getClass()` vs `instanceof` in `equals`?**
`instanceof` supports subclasses but breaks symmetry when subclasses add state; `getClass()` keeps symmetry/transitivity but violates substitutability. Best: final classes or composition.

**4. Can two unequal objects have the same hash code?**
Yes; hash collisions are expected and handled by the map; only equal objects *must* share hashes.

**5. How should entity `equals` be implemented in JPA?**
Prefer a stable business key; otherwise id-based equality that handles transient (null id) instances and Hibernate proxies, with a constant or class-based `hashCode`. Avoid Lombok's all-fields versions.

**6. What does it mean for `compareTo` to be consistent with `equals`, and why does `BigDecimal` break it?**
`compareTo == 0` should imply `equals`; `BigDecimal` compares numeric value in `compareTo` but also scale in `equals`, so `2.0` and `2.00` are unequal but compare as equal.

**7. Why shouldn't you use mutable objects as map keys?**
Their hash codes can change after insertion, making entries unreachable.

**8. Do records override `equals`/`hashCode` correctly?**
Yes: component-wise, using the components' own `equals`. Arrays as components compare by reference, so use lists or override.

## Pitfalls

- `equals(Foo)` overload instead of `equals(Object)` (use `@Override` to catch it).
- Using `==` on boxed values or strings.
- Different fields in `equals` and `hashCode`.
- Floating-point fields compared with `==`.
- Entity `hashCode` derived from a database id that changes on persist.
- Comparators based on subtraction.

## Key takeaways

- Override `equals` and `hashCode` together, over the same immutable fields.
- Inheritance and value equality do not mix; prefer final classes, records and composition.
- Keep `compareTo` consistent with `equals`, or document why not.
- Treat entity equality as a deliberate design choice.
