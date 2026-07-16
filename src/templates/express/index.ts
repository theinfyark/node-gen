import type { ProjectConfig, GeneratedFile, DepMap } from "../../core/types.js";
import { ver } from "../../core/versions.js";
import { ext } from "../../utils/helpers.js";

export function expressDeps(config: ProjectConfig): DepMap {
  const d: DepMap = {
    express: ver("express"),
  };
  if (config.features.security) {
    d.helmet = ver("helmet");
    d.cors = ver("cors");
    d.compression = ver("compression");
    d["express-rate-limit"] = ver("express-rate-limit");
  }
  if (config.features.logger === "pino") {
    d["pino-http"] = ver("pino-http");
  }
  return d;
}

export function expressDevDeps(config: ProjectConfig): DepMap {
  if (config.language !== "ts") return {};
  const d: DepMap = {
    "@types/express": ver("@types/express"),
  };
  if (config.features.security) {
    d["@types/cors"] = ver("@types/cors");
    d["@types/compression"] = ver("@types/compression");
  }
  return d;
}

export function expressFiles(config: ProjectConfig): GeneratedFile[] {
  const e = ext(config.language);
  const ts = config.language === "ts";
  const files: GeneratedFile[] = [];

  files.push({
    path: `src/middleware/request-id.${e}`,
    content: ts
      ? `import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      correlationId?: string;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  const correlation =
    (req.headers['x-correlation-id'] as string) || id;
  req.requestId = id;
  req.correlationId = correlation;
  res.setHeader('x-request-id', id);
  res.setHeader('x-correlation-id', correlation);
  next();
}
`
      : `import { randomUUID } from 'node:crypto';

export function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || randomUUID();
  const correlation = req.headers['x-correlation-id'] || id;
  req.requestId = id;
  req.correlationId = correlation;
  res.setHeader('x-request-id', id);
  res.setHeader('x-correlation-id', correlation);
  next();
}
`,
  });

  files.push({
    path: `src/middleware/error-handler.${e}`,
    content: ts
      ? `import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: (err as { details?: unknown }).details },
    });
    return;
  }
  logger.error(err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
}
`
      : `import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  logger.error(err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
}
`,
  });

  files.push({
    path: `src/health/health.route.${e}`,
    content: ts
      ? `import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
`
      : `import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
`,
  });

  // Items CRUD module
  files.push(...itemsModuleExpress(config));

  files.push({
    path: `src/app/create-app.${e}`,
    content: createAppSource(config),
  });

  files.push({
    path: `src/index.${e}`,
    content: ts
      ? `import { createApp } from './app/create-app.js';
import { appEnv } from './config/env.js';
import { logger } from './lib/logger.js';

const app = createApp();

app.listen(appEnv.PORT, appEnv.HOST, () => {
  logger.info(\`🚀 \${process.env.npm_package_name ?? 'app'} listening on http://\${appEnv.HOST}:\${appEnv.PORT}\`);
});
`
      : `import { createApp } from './app/create-app.js';
import { appEnv } from './config/env.js';
import { logger } from './lib/logger.js';

const app = createApp();

app.listen(appEnv.PORT, appEnv.HOST, () => {
  logger.info(\`🚀 listening on http://\${appEnv.HOST}:\${appEnv.PORT}\`);
});
`,
  });

  if (config.features.testing) {
    files.push({
      path: `tests/health.test.${e}`,
      content: ts
        ? `import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app/create-app.js';

describe('health', () => {
  it('returns 200', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const res = await fetch(\`http://127.0.0.1:\${port}/health\`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    server.close();
  });
});
`
        : `import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app/create-app.js';

describe('health', () => {
  it('returns 200', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const res = await fetch(\`http://127.0.0.1:\${port}/health\`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    server.close();
  });
});
`,
    });
  }

  return files;
}

function createAppSource(config: ProjectConfig): string {
  const ts = config.language === "ts";
  const sec = config.features.security;
  const auth = config.features.auth !== "none";
  const docs = config.features.apiDocs;

  return `${ts ? "import express from 'express';\n" : "import express from 'express';\n"}${sec ? "import helmet from 'helmet';\nimport cors from 'cors';\nimport compression from 'compression';\nimport rateLimit from 'express-rate-limit';\n" : ""}${config.features.logger === "pino" ? "import pinoHttp from 'pino-http';\nimport { logger } from '../lib/logger.js';\n" : ""}import { requestId } from '../middleware/request-id.js';
import { errorHandler, notFoundHandler } from '../middleware/error-handler.js';
import { healthRouter } from '../health/health.route.js';
import { itemsRouter } from '../modules/items/items.route.js';
import { appEnv } from '../config/env.js';
${auth ? "import { authRouter } from '../modules/auth/auth.route.js';\n" : ""}${docs ? "import { mountDocs } from '../docs/openapi.js';\n" : ""}
export function createApp() {
  const app = express();

  app.use(requestId);
${config.features.logger === "pino" ? "  app.use(pinoHttp({ logger }));\n" : ""}${sec ? `  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
` : "  app.use(express.json({ limit: '1mb' }));\n"}
  app.use(healthRouter);
${docs ? "  mountDocs(app);\n" : ""}
  const api = express.Router();
  api.use('/items', itemsRouter);
${auth ? "  api.use('/auth', authRouter);\n" : ""}  app.use(\`\${appEnv.API_PREFIX}/\${appEnv.API_VERSION}\`, api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
`;
}

