---
title: Common Web Vulnerabilities in Java and Spring Applications (OWASP Top 10)
sidebar_label: "Common vulnerabilities"
description: The OWASP Top 10 mapped to Java and Spring - SQL injection, broken access control, XSS, CSRF, SSRF, insecure deserialization, mass assignment, misconfiguration, vulnerable dependencies and secrets, with concrete defences.
keywords: [owasp top 10 java, sql injection prepared statement, xss, ssrf, insecure deserialization, mass assignment, broken access control, spring security best practices, dependency scanning, secrets management]
sidebar_position: 5
---

# Common Vulnerabilities and Defences

<Outcomes items={[
  "Recognise the OWASP-style vulnerabilities that hit Java APIs",
  "Apply the standard defence for each",
  "Build secure development habits"
]} />

## 1. Broken access control (IDOR / BOLA)

The most common serious flaw: the caller can access data or actions that belong to someone else.

- Enforce authorisation on the **server**, per object, in the service layer (see [method security](method-security.md)).
- Scope queries by owner/tenant: `findByIdAndTenantId`.
- Deny by default; centralise policy in one place; log access-control failures.
- Test with a second user's identifiers, and for **horizontal** (other users) and **vertical** (admin functions) escalation.
- Do not trust client-supplied roles, prices, user ids or hidden fields.

## 2. Injection (SQL, JPQL, NoSQL, OS command, LDAP)

Data concatenated into an interpreter's command becomes code.

```java
// VULNERABLE
jdbc.queryForList("select * from users where name = '" + name + "'");        // name = ' OR '1'='1

// SAFE: parameters are sent separately from the SQL text
jdbc.queryForList("select * from users where name = ?", name);
em.createQuery("select u from User u where u.name = :name", User.class).setParameter("name", name);
```

- Always use **bind parameters**: JDBC `PreparedStatement`, JPA named parameters, Spring Data derived queries.
- Dynamic `ORDER BY`/column names cannot be parameters: **allow-list** them.
- Avoid building queries with string concatenation or `String.format`, including in `@Query` SpEL and native queries.
- Never pass user input to `Runtime.exec`/`ProcessBuilder` through a shell; use argument arrays and allow-lists.
- Least-privilege database accounts limit the damage.

## 3. Cross-Site Scripting (XSS)

Untrusted data rendered into HTML/JS executes in other users' browsers, stealing sessions or tokens.

- Use auto-escaping templates (Thymeleaf `th:text`, not `th:utext`; React/Angular escape by default).
- JSON APIs: set `Content-Type: application/json`, and **never** reflect input into HTML.
- Add a strict **Content-Security-Policy** header; avoid inline scripts.
- Sanitise rich HTML with a vetted library (OWASP Java HTML Sanitizer) if you must accept it.
- Mark cookies `HttpOnly`, `Secure`, `SameSite`.

## 4. Cross-Site Request Forgery (CSRF)

Covered in [architecture](security-architecture.md): keep CSRF protection for cookie/session authentication; it is not needed for header-based bearer-token APIs. Use `SameSite=Lax/Strict` cookies as a second layer.

## 5. Server-Side Request Forgery (SSRF)

The server fetches a URL supplied by the user (webhooks, image import, PDF rendering) and an attacker points it at internal services or cloud metadata (`http://169.254.169.254/...`) to steal credentials.

- Allow-list schemes (`https`) and destination hosts; resolve DNS and **block private/link-local/loopback ranges**, rechecking after redirects (disable redirect following or re-validate).
- Run fetchers in a network segment without internal access; require IMDSv2 on AWS.
- Do not return raw upstream responses or errors to the user.

## 6. Insecure deserialization

Deserialising attacker-controlled bytes can execute code through gadget chains.

- **Never use Java native serialization** (`ObjectInputStream`) on untrusted data; if unavoidable, use a serialization filter (`ObjectInputFilter`) allow-list.
- Jackson: avoid **default typing**/polymorphic deserialisation of untrusted JSON (`enableDefaultTyping`, `@JsonTypeInfo(use = Id.CLASS)`); use a restricted `PolymorphicTypeValidator` or explicit subtype names.
- Keep libraries updated (Log4Shell, Spring4Shell and many Jackson/XStream CVEs were deserialisation/expression-injection bugs).
- XML: disable **external entities** (XXE): `factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true)` and disallow DOCTYPE.

