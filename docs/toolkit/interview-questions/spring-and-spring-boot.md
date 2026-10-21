---
title: "Spring and Spring Boot interview questions"
sidebar_label: "Spring and Spring Boot"
description: "Spring and Spring Boot basics: dependency injection, beans, configuration and auto-configuration."
---

# Spring and Spring Boot

Spring and Spring Boot basics: dependency injection, beans, configuration and auto-configuration. Answer each question in two parts: a clear definition first, then a tiny example or why it matters.

**25. What are IoC and Dependency Injection?**
IoC means the framework controls object creation and wiring; DI is how: the container injects an object's dependencies (constructor, setter, field) instead of the object creating them. ([IoC/DI](../../spring/core/ioc-and-dependency-injection.md))

**26. `@Component`, `@Service`, `@Repository`, `@Controller`?**
All register a bean through component scanning. `@Service` marks business logic, `@Repository` the persistence layer (adds exception translation), `@Controller`/`@RestController` web handlers.

**27. What does `@Autowired` do, and why prefer constructor injection?**
It asks Spring to inject a dependency. Constructor injection makes dependencies required and final, simplifies unit testing, and exposes circular dependencies early.

**28. What are bean scopes?**
`singleton` (default, one per container), `prototype` (new each time), and web scopes `request`, `session`, `application`. ([Lifecycle and scopes](../../spring/core/bean-lifecycle-and-scopes.md))

**29. Spring vs Spring Boot?**
Spring is the framework (IoC, AOP, MVC, data access). Spring Boot adds starters, auto-configuration, an embedded server, Actuator and externalised configuration so you can run an app with `java -jar`. ([Boot overview](../../spring/boot/overview.md))

**30. What does `@SpringBootApplication` do?**
It combines `@SpringBootConfiguration`, `@EnableAutoConfiguration` and `@ComponentScan` on the main class.

**31. How do you configure a Spring Boot application?**
`application.properties`/`application.yml`, environment variables, command-line arguments, profiles (`application-dev.yml`) and `@ConfigurationProperties`. ([Configuration](../../spring/boot/configuration.md))
