import type { ProjectConfig, GeneratedFile, DepMap } from "../../core/types.js";
import { ver } from "../../core/versions.js";
import { ext } from "../../utils/helpers.js";
import { inlineCreateSchema, parseBodySnippet } from "../features/validation.js";

export function honoDeps(_config: ProjectConfig): DepMap {
  return {
    hono: ver("hono"),
    "@hono/node-server": ver("@hono/node-server"),
  };
}

export function honoFiles(config: ProjectConfig): GeneratedFile[] {
  const e = ext(config.language);
  const ts = config.language === "ts";
  const hasValidation = config.features.validation !== "none";
  const auth = config.features.auth !== "none";
  const docs = config.features.docs !== "none";

  const files: GeneratedFile[] = [
    {
      path: `src/modules/items/items.store.${e}`,
      content: ts
        ? `export type Item = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

const items = new Map<string, Item>();

export const itemsStore = {
  list(): Item[] { return [...items.values()]; },
  get(id: string): Item | undefined { return items.get(id); },
  create(data: { name: string; description?: string }): Item {
    const now = new Date().toISOString();
    const item: Item = { id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now };
    items.set(item.id, item);
    return item;
  },
  update(id: string, data: Partial<{ name: string; description?: string }>): Item | undefined {
    const existing = items.get(id);
    if (!existing) return undefined;
    const updated: Item = { ...existing, ...data, updatedAt: new Date().toISOString() };
    items.set(id, updated);
    return updated;
  },
  remove(id: string): boolean { return items.delete(id); },
};
`
        : `const items = new Map();

export const itemsStore = {
  list() { return [...items.values()]; },
  get(id) { return items.get(id); },
  create(data) {
    const now = new Date().toISOString();
    const item = { id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now };
    items.set(item.id, item);
    return item;
  },
  update(id, data) {
    const existing = items.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    items.set(id, updated);
    return updated;
  },
  remove(id) { return items.delete(id); },
};
`,
    },
    {
      path: `src/modules/items/items.routes.${e}`,
      content: `import { Hono } from 'hono';
import { itemsStore } from './items.store.js';
import { NotFoundError } from '../../lib/errors.js';
${inlineCreateSchema(config)}
export const itemsRoutes = new Hono();

itemsRoutes.get('/', (c) => c.json({ success: true, data: itemsStore.list() }));

itemsRoutes.get('/:id', (c) => {
  const item = itemsStore.get(c.req.param('id'));
  if (!item) throw new NotFoundError('Item not found');
  return c.json({ success: true, data: item });
});

itemsRoutes.post('/', async (c) => {
  const body = ${parseBodySnippet(config, "await c.req.json()")};
  const item = itemsStore.create(body);
  return c.json({ success: true, data: item }, 201);
});

itemsRoutes.patch('/:id', async (c) => {
  const item = itemsStore.update(c.req.param('id'), await c.req.json());
  if (!item) throw new NotFoundError('Item not found');
  return c.json({ success: true, data: item });
});

itemsRoutes.delete('/:id', (c) => {
  if (!itemsStore.remove(c.req.param('id'))) throw new NotFoundError('Item not found');
  return c.body(null, 204);
});
`,
    },
    {
      path: `src/app/create-app.${e}`,
      content: `import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger as honoLogger } from 'hono/logger';
import { appEnv } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { itemsRoutes } from '../modules/items/items.routes.js';
${auth ? "import { authRoutes } from '../modules/auth/auth.routes.js';\n" : ""}${docs ? "import { docsRoutes } from '../docs/openapi.js';\n" : ""}
export function createApp() {
  const app = new Hono();

  app.use('*', honoLogger());
  app.use('*', cors());
  app.use('*', secureHeaders());

  app.get('/health', (c) =>
    c.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  );

${docs ? "  app.route('/docs', docsRoutes);\n" : ""}
  app.route(\`\${appEnv.API_PREFIX}/\${appEnv.API_VERSION}/items\`, itemsRoutes);
${auth ? "  app.route(`${appEnv.API_PREFIX}/${appEnv.API_VERSION}/auth`, authRoutes);\n" : ""}
  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(
        { success: false, error: { code: err.code, message: err.message } },
        ${ts ? "err.statusCode as 400" : "err.statusCode"},
      );
    }
    return c.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      500,
    );
  });

  app.notFound((c) =>
    c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404),
  );

  return app;
}
`,
    },
    {
      path: `src/index.${e}`,
      content: `import { serve } from '@hono/node-server';
import { createApp } from './app/create-app.js';
import { appEnv } from './config/env.js';
import { logger } from './lib/logger.js';

const app = createApp();
serve({ fetch: app.fetch, port: appEnv.PORT, hostname: appEnv.HOST }, (info) => {
  logger.info(\`🚀 listening on http://\${info.address}:\${info.port}\`);
});
`,
    },
  ];

  return files;
}
