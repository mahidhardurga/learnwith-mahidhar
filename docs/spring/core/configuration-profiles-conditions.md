---
title: Spring Configuration, Profiles and Conditional Beans
sidebar_label: "Configuration, profiles, conditions"
description: Java configuration with @Configuration and @Bean, proxyBeanMethods, profiles, custom @Conditional logic, @Import, property sources and Environment, plus bean overriding and organisation guidelines.
keywords: [spring @Configuration, proxyBeanMethods, "@Profile", "@Conditional", "@Import", Environment PropertySource, bean definition overriding, spring java config]
sidebar_position: 4
---

# Configuration, Profiles and Conditional Beans

<Outcomes items={[
  "Define beans with @Configuration and @Bean",
  "Use profiles and conditions to switch configuration",
  "Understand bean overriding rules"
]} />

## `@Configuration` and `@Bean`

```java
@Configuration
class InfraConfig {

    @Bean
    DataSource dataSource(DataSourceProperties props) {        // dependencies are injected as method parameters
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(props.url());
        return ds;
    }

    @Bean
    JdbcTemplate jdbcTemplate(DataSource ds) {                 // preferred: take the dependency as a parameter
        return new JdbcTemplate(ds);
    }
}
```

### `proxyBeanMethods`: full vs lite mode

In **full** mode (`proxyBeanMethods = true`, the default) the configuration class is CGLIB-subclassed so a call to one `@Bean` method from another returns the **same singleton**:

```java
@Configuration
class Full {
    @Bean Dep dep() { return new Dep(); }
    @Bean Holder holder() { return new Holder(dep()); }      // dep() is intercepted -> the existing singleton
}
```

In **lite** mode (`proxyBeanMethods = false`) the call is a plain Java call and creates a **second** `Dep`. I verified: with `true`, `Holder.dep` is the container's `Dep`; with `false` it is a different instance. Lite mode starts faster and is GraalVM-friendly; Spring Boot's own auto-configuration uses it and injects dependencies through method parameters instead. Rule: **take collaborators as `@Bean` method parameters**, then `proxyBeanMethods = false` is always safe.

`static @Bean` methods are required for `BeanFactoryPostProcessor`/`BeanPostProcessor` beans so the enclosing configuration class is not initialised too early.

## Component scanning

`@ComponentScan` (included in `@SpringBootApplication`) registers annotated classes under a base package. Narrow it with `basePackages` and filters when needed; scanning too widely is slow and pulls in test or unrelated beans. Place the main class in a root package so it scans the whole application and nothing else.

## Profiles

Profiles group beans and properties by environment.

```java
@Configuration
class StorageConfig {
    @Bean @Profile("dev")
    FileStore localStore() { return new LocalFileStore(Path.of("/tmp/files")); }

    @Bean @Profile("!dev")                                    // anything but dev
    FileStore s3Store(S3Client s3) { return new S3FileStore(s3); }
}
```

- Activate with `spring.profiles.active=prod` (property, env var `SPRING_PROFILES_ACTIVE`, or command line). Several: `prod,eu`.
- Profile expressions: `@Profile("prod & eu")`, `"dev | test"`, `"!prod"`.
- Profile-specific property files: `application-prod.yml` (see [Configuration](../boot/configuration.md)).
- **Profile groups** (`spring.profiles.group.prod=proddb,prodmq`) activate several at once.
- Use `spring.profiles.include`/`default` sparingly. Keep profiles to **environment concerns**; do not encode feature toggles as profiles (use properties or a toggle service).
- Beware production-only code paths that tests never exercise: use `@ActiveProfiles` in tests and keep differences small. Prefer **configuration over profile-conditional beans**: one `FileStore` bean with a property-selected implementation is easier to test than two.

## Conditions

`@Profile` is just a built-in `@Conditional`. Conditions decide whether a bean or configuration is registered, based on classpath, properties, existing beans, environment or custom logic. They are the machinery behind [auto-configuration](../boot/auto-configuration.md).

```java
@Bean
@ConditionalOnProperty(name = "feature.fraud-check", havingValue = "true")   // Boot condition
FraudChecker fraudChecker() { return new FraudChecker(); }
```

Custom condition (core Spring):

```java
class OnLinuxCondition implements Condition {
    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        return context.getEnvironment().getProperty("os.name", "").toLowerCase().contains("linux");
    }
}

@Bean
@Conditional(OnLinuxCondition.class)
NativeOptimizer optimizer() { return new NativeOptimizer(); }
```

Conditions are evaluated when bean **definitions** are registered, before beans exist, so they cannot depend on bean instances (but `@ConditionalOnBean` inspects *definitions registered so far*, which is why ordering matters; use it only in auto-configuration).

## Importing configuration

```java
@Configuration
@Import({SecurityConfig.class, MessagingConfig.class})     // explicit composition
class AppConfig { }

@Import(MyImportSelector.class)                              // choose configuration classes programmatically
```

`@ImportResource("classpath:legacy-beans.xml")` bridges legacy XML. `@EnableXyz` annotations (`@EnableCaching`, `@EnableAsync`, `@EnableScheduling`) are `@Import`s of the machinery configuration.

