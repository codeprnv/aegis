# Aegis — Complete Implementation Plan

> **Project Type:** Production-grade, microservices-based authentication & Zero Trust security platform  
> **Goal:** Understand how banking-level backend systems are built through hands-on implementation  
> **Status as of May 2026:** IAM Service ✅ Complete | API Gateway ✅ Complete | Frontend 🚀 Starting

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Current Status](#3-current-status)
4. [Sprint Roadmap](#4-sprint-roadmap)
5. [Sprint 1 — IAM Service (Complete)](#5-sprint-1--iam-service-complete)
6. [Sprint 2 — Notification Service](#6-sprint-2--notification-service)
7. [Sprint 3 — User Service](#7-sprint-3--user-service)
8. [Sprint 4 — File Storage Service](#8-sprint-4--file-storage-service)
9. [Sprint 5 — Audit Service](#9-sprint-5--audit-service)
10. [Sprint 6 — Role & Permission Service](#10-sprint-6--role--permission-service)
11. [Frontend — Aegis UI](#11-frontend--aegis-ui)
12. [Infrastructure & DevOps](#12-infrastructure--devops)
13. [Tech Stack Reference](#13-tech-stack-reference)

---

## 1. Project Overview

Aegis is a microservices-based authentication and security platform built as a learning project to understand how banking-level backend systems work in the real world.

**Core Objectives:**

- Build microservices with clear service boundaries (not a monolith)
- Implement Zero Trust security (never trust, always verify)
- Follow production-ready patterns used in actual fintech companies
- Demonstrate enterprise-level security: fraud detection, device tracking, and compliance-ready audit trails

**What Aegis Is Not:**

- A tutorial CRUD app
- A single-service monolith
- A quick weekend project

---

## 2. Architecture

### Service Map

```
Client (Browser)
       │
       ▼
┌──────────────────┐
│   API Gateway    │  Port 8080 — Edge security, routing, token transformation
│   (NestJS)       │
└──────┬───────────┘
       │  Internal JWT (15min, aud: aegis-internal)
       │
       ├──────────────────────────────────────────┐
       │                                          │
       ▼                                          ▼
┌──────────────┐                        ┌──────────────────┐
│ IAM Service  │  Port 6000             │ Notification Svc │  Port 6001
│ (NestJS)     │  Auth core             │ (NestJS)         │  Email / SMS / Push
└──────────────┘                        └──────────────────┘
       │
       ├────────────────────┬────────────────────┐
       ▼                    ▼                    ▼
┌────────────┐    ┌──────────────────┐  ┌──────────────┐
│ User Svc   │    │ File Storage Svc │  │ Audit Svc    │
│ Port 6002  │    │ Port 6003        │  │ Port 6004    │
│ Profiles   │    │ Uploads          │  │ Logs         │
└────────────┘    └──────────────────┘  └──────────────┘
       │
       ▼
┌──────────────────────┐
│ Role & Permission Svc│  Port 6005 — Advanced RBAC
└──────────────────────┘
```

### Two-Layer Authentication (Zero Trust)

| Layer   | Direction            | Token Type   | Lifetime | Audience         |
| ------- | -------------------- | ------------ | -------- | ---------------- |
| Layer 1 | Client → API Gateway | Access JWT   | 15 min   | `aegis-client`   |
| Layer 1 | Client → API Gateway | Refresh JWT  | 7 days   | `aegis-client`   |
| Layer 2 | Gateway → Services   | Internal JWT | 15 min   | `aegis-internal` |

The API Gateway **transforms** the client-facing token into an internal token before forwarding requests to microservices. Services only accept requests with a valid internal token — they never communicate directly with the internet.

### Database Strategy

Each service owns its own database (Database-per-Service pattern):

| Service           | Database                | Cache |
| ----------------- | ----------------------- | ----- |
| IAM               | PostgreSQL (via Prisma) | Redis |
| Notification      | PostgreSQL              | —     |
| User              | PostgreSQL              | Redis |
| File Storage      | PostgreSQL              | —     |
| Audit             | PostgreSQL              | —     |
| Role & Permission | PostgreSQL              | Redis |

### Monorepo Structure (Nx Workspace)

```
aegis/
├── apps/
│   ├── gateway/          ← API Gateway (NestJS)
│   ├── iam/              ← IAM Service (NestJS)
│   ├── notification/     ← Notification Service (NestJS)
│   ├── user/             ← User Service (NestJS)
│   ├── file-storage/     ← File Storage Service (NestJS)
│   ├── audit/            ← Audit Service (NestJS)
│   ├── roles/            ← Role & Permission Service (NestJS)
│   └── frontend/         ← Aegis UI (Next.js)
├── libs/
│   ├── shared-types/     ← Shared TypeScript interfaces
│   ├── shared-utils/     ← Common utilities
│   └── internal-auth/    ← Internal JWT middleware (shared)
├── prisma/               ← Per-service schema files
├── nx.json
└── package.json
```

---

## 3. Current Status

| Component                 | Status         | Details                                           |
| ------------------------- | -------------- | ------------------------------------------------- |
| API Gateway               | ✅ Complete    | Edge routing, token transformation, rate limiting |
| IAM Service               | ✅ Complete    | Full auth with Redis security hardening           |
| Notification Service      | ⏳ Not Started | Email (Resend), templates, event-driven           |
| User Service              | ⏳ Not Started | Profile management, preferences                   |
| File Storage Service      | ⏳ Not Started | Uploads, image processing                         |
| Audit Service             | ⏳ Not Started | Logging, compliance                               |
| Role & Permission Service | ⏳ Not Started | Advanced RBAC                                     |
| Frontend                  | 🚀 Starting    | Next.js, Shadcn UI, Aceternity UI                 |

---

## 4. Sprint Roadmap

| Sprint               | Service                      | Timeline     | Priority                      |
| -------------------- | ---------------------------- | ------------ | ----------------------------- |
| Sprint 1             | IAM Service                  | Week 1–3     | ✅ Done                       |
| —                    | API Gateway                  | Week 2–3     | ✅ Done                       |
| **Sprint 2**         | **Notification Service**     | **Week 4–5** | 🔴 Critical (blockers in IAM) |
| **Frontend Phase 1** | **Auth UI (Login/Register)** | **Week 4–5** | 🚀 Starting Now               |
| Sprint 3             | User Service                 | Week 6–7     | 🟡 Important                  |
| Frontend Phase 2     | Dashboard + Profile UI       | Week 6–7     | 🟡 Important                  |
| Sprint 4             | File Storage Service         | Week 8–9     | 🟢 Normal                     |
| Sprint 5             | Audit Service                | Week 10–11   | 🟢 Normal                     |
| Sprint 6             | Role & Permission Service    | Week 12–13   | 🟢 Normal                     |
| Frontend Phase 3     | Admin Panel                  | Week 12–14   | 🟢 Normal                     |
| Deployment           | Docker + CI/CD               | Week 14–15   | 🟢 Normal                     |

---

## 5. Sprint 1 — IAM Service (Complete)

### What Was Built

The IAM (Identity and Access Management) service is the authentication core of Aegis. It handles all identity-related operations.

### Completed Features

**Authentication Core:**

- ✅ User registration with validation
- ✅ User login with credentials
- ✅ JWT access token generation (15 min expiry)
- ✅ Refresh token with rotation
- ✅ Session management (multi-device support)
- ✅ Logout (single device & all devices)
- ✅ Token reuse detection
- ✅ Session families for security

**Password Management:**

- ✅ Password validation (strength, format)
- ✅ Password history tracking (last 5 passwords)
- ✅ Password reuse prevention
- ✅ Change password (authenticated users)
- ✅ Forgot password (OTP generation)
- ✅ Reset password with token validation

**Account Security (Redis-Powered):**

- ✅ Account lockout after failed attempts (Redis + PostgreSQL two-layer)
- ✅ Rate limiting per IP
- ✅ Brute force protection (atomic Redis INCR)
- ✅ TTL-based automatic expiry
- ✅ Production-grade error messages (with remaining attempts)

**Role-Based Access Control:**

- ✅ Roles: `USER`, `ADMIN`
- ✅ Role-based middleware
- ✅ Admin features (force password change, admin user reset)

### Tech Stack (IAM)

- **Framework:** NestJS + TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Cache:** Redis
- **Hashing:** Argon2id
- **Tokens:** JWT (access + refresh)
- **Validation:** class-validator + class-transformer

### Known Limitations (To Resolve in Sprint 2)

- 🔴 Password reset emails are currently `console.log()` — not delivered to users
- 🔴 Email OTPs cannot be delivered
- 🟡 Welcome emails on registration not sent
- 🟡 Password change confirmation emails not sent

---

## 6. Sprint 2 — Notification Service

### Purpose

The Notification Service is a dedicated microservice for all communication delivery. It decouples notification logic from business logic, ensuring IAM and other services don't manage email/SMS directly.

### Why This Is Critical

Without the Notification Service, the following IAM flows are broken:

- Forgot Password (cannot deliver reset link)
- Email Verification (cannot verify new accounts)
- Welcome Email (not sent on registration)
- Password Change Confirmation (not sent)

### Architecture

```
IAM Service  ──────► Event Bus (Redis Pub/Sub or BullMQ)
User Service ──────►        │
                            ▼
                   Notification Service
                            │
                    ┌───────┴──────────┐
                    ▼                  ▼
               Resend (Email)      Future: SMS / Push
```

### Planned Features

**Email Delivery:**

- [ ] Resend integration (free tier: 3,000 emails/month)
- [ ] HTML email templates (password reset, welcome, verification, change confirmation)
- [ ] Retry logic with exponential backoff
- [ ] Delivery status tracking

**Template System:**

- [ ] Handlebars or MJML-based templates
- [ ] Brand-consistent Aegis email design
- [ ] Dark/light responsive email templates

**Event-Driven Architecture:**

- [ ] Listen for events: `user.registered`, `password.reset.requested`, `password.changed`, `email.verification.requested`
- [ ] Queue-based processing (BullMQ + Redis)
- [ ] Dead letter queue for failed deliveries

### API Endpoints

```
POST /notifications/email          ← Send email directly
POST /notifications/email/template ← Send from template
GET  /notifications/status/:id     ← Check delivery status
```

### Environment Variables Needed

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=noreply@aegis.dev
FRONTEND_URL=http://localhost:3000
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Implementation Plan

**Day 1:** Set up NestJS service, install Resend SDK, create basic email sender  
**Day 2:** Build template system (password reset, welcome, verification)  
**Day 3:** Wire up event listeners from IAM service  
**Day 4:** Queue-based processing with BullMQ  
**Day 5:** Testing + integration with IAM flows

---

## 7. Sprint 3 — User Service

### Purpose

Separates user profile data from authentication data. Authentication (who you are) is IAM's job. Profile management (what we know about you) belongs to the User Service.

### Planned Features

- [ ] User profile (name, bio, avatar, preferences)
- [ ] Profile update endpoints
- [ ] User settings management
- [ ] Account deletion flow (GDPR-friendly soft delete)
- [ ] User search (admin only)
- [ ] Activity summary (last login, device list)

### API Endpoints

```
GET    /users/me              ← Get own profile
PUT    /users/me              ← Update own profile
DELETE /users/me              ← Deactivate account
GET    /users/:id             ← Get user (admin only)
GET    /users                 ← List users (admin only, paginated)
```

### Database Schema (Planned)

```sql
User Profile Table:
- id (UUID, FK to IAM user)
- display_name
- bio
- avatar_url
- timezone
- language
- created_at
- updated_at
```

---

## 8. Sprint 4 — File Storage Service

### Purpose

Handles all file upload and retrieval operations across Aegis. Decouples binary storage from business logic.

### Planned Features

- [ ] File upload (images, documents)
- [ ] Avatar upload for User Service
- [ ] File metadata tracking
- [ ] Image resizing/optimization (Sharp.js)
- [ ] Presigned URL generation
- [ ] File deletion with soft delete

### Storage Strategy

**Development:** Local filesystem  
**Production:** AWS S3 or Cloudflare R2 (free egress)

---

## 9. Sprint 5 — Audit Service

### Purpose

Provides compliance-ready audit trails for all significant actions across Aegis. Critical for fintech-grade security posture.

### Planned Features

- [ ] Login event logging (IP, device, timestamp, success/failure)
- [ ] Password change events
- [ ] Account lockout events
- [ ] Admin action logs
- [ ] Session creation/revocation logs
- [ ] Queryable audit trail (filtered by user, action type, date range)
- [ ] Tamper-evident log storage

### Events to Track

```
auth.login.success
auth.login.failure
auth.logout
auth.password.changed
auth.password.reset
auth.account.locked
auth.session.revoked
user.profile.updated
user.account.deleted
admin.user.force_reset
admin.role.changed
```

---

## 10. Sprint 6 — Role & Permission Service

### Purpose

Upgrades the basic `USER/ADMIN` role system in IAM to a full, dynamic Role-Based Access Control system.

### Planned Features

- [ ] Dynamic role creation and management
- [ ] Fine-grained permission system
- [ ] Permission inheritance (role hierarchy)
- [ ] Resource-level permissions (e.g., "can edit post:123")
- [ ] Permission caching (Redis)
- [ ] Admin UI integration

### Permission Model

```
Role: ADMIN
  └── Permission: users:read
  └── Permission: users:write
  └── Permission: users:delete

Role: MODERATOR
  └── Permission: users:read
  └── Permission: content:moderate

Role: USER
  └── Permission: profile:read
  └── Permission: profile:write
```

---

## 11. Frontend — Aegis UI

### Tech Stack

| Tool                     | Purpose                                                  |
| ------------------------ | -------------------------------------------------------- |
| Next.js 14+ (App Router) | Framework                                                |
| TypeScript               | Type safety                                              |
| Tailwind CSS v4          | Styling                                                  |
| Shadcn UI                | Functional components (forms, inputs, dialogs)           |
| Aceternity UI            | Animated/visual components (backgrounds, cards, effects) |
| React Hook Form          | Form state management                                    |
| Zod                      | Schema validation                                        |
| Axios                    | API client (typed)                                       |
| Zustand                  | Global state (auth state, user session)                  |
| Framer Motion            | Animations (used by Aceternity)                          |

### Design Direction

**Aesthetic:** Cyberpunk / Zero Trust Security  
**Color Scheme:** Deep dark backgrounds, cyan + purple gradients, glassmorphic panels  
**Reference:** The glassmorphic card with a glowing particle shield (as per design concept)

**Key Design Rules:**

- Glassmorphic form containers: `bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl`
- Gradient buttons: `bg-gradient-to-r from-cyan-400 to-purple-500`
- Input fields: `bg-transparent border border-white/20 focus:border-cyan-400`
- Aceternity `Card Spotlight` wraps Shadcn form components
- Aceternity `Sparkles` or `Vortex Background` for the particle shield visual

### Page Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          ← Login page
│   │   ├── register/page.tsx       ← Register page
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← Protected layout (auth guard)
│   │   ├── dashboard/page.tsx      ← Main dashboard
│   │   ├── profile/page.tsx        ← User profile
│   │   ├── sessions/page.tsx       ← Active sessions management
│   │   └── settings/page.tsx       ← Account settings
│   └── (admin)/
│       ├── layout.tsx              ← Admin guard (ADMIN role only)
│       ├── users/page.tsx
│       └── audit/page.tsx
├── components/
│   ├── ui/                         ← Shadcn components
│   ├── aceternity/                 ← Aceternity components
│   └── forms/                      ← Form components (Login, Register, etc.)
├── lib/
│   ├── api.ts                      ← Axios instance + interceptors
│   ├── auth.ts                     ← Auth utilities
│   └── validations.ts              ← Zod schemas
└── store/
    └── auth.store.ts               ← Zustand auth state
```

### Phase 1 — Auth UI (Current Focus)

**Goal:** Fully functional Login and Register pages connected to the API Gateway.

**Pages to Build:**

1. Login (`/login`) — Username + Password, Remember Me, Forgot Password link
2. Register (`/register`) — Email, Password, Confirm Password, T&C checkbox
3. Forgot Password (`/forgot-password`) — Email input, OTP request (stub until Notification Service)
4. Reset Password (`/reset-password`) — New password + confirm

**Zod Schemas:**

```typescript
// Login
const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

// Register
const registerSchema = z
  .object({
    email: z.string().email('Invalid email'),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .regex(/[^a-zA-Z0-9]/),
    confirmPassword: z.string(),
    agreeToTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
```

**API Client Setup:**

```typescript
// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  withCredentials: true, // send refresh token cookie
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await refreshToken();
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

### Phase 2 — Dashboard & Profile (After User Service)

- Authenticated dashboard with session overview
- Profile page with avatar upload (after File Storage Service)
- Active sessions page (list and revoke sessions)
- Account settings (change password, notification preferences)

### Phase 3 — Admin Panel (After Role & Permission Service)

- User management (list, search, force reset)
- Audit log viewer (filterable by event type, user, date range)
- Role management UI

### Setup Commands

```bash
# Create Next.js app
npx create-next-app@latest aegis-frontend --typescript --tailwind --app
cd aegis-frontend

# Install dependencies
npm install axios zustand react-hook-form zod @hookform/resolvers framer-motion

# Initialize Shadcn UI
npx shadcn-ui@latest init

# Add Shadcn components
npx shadcn-ui@latest add button input label checkbox form card

# Install Aceternity UI components (copy-paste based)
# Visit: https://ui.aceternity.com/components
# Add: card-spotlight, sparkles, glowing-effect, background-gradient, moving-border

npm run dev
```

---

## 12. Infrastructure & DevOps

### Docker Setup (Planned)

Each service will have its own `Dockerfile`. A root `docker-compose.yml` will orchestrate all services for local development.

```yaml
# docker-compose.yml (planned)
services:
  gateway:
    build: ./apps/gateway
    ports: ['8080:8080']
    depends_on: [iam, postgres, redis]

  iam:
    build: ./apps/iam
    ports: ['6000:6000']
    depends_on: [postgres, redis]

  notification:
    build: ./apps/notification
    ports: ['6001:6001']
    depends_on: [postgres, redis]

  postgres:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine

  frontend:
    build: ./apps/frontend
    ports: ['3000:3000']
```

### Environment Configuration

Each service maintains its own `.env` file:

```
# IAM Service
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
INTERNAL_JWT_SECRET=...

# Gateway
INTERNAL_JWT_SECRET=...  ← Must match IAM's INTERNAL_JWT_SECRET
IAM_SERVICE_URL=http://iam:6000

# Notification Service
RESEND_API_KEY=...
FROM_EMAIL=noreply@aegis.dev
FRONTEND_URL=http://localhost:3000
```

### CI/CD (Future)

- GitHub Actions for automated testing on pull requests
- Lint + type check on every push
- Integration tests before merging to main
- Deployment to Railway or Render (free tier) for staging

---

## 13. Tech Stack Reference

### Backend

| Technology         | Version | Purpose                          |
| ------------------ | ------- | -------------------------------- |
| Node.js            | 20 LTS  | Runtime                          |
| NestJS             | 10+     | Framework                        |
| TypeScript         | 5+      | Language                         |
| Prisma             | 5+      | ORM                              |
| PostgreSQL         | 16      | Primary database                 |
| Redis              | 7       | Cache, sessions, queues          |
| BullMQ             | 5+      | Job queue (Notification Service) |
| Argon2             | Latest  | Password hashing                 |
| JWT (jsonwebtoken) | Latest  | Token management                 |
| Resend             | Latest  | Email delivery                   |
| class-validator    | Latest  | Request validation               |
| Nx                 | Latest  | Monorepo tooling                 |

### Frontend

| Technology      | Version | Purpose                    |
| --------------- | ------- | -------------------------- |
| Next.js         | 14+     | Framework (App Router)     |
| React           | 18+     | UI library                 |
| TypeScript      | 5+      | Language                   |
| Tailwind CSS    | v4      | Styling                    |
| Shadcn UI       | Latest  | Accessible UI components   |
| Aceternity UI   | Latest  | Animated visual components |
| Framer Motion   | 11+     | Animation engine           |
| React Hook Form | 7+      | Form management            |
| Zod             | 3+      | Schema validation          |
| Zustand         | 4+      | State management           |
| Axios           | 1+      | HTTP client                |

---

_Document last updated: May 2026_  
_Author: Aegis Project_
