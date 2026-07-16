import type { ProjectConfig, GeneratedFile, DepMap } from "../../core/types.js";
import { ver } from "../../core/versions.js";
import { ext } from "../../utils/helpers.js";

export function docsDeps(config: ProjectConfig): DepMap {
  if (!config.features.apiDocs) return {};
  if (config.framework === "express") {
    return { "@scalar/express-api-reference": ver("@scalar/express-api-reference") };
  }
  if (config.framework === "fastify") {
    return {
      "@fastify/swagger": ver("@fastify/swagger"),
      "@fastify/swagger-ui": ver("@fastify/swagger-ui"),
    };
  }
  return {};
}

export function docsFiles(config: ProjectConfig): GeneratedFile[] {
  if (!config.features.apiDocs) return [];
  const e = ext(config.language);
  const ts = config.language === "ts";

  if (config.framework === "express") {
    return [
      {
        path: `src/docs/openapi.${e}`,
        content: `import type { Express } from 'express';
import { apiReference } from '@scalar/express-api-reference';

const openApiDoc = {
  openapi: '3.1.0',
  info: {
    title: '${config.projectName} API',
    version: '1.0.0',
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/v1/items': {
      get: { summary: 'List items', responses: { '200': { description: 'OK' } } },
      post: { summary: 'Create item', responses: { '201': { description: 'Created' } } },
    },
  },
};

export function mountDocs(app${ts ? ": Express" : ""}) {
  app.get('/openapi.json', (_req, res) => res.json(openApiDoc));
  app.use(
    '/docs',
    apiReference({
      spec: { content: openApiDoc },
    }),
  );
}
`,
      },
    ];
  }

  if (config.framework === "fastify") {
    return [
      {
        path: `src/docs/openapi.${e}`,
        content: `${ts ? "import type { FastifyInstance } from 'fastify';\n" : ""}import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export async function registerDocs(app${ts ? ": FastifyInstance" : ""}) {
  await app.register(swagger, {
    openapi: {
      info: { title: '${config.projectName} API', version: '1.0.0' },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
}
`,
      },
    ];
  }

  // Hono — simple JSON OpenAPI + HTML stub
  return [
    {
      path: `src/docs/openapi.${e}`,
      content: `import { Hono } from 'hono';

const openApiDoc = {
  openapi: '3.1.0',
  info: { title: '${config.projectName} API', version: '1.0.0' },
  paths: {
    '/health': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },
  },
};

export const docsRoutes = new Hono();
docsRoutes.get('/openapi.json', (c) => c.json(openApiDoc));
docsRoutes.get('/', (c) =>
  c.html('<html><body><h1>API Docs</h1><p>See <a href="/docs/openapi.json">openapi.json</a></p></body></html>'),
);
`,
    },
  ];
}

export function dockerFiles(config: ProjectConfig): GeneratedFile[] {
  if (!config.features.docker) return [];
  const files: GeneratedFile[] = [
    {
      path: "Dockerfile",
      content: `FROM node:${config.nodeVersion}-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
${config.language === "ts" ? "RUN npm run build\n" : ""}EXPOSE ${config.port}
CMD ["npm", "start"]
`,
    },
    {
      path: ".dockerignore",
      content: `node_modules
dist
.git
.env
.env.*
coverage
tests
`,
    },
    {
      path: "docker-compose.yml",
      content: `services:
  app:
    build: .
    ports:
      - "${config.port}:${config.port}"
    env_file:
      - .env.local
    depends_on:
${config.features.database === "postgresql" ? "      - postgres\n" : ""}${config.features.database === "mongodb" ? "      - mongo\n" : ""}${config.features.cache === "redis" ? "      - redis\n" : ""}
${config.features.database === "postgresql"
  ? `  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    ports:
      - "5432:5432"
`
  : ""}${config.features.database === "mongodb"
  ? `  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
`
  : ""}${config.features.cache === "redis"
  ? `  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
`
  : ""}`,
    },
  ];
  return files;
}

export function ciFiles(config: ProjectConfig): GeneratedFile[] {
  if (!config.features.ci) return [];
  return [
    {
      path: ".github/workflows/ci.yml",
      content: `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [${config.nodeVersion}.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
      - run: ${config.packageManager === "npm" ? "npm ci" : `${config.packageManager} install`}
      - run: ${config.packageManager === "npm" ? "npm test" : `${config.packageManager} test`}
      - name: Typecheck
        run: ${config.packageManager === "npm" ? "npm run typecheck --if-present" : `${config.packageManager} run typecheck`}
      - name: Build
        run: ${config.packageManager === "npm" ? "npm run build --if-present" : `${config.packageManager} run build`}
      - name: Audit
        run: npm audit --audit-level=high
        continue-on-error: true
`,
    },
    {
      path: ".github/dependabot.yml",
      content: `version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
`,
    },
    {
      path: ".github/workflows/codeql.yml",
      content: `name: CodeQL

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript
      - uses: github/codeql-action/analyze@v3
`,
    },
  ];
}
