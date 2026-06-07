# 🛡️ Aegis

> **Enterprise-Grade Identity & Access Management Platform built with Nx, Express, Next.js, and Prisma.**

![Nx](https://img.shields.io/badge/nx-143055?style=for-the-badge&logo=nx&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgresql-4169e1?style=for-the-badge&logo=postgresql&logoColor=white)

**Aegis** is a high-performance, resilient identity and authentication system designed to mimic enterprise-grade security operations. It leverages a modern monorepo architecture to ensure code modularity, strict type safety, and robust defense against common web vulnerabilities.

---

## 🏗️ Architecture

The project follows a modular **Nx Monorepo** structure, separating concerns between application gateways, the IAM microservice, and the frontend client.

### 🚀 Applications

- **`apps/frontend` (Next.js)**
  The user-facing client application featuring a modern, glassmorphic UI built with Tailwind CSS, Aceternity UI, and React. Handles all login, registration, and password recovery flows.

- **`apps/api-gateway` (Express)**
  The central entry point for all client requests. It handles:
  - **🛡️ Security**: Strict Regex-based Auth Rate Limiting, CORS configuration, and header sanitation.
  - **🔍 Observability**: Request tracing (`cls-rtracer`) and access logging.
  - **🔑 Context**: Authentication context extraction from JWTs.
  - **🚦 Proxy**: Secure routing to internal microservices.

- **`apps/iam-service` (Express)**
  The identity and access management service. It handles:
  - **🔐 Authentication**: User registration, login, and secure password hashing (Argon2).
  - **🎫 Token Management**: Stateful Session Management and JWT issuance (Access & Refresh tokens).
  - **⚙️ Advanced Security**: Optimistic Concurrency Token Rotation, Atomic OTP Burns, and Sequential Password History Checks (DoS protection).
  - **👤 User Management**: Profile management and RBAC.

### 📚 Packages (`packages/`)

Core utilities shared across the platform:

- **`middlewares/`**:
  - `access-logger`: Standardized request logging.
  - `extractAuthContext`: Decodes and injects user context into requests.
  - `errorMiddleware`: Centralized exception handling.
- **`types/`**: Shared TypeScript interfaces.
- **`utils/`**: Shared `logger` instance (Pino).
- **`database/`**: Prisma Client instance and shared database utilities.
- **`auth/`**: Core JWT signing and verification logic.

---

## 🛠️ Tech Stack

- **Frontend**: [Next.js (App Router)](https://nextjs.org/), React, Tailwind CSS, Aceternity UI
- **Backend Framework**: [Express.js](https://expressjs.com/)
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org/), [Prisma](https://www.prisma.io/)
- **Monorepo Tooling**: [Nx](https://nx.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Validation**: [Zod](https://zod.dev/)
- **Security**: `argon2` (Password Hashing), `express-rate-limit`, Cryptographically Secure PRNGs.

---

## ⚡ Getting Started

### Prerequisites

- **Node.js** (v20+ recommended)
- **npm** or **yarn**
- **PostgreSQL** Database

### 1. Installation

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory. Ensure the following variables are defined:

```env
API_GATEWAY_PORT=8080
IAM_SERVICE_PORT=8081
HOST=http://localhost
ORIGIN_HOST_1=http://localhost:3000
JWT_SECRET=your_super_secret_jwt_key
DATABASE_URL=postgresql://user:password@localhost:5432/aegis
NODE_ENV=development
```

### 3. Database Migration

```bash
npx prisma db push --schema=prisma/iam-service/schema.prisma
```

### 4. Running the Project

Start the development server (runs the Gateway, IAM Service, and Frontend in watch mode):

```bash
npm run dev
```

## 🧪 Commands

| Command                     | Description                                             |
| :-------------------------- | :------------------------------------------------------ |
| `npm run dev`               | Starts the development server for the entire workspace. |
| `npx nx build api-gateway`  | Builds the API Gateway for production.                  |
| `npx nx build frontend`     | Builds the Next.js Frontend for production.             |
| `npx jest apps/iam-service` | Runs unit tests for the IAM service.                    |
| `npx nx graph`              | Visualizes the project dependency graph.                |

---

## Authors

- Built with 💖 by [@codeprnv](https://www.github.com/codeprnv)
