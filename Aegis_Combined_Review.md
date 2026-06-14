# Aegis Implementation Plan — Combined Engineering Review (v1 + v2)

> **Reviewed by:** Senior Software Engineer (6+ years)
> **Plan Versions Reviewed:** v1 (May 2026, file:1) and v2 (June 2026, file:2)
> **Project:** Aegis — Microservices-based Authentication & Zero Trust Security Platform
> **Tech Stack:** NestJS · PostgreSQL · Redis · Prisma · Next.js 14 · BullMQ · Upstash · Nx Monorepo

---

## Executive Summary

Aegis is a personal learning project simulating a production-grade, microservices-based authentication and Zero Trust security platform modeled after fintech/banking systems. The scope covers six backend microservices (IAM, Notification, User, File Storage, Audit, Role & Permission), an API Gateway, and a Next.js frontend organized as an Nx monorepo. Between v1 and v2, two major milestones were achieved — the Notification Service reached completion with BullMQ + Upstash Redis, and the frontend architecture was significantly upgraded to a proper Next.js hybrid model. This review documents the full arc: what was planned, what improved, what remains risky, and what must be resolved before the project reaches a defensible state.

---

## 1. Plan Objectives & Scope

### Core Goals

- Build microservices with clear service boundaries (not a monolith)
- Implement Zero Trust security: never trust, always verify
- Follow production-ready patterns used in actual fintech companies
- Demonstrate enterprise-level security: fraud detection, device tracking, and compliance-ready audit trails

### Service Inventory

| Service                 | Status (v1)    | Status (v2)    | Port |
| ----------------------- | -------------- | -------------- | ---- |
| API Gateway             | ✅ Complete    | ✅ Complete    | 8080 |
| IAM Service             | ✅ Complete    | ✅ Complete    | 6000 |
| Notification Service    | ⏳ Not Started | ✅ Complete    | 6001 |
| `@aegis/events` Package | ❌ Not Present | ✅ Complete    | —    |
| User Service            | ⏳ Not Started | ⏳ Not Started | 6002 |
| File Storage Service    | ⏳ Not Started | ⏳ Not Started | 6003 |
| Audit Service           | ⏳ Not Started | ⏳ Not Started | 6004 |
| Role & Permission Svc   | ⏳ Not Started | ⏳ Not Started | 6005 |
| Frontend (Next.js)      | 🚀 Starting    | 🚀 Starting    | 3000 |

### Two-Layer Authentication Model

| Layer   | Direction            | Token Type   | Lifetime | Audience         |
| ------- | -------------------- | ------------ | -------- | ---------------- |
| Layer 1 | Client → API Gateway | Access JWT   | 15 min   | `aegis-client`   |
| Layer 1 | Client → API Gateway | Refresh JWT  | 7 days   | `aegis-client`   |
| Layer 2 | Gateway → Services   | Internal JWT | 15 min   | `aegis-internal` |

The API Gateway transforms the client-facing token into an internal token before forwarding requests to microservices. Services only accept requests with a valid internal token and are never directly exposed to the internet.

---

## 2. v1 → v2 Delta: What Changed

### Notification Service — From Stub to Complete

The most significant change between v1 and v2 is the full completion of the Notification Service. In v1, all password reset and email verification flows were stubs (`console.log()` placeholders). In v2:

- **BullMQ + Upstash Redis** replaces the planned generic Redis Pub/Sub — a more production-appropriate choice for reliable job processing with retries.
- **React-Email templates** are implemented for Welcome, EmailVerification, PasswordReset, and Password Change Confirmation flows.
- **Idempotency** is enforced using BullMQ `job.id` to prevent duplicate email dispatch on worker retries.
- **PostgreSQL audit trail** tracks all sent notification records for compliance visibility.
- **Strict email verification gate** is enforced — users cannot log in until email is verified.
- **The synchronous HTTP endpoint ambiguity is resolved** — the `POST /notifications/email` direct endpoint from v1 is removed; `GET /health` is the only HTTP surface. All notifications flow exclusively through the event bus.
- **`@aegis/events` shared package** (`NotificationEvent` enums + `enqueueNotification` helper) is introduced as the canonical event publishing interface.

### Frontend Architecture — From Basic SPA to Hybrid Next.js

In v1, the frontend was a straightforward Axios + Zustand SPA with client-side token attachment. In v2:

