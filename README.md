# node-gen-kit

## Introduction

**node-gen-kit** (`node-gen` CLI) scaffolds production-ready Node.js backends — comparable to `create-next-app`, focused on enterprise APIs.

```bash
# Scaffold a project (this is the main command — not npm install)
npx node-gen-kit
# or
npx node-gen
```

> **Important:** `npm install node-gen-kit` only installs the package into `node_modules`.
> It does **not** generate a backend. Always run `npx node-gen-kit` (or `node-gen`) in an interactive terminal.

## What this package covers

| Area                 | Options                                                    |
| -------------------- | ---------------------------------------------------------- |
| **Languages**        | TypeScript, JavaScript                                     |
| **Frameworks**       | Express, Fastify, Hono, Koa                                |
| **Module systems**   | ESM, CommonJS                                              |
| **Package managers** | npm, pnpm, yarn, bun                                       |
| **Node**             | v22.23.1, v24.18.0, 22 LTS, 20 LTS                         |
| **API style**        | REST                                                       |
| **Auth**             | JWT, Passport, Auth0, Okta, Keycloak                       |
| **Validation**       | Zod, Joi                                                   |
| **Databases**        | PostgreSQL, MongoDB, MySQL, SQLite                         |
| **ORM**              | Prisma, Drizzle, Mongoose                                  |
| **Cache**            | Redis                                                      |
| **Logger**           | Pino, Winston, structured-logger-kit                       |
| **API docs**         | Swagger UI, Scalar, OpenAPI JSON                           |
| **Testing**          | Vitest, Jest, Mocha + Chai                                 |
| **Ops**              | Docker, docker-compose, GitHub Actions, Dependabot, CodeQL |
| **Security**         | Helmet / secure headers, CORS, compression, rate limiting  |
| **Env**              | Multi-env files + `env-ok-kit` validation                  |
| **Architecture**     | Layered modules (routes → services → store)                |

## Why this package exists

Most Node starters are either too minimal or dump an empty enterprise folder tree. **node-gen** asks clear questions, generates only what you selected, and ships a runnable app with health checks, layered modules, security defaults, and CI.

## Installation

```bash
npm install -g node-gen-kit
# or
npx node-gen
```

Requires Node.js 18+.

## Quick Start

### Interactive

```bash
npx node-gen-kit
```

### Non-interactive defaults (Express + TypeScript)

```bash
npx node-gen-kit my-api --yes
```

### TypeScript (programmatic)

```ts
import { createProject, defaultConfig } from 'node-gen-kit';

await createProject(
  defaultConfig({
    projectName: 'orders-api',
    targetDir: './orders-api',
    framework: 'koa',
    features: {
      auth: 'jwt',
      validation: true,
      database: 'postgresql',
      orm: 'prisma',
      cache: 'none',
      logger: 'pino',
      docs: 'swagger',
      docker: true,
      ci: true,
      security: true,
      testing: 'jest',
      monitoring: true,
      gitInit: true,
      githubRepo: false,
    },
  }),
);
```

### JavaScript

```js
import { createProject, defaultConfig } from 'node-gen-kit';

await createProject(
  defaultConfig({
    projectName: 'orders-api',
    targetDir: './orders-api',
    framework: 'hono',
    language: 'js',
  }),
);
```

After generation:

```bash
cd my-api
npm run dev
curl http://localhost:3000/health
```

## CLI

```
node-gen [project-name] [options]

Options:
  --yes, -y          Non-interactive defaults
  --framework <name> express | fastify | hono | koa
  --lang <name>      ts | js
  --pm <name>        npm | pnpm | yarn | bun
  --skip-install     Skip dependency install
  --skip-git         Skip git init
  --dry-run          Plan files without writing
  --help             Show help
  --version          Show version
```

## Generated architecture

```
src/
  app/           # bootstrap + middleware pipeline
  config/        # env-ok-kit validation
  modules/       # feature modules (routes → services → store)
  middleware/
  health/
  lib/           # logger, db, redis
  docs/          # OpenAPI / Swagger / Scalar (optional)
tests/
```

## Middleware order

Request ID → Correlation ID → Logger → Helmet → Compression → CORS → Body parser → Auth → Validation → Rate limit → Routes → 404 → Error handler

## API Reference

### `createProject(config)`

Generates a project on disk. Returns `{ targetDir, files, packageManager, installRan, auditOk, gitInit }`.

### `defaultConfig(partial)`

Fills sensible defaults for Express + TypeScript + ESM + Vitest + security.

### `registerPlugin(plugin)`

Register a custom generator plugin (`id`, `applies`, `apply`).

## Examples

### Express + JWT + Swagger

```bash
npx node-gen-kit shop-api --yes --framework express
```

Then enable auth and Swagger in prompts, or use the programmatic API with `features.auth: "jwt"` and `features.docs: "swagger"`.

### Koa + Jest

```ts
await createProject(
  defaultConfig({
    projectName: 'notes',
    targetDir: './notes',
    framework: 'koa',
    features: {
      ...defaultConfig({ projectName: 'notes', targetDir: './notes' }).features,
      testing: 'jest',
      docs: 'swagger',
    },
  }),
);
```

## Framework Integration

Generated apps are plain Node HTTP servers — deploy to any Node host, Docker, or Kubernetes (Docker Compose included when selected).

## TypeScript Usage

Generated TypeScript projects use `tsx` for `dev`, `tsc` for `build`, and strict `tsconfig.json`.

## Error Handling

Scaffolded apps include `AppError`, `NotFoundError`, `UnauthorizedError`, `ValidationError` and a global error handler returning consistent JSON.

## Performance

Templates avoid unnecessary dependencies. In-memory stores are used for the sample CRUD module so `npm run dev` works without a database.

## Best Practices

- Change `JWT_SECRET` before production
- Prefer ESM + TypeScript for new services
- Keep modules small and layered
- Run `npm audit` in CI (included when CI is selected)

## FAQ

**Can I add GraphQL later?**  
Plugins are planned; see ROADMAP.md.

**Does it create empty folders?**  
No. Only selected features are generated.

## Migration Guide

From hand-rolled Express starters: generate a fresh project and move domain modules into `src/modules/`.

## Troubleshooting

| Issue            | Fix                                             |
| ---------------- | ----------------------------------------------- |
| Target not empty | Choose a new folder name                        |
| Install failed   | Run with `--skip-install` then install manually |
| Port in use      | Change `PORT` in `.env.local`                   |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT © Anil Kumar
