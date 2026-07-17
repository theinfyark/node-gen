import type { ProjectConfig, GeneratedFile, DepMap } from '../../core/types.js';
import { ver } from '../../core/versions.js';
import { ext } from '../../utils/helpers.js';
import {
  inlineCreateSchema,
  parseBodySnippet,
} from '../features/validation.js';

export function koaDeps(config: ProjectConfig): DepMap {
  const d: DepMap = {
    koa: ver('koa'),
    '@koa/router': ver('@koa/router'),
    'koa-bodyparser': ver('koa-bodyparser'),
  };
  if (config.features.security) {
    d['@koa/cors'] = ver('@koa/cors');
    d['koa-helmet'] = ver('koa-helmet');
    d['koa-compress'] = ver('koa-compress');
  }
  return d;
}

export function koaDevDeps(config: ProjectConfig): DepMap {
  if (config.language !== 'ts') return {};
  const d: DepMap = {
    '@types/koa': ver('@types/koa'),
    '@types/koa__router': ver('@types/koa__router'),
    '@types/koa-bodyparser': ver('@types/koa-bodyparser'),
  };
  if (config.features.security) {
    d['@types/koa__cors'] = ver('@types/koa__cors');
    d['@types/koa-compress'] = ver('@types/koa-compress');
  }
  return d;
}

export function koaFiles(config: ProjectConfig): GeneratedFile[] {
  const e = ext(config.language);
  const ts = config.language === 'ts';
  const hasValidation = config.features.validation !== 'none';
  const authEnabled = config.features.auth !== 'none';
  const auth = config.features.auth;
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
      content: `import Router from '@koa/router';
import { itemsStore } from './items.store.js';
import { NotFoundError } from '../../lib/errors.js';
${inlineCreateSchema(config)}
export const itemsRouter = new Router({ prefix: '/items' });

itemsRouter.get('/', (ctx) => {
  ctx.body = { success: true, data: itemsStore.list() };
});

itemsRouter.get('/:id', (ctx) => {
  const item = itemsStore.get(ctx.params.id);
  if (!item) throw new NotFoundError('Item not found');
  ctx.body = { success: true, data: item };
});

itemsRouter.post('/', (ctx) => {
  const body = ${parseBodySnippet(config, 'ctx.request.body')};
  const item = itemsStore.create(body);
  ctx.status = 201;
  ctx.body = { success: true, data: item };
});

itemsRouter.patch('/:id', (ctx) => {
  const item = itemsStore.update(ctx.params.id, ctx.request.body);
  if (!item) throw new NotFoundError('Item not found');
  ctx.body = { success: true, data: item };
});

itemsRouter.delete('/:id', (ctx) => {
  if (!itemsStore.remove(ctx.params.id)) throw new NotFoundError('Item not found');
  ctx.status = 204;
});
`,
    },
    {
      path: `src/app/create-app.${e}`,
      content: `import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
${sec ? "import cors from '@koa/cors';\nimport helmet from 'koa-helmet';\nimport compress from 'koa-compress';\n" : ''}import { appEnv } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { itemsRouter } from '../modules/items/items.routes.js';
${authEnabled ? "import { authRouter } from '../modules/auth/auth.routes.js';\n" : ''}${docs ? "import { mountDocs } from '../docs/openapi.js';\n" : ''}
export function createApp() {
  const app = new Koa();
  const api = new Router({ prefix: \`\${appEnv.API_PREFIX}/\${appEnv.API_VERSION}\` });

  app.use(async (ctx, next) => {
    const id = (ctx.get('x-request-id') || crypto.randomUUID());
    ctx.set('x-request-id', id);
    ctx.state.requestId = id;
    try {
      await next();
    } catch (err) {
      if (err instanceof AppError) {
        ctx.status = err.statusCode;
        ctx.body = { success: false, error: { code: err.code, message: err.message } };
        return;
      }
      logger.error(err);
      ctx.status = 500;
      ctx.body = { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } };
    }
  });

${sec ? '  app.use(helmet());\n  app.use(cors());\n  app.use(compress());\n' : ''}  app.use(bodyParser({ jsonLimit: '1mb' }));

  const root = new Router();
  root.get('/health', (ctx) => {
    ctx.body = {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });
${docs ? '  mountDocs(root);\n' : ''}
  api.use(itemsRouter.routes(), itemsRouter.allowedMethods());
${authEnabled ? '  api.use(authRouter.routes(), authRouter.allowedMethods());\n' : ''}
  app.use(root.routes()).use(root.allowedMethods());
  app.use(api.routes()).use(api.allowedMethods());

  return app;
}
`,
    },
    {
      path: `src/index.${e}`,
      content: `import { createApp } from './app/create-app.js';
import { appEnv } from './config/env.js';
import { logger } from './lib/logger.js';

const app = createApp();
app.listen(appEnv.PORT, appEnv.HOST, () => {
  logger.info(\`listening on http://\${appEnv.HOST}:\${appEnv.PORT}\`);
});
`,
    },
  ];

  if (auth === 'jwt' || auth === 'passport') {
    files.push({
      path: `src/modules/auth/auth.routes.${e}`,
      content: `import Router from '@koa/router';
import { authService } from './auth.service.js';

export const authRouter = new Router({ prefix: '/auth' });

authRouter.post('/register', async (ctx) => {
  const body = ctx.request.body${ts ? ' as { email: string; password: string }' : ''};
  const result = await authService.register(body.email, body.password);
  ctx.status = 201;
  ctx.body = { success: true, data: result };
});

authRouter.post('/login', async (ctx) => {
  const body = ctx.request.body${ts ? ' as { email: string; password: string }' : ''};
  const result = await authService.login(body.email, body.password);
  ctx.body = { success: true, data: result };
});
`,
    });
  }

  return files;
}