function itemsModuleExpress(config: ProjectConfig): GeneratedFile[] {
  const e = ext(config.language);
  const ts = config.language === "ts";
  const zod = config.features.validation;

  const files: GeneratedFile[] = [
    {
      path: `src/modules/items/items.store.${e}`,
      content: ts
        ? `export interface Item {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

const items = new Map<string, Item>();

export const itemsStore = {
  list(): Item[] {
    return [...items.values()];
  },
  get(id: string): Item | undefined {
    return items.get(id);
  },
  create(data: { name: string; description?: string }): Item {
    const now = new Date().toISOString();
    const item: Item = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      createdAt: now,
      updatedAt: now,
    };
    items.set(item.id, item);
    return item;
  },
  update(id: string, data: Partial<{ name: string; description?: string }>): Item | undefined {
    const existing = items.get(id);
    if (!existing) return undefined;
    const updated: Item = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    items.set(id, updated);
    return updated;
  },
  remove(id: string): boolean {
    return items.delete(id);
  },
};
`
        : `const items = new Map();

export const itemsStore = {
  list() {
    return [...items.values()];
  },
  get(id) {
    return items.get(id);
  },
  create(data) {
    const now = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      createdAt: now,
      updatedAt: now,
    };
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
  remove(id) {
    return items.delete(id);
  },
};
`,
    },
    {
      path: `src/modules/items/items.service.${e}`,
      content: ts
        ? `import { NotFoundError } from '../../lib/errors.js';
import { itemsStore, type Item } from './items.store.js';

export const itemsService = {
  list(): Item[] {
    return itemsStore.list();
  },
  get(id: string): Item {
    const item = itemsStore.get(id);
    if (!item) throw new NotFoundError('Item not found');
    return item;
  },
  create(data: { name: string; description?: string }): Item {
    return itemsStore.create(data);
  },
  update(id: string, data: Partial<{ name: string; description?: string }>): Item {
    const item = itemsStore.update(id, data);
    if (!item) throw new NotFoundError('Item not found');
    return item;
  },
  remove(id: string): void {
    if (!itemsStore.remove(id)) throw new NotFoundError('Item not found');
  },
};
`
        : `import { NotFoundError } from '../../lib/errors.js';
import { itemsStore } from './items.store.js';

export const itemsService = {
  list() {
    return itemsStore.list();
  },
  get(id) {
    const item = itemsStore.get(id);
    if (!item) throw new NotFoundError('Item not found');
    return item;
  },
  create(data) {
    return itemsStore.create(data);
  },
  update(id, data) {
    const item = itemsStore.update(id, data);
    if (!item) throw new NotFoundError('Item not found');
    return item;
  },
  remove(id) {
    if (!itemsStore.remove(id)) throw new NotFoundError('Item not found');
  },
};
`,
    },
  ];

  if (zod) {
    files.push({
      path: `src/modules/items/items.schema.${e}`,
      content: `import { z } from 'zod';

export const createItemSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
});

export const updateItemSchema = createItemSchema.partial();
`,
    });
    files.push({
      path: `src/middleware/validate.${e}`,
      content: ts
        ? `import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../lib/errors.js';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(new ValidationError('Validation failed', parsed.error.flatten()));
      return;
    }
    req.body = parsed.data;
    next();
  };
}
`
        : `import { ValidationError } from '../lib/errors.js';

export function validateBody(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(new ValidationError('Validation failed', parsed.error.flatten()));
      return;
    }
    req.body = parsed.data;
    next();
  };
}
`,
    });
  }

  files.push({
    path: `src/modules/items/items.route.${e}`,
    content: ts
      ? `import { Router } from 'express';
import { itemsService } from './items.service.js';
${zod ? "import { validateBody } from '../../middleware/validate.js';\nimport { createItemSchema, updateItemSchema } from './items.schema.js';\n" : ""}
export const itemsRouter = Router();

itemsRouter.get('/', (_req, res) => {
  res.json({ success: true, data: itemsService.list() });
});

itemsRouter.get('/:id', (req, res, next) => {
  try {
    res.json({ success: true, data: itemsService.get(req.params.id) });
  } catch (err) {
    next(err);
  }
});

itemsRouter.post('/'${zod ? ", validateBody(createItemSchema)" : ""}, (req, res, next) => {
  try {
    const item = itemsService.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

itemsRouter.patch('/:id'${zod ? ", validateBody(updateItemSchema)" : ""}, (req, res, next) => {
  try {
    const item = itemsService.update(req.params.id, req.body);
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

itemsRouter.delete('/:id', (req, res, next) => {
  try {
    itemsService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
`
      : `import { Router } from 'express';
import { itemsService } from './items.service.js';
${zod ? "import { validateBody } from '../../middleware/validate.js';\nimport { createItemSchema, updateItemSchema } from './items.schema.js';\n" : ""}
export const itemsRouter = Router();

itemsRouter.get('/', (_req, res) => {
  res.json({ success: true, data: itemsService.list() });
});

itemsRouter.get('/:id', (req, res, next) => {
  try {
    res.json({ success: true, data: itemsService.get(req.params.id) });
  } catch (err) {
    next(err);
  }
});

itemsRouter.post('/'${zod ? ", validateBody(createItemSchema)" : ""}, (req, res, next) => {
  try {
    const item = itemsService.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

itemsRouter.patch('/:id'${zod ? ", validateBody(updateItemSchema)" : ""}, (req, res, next) => {
  try {
    const item = itemsService.update(req.params.id, req.body);
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

itemsRouter.delete('/:id', (req, res, next) => {
  try {
    itemsService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
`,
  });

  return files;
}