## 7. Mass assignment / over-posting

Binding request JSON directly to an entity lets attackers set fields like `role`, `balance` or `id`.

```java
// VULNERABLE: client can send {"role":"ADMIN"}
@PostMapping("/users") User create(@RequestBody User user) { return repo.save(user); }

// SAFE: dedicated input DTO exposes only allowed fields
record CreateUserRequest(@NotBlank String name, @Email String email) { }
@PostMapping("/users") UserResponse create(@Valid @RequestBody CreateUserRequest req) {
    return mapper.toResponse(service.create(req.name(), req.email()));
}
```

Use separate request/response DTOs; never return entities (they leak internal fields); configure Jackson `FAIL_ON_UNKNOWN_PROPERTIES` for strict inputs where useful.

## 8. Sensitive data exposure and logging

- Never log passwords, tokens, card numbers or full personal data; mask in logs and error messages.
- Do not expose stack traces; return generic errors (see [exception handling](../boot/exception-handling.md)).
- Expose only the Actuator endpoints you need and **secure** them (`env`, `heapdump`, `configprops` leak secrets).
- Encrypt in transit (TLS everywhere, including between services) and at rest; encrypt backups.
- Do not put secrets or PII in URLs or JWT payloads.
- Return minimal data (DTOs), and avoid caching sensitive responses (`Cache-Control: no-store`).

## 9. Authentication weaknesses

- Hash passwords with bcrypt/argon2 via `DelegatingPasswordEncoder`; never roll your own crypto.
- Rate-limit and lock out brute force and credential stuffing (per account and per IP, with back-off); add MFA for sensitive access.
- Do not reveal whether a username exists in login or reset messages.
- Rotate session ids after login (Spring does this by default: session fixation protection), expire sessions, secure cookie flags.
- Use a vetted IdP (OIDC) rather than building authentication yourself (see [OAuth2/OIDC](oauth2-oidc.md)).

## 10. Security misconfiguration

