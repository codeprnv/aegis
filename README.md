# 🛡️ Aegis

> **Scalable MicroServices based Authentication Infrastructure built with Nx, Express, and TypeScript.**

![Nx](https://img.shields.io/badge/nx-143055?style=for-the-badge&logo=nx&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Zod](https://img.shields.io/badge/zod-%233068b5.svg?style=for-the-badge&logo=zod&logoColor=white)

**Aegis** is a high-performance, resilient backend system designed for secure authentication operations. It leverages a modern monorepo architecture to ensure code modularity, type safety, and operational excellence.

---

## 🏗️ Architecture

The project follows a modular **Nx Monorepo** structure, separating concerns between application gateways and shared domain logic.

### 🚀 Applications

- **`apps/api-gateway`**
  The central entry point for all client requests. It handles:
  - **🛡️ Security**: Rate limiting, CORS configuration, and header sanitation.
  - **🔍 Observability**: Request tracing (`cls-rtracer`) and access logging.
  - **🔑 Context**: Authentication context extraction from tokens.
  - **Health Checks**: `/gateway-health` endpoint.

### 📚 Libraries (`libs/`)

Core utilities shared across the platform:

- **`middlewares/`**:
  - `access-logger`: Standardized request logging.
  - `extractAuthContext`: Decodes and injects user context into requests.
  - `request-tracer`: unique request ID generation for distributed tracing.
  - `errorMiddleware`: Centralized exception handling.
- **`types/`**: shared TypeScript interfaces (e.g., `process.env` schema via Zod).
- **`utils/`**: Shared `logger` instance (Pino).

---

## 🛠️ Tech Stack

- **Framework**: [Express.js](https://expressjs.com/)
- **Monorepo Tooling**: [Nx](https://nx.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Validation**: [Zod](https://zod.dev/)
- **Logging**: [Pino](https://github.com/pinojs/pino)
- **Utilities**: `dotenv`, `cors`, `cookie-parser`, `express-limit`.

---

## ⚡ Getting Started

### Prerequisites

- **Node.js** (v20+ recommended)
- **npm** or **yarn**

### 1. Installation

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory. Ensure the following variables are defined (validated by `libs/types/env.ts`):

```env
API_GATEWAY_PORT=8080
HOST=http://localhost
ORIGIN_HOST_1=http://localhost:3000
JWT_SECRET=your_super_secret_jwt_key
NODE_ENV=development
```

### 3. Running the Project

Start the development server (runs all applications in watch mode):

```bash
npm run dev
```

Or run the specific application:

```bash
npx nx serve api-gateway
```

## 🧪 Commands

| Command                    | Description                                             |
| :------------------------- | :------------------------------------------------------ |
| `npm run dev`              | Starts the development server for the entire workspace. |
| `npx nx build api-gateway` | Builds the API Gateway for production.                  |
| `npx nx graph`             | Visualizes the project dependency graph.                |

---

## Authors

- Built with 💖 by [@codeprnv](https://www.github.com/codeprnv)