- **Edge Middleware** (`src/middleware.ts`) handles route protection before pages render, eliminating the client-side redirect flash.
- **Server Component layouts** (`(protected)/layout.tsx`) fetch user data server-side and hydrate Zustand state, removing the initial loading spinner caused by client-side auth checks.
- **Route groups** are restructured into `(auth)`, `(protected)`, and `(admin)` with shared layout wrappers — DRY, cleaner, and semantically correct.
- **A new `/verify` route** is added to handle the strict email verification flow.

### Sprint Roadmap Update

- Sprint 2 (Notification Service) moved from "Week 4–5" to "Week 4" and is marked complete.
- Frontend Phase 1 is now actively in progress.
- All remaining sprints (3–6) and deployment are unchanged.

---

## 3. Issues Resolved Between v1 and v2

| v1 Flag                                                       | Resolution in v2                                       |
| ------------------------------------------------------------- | ------------------------------------------------------ |
| Notification Service sync/async ambiguity (HTTP vs event bus) | ✅ HTTP endpoint removed; event-only path enforced     |
| Email delivery stubbed as `console.log()`                     | ✅ Resend + React-Email templates live                 |
| No email verification enforcement                             | ✅ Strict gate added — login blocked until verified    |
| Frontend lacked server-side route protection                  | ✅ Edge Middleware added                               |
| Zustand hydration causing loading spinners                    | ✅ Server Component hydrates state before first render |
| No idempotency on email delivery retries                      | ✅ BullMQ `job.id` based idempotency implemented       |

---

## 4. Flaws & Risk Factors

### 4.1 Critical Security Risks

**Shared `INTERNAL_JWT_SECRET` (Severity: Critical — Unchanged Across Both Versions)**

The API Gateway and IAM Service share a single `INTERNAL_JWT_SECRET`. This secret is documented explicitly in the environment configuration section. If this secret leaks, an attacker can forge any internal service call and impersonate the Gateway to any downstream microservice. As more services (User, Audit, Role) come online and depend on this same secret, the blast radius grows. True Zero Trust mandates per-service signing keys or mutual TLS (mTLS) between services. This is the single highest-severity unmitigated risk in the entire plan and was not addressed in v2.

**No Cookie Security Flags Documented**

The API client uses `withCredentials: true` to send the refresh token cookie. However, the plan documents no server-side cookie configuration. Without `HttpOnly`, `Secure`, and `SameSite=Strict` flags explicitly set on the cookie in the IAM Service response, the refresh token is potentially vulnerable to XSS (if `HttpOnly` is missing) and CSRF (if `SameSite` is missing). For an authentication platform, this is a P0 item.

**Redis as a Shared Trust Boundary (v1 — Partially Mitigated in v2)**

In v1, all services shared a single Redis instance with no namespace isolation. In v2, the Notification Service migrates to Upstash Redis, which partially addresses this. However, IAM's session tokens, brute-force counters, and RBAC caches remain on the local Redis container. A compromise of that Redis instance still exposes the most sensitive data in the system. No Redis ACL configuration or key-prefix namespacing strategy is documented.

**No Secret Management Strategy**

JWT secrets and API keys are stored in per-service `.env` files. No secrets manager (HashiCorp Vault, Docker secrets, AWS Secrets Manager, or even `.env.vault`) is mentioned. For a portfolio project claiming banking-grade security posture, this is a governance contradiction — and it actively models bad practice.

### 4.2 New Risks Introduced in v2

**Upstash Redis / Local Redis Split — Infrastructure Inconsistency**

The Notification Service uses Upstash Redis (HTTP-based, managed) while IAM continues using a local Redis 7 Alpine container via TCP. The Docker Compose file still defines `redis: image: redis:7-alpine`. This creates two Redis instances with fundamentally different connection models, different authentication mechanisms, and different failure modes. The plan provides no clarity on which services use which Redis instance going forward, particularly for the Role & Permission Service that plans Redis-cached RBAC — this decision must be made before Sprint 3 begins.

**`@aegis/events` Package — Version Drift Risk**

The shared `@aegis/events` package creates an implicit API contract between IAM (producer) and the Notification Service (consumer). There is no versioning strategy, CHANGELOG, or breaking-change policy documented for this package. In an Nx monorepo, a silent change to `enqueueNotification`'s signature will cause a TypeScript compile error at best, or a runtime queue message format mismatch at worst if the consumer is not updated in sync.

**Email Verification Gate — Missing Recovery UX**

The strict email verification gate is a strong security addition, but the plan documents no recovery path for: (a) resending a verification email after expiry, (b) correcting a typo in the registered email address, or (c) silent delivery failure from Resend (e.g., email classified as spam). A user who registers with a typo has no documented self-service recovery path and is permanently locked out.

