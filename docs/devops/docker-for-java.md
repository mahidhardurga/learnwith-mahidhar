---
title: Docker for Java Applications - Layered Images, JVM in Containers and Hardening
sidebar_label: "Docker for Java"
description: Build small, secure, fast-to-rebuild Docker images for Spring Boot with multi-stage builds and layered jars, buildpacks or Jib, run as non-root, size the JVM for containers, handle signals for graceful shutdown and scan images.
keywords: [docker spring boot, multi-stage dockerfile, layered jar, jib, buildpacks, jvm container memory, non-root container, docker graceful shutdown, distroless, docker best practices java]
sidebar_position: 2
hide_table_of_contents: true
---

# Docker for Java Applications

<Outcomes items={[
  "Write a layered, multi-stage Dockerfile for Spring Boot",
  "Configure the JVM for container memory",
  "Handle signals for graceful shutdown"
]} />

## Layers and caching

Each Dockerfile instruction creates a layer; unchanged layers are reused from cache, **provided nothing above them changed**. A Spring Boot fat jar is ~60 MB where dependencies change rarely and your code changes constantly; copying the whole jar as one layer re-uploads 60 MB on every commit.

**Layered jars** split the jar by change frequency:

```dockerfile
# ---- extract layers
FROM eclipse-temurin:21-jre-alpine AS extract
WORKDIR /build
COPY target/app.jar app.jar
RUN java -Djarmode=tools -jar app.jar extract --layers --launcher --destination extracted

# ---- runtime image
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S app && adduser -S app -G app
USER app
WORKDIR /app
COPY --from=extract /build/extracted/dependencies/ ./
COPY --from=extract /build/extracted/spring-boot-loader/ ./
COPY --from=extract /build/extracted/snapshot-dependencies/ ./
# application code last: it changes most often
COPY --from=extract /build/extracted/application/ ./
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

I built exactly this image for a test application: the layers were 58 MB for dependencies but only **238 kB for the application layer**, so a code-only change re-pushes a few hundred kilobytes. Order layers from least to most frequently changing.

### Multi-stage builds

Compile in a stage with the JDK and Maven/Gradle; copy only the artifact into a minimal runtime stage (JRE only, no build tools, no source). This keeps images small and free of compilers and credentials.

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B dependency:go-offline     # cache dependencies as a layer
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B package -DskipTests
```

### Alternatives to hand-written Dockerfiles

| Tool | Notes |
| --- | --- |
| **Spring Boot buildpacks** (`mvn spring-boot:build-image`) | Cloud Native Buildpacks: layered image, memory calculator, non-root, SBOM; no Dockerfile |
| **Jib** (Maven/Gradle plugin) | Builds layered images **without a Docker daemon**, reproducible, pushes straight to a registry: great for CI |
| Dockerfile | Maximum control; you maintain base image choices and hardening |

Whichever you choose, standardise it across services.

## Choosing a base image

| Base | Pros | Cons |
| --- | --- | --- |
| `eclipse-temurin:21-jre` (Debian/Ubuntu, glibc) | Broad compatibility, easy debugging | Larger |
| `...-jre-alpine` (musl libc) | Small | musl differences: some native libraries (DNS resolver behaviours, glibc-only JNI, Netty/native codecs) can misbehave; test properly |
| **Distroless** (`gcr.io/distroless/java21`) | Minimal, no shell or package manager: smaller attack surface | Hard to debug (use ephemeral debug containers) |
| Chainguard / Red Hat UBI | Hardened, regularly patched | Vendor-specific |

Use a **JRE** (or a custom `jlink` runtime) in the runtime stage, pin a specific version/digest rather than `latest`, and rebuild regularly to pick up security patches.

## JVM in containers

Containers limit CPU and memory with cgroups, and a modern JVM reads those limits.

- **Memory**: use `-XX:MaxRAMPercentage=75` (or 70) rather than a fixed `-Xmx`, so the heap scales with the container limit. Leave headroom: metaspace, thread stacks, direct buffers, code cache and the JVM itself live **outside** the heap, and exceeding the container limit gets the process **OOM-killed** (exit 137) with no Java stack trace. In my test a 512 MiB limit with `MaxRAMPercentage=75` produced a 384 MiB maximum heap.
- **CPU**: the JVM sizes thread pools and picks the GC from the visible CPU count. A limit below 2 CPUs makes it choose the **Serial GC** and a single-CPU sizing; use `-XX:ActiveProcessorCount` or set limits deliberately. CPU **limits** cause throttling (latency spikes) while **requests** only affect scheduling; many teams set requests without CPU limits.
- `-XX:+ExitOnOutOfMemoryError` makes a poisoned JVM exit so the orchestrator restarts it, instead of limping along.
- See [JVM tuning](../java/concurrency-jvm/jvm-tuning-diagnostics.md) and [GC](../java/concurrency-jvm/garbage-collection.md).
- Faster startup: Class Data Sharing / AppCDS, CRaC checkpoints, or GraalVM native image (trading peak performance and build time).

## Signals and graceful shutdown

`docker stop` / Kubernetes send **SIGTERM** to **PID 1** in the container, then SIGKILL after the grace period. Use the **exec form** of `ENTRYPOINT ["java", ...]`: the JVM is PID 1 and receives the signal. The shell form (`ENTRYPOINT java ...`) wraps the command in `sh -c`, which does **not** forward signals, so the JVM is killed without a graceful shutdown.

