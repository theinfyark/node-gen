import type { ProjectConfig, GeneratedFile } from '../../core/types.js';
import { ext } from '../../utils/helpers.js';

const DOMAINS = [
  {
    name: 'items',
    singular: 'item',
    title: 'Item',
    fields: 'name, description',
  },
  {
    name: 'orders',
    singular: 'order',
    title: 'Order',
    fields: 'customerId, total, status',
  },
  {
    name: 'profiles',
    singular: 'profile',
    title: 'Profile',
    fields: 'displayName, email',
  },
] as const;

/** Express MVC: models / views / controllers / routes (+ main routes index). */
export function expressMvcFiles(config: ProjectConfig): GeneratedFile[] {
  const e = ext(config.language);
  const ts = config.language === 'ts';
  const hasValidation = config.features.validation !== 'none';
  const files: GeneratedFile[] = [];

  for (const domain of DOMAINS) {
    files.push(...mvcDomainFiles(config, domain, hasValidation));
  }

  files.push({
    path: `src/routes/index.${e}`,
    content: mainRoutesIndex(config),
  });

  return files;
}

function mvcDomainFiles(
  config: ProjectConfig,
  domain: (typeof DOMAINS)[number],
  hasValidation: boolean,
): GeneratedFile[] {
  const e = ext(config.language);
  const ts = config.language === 'ts';
  const { name, singular, title } = domain;

  const files: GeneratedFile[] = [
    {
      path: `src/models/${name}.model.${e}`,
      content: modelSource(ts, name, singular, title),
    },
    {
      path: `src/views/${name}.view.${e}`,
      content: viewSource(ts, name, singular, title),
    },
    {
      path: `src/controllers/${name}.controller.${e}`,
      content: controllerSource(ts, name, singular, title),
    },
    {
      path: `src/routes/${name}.routes.${e}`,
      content: routeSource(ts, name, singular, hasValidation && name === 'items'),
    },
  ];

  if (hasValidation && name === 'items') {
    files.push({
      path: `src/models/${name}.schema.${e}`,
      content: itemsSchemaSource(config),
    });
  }

  return files;
}

