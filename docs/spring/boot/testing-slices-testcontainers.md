---
title: Spring Boot Slice Tests and Testcontainers
sidebar_label: "Slice tests and Testcontainers"
description: Test only the layer you care about with @WebMvcTest and @DataJpaTest, and run integration tests against real PostgreSQL or Kafka using Testcontainers and @ServiceConnection.
keywords: [WebMvcTest, DataJpaTest, SpringBootTest, Testcontainers, ServiceConnection, MockMvc, integration testing spring boot]
sidebar_position: 9
---

# Slice Tests and Testcontainers

<Outcomes items={[
  "Use slice tests (@WebMvcTest, @DataJpaTest) for focused checks",
  "Run real databases with Testcontainers",
  "Know when to use a full-stack test"
]} />

## Slice annotations

| Annotation | Loads | Typical use |
| --- | --- | --- |
| `@WebMvcTest(Controller.class)` | MVC infrastructure, controllers, advice, filters, converters (not services) | Request mapping, JSON, validation, status codes |
| `@DataJpaTest` | Entities, repositories, Hibernate, transactions (each test rolls back) | Queries, mappings, constraints |
| `@JsonTest` | Jackson `ObjectMapper` and JSON tester | Serialization rules |
| `@RestClientTest` | `RestClient`/`RestTemplate` with mock server | Outbound HTTP clients |
| `@SpringBootTest` | Everything | A few end-to-end flows |

## `@WebMvcTest` example

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired MockMvc mvc;

    @MockitoBean OrderService orderService;   // Spring Framework 6.2+, Boot 3.4+

    @Test
    void returns404WhenOrderMissing() throws Exception {
        when(orderService.find(42L)).thenThrow(new OrderNotFoundException(42L));

        mvc.perform(get("/orders/42"))
           .andExpect(status().isNotFound())
           .andExpect(jsonPath("$.orderId").value(42));
    }

    @Test
    void rejectsEmptyBody() throws Exception {
        mvc.perform(post("/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
           .andExpect(status().isBadRequest());
    }
}
```

The service layer is replaced with a mock, so the test checks only the web contract: URL mapping, JSON binding, validation and the exception handler from [exception handling](exception-handling.md). If Spring Security is on the classpath, MVC slice tests apply it too; use `@WithMockUser` or `.with(csrf())` as needed.

## Why not H2?

An in-memory H2 database behaves differently from PostgreSQL or MySQL: SQL dialect, locking, JSON columns, sequences, case rules. Tests pass and production fails. Testcontainers starts the **same database** in Docker for the duration of the test.

## `@DataJpaTest` with Testcontainers

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class OrderRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired OrderRepository repository;

    @Test
    void findsOrdersByCustomer() {
        repository.save(new OrderEntity(1L, "C-1"));
        assertThat(repository.findByCustomerId("C-1")).hasSize(1);
    }
}
```

Key parts:

- `@Container` on a `static` field means one container per test class; the `@Testcontainers` extension starts and stops it.
- `@ServiceConnection` (Boot 3.1+) auto-configures the `DataSource` from the container, replacing manual `@DynamicPropertySource` wiring.
- `Replace.NONE` stops Boot swapping in an embedded database.

For other services use the matching container and `@ServiceConnection`: `KafkaContainer`, `GenericContainer` with `@DynamicPropertySource` for anything without built-in support.

### Sharing one container across many classes

Starting a container per class is slow. Use an abstract base class with a static singleton container started once, or Testcontainers' reuse feature in local development.

```java
abstract class AbstractIntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    static {
        POSTGRES.start();   // stopped by Ryuk when the JVM exits
    }
}
```

## Full-stack test

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderFlowIT extends AbstractIntegrationTest {

    @Autowired TestRestTemplate rest;

    @Test
    void createAndFetchOrder() {
        var created = rest.postForEntity("/orders", new CreateOrderRequest(1L, List.of()), Void.class);
        assertThat(created.getStatusCode().is2xxSuccessful()).isTrue();
    }
}
```

Reserve these for a handful of critical journeys. Name them `*IT` and run them with the Failsafe plugin so `mvn test` stays fast.

## Boot 4 note

Spring Boot 4 splits test support into per-technology modules, and annotations such as `@WebMvcTest` live in new packages with their own test starters (for example `spring-boot-starter-webmvc-test`). The concepts are unchanged; check imports and starters when upgrading.

## Check yourself

<Checkpoint questions={[
  {
    "q": "Which test slice loads only the web layer?",
    "options": [
      "@WebMvcTest",
      "@DataJpaTest",
      "@SpringBootTest with no web",
      "@JsonTest only"
    ],
    "answer": 0,
    "why": "@WebMvcTest configures controllers and MVC infrastructure, with MockMvc and mocked services."
  },
  {
    "q": "Why prefer Testcontainers over H2 for repository tests?",
    "options": [
      "H2 is not free",
      "Your tests run against the same database engine as production",
      "Testcontainers is faster in every case",
      "H2 cannot store data"
    ],
    "answer": 1,
    "why": "Dialect differences (JSON, locking, SQL features) show up only on the real engine."
  },
  {
    "q": "What does @SpringBootTest load by default?",
    "options": [
      "Only controllers",
      "Only repositories",
      "The full application context",
      "Nothing"
    ],
    "answer": 2,
    "why": "It is the slowest option, so keep it for a few end-to-end tests."
  }
]} />

## Common interview questions

**1. What is a test slice?**
A Boot test annotation that builds a minimal application context for one layer, with relevant auto-configuration only. It is faster and more focused than `@SpringBootTest`.

**2. Why does `@WebMvcTest` need `@MockitoBean` for services?**
Services are not loaded in that slice. The controller's dependencies must be supplied, and a mock isolates the web layer.

**3. Why Testcontainers rather than H2?**
Fidelity. You test against the same engine and SQL dialect that production runs, including migrations (Flyway/Liquibase) and engine-specific features.

**4. What does `@ServiceConnection` do?**
It maps a container to Boot's connection details (JDBC URL, credentials, Kafka bootstrap servers) automatically, so no property juggling.

**5. How do you keep integration tests fast?**
Reuse containers across classes, share the Spring context (identical configuration is cached), use slices where possible and avoid `@DirtiesContext`.

**6. How is test data isolated?**
`@DataJpaTest` and `@Transactional` tests roll back after each test. For full-stack tests with real HTTP the transaction is not shared, so clean data explicitly or use unique identifiers.

## Pitfalls

- `@SpringBootTest` for everything; the suite takes minutes.
- `@MockitoBean` with different mock sets on each class, defeating context caching.
- Docker not available on CI runners; use a runner with Docker or a Testcontainers cloud service.
- Hibernate `ddl-auto=create` in tests while production uses migrations; run the real migrations instead.

## Key takeaways

- Pick the smallest slice that covers the behaviour.
- Test against real infrastructure with Testcontainers and `@ServiceConnection`.
- Keep a small number of full-context tests, and keep everything else fast.
