---
title: Java Generics - Type Erasure, Wildcards and PECS
sidebar_label: "Generics and PECS"
description: How Java generics really work - type erasure, bridge methods, bounded types, wildcards and the PECS rule, generic arrays, heap pollution and what reifiable types mean in practice.
keywords: [java generics, type erasure, PECS, wildcards, bounded type parameters, heap pollution, generic array, bridge method]
sidebar_position: 7
hide_table_of_contents: true
---

# Generics

<Outcomes items={[
  "Explain type erasure and what it means at runtime",
  "Use PECS (producer extends, consumer super) correctly",
  "Recognise heap pollution and why generic arrays are unsafe"
]} />

## Type erasure

The compiler checks generic types, inserts casts, then **erases** type arguments from the bytecode. At runtime `List<String>` and `List<Integer>` are both just `List`.

```java
List<String> strings = new ArrayList<>();
List<Integer> ints = new ArrayList<>();
System.out.println(strings.getClass() == ints.getClass());   // true
```

Consequences:

| You cannot... | Because |
| --- | --- |
| `new T()`, `new T[10]` | `T` does not exist at runtime |
| `obj instanceof List<String>` | Only `instanceof List<?>` is legal (the argument is erased) |
| Overload `void f(List<String>)` and `void f(List<Integer>)` | Same erasure: "name clash" |
| Use primitives (`List<int>`) | Type arguments must be reference types: use `List<Integer>` (boxing cost) or `IntStream` |
| Catch or throw generic exceptions | `class MyEx<T> extends Exception` is illegal |
| Create static fields of type `T` | One static field is shared by all instantiations |

Type information survives only in signatures (class files keep generic metadata), which is why frameworks can read `List<Order>` from a field or method via reflection, and why a **type token** works around erasure:

```java
abstract class TypeRef<T> {
    final Type type = ((ParameterizedType) getClass().getGenericSuperclass()).getActualTypeArguments()[0];
}
Type t = new TypeRef<List<String>>() { }.type;       // java.util.List<java.lang.String>
```

(Jackson's `TypeReference` and Spring's `ParameterizedTypeReference` do exactly this.)

### Bridge methods

When a generic class is specialised, the compiler generates synthetic **bridge methods** to preserve overriding after erasure:

```java
class Box<T extends Comparable<T>> implements Comparable<Box<T>> {
    T value;
    public int compareTo(Box<T> other) { return value.compareTo(other.value); }
    // compiler adds: public int compareTo(Object o) { return compareTo((Box) o); }
}
```

You see them in stack traces and when reflecting (`Method.isBridge()`).

## Bounded type parameters

```java
static <T extends Comparable<? super T>> T max(Collection<? extends T> items) {
    Iterator<? extends T> it = items.iterator();
    T best = it.next();
    while (it.hasNext()) {
        T next = it.next();
        if (next.compareTo(best) > 0) best = next;
    }
    return best;
}
```

`<T extends Comparable<? super T>>` is the idiomatic bound: `T` must be comparable to itself **or a supertype**, so `java.sql.Timestamp extends Date` works even though only `Date` implements `Comparable<Date>`.

Multiple bounds: `<T extends Number & Comparable<T>>` (class first, then interfaces).

## Invariance, covariance and wildcards

Arrays are **covariant** (and unsound); generics are **invariant**:

```java
Object[] arr = new String[1];
arr[0] = 1;                       // compiles; ArrayStoreException at runtime

List<Object> list = new ArrayList<String>();   // does not compile: List<String> is not a List<Object>
```

Wildcards add variance at use sites:

| Form | Meaning | Can read as | Can write |
| --- | --- | --- | --- |
| `List<?>` | Unknown element type | `Object` | only `null` |
| `List<? extends Number>` | Some subtype of `Number` (**producer**) | `Number` | only `null` |
| `List<? super Integer>` | Some supertype of `Integer` (**consumer**) | `Object` | `Integer` and subtypes |

### PECS: Producer Extends, Consumer Super

```java
static <T> void copy(List<? super T> dest, List<? extends T> src) {
    for (T item : src) {
        dest.add(item);           // src produces T, dest consumes T
    }
}

List<Number> numbers = new ArrayList<>();
copy(numbers, List.of(1, 2, 3));            // Integer -> Number
copy(numbers, List.of(1.5, 2.5));           // Double  -> Number
```

Rule: if a parameter **produces** values you read, use `extends`; if it **consumes** values you write, use `super`; if both, use an exact type. Never use wildcards in **return types** (they burden callers). `Comparator<? super T>` in `sort`/`max` APIs and `Collection<? extends E>` in `addAll` are PECS in the JDK.

### Wildcard capture

```java
static void swapFirstTwo(List<?> list) { swapHelper(list); }
private static <T> void swapHelper(List<T> list) {      // captures the unknown type as T
    T tmp = list.get(0);
    list.set(0, list.get(1));
    list.set(1, tmp);
}
```