function modelSource(
  ts: boolean,
  name: string,
  singular: string,
  title: string,
): string {
  if (name === 'items') {
    return ts
      ? `export interface ${title} {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

const store = new Map<string, ${title}>();

export const ${name}Model = {
  list(): ${title}[] {
    return [...store.values()];
  },
  get(id: string): ${title} | undefined {
    return store.get(id);
  },
  create(data: { name: string; description?: string }): ${title} {
    const now = new Date().toISOString();
    const row: ${title} = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      createdAt: now,
      updatedAt: now,
    };
    store.set(row.id, row);
    return row;
  },
  update(
    id: string,
    data: Partial<{ name: string; description?: string }>,
  ): ${title} | undefined {
    const existing = store.get(id);
    if (!existing) return undefined;
    const updated: ${title} = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    store.set(id, updated);
    return updated;
  },
  remove(id: string): boolean {
    return store.delete(id);
  },
};
`
      : `const store = new Map();

export const ${name}Model = {
  list() {
    return [...store.values()];
  },
  get(id) {
    return store.get(id);
  },
  create(data) {
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      createdAt: now,
      updatedAt: now,
    };
    store.set(row.id, row);
    return row;
  },
  update(id, data) {
    const existing = store.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    store.set(id, updated);
    return updated;
  },
  remove(id) {
    return store.delete(id);
  },
};
`;
  }

  if (name === 'orders') {
    return ts
      ? `export interface ${title} {
  id: string;
  customerId: string;
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

const store = new Map<string, ${title}>();

export const ${name}Model = {
  list(): ${title}[] {
    return [...store.values()];
  },
  get(id: string): ${title} | undefined {
    return store.get(id);
  },
  create(data: {
    customerId: string;
    total: number;
    status?: ${title}['status'];
  }): ${title} {
    const now = new Date().toISOString();
    const row: ${title} = {
      id: crypto.randomUUID(),
      customerId: data.customerId,
      total: data.total,
      status: data.status ?? 'pending',
      createdAt: now,
      updatedAt: now,
    };
    store.set(row.id, row);
    return row;
  },
  update(
    id: string,
    data: Partial<{ customerId: string; total: number; status: ${title}['status'] }>,
  ): ${title} | undefined {
    const existing = store.get(id);
    if (!existing) return undefined;
    const updated: ${title} = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    store.set(id, updated);
    return updated;
  },
  remove(id: string): boolean {
    return store.delete(id);
  },
};
`
      : `const store = new Map();

export const ${name}Model = {
  list() {
    return [...store.values()];
  },
  get(id) {
    return store.get(id);
  },
  create(data) {
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      customerId: data.customerId,
      total: data.total,
      status: data.status ?? 'pending',
      createdAt: now,
      updatedAt: now,
    };
    store.set(row.id, row);
    return row;
  },
  update(id, data) {
    const existing = store.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    store.set(id, updated);
    return updated;
  },
  remove(id) {
    return store.delete(id);
  },
};
`;
  }

  // profiles
  return ts
    ? `export interface ${title} {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

const store = new Map<string, ${title}>();

export const ${name}Model = {
  list(): ${title}[] {
    return [...store.values()];
  },
  get(id: string): ${title} | undefined {
    return store.get(id);
  },
  create(data: { displayName: string; email: string }): ${title} {
    const now = new Date().toISOString();
    const row: ${title} = {
      id: crypto.randomUUID(),
      displayName: data.displayName,
      email: data.email,
      createdAt: now,
      updatedAt: now,
    };
    store.set(row.id, row);
    return row;
  },
  update(
    id: string,
    data: Partial<{ displayName: string; email: string }>,
  ): ${title} | undefined {
    const existing = store.get(id);
    if (!existing) return undefined;
    const updated: ${title} = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    store.set(id, updated);
    return updated;
  },
  remove(id: string): boolean {
    return store.delete(id);
  },
};
`
    : `const store = new Map();

export const ${name}Model = {
  list() {
    return [...store.values()];
  },
  get(id) {
    return store.get(id);
  },
  create(data) {
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      displayName: data.displayName,
      email: data.email,
      createdAt: now,
      updatedAt: now,
    };
    store.set(row.id, row);
    return row;
  },
  update(id, data) {
    const existing = store.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    store.set(id, updated);
    return updated;
  },
  remove(id) {
    return store.delete(id);
  },
};
`;
}

function viewSource(
  ts: boolean,
  name: string,
  _singular: string,
  title: string,
): string {
  return ts
    ? `import type { ${title} } from '../models/${name}.model.js';

/** JSON view helpers for ${title} responses. */
export const ${name}View = {
  one(row: ${title}) {
    return { success: true as const, data: row };
  },
  many(rows: ${title}[]) {
    return { success: true as const, data: rows, meta: { count: rows.length } };
  },
};
`
    : `/** JSON view helpers for ${title} responses. */
export const ${name}View = {
  one(row) {
    return { success: true, data: row };
  },
  many(rows) {
    return { success: true, data: rows, meta: { count: rows.length } };
  },
};
`;
}

