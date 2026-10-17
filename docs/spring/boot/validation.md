---
title: Bean Validation in Spring Boot
sidebar_label: "Bean validation"
description: Validate request bodies, parameters and nested objects with Jakarta Bean Validation, return clean field errors, and write custom constraints.
keywords: [spring boot validation, "@Valid", "@Validated", jakarta validation, custom constraint, MethodArgumentNotValidException]
sidebar_position: 6
---

# Bean Validation

<Outcomes items={[
  "Validate request bodies with Bean Validation annotations",
  "Return clear field errors",
  "Write a custom constraint"
]} />

## Validating a request body

```java
public record CreateOrderRequest(
        @NotNull Long customerId,
        @NotEmpty @Size(max = 50) List<@Valid OrderLine> lines,
        @Email String notificationEmail) {

    public record OrderLine(
            @NotBlank String sku,
            @Positive int quantity) {
    }
}
```

```java
@RestController
@RequestMapping("/orders")
class OrderController {

    @PostMapping
    ResponseEntity<Void> create(@Valid @RequestBody CreateOrderRequest request) {
        // request is valid here
        return ResponseEntity.accepted().build();
    }
}
```

`@Valid` on the parameter triggers validation; `@Valid` on `OrderLine` inside the list cascades into each element. Without the cascade, nested fields are silently unchecked, which is a classic bug.

## Validating path variables and request parameters

Put `@Validated` on the controller class, then use constraints directly on parameters:

```java
@Validated
@RestController
class ProductController {

    @GetMapping("/products/{id}")
    Product get(@PathVariable @Min(1) long id,
                @RequestParam @Size(min = 2, max = 20) String locale) {
        // ...
        return null;
    }
}
```

Failures here throw `ConstraintViolationException` (or `HandlerMethodValidationException` in Spring 6.1+ when using method validation built into MVC). Body failures throw `MethodArgumentNotValidException`.

## Returning field errors

```java
@RestControllerAdvice
class ValidationHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail onInvalid(MethodArgumentNotValidException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
          .forEach(e -> errors.putIfAbsent(e.getField(), e.getDefaultMessage()));
        pd.setProperty("errors", errors);
        return pd;
    }
}
```

If your global advice already extends `ResponseEntityExceptionHandler` (as in [exception handling](exception-handling.md)), do not add a second advice for the same exception. Override `handleMethodArgumentNotValid` in that class instead, so only one handler owns the response.

## Custom constraint

```java
@Documented
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = SkuValidator.class)
public @interface ValidSku {
    String message() default "SKU must look like ABC-12345";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
```

```java
public class SkuValidator implements ConstraintValidator<ValidSku, String> {

    private static final Pattern PATTERN = Pattern.compile("[A-Z]{3}-\\d{5}");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value == null || PATTERN.matcher(value).matches(); // null handled by @NotNull
    }
}
```

Convention: constraint validators treat `null` as valid and let `@NotNull` handle presence. Validators can inject Spring beans (for example to check uniqueness), but keep them cheap; uniqueness must still be enforced by a database constraint because of race conditions.

## Groups

Groups apply different rules for create versus update:

```java
interface OnCreate {}
interface OnUpdate {}

record UserDto(
        @Null(groups = OnCreate.class) @NotNull(groups = OnUpdate.class) Long id,
        @NotBlank String name) {
}
```

Use `@Validated(OnCreate.class)` on the parameter. Often separate request DTOs for create and update are simpler than groups.

## Check yourself

<Checkpoint questions={[
  {
    "q": "What makes a @RequestBody validated in a controller?",
    "options": [
      "@Valid (or @Validated) on the parameter",
      "@NotNull on the method",
      "A filter",
      "Nothing, it is automatic"
    ],
    "answer": 0,
    "why": "Without @Valid the constraint annotations are ignored."
  },
  {
    "q": "Which exception does Spring MVC raise when body validation fails?",
    "options": [
      "IllegalStateException",
      "MethodArgumentNotValidException",
      "NullPointerException",
      "ClassCastException"
    ],
    "answer": 1,
    "why": "Handle it in a @RestControllerAdvice to return a 400 with field errors."
  },
  {
    "q": "How do you validate @PathVariable and @RequestParam?",
    "options": [
      "It is impossible",
      "Use @Valid on the class only",
      "Annotate the controller class with @Validated and add constraints to parameters",
      "Use @Transactional"
    ],
    "answer": 2,
    "why": "Method-level validation needs @Validated on the class."
  }
]} />

## Common interview questions

**1. `@Valid` vs `@Validated`?**
`@Valid` is the standard Jakarta annotation: triggers validation and cascades into nested objects. `@Validated` is Spring's variant: supports validation **groups** and, on a class, enables method-level validation of parameters like `@PathVariable`.

**2. `@NotNull` vs `@NotEmpty` vs `@NotBlank`?**
`@NotNull`: not null. `@NotEmpty`: not null and size greater than 0 (strings, collections, maps, arrays). `@NotBlank`: strings only, not null and has at least one non-whitespace character.

**3. Is validation in the controller enough?**
No. Validate at the edge for fast feedback, but enforce invariants in the domain and database too (unique indexes, not-null columns, foreign keys), because other entry points such as messages and batch jobs bypass the controller.

**4. How do you validate a `List<String>` of emails?**
Container element constraints: `List<@Email String>`.

**5. What exception does a failed `@RequestBody` validation throw, and how do you handle it?**
`MethodArgumentNotValidException`. Handle it in a `@RestControllerAdvice` and return 400 with the field errors.

## Pitfalls

- Missing `@Valid` on nested objects or collection elements.
- Using `@NotNull` on primitives (they can never be null).
- Mutating entities directly from request DTOs and validating the entity afterwards.
- Relying on application-level uniqueness checks without a database unique index.

## Key takeaways

- Annotate DTOs with constraints, trigger with `@Valid`, cascade explicitly.
- Add `@Validated` on classes for parameter-level constraints.
- Return structured field errors with a single advice class.
- Validation at the edge complements, never replaces, database constraints.

Next: [Testing basics](testing-basics.md).