In my test, stopping the container logged "Commencing graceful shutdown. Waiting for active requests to complete" and the JVM exited with code **143** (128 + SIGTERM), which is normal for a signal-terminated JVM. Combine with `server.shutdown=graceful` and `spring.lifecycle.timeout-per-shutdown-phase` (see [Bean lifecycle](../spring/core/bean-lifecycle-and-scopes.md)) and Kubernetes termination settings ([Kubernetes basics](kubernetes-basics.md)). If you use scripts as entrypoints, `exec java ...` at the end, or use `tini`/`--init` as a minimal init process.

## Security hardening checklist

- **Run as a non-root user** (`USER app`; verified: `whoami` printed `app`). Use a read-only root filesystem where possible and drop capabilities.
- Minimal base, no build tools, no shells in production images if feasible.
- **No secrets in images or build args** (they remain in layer history). Inject at runtime via environment, mounted secrets or a secret manager.
- `.dockerignore` excludes `.git`, `target/`, local config and credentials.
- **Scan images** in CI (Trivy, Grype, Docker Scout) and fail on critical vulnerabilities; generate an **SBOM**; sign images (cosign) and verify at deploy.
- Pin base images by version or digest; rebuild on a schedule.
- Expose only necessary ports; set `HEALTHCHECK` for plain Docker/Compose (Kubernetes uses probes instead).

## Docker Compose for local development

```yaml
services:
  app:
    build: .
    ports: ["8080:8080"]
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/shop
      SPRING_DATASOURCE_USERNAME: shop
      SPRING_DATASOURCE_PASSWORD_FILE: /run/secrets/db_password
    depends_on:
      db: { condition: service_healthy }
  db:
    image: postgres:16-alpine
    environment: { POSTGRES_DB: shop, POSTGRES_USER: shop, POSTGRES_PASSWORD: dev-only }
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U shop"], interval: 5s, retries: 10 }
```

Spring Boot 3.1+ also supports **Docker Compose integration** (`spring-boot-docker-compose`): it starts services from `compose.yaml` during development and wires connection details automatically, and **Testcontainers** `@ServiceConnection` does the same for tests (see [Testcontainers](../spring/boot/testing-slices-testcontainers.md)).

## Image size and startup tips

- Do not bundle dev tools or documentation; use `.dockerignore`.
- Share base layers across services so nodes cache them.
- Consider `jlink` custom runtimes (`jdeps` to find modules) for the smallest JRE.
- Measure startup (`spring.main.lazy-initialization` with care, CDS, native image) because slow starts stretch rolling deployments and autoscaling response.

## Check yourself

<Checkpoint questions={[
  {
    "q": "Why copy dependencies before application classes in a Dockerfile?",
    "options": [
      "Unchanged layers are cached, so rebuilds are fast",
      "It makes the jar smaller",
      "It is required by Java",
      "It encrypts the image"
    ],
    "answer": 0,
    "why": "Layer order should put rarely changing content first."
  },
  {
    "q": "Which JVM option sizes the heap relative to container memory?",
    "options": [
      "-Xdebug",
      "-XX:MaxRAMPercentage",
      "-XX:+UseTLAB only",
      "-verbose:class"
    ],
    "answer": 1,
    "why": "Modern JVMs are container-aware; leave headroom for off-heap memory."
  },
  {
    "q": "Why use the exec form of ENTRYPOINT (JSON array)?",
    "options": [
      "It makes the image smaller",
      "It is faster to start",
      "The Java process receives SIGTERM directly and can shut down gracefully",
      "Shell form is not allowed"
    ],
    "answer": 2,
    "why": "Shell form wraps the process in sh, which may swallow signals."
  }
]} />

## Common interview questions

**1. Why layered jars and multi-stage builds?**
Layered jars separate rarely-changing dependencies from frequently-changing application code so image rebuilds and pushes are tiny; multi-stage builds keep build tools and sources out of the runtime image.

**2. How does the JVM behave inside a container?**
It reads cgroup limits to size the heap (`MaxRAMPercentage`) and CPU count (which affects GC choice and pool sizes); off-heap memory still counts against the limit, so leave headroom to avoid OOM kills.

**3. Why is the exec form of `ENTRYPOINT` important?**
It makes the JVM PID 1 so it receives SIGTERM and can shut down gracefully; the shell form interposes `sh` that does not forward signals.

**4. What does exit code 137 vs 143 mean?**
137 = killed by SIGKILL (often the OOM killer or grace period expired); 143 = terminated by SIGTERM.

**5. How do you keep secrets out of images?**
Never copy or pass them as build args; inject at runtime through environment variables, mounted secrets or a vault, and rotate them.

**6. Alpine vs Debian vs distroless for Java?**
Alpine is small but uses musl (compatibility risks); Debian/Ubuntu images are the safe default; distroless minimises attack surface but is harder to debug.

**7. How do you reduce image build time in CI?**
Cache dependency downloads, order Dockerfile layers by change frequency, use BuildKit cache mounts, or Jib/buildpacks that layer intelligently and avoid the Docker daemon.

**8. How would you harden a production image?**
Non-root user, minimal base, no secrets, pinned versions, vulnerability scanning and SBOM in CI, image signing, read-only filesystem.

## Pitfalls

- `latest` tags and unpinned bases.
- Shell-form entrypoints (no graceful shutdown).
- `-Xmx` equal to the container limit (OOM kills) or ignoring fractional CPU limits.
- Secrets baked into layers; running as root.
- Single-layer fat jar copies that bust cache on every build.
- Using Alpine without testing native-library behaviour.

## Key takeaways

- Layer by change frequency; multi-stage for small runtime images.
- Size the JVM from the container limit and keep off-heap headroom.
- Exec-form entrypoint, non-root, no secrets, scan and sign images.
- Standardise on one build approach (Dockerfile, buildpacks or Jib).

Next: [Kubernetes basics](kubernetes-basics.md).
