---
title: "DevOps interview questions"
sidebar_label: "DevOps"
description: "Docker, Kubernetes and delivery pipelines for Java services."
---

# DevOps

Docker, Kubernetes and delivery pipelines for Java services. Answer each question in two parts: a clear definition first, then a tiny example or why it matters.

**68. Liveness vs readiness probes in Kubernetes?**
Liveness restarts a broken container; readiness gates traffic. Keep dependencies out of liveness. ([Kubernetes](../../devops/kubernetes-basics.md))

**69. How do you containerise a Spring Boot app well?**
Multi-stage build, layered jar, non-root user, `MaxRAMPercentage`, exec-form entrypoint for graceful shutdown. ([Docker](../../devops/docker-for-java.md))

**70. What is CI/CD and what does your pipeline do?**
Automated build, tests, scanning, image build and deployment; build once, promote the same artifact, with rollback. ([CI/CD](../../devops/ci-cd.md))