function controllerSource(
  ts: boolean,
  name: string,
  _singular: string,
  title: string,
): string {
  return ts
    ? `import type { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../lib/errors.js';
import { ${name}Model } from '../models/${name}.model.js';
import { ${name}View } from '../views/${name}.view.js';

export const ${name}Controller = {
  list(_req: Request, res: Response): void {
    res.json(${name}View.many(${name}Model.list()));
  },
  get(req: Request, res: Response, next: NextFunction): void {
    try {
      const row = ${name}Model.get(req.params.id);
      if (!row) throw new NotFoundError('${title} not found');
      res.json(${name}View.one(row));
    } catch (err) {
      next(err);
    }
  },
  create(req: Request, res: Response, next: NextFunction): void {
    try {
      const row = ${name}Model.create(req.body);
      res.status(201).json(${name}View.one(row));
    } catch (err) {
      next(err);
    }
  },
  update(req: Request, res: Response, next: NextFunction): void {
    try {
      const row = ${name}Model.update(req.params.id, req.body);
      if (!row) throw new NotFoundError('${title} not found');
      res.json(${name}View.one(row));
    } catch (err) {
      next(err);
    }
  },
  remove(req: Request, res: Response, next: NextFunction): void {
    try {
      if (!${name}Model.remove(req.params.id)) {
        throw new NotFoundError('${title} not found');
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
`
    : `import { NotFoundError } from '../lib/errors.js';
import { ${name}Model } from '../models/${name}.model.js';
import { ${name}View } from '../views/${name}.view.js';

export const ${name}Controller = {
  list(_req, res) {
    res.json(${name}View.many(${name}Model.list()));
  },
  get(req, res, next) {
    try {
      const row = ${name}Model.get(req.params.id);
      if (!row) throw new NotFoundError('${title} not found');
      res.json(${name}View.one(row));
    } catch (err) {
      next(err);
    }
  },
  create(req, res, next) {
    try {
      const row = ${name}Model.create(req.body);
      res.status(201).json(${name}View.one(row));
    } catch (err) {
      next(err);
    }
  },
  update(req, res, next) {
    try {
      const row = ${name}Model.update(req.params.id, req.body);
      if (!row) throw new NotFoundError('${title} not found');
      res.json(${name}View.one(row));
    } catch (err) {
      next(err);
    }
  },
  remove(req, res, next) {
    try {
      if (!${name}Model.remove(req.params.id)) {
        throw new NotFoundError('${title} not found');
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
`;
}

function routeSource(
  ts: boolean,
  name: string,
  _singular: string,
  withValidation: boolean,
): string {
  const validateImport = withValidation
    ? `import { validateBody } from '../middleware/validate.js';\nimport { createItemSchema, updateItemSchema } from '../models/${name}.schema.js';\n`
    : '';
  const postMw = withValidation ? ', validateBody(createItemSchema)' : '';
  const patchMw = withValidation ? ', validateBody(updateItemSchema)' : '';

  return `import { Router } from 'express';
import { ${name}Controller } from '../controllers/${name}.controller.js';
${validateImport}
export const ${name}Router = Router();

${name}Router.get('/', ${name}Controller.list);
${name}Router.get('/:id', ${name}Controller.get);
${name}Router.post('/'${postMw}, ${name}Controller.create);
${name}Router.patch('/:id'${patchMw}, ${name}Controller.update);
${name}Router.delete('/:id', ${name}Controller.remove);
`;
}

function itemsSchemaSource(config: ProjectConfig): string {
  if (config.features.validation === 'joi') {
    return `import Joi from 'joi';

export const createItemSchema = Joi.object({
  name: Joi.string().min(1).required(),
  description: Joi.string().allow('').optional(),
});

export const updateItemSchema = Joi.object({
  name: Joi.string().min(1).optional(),
  description: Joi.string().allow('').optional(),
}).min(1);
`;
  }
  return `import { z } from 'zod';

export const createItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const updateItemSchema = createItemSchema.partial();
`;
}

function mainRoutesIndex(config: ProjectConfig): string {
  const auth = config.features.auth !== 'none';
  return `import { Router } from 'express';
import { itemsRouter } from './items.routes.js';
import { ordersRouter } from './orders.routes.js';
import { profilesRouter } from './profiles.routes.js';
${auth ? "import { authRouter } from '../modules/auth/auth.route.js';\n" : ''}
/**
 * Main API router — mount domain routers here.
 * Add new domains under src/routes/<name>.routes and register below.
 */
export const apiRouter = Router();

apiRouter.use('/items', itemsRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/profiles', profilesRouter);
${auth ? "apiRouter.use('/auth', authRouter);\n" : ''}
`;
}

/** Layered architecture: keep modules, but expose a main routes/index aggregator. */
export function expressLayeredRoutesIndex(config: ProjectConfig): GeneratedFile {
  const e = ext(config.language);
  const auth = config.features.auth !== 'none';
  return {
    path: `src/routes/index.${e}`,
    content: `import { Router } from 'express';
import { itemsRouter } from '../modules/items/items.route.js';
${auth ? "import { authRouter } from '../modules/auth/auth.route.js';\n" : ''}
/**
 * Main API router — mount feature routers here.
 */
export const apiRouter = Router();

apiRouter.use('/items', itemsRouter);
${auth ? "apiRouter.use('/auth', authRouter);\n" : ''}
`,
  };
}