**`/verify` Page — No Implementation Spec**

A `/verify` route appears in the updated frontend page structure but has no Zod schema, no API call pattern, no error state design, and no documented token extraction logic (the verification token presumably arrives as a URL query parameter). This is a functional gap on a page that handles a critical security action — it is currently undefined implementation.

### 4.3 Persistent Risks (Unresolved from v1)

**Single PostgreSQL Container Violates Database-per-Service**

Despite the plan explicitly declaring "Database-per-Service," the Docker Compose configuration shows a single shared `postgres: image: postgres:16` container serving all services. This means a database crash takes all services offline simultaneously, and schema migrations across services become entangled. The logical isolation claimed in the architecture table is not enforced at the infrastructure level.

**Deployment Deferred to Week 14–15**

Docker and CI/CD remain last-mile work items. In a microservices architecture, deferring containerization means integration bugs accumulate for 13 weeks and surface only at the final sprint. Running services locally without Docker from day one creates a false confidence about inter-service behavior, network resolution, and `depends_on` ordering.

**No Distributed Tracing or Structured Logging**

There is no mention of OpenTelemetry, correlation IDs, Jaeger, Zipkin, or even structured JSON logging across services in either version of the plan. In a 6-service architecture, debugging a single failing request without a trace ID across service boundaries is practically infeasible. This gap also makes the Audit Service — which is supposed to provide "compliance-ready audit trails" — unable to correlate events across the system.

**No Testing Strategy**

Neither version of the plan includes a dedicated testing section. There are no unit test coverage targets per service, no integration test framework (Supertest + Jest), no end-to-end test tooling (Playwright), and no contract testing between services (e.g., Pact) to detect API drift. The CI/CD section mentions "integration tests before merging" but defines no actual test infrastructure.

**Fraud Detection — Listed Objective, Zero Implementation**

Fraud detection is listed as a core objective in the Project Overview of both v1 and v2. No sprint, no data model, no API endpoint, and no algorithm is planned for it anywhere in the document. It is a stated goal with no path to delivery.

**Tamper-Evident Audit Log — Compliance Theater**

The Audit Service (Sprint 5) claims "tamper-evident log storage" as a planned feature in both versions. No technical mechanism is defined — no append-only storage, no cryptographic chaining (e.g., HMAC chain or hash linking between log records), and no write-once policy. As-is, this is a label without implementation substance.

**Tailwind CSS v4 + Shadcn UI Compatibility**

Tailwind CSS v4 introduces significant breaking changes from v3. Shadcn UI's component library was authored against v3 defaults. The plan lists both without any migration notes, compatibility verification, or acknowledged incompatibility. This will likely cause styling regressions the moment Shadcn components are initialized.

---

## 5. Gaps in Requirements, Testing, Deployment & Governance

### Requirements Gaps

- **No SLA or uptime target** is defined despite the "banking-level" framing
- **GDPR account deletion cascade** is mentioned for User Service (soft delete) but there is no cross-service deletion plan covering IAM sessions, Audit event logs, File Storage objects, and Notification history
- **No defined token expiry policy** for the email verification token — unknown TTL, unknown cleanup strategy for unverified accounts
- **API versioning is absent** — all endpoints are defined without a `/v1/` prefix; any breaking change after the frontend consumes them has no safe rollback path

### Testing Gaps

- No unit test framework or coverage targets per service
- No integration test setup (Supertest + Jest against real services in Docker)
- No end-to-end test framework for the frontend (Playwright or Cypress)
- No contract testing between services to catch producer/consumer API drift
- No performance or load test plan for auth token issuance, Redis session operations, or BullMQ queue saturation

### Deployment Gaps

- Docker health checks (`healthcheck:` blocks) are absent from all services in Compose — `depends_on` only waits for container start, not service readiness
- CI/CD pipeline is a future bullet point with no tooling decision, no workflow file, and no defined stages
- No cost estimate or resource limit analysis for Railway/Render free-tier hosting of a 6-service system
- No rollback or blue-green deployment strategy

### Governance Gaps

- No branching strategy (Gitflow, trunk-based, or otherwise)
- No PR review process or code ownership defined
- No `.env.example` files or secret rotation procedure documented
- IAM Service "Known Limitations" section still lists email delivery as broken (console.log stubs) even though Sprint 2 is complete in v2 — a documentation inconsistency that could mislead future contributors

---

## 6. Prioritized Recommendations

### P0 — Do Before Writing Another Line of Code

