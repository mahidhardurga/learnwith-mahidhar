---
title: The Twelve-Factor App for Spring Boot and Kubernetes
sidebar_label: "Twelve-factor apps"
description: Each of the twelve factors mapped to concrete Spring Boot, Docker and Kubernetes practices - config, backing services, stateless processes, logs, disposability, dev/prod parity - plus modern additions like observability and API-first design.
keywords: [twelve factor app, 12 factor, cloud native java, stateless services, config in environment, backing services, disposability, logs as event streams, spring boot cloud native, dev prod parity]
sidebar_position: 1
---

# The Twelve-Factor App

The twelve-factor methodology (from Heroku engineers) describes how to build **portable, scalable, cloud-friendly services**. Interviewers use it as a checklist: "is your service cloud-native?" Below, each factor with the Spring Boot / container / Kubernetes translation.

| # | Factor | In one line |
| --- | --- | --- |
| I | Codebase | One codebase tracked in version control, many deploys |
| II | Dependencies | Explicitly declare and isolate dependencies |
| III | Config | Store config in the environment |
| IV | Backing services | Treat backing services as attached resources |
| V | Build, release, run | Strictly separate build and run stages |
| VI | Processes | Execute the app as one or more stateless processes |
| VII | Port binding | Export services via port binding |
| VIII | Concurrency | Scale out via the process model |
| IX | Disposability | Fast startup and graceful shutdown |
| X | Dev/prod parity | Keep development, staging and production similar |
| XI | Logs | Treat logs as event streams |
| XII | Admin processes | Run admin/management tasks as one-off processes |

<Outcomes items={[
  "Name the twelve factors that matter most for Spring Boot services",
  "Keep config in the environment and processes stateless",
  "Run logs, admin tasks and dev/prod parity the cloud way"
]} />

## I. Codebase

One repository per deployable service (or a monorepo with independently built modules); the **same codebase** produces every environment's deployment (dev, staging, prod). Shared code becomes a versioned library, not copy-paste. Anti-pattern: separate forks per environment or customer.

## II. Dependencies

Declare **all** dependencies in the build file (`pom.xml`/`build.gradle`) and never rely on system-wide packages. Boot's dependency management (BOM) pins compatible versions ([Starters](../spring/boot/starters.md)); the fat jar/image bundles everything needed except the JRE. Pin versions, use dependency scanning, and avoid "works because the server happens to have X installed".

## III. Config

**Config that varies between deploys (URLs, credentials, feature flags) lives in the environment**, not in the code or the image. Spring Boot's externalised configuration ([property precedence](../spring/boot/configuration.md)) fits: `SPRING_DATASOURCE_URL`, `--server.port=...`, mounted config trees, Spring Cloud Config. Test: could you open-source the repository right now without leaking credentials? Group config by **environment variables or files per deploy**, not by named environments in code (`if (env == "prod")`), and keep **secrets** in a secret manager. Use `@ConfigurationProperties` records with validation to fail fast on missing config.

## IV. Backing services

Databases, queues, caches, SMTP and third-party APIs are **attached resources** identified by a URL/credentials in config. Swapping a local PostgreSQL for a managed one, or replacing a broker, should need **no code change**. Spring's abstractions (DataSource, `KafkaTemplate`, `RestClient`) and Testcontainers support this. Design for their failure: timeouts, retries, circuit breakers ([Resilience4j](../microservices/resilience/resilience4j.md)).

## V. Build, release, run

Three strictly separate stages:

- **Build**: compile and package an artifact (jar → container image).
- **Release**: combine the build with environment config, yielding an immutable, versioned release.
- **Run**: start the release in the execution environment.

Never patch code on a running server. A fix is a new build → release. This is exactly the [CI/CD](ci-cd.md) principle of building once and promoting. Rollback = run the previous release.

## VI. Processes (stateless, share-nothing)

Processes are **stateless** and share nothing; persistent state lives in backing services. Anything in memory or local disk can vanish at any time (restart, reschedule).

