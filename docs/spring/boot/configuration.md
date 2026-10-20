---
title: Externalized Configuration and Properties
sidebar_label: "Configuration and properties"
description: Property sources and their precedence, profiles, type-safe @ConfigurationProperties binding and validation in Spring Boot.
keywords: [spring boot properties, "@ConfigurationProperties", "@Value", profiles, application.yml, property precedence]
sidebar_position: 4
hide_table_of_contents: true
---

# Externalized Configuration and Properties

<Outcomes items={[
  "State the property source precedence order in simple terms",
  "Choose @ConfigurationProperties over @Value for groups of settings",
  "Handle secrets safely"
]} />

## Precedence (highest wins), simplified

1. Command-line arguments (`--server.port=9000`)
2. `SPRING_APPLICATION_JSON` and Java system properties (`-Dserver.port=9000`)
3. OS environment variables (`SERVER_PORT=9000`)
4. Profile-specific files outside the JAR, then inside: `application-prod.yml`
5. `application.yml` / `application.properties` outside the JAR, then inside
6. `@PropertySource` and `SpringApplication.setDefaultProperties`

Practical consequence: in Kubernetes you set environment variables or mount a config file and never rebuild the image.

Relaxed binding maps `server.port`, `SERVER_PORT` and `serverPort` to the same property. Environment variables use upper-case with underscores: `SPRING_DATASOURCE_URL` is `spring.datasource.url`.

## Profiles

```yaml
# application.yml
spring:
  application:
    name: order-service
greeting:
  message: Hello
---
spring:
  config:
    activate:
      on-profile: prod
greeting:
  message: Welcome
```

Activate with `--spring.profiles.active=prod` or `SPRING_PROFILES_ACTIVE=prod`. A bean can be restricted with `@Profile("prod")`.

## `@Value` versus `@ConfigurationProperties`

`@Value("${greeting.message}")` is fine for one-off values. For groups of settings prefer `@ConfigurationProperties`: it is type-safe, supports nested objects, lists and durations, validates, and generates IDE metadata.

A modern, immutable form uses a Java record (constructor binding is automatic for records):

```java
@ConfigurationProperties(prefix = "payment")
@Validated
public record PaymentProperties(
        @NotBlank String gatewayUrl,
        @DefaultValue("3") @Min(1) @Max(10) int maxRetries,
        @DefaultValue("5s") Duration timeout,
        List<String> allowedCurrencies) {
}
```

Enable it either with `@EnableConfigurationProperties(PaymentProperties.class)` or `@ConfigurationPropertiesScan` on the application class.

```yaml
payment:
  gateway-url: https://pay.example.com
  max-retries: 5
  timeout: 2s
  allowed-currencies: [INR, USD]
```

If `gateway-url` is missing or blank, the application **fails at startup** with a clear message, which is exactly what you want from configuration errors.

Usage:

```java
@Service
class PaymentClient {
    private final PaymentProperties props;

    PaymentClient(PaymentProperties props) {
        this.props = props;
    }

    Duration timeout() {
        return props.timeout();
    }
}
```

## Secrets

Never commit secrets in `application.yml`. Supply them from environment variables, Kubernetes secrets, or a vault (HashiCorp Vault, cloud secret managers, Spring Cloud Config with encryption). Boot also supports `configtree:` to read each file in a mounted directory as a property.

## Check yourself

<Checkpoint questions={[
  {
    "q": "Which source normally overrides application.yml?",
    "options": [
      "Environment variables and command-line arguments",
      "Comments in the YAML",
      "The jar file name",
      "Maven version"
    ],
    "answer": 0,
    "why": "Command-line and environment values sit above file-based configuration."
  },
  {
    "q": "Why prefer @ConfigurationProperties for related settings?",
    "options": [
      "It is faster at runtime by 10x",
      "It binds a typed, validated object and supports relaxed binding",
      "It works without Spring",
      "It avoids YAML"
    ],
    "answer": 1,
    "why": "Typed binding catches mistakes early and groups related properties."
  },
  {
    "q": "Where should production secrets live?",
    "options": [
      "In application.yml committed to git",
      "In the README",
      "In a secret manager or injected environment, not in the repository",
      "In a public bucket"
    ],
    "answer": 2,
    "why": "Never commit secrets. Use Vault, cloud secret stores or Kubernetes Secrets."
  }
]} />

## Common interview questions

**1. In what order does Spring Boot resolve properties?**
Command-line args over system properties over environment variables over profile files over default `application` files over defaults in code. Outside-the-JAR files beat inside-the-JAR files.

**2. `@Value` vs `@ConfigurationProperties`?**
`@Value` injects single values with SpEL support but no relaxed binding for the expression key and no grouping. `@ConfigurationProperties` binds a whole prefix to a typed object with relaxed binding, validation and metadata.

**3. How do you have different configuration per environment?**
Profile-specific files or documents, activated by `spring.profiles.active`, plus environment variables for deployment-specific values and secrets.

**4. How do you validate configuration?**
Annotate the properties class with `@Validated` and put Jakarta constraints on fields. Binding fails at startup if they are violated.

**5. How do you refresh configuration at runtime?**
Plain Boot does not. With Spring Cloud, `@RefreshScope` beans re-bind when `/actuator/refresh` is called or a bus event arrives (see [Config Server](../../microservices/infrastructure/config-server.md)).

## Pitfalls

- Duplicate keys with different casing or format across properties and YAML.
- Forgetting that `@Profile` on a bean and `on-profile` in a document are different mechanisms for different things.
- Binding a `List` from environment variables: use `MY_LIST_0`, `MY_LIST_1` or a comma-separated value.
- Using mutable properties classes with setters when records would make them immutable.

## Key takeaways

- One artifact, many environments: change configuration, not code.
- Higher-priority sources override lower ones; env vars and CLI args win.
- Prefer validated `@ConfigurationProperties` records over scattered `@Value`.
- Keep secrets out of the repository.

Next: [Actuator](actuator.md).
