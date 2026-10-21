---
title: "REST, JPA and SQL interview questions"
sidebar_label: "REST, JPA and SQL"
description: "REST API design, JPA basics and everyday SQL."
---

# REST, JPA and SQL

REST API design, JPA basics and everyday SQL. Answer each question in two parts: a clear definition first, then a tiny example or why it matters.

**32. HTTP methods and status codes; what is idempotent?**
GET (read), POST (create), PUT (replace), PATCH (partial update), DELETE. Idempotent methods (GET, PUT, DELETE) give the same result when repeated. Common codes: 200, 201, 204, 400, 401, 403, 404, 409, 500.

**33. `@Controller` vs `@RestController`; `@PathVariable` vs `@RequestParam` vs `@RequestBody`?**
`@RestController` = `@Controller` + `@ResponseBody` (returns data, not views). `@PathVariable` reads `/users/{id}`, `@RequestParam` reads `?page=2`, `@RequestBody` binds the JSON body to an object.

**34. What are JPA, Hibernate and Spring Data JPA?**
JPA is the persistence specification, Hibernate an implementation, Spring Data JPA generates repositories on top (`interface UserRepository extends JpaRepository<User, Long>`). ([JPA basics](../../spring/data/jpa-basics.md))

**35. SQL joins, primary vs foreign key, and ACID?**
`INNER JOIN` returns matches; `LEFT JOIN` keeps all left rows. A primary key uniquely identifies a row; a foreign key references another table's key. ACID: atomicity, consistency, isolation, durability. ([SQL patterns](../../databases/sql-patterns.md), [ACID](../../databases/acid-isolation-mvcc.md))