## Environment and property sources

The `Environment` aggregates `PropertySource`s (system properties, environment variables, `application.yml`, `@PropertySource` files, command-line args) in precedence order. Inject values with `@Value("${timeout:5s}")` (default after the colon), or better with typed `@ConfigurationProperties`. Placeholders can nest and reference each other. SpEL (`#{...}`) evaluates expressions: `@Value("#{systemProperties['user.home']}")`, `@Value("#{'${tags}'.split(',')}")`.

Read `Environment` directly only in infrastructure code:

```java
@Bean
Clock clock(Environment env) {
    return env.acceptsProfiles(Profiles.of("test")) ? Clock.fixed(Instant.EPOCH, ZoneOffset.UTC) : Clock.systemUTC();
}
```

## Bean overriding

Defining two beans with the same name silently replaced the first in old Spring; **Spring Boot 2.1+ disables overriding** (`spring.main.allow-bean-definition-overriding=false`) and fails at startup with a clear error. Resolve duplicates by renaming, `@Primary`, or conditions rather than turning overriding on; it makes behaviour depend on scan/registration order.

## Organising configuration

- One configuration class per concern (persistence, messaging, security, web), not a single god class.
- Keep business classes free of Spring annotations where practical; wire them in `@Configuration` (useful in hexagonal architectures).
- Use `@ConfigurationProperties` records for settings and validate them.
- Prefer **constructor-injected** collaborators; expose small `@Bean` methods; avoid logic in configuration beyond construction.
- Test configuration with `ApplicationContextRunner` (fast, no full app).

```java
new ApplicationContextRunner()
    .withUserConfiguration(StorageConfig.class)
    .withPropertyValues("spring.profiles.active=dev")
    .run(ctx -> assertThat(ctx).hasSingleBean(FileStore.class));
```

## Check yourself

<Checkpoint questions={[
  {
    "q": "What does @Profile(\"dev\") on a bean do?",
    "options": [
      "Registers the bean only when the dev profile is active",
      "Marks the bean as deprecated",
      "Makes it prototype scoped",
      "Loads application-dev.yml only"
    ],
    "answer": 0,
    "why": "Profiles select which beans and property files apply per environment."
  },
  {
    "q": "Which annotation registers a bean only if a property has a given value?",
    "options": [
      "@ConditionalOnProperty",
      "@Profile",
      "@Primary",
      "@Lazy"
    ],
    "answer": 0,
    "why": "Boot conditions such as @ConditionalOnProperty and @ConditionalOnMissingBean drive auto-configuration."
  },
  {
    "q": "Two beans share a name. What happens in Spring Boot 2.1+ by default?",
    "options": [
      "The last one silently wins",
      "Startup fails: bean definition overriding is disabled",
      "The first one silently wins",
      "Both are kept"
    ],
    "answer": 1,
    "why": "Boot disables overriding by default to avoid hard-to-find mistakes."
  }
]} />

## Common interview questions

**1. What does `@Configuration` do and how is it different from `@Component`?**
It marks a class as a source of bean definitions; in full mode it is CGLIB-proxied so inter-`@Bean` method calls return container-managed singletons. A `@Component` with `@Bean` methods runs in lite mode (no inter-bean call interception).

**2. What is `proxyBeanMethods`?**
Whether the config class is proxied. `false` skips the proxy (faster startup), requiring dependencies to be passed as method parameters rather than calling other `@Bean` methods.

**3. How do profiles work and how do you activate them?**
They conditionally register beans and select property files; activated by `spring.profiles.active` via property, environment variable or command line; expressions allow `!`, `&`, `|`.

**4. How do you write a conditional bean?**
Annotate with `@Conditional(MyCondition.class)` or Boot's `@ConditionalOnProperty/Class/MissingBean`; the condition inspects the environment/classpath/definitions at registration time.

**5. How does Spring handle two beans with the same name?**
Boot 2.1+ fails by default; avoid overriding, use distinct names, `@Primary` or `@Qualifier`.

**6. `@Value` vs `@ConfigurationProperties`?**
`@Value` for a single value with SpEL; `@ConfigurationProperties` for typed, validated, relaxed-bound groups.

**7. How do you share configuration across modules?**
Create library configuration classes or [auto-configuration](../boot/auto-configuration.md) with conditions, and import them explicitly or through `AutoConfiguration.imports`.

## Pitfalls

- Calling `@Bean` methods from each other in lite mode (accidental duplicates).
- Non-static `BeanPostProcessor` bean methods.
- Using profiles for feature flags; environment-only code paths untested.
- Turning on bean-definition overriding to silence an error.
- Overbroad component scans.
- Business logic inside `@Configuration` classes.

## Key takeaways

- Pass dependencies as `@Bean` parameters; `proxyBeanMethods = false` is safe then.
- Profiles are for environments; conditions generalise them.
- Do not allow bean overriding; make names and priorities explicit.
- Test configuration with `ApplicationContextRunner`.

Next: [Application events](application-events.md).
