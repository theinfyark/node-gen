# node-gen-kit

## Introduction

**node-gen-kit** (`node-gen` CLI) is an interactive generator that scaffolds **production-ready Node.js backends** — comparable to `create-next-app`, focused on enterprise APIs.

```bash
npx node-gen-kit
# or
npx node-gen
```

## Why this package exists

Most Node starters are either too minimal or dump an empty enterprise folder tree. **node-gen** asks clear questions, generates only what you selected, and ships a runnable app with health checks, layered modules, security defaults, and CI.

## Installation

```bash
npm install -g node-gen-kit
# or
npx node-gen-kit
```

Requires Node.js 18+.

## Features

- Express, Fastify, and Hono
- TypeScript or JavaScript (ESM / CJS)
- Node 20 / 22 LTS
- Zod validation, JWT / Passport auth
- Prisma, Drizzle, Mongoose
- Redis cache, Pino or structured-logger-kit
- OpenAPI + Scalar / Swagger UI
- Docker, GitHub Actions, Dependabot, CodeQL
- Plugin architecture for future frameworks and features
- Programmatic API: `createProject(config)`

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
import { createProject, defaultConfig } from "node-gen-kit";

await createProject(
  defaultConfig({
    projectName: "orders-api",
    targetDir: "./orders-api",
    framework: "fastify",
    features: {
      auth: "jwt",
      validation: true,
      database: "postgresql",
      orm: "prisma",
      cache: "none",
      logger: "pino",
      apiDocs: true,
      docker: true,
      ci: true,
      security: true,
      testing: true,
      monitoring: true,
      gitInit: true,
      githubRepo: false,
    },
  }),
);
```

### JavaScript

```js
import { createProject, defaultConfig } from "node-gen-kit";

await createProject(
  defaultConfig({
    projectName: "orders-api",
    targetDir: "./orders-api",
    framework: "hono",
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
  --framework <name> express | fastify | hono
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
  docs/          # OpenAPI (optional)
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

### Express + JWT + Zod

```bash
npx node-gen-kit shop-api --yes --framework express
```

Then enable auth in prompts, or use the programmatic API with `features.auth: "jwt"`.

### Fastify + Prisma + SQLite

```ts
await createProject(
  defaultConfig({
    projectName: "notes",
    targetDir: "./notes",
    framework: "fastify",
    features: {
      ...defaultConfig({ projectName: "notes", targetDir: "./notes" }).features,
      database: "sqlite",
      orm: "prisma",
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

**Can I add Koa / GraphQL later?**  
Yes — plugins are planned; see ROADMAP.md.

**Does it create empty folders?**  
No. Only selected features are generated.

## Migration Guide

From hand-rolled Express starters: generate a fresh project and move domain modules into `src/modules/`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Target not empty | Choose a new folder name |
| Install failed | Run with `--skip-install` then install manually |
| Port in use | Change `PORT` in `.env.local` |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT © Anil Kumar
