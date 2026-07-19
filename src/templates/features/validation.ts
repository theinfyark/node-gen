import type { ProjectConfig, GeneratedFile, DepMap } from '../../core/types.js';
import { ver } from '../../core/versions.js';
import { ext } from '../../utils/helpers.js';

export function validationDeps(config: ProjectConfig): DepMap {
  if (config.features.validation === 'zod') return { zod: ver('zod') };
  if (config.features.validation === 'joi') return { joi: ver('joi') };
  return {};
}

/** Shared validate middleware + item schemas for Express (zod or joi). */
export function expressValidationFiles(config: ProjectConfig): GeneratedFile[] {
  if (config.features.validation === 'none') return [];
  const e = ext(config.language);
  const ts = config.language === 'ts';
  const files: GeneratedFile[] = [];
  // MVC writes items schema under models/; layered uses modules/items/
  const schemaPath =
    config.architecture === 'mvc'
      ? `src/models/items.schema.${e}`
      : `src/modules/items/items.schema.${e}`;

  if (config.features.validation === 'zod') {
    // Skip schema file for MVC — expressMvcFiles already emits it
    if (config.architecture !== 'mvc') {
      files.push({
        path: schemaPath,
        content: `import { z } from 'zod';

export const createItemSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
});

export const updateItemSchema = createItemSchema.partial();
`,
      });
    }
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
  } else {
    if (config.architecture !== 'mvc') {
      files.push({
        path: schemaPath,
        content: `import Joi from 'joi';

export const createItemSchema = Joi.object({
  name: Joi.string().min(1).max(120).required(),
  description: Joi.string().max(500).optional(),
});

export const updateItemSchema = Joi.object({
  name: Joi.string().min(1).max(120),
  description: Joi.string().max(500).optional(),
});
`,
      });
    }
    files.push({
      path: `src/middleware/validate.${e}`,
      content: ts
        ? `import type { Request, Response, NextFunction } from 'express';
import type { ObjectSchema } from 'joi';
import { ValidationError } from '../lib/errors.js';

export function validateBody(schema: ObjectSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      next(new ValidationError('Validation failed', error.details));
      return;
    }
    req.body = value;
    next();
  };
}
`
        : `import { ValidationError } from '../lib/errors.js';

export function validateBody(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      next(new ValidationError('Validation failed', error.details));
      return;
    }
    req.body = value;
    next();
  };
}
`,
    });
  }

  return files;
}

/** Inline schema snippet for non-Express frameworks. */
export function inlineCreateSchema(config: ProjectConfig): string {
  if (config.features.validation === 'zod') {
    return `import { z } from 'zod';

const createSchema = z.object({ name: z.string().min(1), description: z.string().optional() });
`;
  }
  if (config.features.validation === 'joi') {
    return `import Joi from 'joi';

const createSchema = Joi.object({
  name: Joi.string().min(1).required(),
  description: Joi.string().optional(),
});
`;
  }
  return '';
}

export function parseBodySnippet(
  config: ProjectConfig,
  bodyExpr: string,
): string {
  if (config.features.validation === 'zod') {
    return `createSchema.parse(${bodyExpr})`;
  }
  if (config.features.validation === 'joi') {
    return `(() => { const { error, value } = createSchema.validate(${bodyExpr}, { abortEarly: false, stripUnknown: true }); if (error) throw error; return value; })()`;
  }
  return bodyExpr;
}
