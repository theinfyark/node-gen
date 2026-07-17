import type { ProjectConfig, GeneratedFile, DepMap } from '../../core/types.js';
import { ver } from '../../core/versions.js';
import { ext } from '../../utils/helpers.js';
import {
  inlineCreateSchema,
  parseBodySnippet,
} from '../features/validation.js';

export function fastifyDeps(config: ProjectConfig): DepMap {
  const d: DepMap = { fastify: ver('fastify') };
  if (config.features.security) {
    d['@fastify/helmet'] = ver('@fastify/helmet');
    d['@fastify/cors'] = ver('@fastify/cors');
    d['@fastify/compress'] = ver('@fastify/compress');
    d['@fastify/rate-limit'] = ver('@fastify/rate-limit');
  }
  return d;
}

export function fastifyFiles(config: ProjectConfig): GeneratedFile[] {
  const e = ext(config.language);
  const ts = config.language === 'ts';
  const hasValidation = config.features.validation !== 'none';
  const auth = config.features.auth !== 'none';
  const docs = config.features.docs !== 'none';
  const sec = config.features.security;

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
      content: `${ts ? "import type { FastifyInstance } from 'fastify';\n" : ''}import { itemsStore } from './items.store.js';
import { NotFoundError } from '../../lib/errors.js';
${inlineCreateSchema(config)}
export async function itemsRoutes(app${ts ? ': FastifyInstance' : ''}) {
  app.get('/items', async () => ({ success: true, data: itemsStore.list() }));

  app.get('/items/:id', async (req) => {
    const item = itemsStore.get(${ts ? '(req.params as { id: string }).id' : 'req.params.id'});
    if (!item) throw new NotFoundError('Item not found');
    return { success: true, data: item };
  });

  app.post('/items', async (req, reply) => {
    const body = ${parseBodySnippet(config, 'req.body')};
    const item = itemsStore.create(body);
    return reply.code(201).send({ success: true, data: item });
  });

  app.patch('/items/:id', async (req) => {
    const item = itemsStore.update(${ts ? '(req.params as { id: string }).id' : 'req.params.id'}, req.body);
    if (!item) throw new NotFoundError('Item not found');
    return { success: true, data: item };
  });

  app.delete('/items/:id', async (req, reply) => {
    if (!itemsStore.remove(${ts ? '(req.params as { id: string }).id' : 'req.params.id'})) {
      throw new NotFoundError('Item not found');
    }
    return reply.code(204).send();
  });
}
`,
    },
    {
      path: `src/app/create-app.${e}`,
      content: `${ts ? "import Fastify from 'fastify';\n" : "import Fastify from 'fastify';\n"}import { appEnv } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { AppError } from '../lib/errors.js';
import { itemsRoutes } from '../modules/items/items.routes.js';
${auth ? "import { authRoutes } from '../modules/auth/auth.routes.js';\n" : ''}${docs ? "import { registerDocs } from '../docs/openapi.js';\n" : ''}${
        sec
          ? `import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
`
          : ''
      }
export async function createApp() {
  const app = Fastify({ logger: false });

${
  sec
    ? `  await app.register(helmet);
  await app.register(cors);
  await app.register(compress);
  await app.register(rateLimit, { max: 200, timeWindow: '15 minutes' });
`
    : ''
}
  app.addHook('onRequest', async (req, reply) => {
    const id = (req.headers['x-request-id']${ts ? ' as string' : ''}) || crypto.randomUUID();
    reply.header('x-request-id', id);
  });

  app.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

${docs ? '  await registerDocs(app);\n' : ''}
  await app.register(itemsRoutes, { prefix: \`\${appEnv.API_PREFIX}/\${appEnv.API_VERSION}\` });
${auth ? '  await app.register(authRoutes, { prefix: `${appEnv.API_PREFIX}/${appEnv.API_VERSION}/auth` });\n' : ''}
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({
        success: false,
        error: { code: err.code, message: err.message },
      });
    }
    logger.error(err);
    return reply.code(500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  return app;
}
`,
    },
    {
      path: `src/index.${e}`,
      content: `import { createApp } from './app/create-app.js';
import { appEnv } from './config/env.js';
import { logger } from './lib/logger.js';

const app = await createApp();
await app.listen({ port: appEnv.PORT, host: appEnv.HOST });
logger.info(\`🚀 listening on http://\${appEnv.HOST}:\${appEnv.PORT}\`);
`,
    },
  ];

  return files;
}
