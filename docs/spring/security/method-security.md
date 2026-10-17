---
title: Spring Method Security - @PreAuthorize, @PostAuthorize and Resource-Level Checks
sidebar_label: "Method security"
description: Enforce authorization inside services with @EnableMethodSecurity, @PreAuthorize and @PostAuthorize SpEL expressions, custom permission beans, preventing IDOR, and the proxy limits that bypass checks.
keywords: [spring method security, "@PreAuthorize", "@PostAuthorize", "@EnableMethodSecurity", SpEL authorization, IDOR, hasRole hasAuthority, "@PreFilter", authorization manager]
sidebar_position: 4
---

# Method Security

URL rules (`requestMatchers(...)`) protect **endpoints**. They cannot express "this user may only read **their own** orders", and they do not protect code paths that reach a service by other means (messages, schedulers, other controllers). **Method security** enforces rules at the **service layer**, close to the data, and is how you stop **IDOR** (insecure direct object reference / broken object-level authorization), the number one API vulnerability.

<Outcomes items={[
  "Enable method security and use @PreAuthorize",
  "Delegate complex rules to a bean",
  "Prevent IDOR with ownership checks"
]} />

## Enabling it

```java
@Configuration
@EnableMethodSecurity          // Spring Security 6: enables @PreAuthorize/@PostAuthorize/@PreFilter/@PostFilter (replaces @EnableGlobalMethodSecurity)
class MethodSecurityConfig { }
```

Like `@Transactional`, it is implemented with **proxies** (see [AOP](../core/aop-and-proxies.md)): the check runs when the method is called through the proxy.

## `@PreAuthorize` and `@PostAuthorize`

```java
@Service
class DocumentService {

    @PreAuthorize("hasRole('ADMIN') or #owner == authentication.name")
    public List<Doc> findFor(String owner) { ... }                       // checked BEFORE the method runs

    @PostAuthorize("returnObject.owner == authentication.name or hasRole('ADMIN')")
    public Doc load(long id) { return repo.findById(id).orElseThrow(); } // checked AFTER, using the result

    @PreAuthorize("hasAuthority('SCOPE_orders.write')")
    public void write() { ... }
}
```

In SpEL: `authentication` (the `Authentication`), `principal`, method parameters by name (`#owner`, requires `-parameters`), `returnObject` (post only), and functions `hasRole`, `hasAnyRole`, `hasAuthority`, `isAuthenticated()`, `permitAll`.

I tested this exact service: the owner can read their own documents, an admin can read all, another user gets `AccessDeniedException` (HTTP 403 through the controller), and `GET /docs/1` as `bob` (doc owned by `alice`) is **403**: an IDOR attempt blocked by `@PostAuthorize`.

### Pre vs Post

- **`@PreAuthorize`** is cheaper and prevents the work happening at all. Use it when the decision depends on arguments and identity.
- **`@PostAuthorize`** loads first, so the **database was queried and any side effects occurred**; use it for read-only methods whose rule depends on the loaded object. For writes, load and authorise explicitly before changing state.
- **`@PreFilter`/`@PostFilter`** filter collections by predicate; they fetch everything and then filter in memory, which is wrong for large data sets. Prefer **queries that already restrict by owner/tenant** (`findByIdAndOwner(...)`), so unauthorised rows are never read.

## Delegating complex rules to a bean

Keep SpEL short; call a Spring bean for real policies:

```java
@Component("perm")
class PermissionEvaluator {
    private final OrderRepository orders;
    PermissionEvaluator(OrderRepository orders) { this.orders = orders; }

    boolean canView(long orderId, Authentication auth) {
        return orders.findOwner(orderId).map(owner -> owner.equals(auth.getName())).orElse(false);
    }
}

@PreAuthorize("@perm.canView(#orderId, authentication) or hasRole('SUPPORT')")
public Order get(long orderId) { ... }
```

This keeps policy testable (unit tests on `PermissionEvaluator`), readable and out of strings. Spring Security 6.3+ also supports **meta-annotations** and custom `AuthorizationManager` beans for reusable rules:

```java
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasRole('ADMIN')")
@interface AdminOnly { }
```

## Preventing IDOR in practice

Broken object-level authorisation happens when the API takes an id and returns the object without checking the caller may see it.

```java
// VULNERABLE: any authenticated user can read any order by guessing ids
@GetMapping("/orders/{id}")
Order get(@PathVariable long id) { return orders.findById(id).orElseThrow(); }

// Fixed: scope the query by the caller
@GetMapping("/orders/{id}")
Order get(@PathVariable long id, Authentication auth) {
    return orders.findByIdAndCustomerId(id, customerIdOf(auth)).orElseThrow(NotFoundException::new);
}
```

