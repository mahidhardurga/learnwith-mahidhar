---
title: "Security interview questions"
sidebar_label: "Security"
description: "Authentication, authorization, tokens and common vulnerabilities."
---

# Security

Authentication, authorization, tokens and common vulnerabilities. Answer each question in two parts: a clear definition first, then a tiny example or why it matters.

**91. How do you design authentication and authorisation across microservices?**
Central IdP with OIDC/OAuth2, Authorization Code + PKCE for users, client credentials or token exchange for services, JWT validation (issuer, audience, expiry) at every service, scopes for clients plus roles/permissions, object-level checks in services, mTLS or mesh for transport identity. ([OAuth2/OIDC](../../spring/security/oauth2-oidc.md))

**92. How do you prevent IDOR/broken access control?**
Enforce ownership on every data access (scoped queries, `@PostAuthorize`), deny by default, test with another user's identifiers, and return 404 for foreign resources. ([Method security](../../spring/security/method-security.md))

**93. How do you manage secrets and supply-chain risk?**
Secret manager with short-lived credentials and rotation, no secrets in images or repos, SBOMs, dependency and image scanning, pinned and signed artifacts, least-privilege pipelines. ([Vulnerabilities](../../spring/security/common-vulnerabilities.md), [CI/CD](../../devops/ci-cd.md))

**94. How would you design multi-tenancy?**
Choose isolation by compliance and scale: database per tenant, schema per tenant, or shared tables with `tenant_id` enforced centrally (and row-level security as a backstop); tenant-aware caching, rate limits and observability. ([Relational design](../../databases/relational-design.md))