| Action                                                                                   | Owner     | Estimate        |
| ---------------------------------------------------------------------------------------- | --------- | --------------- |
| Add `HttpOnly`, `Secure`, `SameSite=Strict` to refresh token cookie in IAM               | Backend   | 1 hour          |
| Decide: Upstash Redis for all services, or local Redis for IAM + Upstash for BullMQ only | Architect | 30 min decision |
| Update IAM "Known Limitations" section to reflect Sprint 2 completion                    | Author    | 15 min          |

### P1 — This Sprint (Frontend Phase 1)

| Action                                                                                     | Owner    | Estimate |
| ------------------------------------------------------------------------------------------ | -------- | -------- |
| Design `/verify` page fully: Zod schema, token extraction from URL, API call, error states | Frontend | 2 hours  |
| Add resend-verification endpoint and link it to the verify page error state                | Backend  | 3 hours  |
| Document `@aegis/events` API contract with a CHANGELOG in `shared-types/`                  | Backend  | 1 hour   |
| Add Redis key-prefix namespacing per service (e.g., `iam:`, `session:`, `rbac:`)           | Backend  | 2 hours  |

### P2 — Before Sprint 3 (User Service)

| Action                                                                                  | Owner     | Estimate |
| --------------------------------------------------------------------------------------- | --------- | -------- |
| Rotate to per-service internal JWT signing keys or document mTLS plan                   | Architect | 4 hours  |
| Add API versioning prefix `/v1/` to all routes before User Service frontend consumption | Backend   | 2 hours  |
| Add Docker `healthcheck:` blocks and `condition: service_healthy` to all `depends_on`   | DevOps    | 2 hours  |
| Split PostgreSQL into per-service databases in Compose (`POSTGRES_DB` per container)    | DevOps    | 1 hour   |

### P3 — Sprint 5 Onward (Audit Service)

| Action                                                                                | Owner     | Estimate         |
| ------------------------------------------------------------------------------------- | --------- | ---------------- |
| Introduce OpenTelemetry instrumentation starting with the Audit Service               | Backend   | 1 day            |
| Define tamper-evident mechanism: append-only table + HMAC chain on log records        | Backend   | Planning session |
| Build integration test suite (Supertest + Jest) running in Docker Compose             | Backend   | 2 days           |
| Replace `.env` files with Docker secrets or `.env.vault` before any public deployment | DevOps    | 4 hours          |
| Define fraud detection feature scope or explicitly remove it from Project Overview    | Architect | Planning session |

---

## 7. Open Questions to Resolve Before Proceeding

1. **Is Upstash Redis the definitive strategy for all services?** The Role & Permission Service plans Redis-cached RBAC — it must be decided whether this uses Upstash or local Redis before Sprint 3 begins.

2. **What is the email verification token TTL?** What happens to unverified accounts after expiry — are they auto-purged, indefinitely locked, or manually cleaned up?

3. **Does `(protected)/layout.tsx` call IAM directly or via the API Gateway?** Calling IAM directly from a Server Component bypasses the Gateway's token transformation, rate limiting, and audit logging.

4. **Is this a portfolio showcase or a real deployment?** The answer significantly changes the urgency of secret management, mTLS, and compliance gap closures.

5. **What does "fraud detection" concretely mean in this context?** Anomaly detection on login patterns? Device fingerprinting thresholds? IP reputation checks? Without a concrete definition, it cannot be scoped, and it should be removed from the stated objectives if it has no implementation path.

6. **What branching strategy is being used?** If collaborators will contribute, `main`-branch-only development with no PR process will create merge conflicts at scale.

---

## 8. Overall Assessment

Aegis shows strong architectural instincts — the two-layer JWT model, BullMQ-backed async notifications, idempotency enforcement, edge middleware, and the `@aegis/events` shared contract are all patterns used in production fintech systems. The velocity from v1 to v2 is meaningful: a critical service went from stub to complete with proper queuing, templates, and delivery guarantees.

The primary concern is the gap between stated ambition ("banking-grade", "Zero Trust", "compliance-ready") and the implementation detail behind several of those claims. Shared internal secrets, a single PostgreSQL container despite a database-per-service claim, no distributed tracing, no testing strategy, and an unimplemented "fraud detection" objective are the most prominent examples. None of these are disqualifying for a learning project — but they should be acknowledged honestly in the plan so the author knows exactly what "production-ready" means versus what the current build achieves.

The project is on a strong trajectory. Closing the P0 and P1 items above before Sprint 3 begins will meaningfully reduce accumulated technical debt and make the system genuinely defensible as a portfolio artifact.

---

_Combined review authored June 2026 | Covers Aegis Implementation Plan v1 and v2_