- No sticky sessions or in-JVM session state: use **JWT** ([JWT](../spring/security/jwt.md)) or **Spring Session + Redis**.
- Do not store uploads on local disk: use object storage.
- Local caches are an optimisation only (rebuildable); shared state belongs in a database or distributed cache.
- Scheduled jobs in a scaled service run once per instance: use a distributed scheduler lock (ShedLock) or a Kubernetes CronJob.
- Singleton Spring beans must be stateless anyway ([DI](../spring/core/ioc-and-dependency-injection.md)).

## VII. Port binding

The service is **self-contained** and exports HTTP by binding to a port; it does not depend on an external web server being injected. Boot embeds Tomcat/Netty: `java -jar app.jar` listens on `server.port` (read from the environment, e.g. `PORT`). One service can become another's backing service via its URL.

## VIII. Concurrency

**Scale out** by running more identical processes (horizontal scaling), by workload type (web, workers, schedulers), rather than making one process huge. In Kubernetes: more replicas (HPA), separate Deployments for the API and background consumers. This only works if processes are stateless (VI). Within a process, use thread pools/virtual threads for concurrency, but plan capacity as replicas × per-instance throughput ([Executors](../java/concurrency-jvm/executors.md)). Mind per-instance resource use against shared backing services (connection pool × replicas ≤ database limit).

## IX. Disposability

Processes can be **started or stopped at a moment's notice**: fast startup (seconds), graceful shutdown on SIGTERM, robust against sudden death.

- Startup: avoid heavy work in initialisers; consider CDS/native for faster start ([Docker](docker-for-java.md)); use readiness to gate traffic.
- Shutdown: `server.shutdown=graceful`, finish in-flight requests, stop consuming messages, flush buffers, release locks ([lifecycle](../spring/core/bean-lifecycle-and-scopes.md)); exec-form entrypoint so SIGTERM reaches the JVM.
- **Crash-safety**: jobs must be **idempotent and resumable**; message processing at-least-once with idempotent handlers ([Kafka consumers](../messaging/kafka-consumers-offsets.md)). Use Kubernetes `terminationGracePeriodSeconds` and preStop hooks correctly ([Kubernetes basics](kubernetes-basics.md)).

## X. Dev/prod parity

Minimise gaps in **time** (deploy quickly and often), **people** (developers deploy and operate), and **tools** (same backing services in dev and prod). Do not develop on H2 and run on PostgreSQL: use Docker Compose/Testcontainers with the real engines and the same migrations ([Testcontainers](../spring/boot/testing-slices-testcontainers.md)). Use the same image locally, in staging and in production. Keep profile-specific behaviour minimal ([profiles](../spring/core/configuration-profiles-conditions.md)).

## XI. Logs

The app **does not manage log files**; it writes an unbuffered **event stream to stdout/stderr**, and the platform routes and stores it (Fluent Bit → Loki/Elasticsearch/CloudWatch). Practices: structured JSON logs (Boot 3.4+ built-in structured logging), a correlation/trace id on every line ([Observability](../microservices/observability/observability.md)), log levels per environment via configuration, no secrets or PII, and avoid multi-line stack traces that break aggregation (structured logging handles them as one event).

## XII. Admin processes

One-off administrative tasks (database migrations, data fixes, reports) run as **separate short-lived processes** using the same release, code and config as the app: Kubernetes **Jobs** or `kubectl run`, Flyway as an init container/Job ([schema migrations](../databases/schema-migrations.md)), or a Spring Boot `CommandLineRunner` activated by a profile/argument. Avoid SSH-ing into servers to run scripts and avoid hidden admin endpoints in the main app.

## Beyond the original twelve