- Default or sample credentials, open admin consoles (H2 console, Actuator, Swagger in production), verbose errors.
- Overly permissive CORS (`*` with credentials) or `permitAll` on broad patterns.
- Missing security headers (HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`).
- Debug/trace logging in production; development profiles enabled in production.
- Infrastructure: public buckets, containers running as root, no network policies.

Harden with secure defaults, infrastructure-as-code review, and automated config scanning.

## 11. Vulnerable and outdated components

The Log4Shell, Spring4Shell and Text4Shell incidents were dependency vulnerabilities.

- Keep an **SBOM** and run **software composition analysis** in CI: OWASP Dependency-Check, Dependabot/Renovate, Snyk, Trivy for container images.
- Upgrade Spring Boot patch releases promptly (they carry dependency CVE fixes).
- Remove unused dependencies; pin base images; scan images in CI and at runtime.

## 12. Secrets management

- No secrets in Git, images or config files; read from environment/secret stores (Vault, AWS Secrets Manager, Kubernetes Secrets with encryption at rest).
- Rotate regularly; use short-lived credentials (database credentials from Vault, IAM roles instead of keys).
- Scan repositories for leaked secrets (gitleaks) and revoke immediately when found.

## 13. Logging, monitoring and rate limiting

- Log security events (logins, failures, access denied, privilege changes) with correlation IDs; alert on anomalies.
- Apply **rate limiting** at the gateway to blunt brute force, scraping and denial-of-wallet; validate request sizes (`server.tomcat.max-swallow-size`, `spring.servlet.multipart.max-file-size`) to prevent resource exhaustion.
- Protect against regex DoS (ReDoS): avoid nested quantifiers on untrusted input.

## 14. File uploads

Validate content type by **inspecting content**, not just the extension/`Content-Type`; limit size; generate server-side file names (no path traversal: reject `..`, normalise paths and check they stay inside the base directory); store outside the web root; scan for malware; serve with `Content-Disposition: attachment` and a safe type.

```java
Path target = base.resolve(userSuppliedName).normalize();
if (!target.startsWith(base)) throw new IllegalArgumentException("path traversal attempt");
```

## Secure development habits

- **Threat model** new features (STRIDE: spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege).
- **Defence in depth**: validate input, authorise per object, encode output, least privilege everywhere.
- **Fail closed**, secure defaults, minimal attack surface.
- Automated checks in CI: SAST (SpotBugs + Find Security Bugs, CodeQL), SCA, secret scanning, DAST (OWASP ZAP) against staging.
- Security tests in the suite: 401/403 paths, IDOR attempts, malicious payloads.

## Check yourself

<Checkpoint questions={[
  {
    "q": "What is the defence against SQL injection?",
    "options": [
      "Parameterised queries or prepared statements",
      "Escaping quotes by hand",
      "Client-side validation",
      "Hiding the table names"
    ],
    "answer": 0,
    "why": "Parameters keep data separate from SQL text."
  },
  {
    "q": "What does an IDOR vulnerability show?",
    "options": [
      "A weak password policy",
      "Broken access control: object-level authorisation is missing",
      "An expired certificate",
      "A slow query"
    ],
    "answer": 1,
    "why": "It is consistently among the top risks. Authorise every object access."
  },
  {
    "q": "Why is mass assignment dangerous?",
    "options": [
      "It slows serialisation",
      "It breaks CORS",
      "Binding request JSON straight onto an entity can set fields the client must not control",
      "It exposes the stack trace"
    ],
    "answer": 2,
    "why": "Use DTOs with only the allowed fields."
  }
]} />

## Common interview questions

**1. How do you prevent SQL injection in Spring?**
Always use bind parameters (JPA named parameters, `JdbcTemplate` placeholders, Spring Data); allow-list dynamic identifiers; least-privilege DB accounts. Never concatenate input into queries.

**2. What is IDOR and how do you prevent it?**
Accessing objects by guessing identifiers. Enforce object-level authorisation on every access, scope queries by owner, and test with other users' ids.

**3. XSS vs CSRF?**
XSS runs attacker script in the victim's browser through unescaped output; CSRF makes the victim's browser send an authenticated state-changing request. Defences: output escaping/CSP vs CSRF tokens/SameSite.

**4. What is SSRF and how do you mitigate it?**
The server is tricked into requesting internal or metadata URLs. Allow-list destinations, block private ranges after DNS resolution, disable open redirects, and isolate the network.

**5. What is mass assignment?**
Binding client input directly to an entity so attackers set privileged fields. Use input DTOs with only permitted fields.

**6. Why is Java deserialization dangerous?**
Crafted streams can trigger gadget chains that run code during deserialisation. Avoid native serialisation of untrusted data, use filters, and restrict Jackson polymorphic typing.

**7. How do you handle secrets in a Spring Boot microservice?**
External secret stores/environment injection, never in the repo or image, short-lived credentials, rotation, and no logging of values.

**8. How do you keep dependencies safe?**
SCA scanning in CI with alerts (Dependabot/Trivy), frequent patch upgrades, SBOMs, and removal of unused libraries.

**9. What do you do about brute-force login attempts?**
Rate limiting, progressive delays or lockouts, CAPTCHA/MFA, uniform error messages, monitoring and alerting.

**10. What are secure response headers you would set?**
HSTS, CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, and `Cache-Control: no-store` for sensitive data.

## Pitfalls

- Trusting client input, including "internal" headers and ids.
- Validating on the client only.
- Disabling security features "temporarily" and forgetting.
- Exposing Actuator, Swagger or H2 consoles in production.
- Logging request bodies with credentials.
- Treating authentication as authorisation.
- Upgrading frameworks only when forced.

## Key takeaways

- Authorise every object access; parameterise every query; escape every output; validate every input.
- Use DTOs, not entities, at the boundary.
- Keep dependencies and secrets under control with automation.
- Layer defences and test the negative paths.