Return **404** rather than 403 for resources the caller should not know exist (avoids confirming existence). Random UUIDs make guessing harder but are not a substitute for authorisation checks. Add integration tests that call each endpoint with another user's identifier.

## Roles, authorities, scopes in expressions

- `hasRole('ADMIN')` → authority `ROLE_ADMIN`; `hasAuthority('SCOPE_orders.read')` → exact authority string. Do not write `hasRole('ROLE_ADMIN')`.
- With JWTs, ensure your converter produces the authorities you check (see [JWT](jwt.md)).
- Prefer **permissions/scopes** for operations (`orders.write`) and map roles to permissions centrally.

## Limitations (same as AOP)

I verified the first of these in a test:

- **Self-invocation bypasses the check**: a method in the same class that calls a `@PreAuthorize` method directly skips authorisation (`docs.self()` returned data for a user who would be denied through the proxy). Move protected methods to another bean or put the annotation on the entry point.
- **Only public/proxyable methods** on non-final classes (CGLIB).
- `@Async`, `@Transactional` and security advice interact through ordering; the security context must be present in the thread that runs the secured method (see [architecture](security-architecture.md)).
- Annotations on interfaces vs classes: keep them where the implementation is (or on the interface for JDK proxies) consistently.

## Testing

```java
@Test @WithMockUser(username = "bob")
void cannotReadOthersDocument() {
    assertThatThrownBy(() -> service.load(1)).isInstanceOf(AccessDeniedException.class);
}

@Test @WithMockUser(roles = "ADMIN")
void adminCanReadAnything() { assertThat(service.load(1)).isNotNull(); }
```

Write tests per rule: owner allowed, other user denied, admin allowed, anonymous denied.

## Check yourself

<Checkpoint questions={[
  {
    "q": "Which annotation checks a rule before the method runs?",
    "options": [
      "@PreAuthorize",
      "@PostConstruct",
      "@Secured only after",
      "@Async"
    ],
    "answer": 0,
    "why": "It evaluates a SpEL expression such as hasRole('ADMIN') or an ownership check."
  },
  {
    "q": "What is IDOR?",
    "options": [
      "An injection attack on the database",
      "Accessing another user's object by guessing its identifier",
      "A browser bug",
      "A misconfigured proxy"
    ],
    "answer": 1,
    "why": "Always check that the current user may access the object, not only that they are logged in."
  },
  {
    "q": "Why can @PreAuthorize be skipped on an internal call?",
    "options": [
      "It only works on controllers",
      "It needs XML",
      "It is proxy-based, so self-invocation bypasses it",
      "It is disabled in production"
    ],
    "answer": 2,
    "why": "The same limitation as @Transactional."
  }
]} />

## Common interview questions

**1. URL-based vs method-level security?**
URL rules guard HTTP endpoints coarsely; method security guards business operations, can use arguments/return values and protects code reached by other entry points. Use both (defence in depth).

**2. `@PreAuthorize` vs `@PostAuthorize`?**
Pre checks before execution using arguments and identity; Post checks after, using the returned object, at the cost of having executed the method first.

**3. What is IDOR/BOLA and how do you prevent it?**
Accessing another user's object by changing an identifier. Prevent with ownership/tenant checks in every data access (scoped queries or `@PostAuthorize`), not by hiding ids.

**4. `hasRole('ADMIN')` vs `hasAuthority('ADMIN')`?**
`hasRole` prepends `ROLE_`; `hasAuthority` matches the authority string exactly.

**5. Why does my `@PreAuthorize` not work?**
Method security not enabled, call within the same class (proxy bypass), non-public/final method, class not a Spring bean, or authorities not what the expression expects.

**6. Why avoid `@PostFilter` on large collections?**
It loads all rows, then filters in memory; push the restriction into the query.

**7. How do you test method security?**
`@WithMockUser`/`@WithUserDetails`/`jwt()` with cases for allowed and denied users.

## Pitfalls

- Relying only on URL patterns; internal paths unprotected.
- Complex SpEL strings that nobody tests.
- Self-invocation skipping checks.
- Returning 403 vs 404 inconsistently, leaking existence.
- `@PostAuthorize` on state-changing methods.
- Authorising in the controller only.

## Key takeaways

- Authorise **objects**, not just endpoints; method security enforces it near the data.
- Keep rules in testable beans; scope queries by owner/tenant.
- It is proxy-based, so the AOP limitations apply.
- Test denied cases explicitly.

Next: [Common vulnerabilities](common-vulnerabilities.md).