Cloud-native practice added more factors (Kevin Hoffman's "Beyond the Twelve-Factor App"):

- **API first**: design the contract (OpenAPI) before the implementation; version it ([Communication](../microservices/communication/service-communication.md)).
- **Telemetry**: metrics, traces, health endpoints as first-class features ([Actuator](../spring/boot/actuator.md), [Observability](../microservices/observability/observability.md)).
- **Authentication and authorisation**: security built in, zero-trust service-to-service ([OAuth2/OIDC](../spring/security/oauth2-oidc.md)).
- **Resilience**: assume dependencies fail; timeouts, bulkheads, circuit breakers.
- **Infrastructure as code** and **declarative delivery** (GitOps).

## A quick self-assessment for a Spring Boot service

| Question | Good answer |
| --- | --- |
| Where do DB credentials come from? | Secret manager/environment at runtime |
| Can you kill any instance at any time? | Yes: no local state, graceful shutdown, idempotent work |
| Can you scale to 10 instances? | Yes: sessions external, schedulers coordinated |
| Is the production image the one tested? | Yes: same immutable artifact |
| Where do logs go? | stdout as structured JSON with trace ids |
| How do you run a migration? | A Job/init step from the same release |
| Does local dev use the same DB engine? | Yes: containers |

## Check yourself

<Checkpoint questions={[
  {
    "q": "Where should environment-specific settings such as database URLs live?",
    "options": [
      "In the environment, not in the code",
      "Hard-coded constants",
      "The jar manifest",
      "A shared mutable static"
    ],
    "answer": 0,
    "why": "The same build runs in every environment with different config."
  },
  {
    "q": "How should a twelve-factor app handle logs?",
    "options": [
      "Rotate files inside the container yourself",
      "Write them to stdout as a stream and let the platform collect them",
      "Email them",
      "Store them in the database"
    ],
    "answer": 1,
    "why": "The platform handles routing and storage."
  },
  {
    "q": "Why keep processes stateless?",
    "options": [
      "To save RAM only",
      "Because HTTP is stateful",
      "So any instance can be started, stopped or replaced and scaled horizontally",
      "To avoid databases"
    ],
    "answer": 2,
    "why": "Persist state in backing services such as databases and caches."
  }
]} />

## Common interview questions

**1. What are the twelve factors? Name five and give a Spring Boot example for each.**
Config (`SPRING_*` env vars), Backing services (DataSource URL swap), Processes (stateless with JWT/Spring Session), Logs (stdout JSON), Disposability (graceful shutdown), also Build/release/run, Dev/prod parity, Port binding (embedded Tomcat).

**2. Why must processes be stateless?**
So any instance can serve any request and be replaced or scaled freely; state is externalised to backing services.

**3. How do you handle configuration across environments?**
Same artifact everywhere; config injected through environment variables, mounted files, config servers and secret managers; never baked into the image.

**4. What is dev/prod parity and how do you achieve it?**
Keeping environments similar in time, people and tools: same images, same backing service types via containers, frequent deployment.

**5. Why log to stdout?**
The execution environment owns log routing and retention; apps stay simple and portable across platforms.

**6. How do you run database migrations in a twelve-factor system?**
As a one-off admin process (Job or init container) from the same release before or during rollout.

**7. How does disposability relate to Kubernetes?**
Pods are ephemeral: fast starts, graceful SIGTERM handling, readiness gating and crash-safe idempotent work are required for rolling updates and autoscaling.

**8. Which twelve-factor principles do sticky sessions violate?**
Stateless processes (VI) and concurrency via scale-out (VIII); externalise session state.

## Pitfalls

- Environment-specific config files baked into images.
- In-memory sessions or local file storage.
- Different database engines in dev and prod.
- File-based logging inside containers without rotation or shipping.
- Hot-patching running containers.
- Cron-in-the-app running on every replica.

## Key takeaways

- Same immutable build everywhere; configuration comes from the environment.
- Stateless, disposable processes that scale horizontally.
- Backing services are swappable resources; logs are streams; admin tasks are one-off jobs.
- Add observability, security and API-first design to complete the picture.

Next: [Deployment strategies](deployment-strategies.md).
