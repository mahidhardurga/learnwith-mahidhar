---
title: REST Exception Handling in Spring Boot
sidebar_label: "REST exception handling"
description: Centralised error handling with @RestControllerAdvice, ProblemDetail (RFC 9457), custom exceptions and how Boot's default error handling works.
keywords: [spring boot exception handling, "@RestControllerAdvice", "@ExceptionHandler", ProblemDetail, ResponseStatusException]
sidebar_position: 7
---

# REST Exception Handling

A good API returns consistent, informative errors and never leaks stack traces. Spring gives you several layers; interviewers want to know which to use and why.

<Outcomes items={[
  "Centralise errors with @RestControllerAdvice",
  "Return RFC 9457 ProblemDetail responses",
  "Know how exception resolution picks a handler"
]} />

## The layers

1. **Boot's default** `BasicErrorController` and `/error`: returns a generic JSON body for uncaught exceptions. Hide details with `server.error.include-message=never` and `include-stacktrace=never` (these are the defaults in recent versions).
2. **`@ResponseStatus`** on an exception class: maps it to a status code.
3. **`ResponseStatusException`**: throw inline with a status and reason.
4. **`@ExceptionHandler`** in a controller: handles exceptions for that controller only.
5. **`@RestControllerAdvice`**: global handlers across all controllers. This is the standard solution.

## Standard error body: `ProblemDetail`

Spring Framework 6 supports RFC 9457 "Problem Details for HTTP APIs" with the `ProblemDetail` class. Enable it for Spring's own exceptions with `spring.mvc.problemdetails.enabled=true`, or extend `ResponseEntityExceptionHandler` which handles them.

## Example

Domain exceptions:

```java
public class OrderNotFoundException extends RuntimeException {
    private final long orderId;

    public OrderNotFoundException(long orderId) {
        super("Order " + orderId + " not found");
        this.orderId = orderId;
    }

    public long getOrderId() { return orderId; }
}
```

```java
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(OrderNotFoundException.class)
    ProblemDetail handleNotFound(OrderNotFoundException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        pd.setTitle("Order not found");
        pd.setProperty("orderId", ex.getOrderId());
        return pd;
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail handleConflict(DataIntegrityViolationException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "The request conflicts with existing data");
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
    }
}
```

Response for a missing order:

```json
{
  "type": "about:blank",
  "title": "Order not found",
  "status": 404,
  "detail": "Order 42 not found",
  "instance": "/orders/42",
  "orderId": 42
}
```

Validation errors (`MethodArgumentNotValidException`) are covered in [Validation](validation.md).

## How resolution works

`DispatcherServlet` asks its `HandlerExceptionResolver` chain: `ExceptionHandlerExceptionResolver` (your `@ExceptionHandler` methods), then `ResponseStatusExceptionResolver`, then `DefaultHandlerExceptionResolver`. The most specific handler for the exception type wins; local controller handlers take precedence over advice.

Exceptions thrown from **filters** happen before the `DispatcherServlet`, so `@ControllerAdvice` does not see them. Handle those in the filter or with a `HandlerExceptionResolver`.

## Check yourself

<Checkpoint questions={[
  {
    "q": "Where should REST error mapping live?",
    "options": [
      "In a @RestControllerAdvice with @ExceptionHandler methods",
      "Inside every controller method with try/catch",
      "In the database",
      "In JavaScript"
    ],
    "answer": 0,
    "why": "A central advice gives consistent error bodies and keeps controllers clean."
  },
  {
    "q": "What is ProblemDetail?",
    "options": [
      "A logging level",
      "A standard error body format (RFC 9457) supported in Spring 6",
      "A JSON library",
      "A security filter"
    ],
    "answer": 1,
    "why": "It has type, title, status, detail and instance fields."
  },
  {
    "q": "Two handlers match an exception. Which wins?",
    "options": [
      "The first alphabetically",
      "The last declared",
      "The one with the closest exception type",
      "Spring throws an error"
    ],
    "answer": 2,
    "why": "Resolution prefers the most specific match."
  }
]} />

## Common interview questions

**1. How do you handle exceptions globally?**
A class annotated with `@RestControllerAdvice` containing `@ExceptionHandler` methods; each maps an exception type to a response.

**2. `@ControllerAdvice` vs `@RestControllerAdvice`?**
The latter adds `@ResponseBody`, so return values are serialised to the body instead of being interpreted as view names.

**3. Which HTTP status for which error?**
400 for malformed or invalid input, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict (duplicate or version clash), 422 semantic validation failure (optional alternative to 400), 429 rate limited, 500 server bug, 503 dependency unavailable.

**4. How do you avoid leaking internals?**
Return generic messages for unexpected errors, log the details with a correlation ID, and never expose stack traces or SQL errors.

**5. A transactional method throws a checked exception. Does it roll back?**
By default no: only `RuntimeException` and `Error` trigger rollback. Use `@Transactional(rollbackFor = ...)`. See [Transactions](../data/transactions.md).

## Pitfalls

- Catching `Exception` in the controller and returning 200 with an error message.
- Generic handler registered before specific ones with unclear precedence; rely on type specificity and test it.
- Logging the same exception at every layer, producing duplicate stack traces.
- Forgetting that filter exceptions bypass the advice.

## Key takeaways

- Use one `@RestControllerAdvice` with typed handlers and a consistent `ProblemDetail` body.
- Map domain exceptions to precise status codes; log unexpected ones once.
- Filters and security failures need their own handling.

Next: [Validation](validation.md).
