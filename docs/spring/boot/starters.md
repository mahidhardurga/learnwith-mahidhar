---
title: Spring Boot Starters and Dependency Management
sidebar_label: "Starters and dependency management"
description: What starters are, how the Boot BOM controls versions, and how to override or exclude dependencies safely.
keywords: [spring boot starters, spring-boot-starter-parent, dependency management, BOM, exclude dependency]
sidebar_position: 2
---

# Starters and Dependency Management

A **starter** is a dependency descriptor with no code of its own. Adding `spring-boot-starter-web` pulls in Spring MVC, Jackson, validation hooks, an embedded Tomcat and logging, all at versions known to work together.

<Outcomes items={[
  "Explain what a starter is versus the dependency BOM",
  "Override a managed version safely",
  "Exclude a transitive dependency"
]} />

## Two separate ideas

1. **Starters** bundle the right libraries for a purpose.
2. **Dependency management** (the Boot BOM) fixes the *version* of each library so you rarely write one.

Starters decide *what* is on the classpath; auto-configuration then looks at the classpath and decides *what beans to create*. That is the link between them: add `spring-boot-starter-data-jpa` and a `DataSource`, `EntityManagerFactory` and transaction manager appear.

## Getting the BOM

Option A: inherit from the parent POM.

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.5.6</version>
</parent>
```

The parent also configures Java version defaults, UTF-8, resource filtering and the repackage plugin.

Option B: import the BOM when you already have a corporate parent.

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>3.5.6</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

## Frequently used starters

| Starter | Gives you |
| --- | --- |
| `spring-boot-starter-web` | Spring MVC, Jackson, embedded Tomcat |
| `spring-boot-starter-webflux` | Reactive stack on Netty |
| `spring-boot-starter-data-jpa` | Hibernate, Spring Data JPA, HikariCP |
| `spring-boot-starter-validation` | Jakarta Bean Validation (Hibernate Validator) |
| `spring-boot-starter-security` | Spring Security |
| `spring-boot-starter-actuator` | Production endpoints and metrics |
| `spring-boot-starter-test` | JUnit 5, Mockito, AssertJ, Spring Test |

## Overriding a managed version

When a CVE fix is out and Boot has not bumped it yet, override the property the BOM uses:

```xml
<properties>
    <jackson-bom.version>2.18.2</jackson-bom.version>
</properties>
```

(Check the property name in `spring-boot-dependencies` for your Boot version.) Prefer waiting for a Boot patch release when possible: Boot tests its own combinations.

## Excluding a transitive dependency

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
        </exclusion>
    </exclusions>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jetty</artifactId>
</dependency>
```

Inspect what you actually have with:

```bash
mvn dependency:tree -Dincludes=org.apache.tomcat.embed
```

## Check yourself

<Checkpoint questions={[
  {
    "q": "What is a starter?",
    "options": [
      "A curated dependency descriptor that pulls in the libraries for a feature",
      "A main class generator",
      "A plugin that starts the server",
      "A Spring annotation"
    ],
    "answer": 0,
    "why": "For example spring-boot-starter-web brings Spring MVC, Jackson and Tomcat."
  },
  {
    "q": "What does the Boot BOM (spring-boot-dependencies) provide?",
    "options": [
      "A runtime container",
      "Tested, compatible versions for many libraries",
      "Code generation",
      "A GUI"
    ],
    "answer": 1,
    "why": "You can omit version numbers for managed dependencies."
  },
  {
    "q": "How do you override a managed version in Maven?",
    "options": [
      "Delete the BOM",
      "Rename the jar",
      "Set the version property that the BOM exposes, for example in properties",
      "Use reflection"
    ],
    "answer": 2,
    "why": "Property overrides keep the rest of the BOM aligned. Use sparingly."
  }
]} />

## Common interview questions

**1. What is a starter?**
A convenience dependency that transitively brings everything for one capability. It contains no logic; auto-configuration in the Boot jars reacts to what it puts on the classpath.

**2. Why do you not specify versions for most dependencies?**
The Boot parent (or imported BOM) has a `dependencyManagement` section pinning compatible versions of hundreds of libraries.

**3. What is the difference between the parent POM and importing the BOM?**
The parent also sets plugin configuration and build defaults. Importing the BOM only provides version management, which is what you need when you cannot change your parent.

**4. How do you resolve a version conflict with a transitive dependency?**
Check `mvn dependency:tree`, then either override the BOM property, add an explicit `dependencyManagement` entry, or exclude the offender.

## Pitfalls

- Pinning a version of a managed library "just in case"; it silently drifts from what Boot tested.
- Mixing two Spring Boot versions through different starters.
- Both `starter-web` and `starter-webflux` present: Boot chooses the servlet stack and WebFlux's `WebClient` runs, but your app is not reactive end to end.

## Key takeaways

- Starters bundle libraries; the BOM pins their versions.
- Auto-configuration reads the classpath that starters build.
- Override via properties or `dependencyManagement`, exclude via `<exclusions>`, and verify with `dependency:tree`.

Next: [Externalized configuration](configuration.md).
