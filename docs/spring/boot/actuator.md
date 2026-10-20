---
title: Spring Boot Actuator
sidebar_label: "Actuator"
description: Production-ready endpoints in Spring Boot - health probes, metrics with Micrometer, securing and customising Actuator, and the questions interviewers ask.
keywords: [spring boot actuator, health indicator, micrometer, readiness liveness probe, actuator endpoints]
sidebar_position: 5
hide_table_of_contents: true
---

# Spring Boot Actuator

Actuator adds operational endpoints to a running application: health, metrics, environment, loggers, thread dumps and more. It is also the foundation of [observability](../../microservices/observability/observability.md) in Boot-based microservices, because metrics are published through Micrometer.

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

<Outcomes items={[
  "Expose health, metrics and info endpoints safely",
  "Explain readiness versus liveness",
  "Add custom metrics with Micrometer"
]} />

## Exposure is opt-in

Only `health` is exposed over HTTP by default. Expose more explicitly, and be selective:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,loggers
  endpoint:
    health:
      show-details: when-authorized
      probes:
        enabled: true
```

| Endpoint | Purpose |
| --- | --- |
| `/actuator/health` | Aggregated health status |
| `/actuator/info` | Build and git info, custom data |
| `/actuator/metrics` | Micrometer metric names and values |
| `/actuator/prometheus` | Prometheus scrape format (needs `micrometer-registry-prometheus`) |
| `/actuator/loggers` | View and change log levels at runtime |
| `/actuator/conditions` | Auto-configuration report |
| `/actuator/env`, `/configprops` | Effective configuration (sensitive!) |
| `/actuator/threaddump`, `/heapdump` | Diagnostics (very sensitive) |

## Health, readiness and liveness

With `probes.enabled=true` (automatic on Kubernetes) you get:

- `/actuator/health/liveness`: is the process fundamentally OK? If not, restart it.
- `/actuator/health/readiness`: can it take traffic right now? If not, remove it from load balancing.

Do not put external dependencies such as the database in the **liveness** group. A database outage would then restart every pod, which makes the incident worse. Readiness may include them, depending on whether the service can do anything useful without them.

### Custom health indicator

```java
@Component
class PaymentGatewayHealthIndicator implements HealthIndicator {

    private final PaymentGatewayClient client;

    PaymentGatewayHealthIndicator(PaymentGatewayClient client) {
        this.client = client;
    }

    @Override
    public Health health() {
        try {
            long ms = client.ping();
            return Health.up().withDetail("latencyMs", ms).build();
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }
}
```

The bean name minus `HealthIndicator` becomes the component name: `paymentGateway`.

## Metrics with Micrometer

Micrometer is a vendor-neutral metrics facade (think SLF4J for metrics). Boot auto-registers JVM, HTTP server, datasource pool and cache metrics. Add your own:

```java
@Service
class OrderService {

    private final Counter placed;
    private final Timer processing;

    OrderService(MeterRegistry registry) {
        this.placed = Counter.builder("orders.placed").description("Orders accepted").register(registry);
        this.processing = Timer.builder("orders.processing").register(registry);
    }

    void place(Order order) {
        processing.record(() -> {
            // ... business logic ...
            placed.increment();
        });
    }
}
```

Beware **high-cardinality tags** (user IDs, order IDs, raw URLs). Each unique tag combination creates a new time series, which can overwhelm the metrics backend.

## Securing Actuator

Treat sensitive endpoints as internal. Typical approaches: expose them on a separate management port (`management.server.port=9090`) not published outside the cluster, and/or require a role via Spring Security.

```java
@Bean
SecurityFilterChain actuatorChain(HttpSecurity http) throws Exception {
    http.securityMatcher(EndpointRequest.toAnyEndpoint())
        .authorizeHttpRequests(a -> a
            .requestMatchers(EndpointRequest.to("health", "info")).permitAll()
            .anyRequest().hasRole("OPS"))
        .httpBasic(Customizer.withDefaults());
    return http.build();
}
```

## Check yourself

<Checkpoint questions={[
  {
    "q": "Which probe should fail while the app is warming up but alive?",
    "options": [
      "Readiness",
      "Liveness",
      "Both",
      "Neither"
    ],
    "answer": 0,
    "why": "Readiness controls traffic. Liveness restarts the container, so it should not depend on downstream systems."
  },
  {
    "q": "Why limit exposed Actuator endpoints?",
    "options": [
      "They slow the CPU",
      "Some endpoints reveal internals such as environment and heap dumps",
      "They are not compatible with Docker",
      "They break JSON"
    ],
    "answer": 1,
    "why": "Expose only health, info and metrics unless secured."
  },
  {
    "q": "What does Micrometer provide?",
    "options": [
      "A database driver",
      "A web server",
      "A vendor-neutral metrics facade (Prometheus, Datadog and more)",
      "A logging format"
    ],
    "answer": 2,
    "why": "Micrometer is to metrics what SLF4J is to logging."
  }
]} />

## Common interview questions

**1. What is Actuator and why use it?**
A starter that exposes operational endpoints (health, metrics, loggers and so on) so platforms and humans can monitor and manage a running app.

**2. How do you create a custom health check?**
Implement `HealthIndicator` (or `ReactiveHealthIndicator`) and return `Health.up()` or `Health.down()`; it is aggregated into `/actuator/health`.

**3. What is the difference between liveness and readiness?**
Liveness answers "should this container be restarted?", readiness answers "should it receive traffic?". Kubernetes probes map to them.

**4. How would you change log levels in production without a restart?**
POST to `/actuator/loggers/{name}` with `{"configuredLevel":"DEBUG"}`, and reset it afterwards.

**5. Why shouldn't you expose all endpoints?**
`env`, `heapdump` and `configprops` can leak secrets and memory contents. Expose the minimum and protect the rest.

## Pitfalls

- `management.endpoints.web.exposure.include=*` on a publicly reachable port.
- Database checks in liveness probes, causing restart storms.
- Unbounded metric tags.
- Slow health indicators that block the probe and cause false failures; give them timeouts.

## Key takeaways

- Actuator = health, metrics, loggers and diagnostics; expose only what you need.
- Use liveness/readiness groups properly with Kubernetes.
- Micrometer is the metrics API; mind tag cardinality.
- Secure or isolate sensitive endpoints.

Next: [REST exception handling](exception-handling.md).