A helper method with a named type variable lets you write to a `List<?>`.

## Generic arrays and varargs: heap pollution

```java
T[] array = new T[10];                               // does not compile
T[] array = (T[]) new Object[10];                    // unchecked cast; fine if never exposed as T[]
List<String>[] bad = new List<String>[1];            // does not compile
```

**Heap pollution** occurs when a variable of a parameterised type refers to an object that is not of that type, which surfaces later as a `ClassCastException` far from the cause. Generic varargs (`static <T> void f(T... xs)`) create a generic array and trigger "unchecked generic array creation"; mark a method `@SafeVarargs` only if it does not store into or expose the array.

## Generic methods and inference

```java
static <K, V extends Comparable<V>> K argMax(Map<K, V> map) {
    return map.entrySet().stream().max(Map.Entry.comparingByValue()).orElseThrow().getKey();
}
```

Java infers type arguments from arguments and the target type. Use the diamond `new HashMap<>()`. Where inference fails you can supply explicit arguments: `Collections.<String>emptyList()`. `var` (Java 10) only infers the local variable type; it does not change generic semantics.

## Raw types

`List list = new ArrayList();` disables checks and exists for pre-Java-5 compatibility. A raw call can silently put a `String` into a `List<Integer>` and fail later with `ClassCastException`. Never use raw types; if you must interface with legacy code, isolate the unchecked cast and annotate narrowly with `@SuppressWarnings("unchecked")`.

## Reifiable types

A type is **reifiable** if its full type information exists at runtime: primitives, non-generic classes, raw types and unbounded wildcards (`List<?>`). `List<String>` is not reifiable. Only reifiable types can be used in `instanceof`, array creation and (without warnings) in varargs.

## Check yourself

<Checkpoint questions={[
  {
    "q": "What does List<String> become at runtime?",
    "options": [
      "A raw List: the type argument is erased",
      "A specialised StringList class",
      "An array of Strings",
      "Nothing changes, the type argument is kept"
    ],
    "answer": 0,
    "why": "Type erasure removes type arguments after compile-time checking. This is why you cannot write new T() or instanceof List<String>."
  },
  {
    "q": "A method only reads items from a collection to sum numbers. Which parameter type follows PECS?",
    "options": [
      "List<? super Number>",
      "List<? extends Number>",
      "List<Number> only",
      "List<?> and cast"
    ],
    "answer": 1,
    "why": "A producer (you read from it) uses extends. A consumer (you write into it) uses super."
  },
  {
    "q": "Why is List<Integer> not a List<Number>?",
    "options": [
      "Integer is not a subclass of Number",
      "Because of boxing",
      "Generics are invariant, otherwise you could add a Double to a list of Integers",
      "It is, generics are covariant"
    ],
    "answer": 2,
    "why": "Invariance protects type safety. Use wildcards when you need flexibility."
  }
]} />

## Common interview questions

**1. What is type erasure and what are its consequences?**
The compiler removes type arguments after checking, inserting casts as needed. You cannot instantiate type variables, create generic arrays, use `instanceof` with parameterised types, or overload on type arguments.

**2. Explain PECS.**
Use `? extends T` when a collection only supplies values to you (producer), and `? super T` when it only receives values (consumer). It is what makes `Collections.copy` and `Comparator<? super T>` flexible.

**3. Why is `List<Object> = List<String>` illegal while `Object[] = String[]` compiles?**
Generics are invariant for soundness; arrays are covariant for historical reasons and checked at runtime (`ArrayStoreException`).

**4. What does `<T extends Comparable<? super T>>` mean and why `super`?**
`T` can be compared using a comparator of `T` or any supertype, so subclasses of a comparable base class qualify.

**5. How can you obtain a generic type at runtime despite erasure?**
Through generic supertypes (the type-token pattern), fields/method signatures, or by passing a `Class<T>` argument.

**6. What is a bridge method?**
A compiler-generated method that preserves polymorphism after erasure, delegating from the erased signature to your typed override.

**7. What is heap pollution?**
A parameterised-type variable referring to an incompatible object, typically through raw types or unchecked casts, causing a delayed `ClassCastException`.

**8. Can you create `List<int>`?**
No. Use `List<Integer>` (boxing overhead and memory) or primitive-specialised structures/streams. Project Valhalla aims to lift this limitation.

## Pitfalls

- Using raw types or ignoring unchecked warnings.
- Wildcards in return types.
- Exposing `T[]` created via `Object[]` cast to callers.
- Static members referring to class type parameters.
- Assuming `Class<T>` and `T` are interchangeable at runtime.

## Key takeaways

- Generics are compile-time only; erasure shapes every limitation.
- PECS decides between `extends` and `super`.
- Prefer `List`s to arrays when mixing with generics.
- Treat unchecked warnings as bugs unless you have proven them safe.
