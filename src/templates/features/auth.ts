import type { ProjectConfig, GeneratedFile, DepMap } from "../../core/types.js";
import { ver } from "../../core/versions.js";
import { ext } from "../../utils/helpers.js";

export function authDeps(config: ProjectConfig): DepMap {
  if (config.features.auth === "none") return {};
  const d: DepMap = {
    jsonwebtoken: ver("jsonwebtoken"),
    bcryptjs: ver("bcryptjs"),
  };
  if (config.features.auth === "passport") {
    d.passport = ver("passport");
    d["passport-jwt"] = ver("passport-jwt");
    d["passport-local"] = ver("passport-local");
  }
  return d;
}

export function authDevDeps(config: ProjectConfig): DepMap {
  if (config.features.auth === "none" || config.language !== "ts") return {};
  const d: DepMap = {
    "@types/jsonwebtoken": ver("@types/jsonwebtoken"),
    "@types/bcryptjs": ver("@types/bcryptjs"),
  };
  if (config.features.auth === "passport") {
    d["@types/passport"] = ver("@types/passport");
    d["@types/passport-jwt"] = ver("@types/passport-jwt");
    d["@types/passport-local"] = ver("@types/passport-local");
  }
  return d;
}

export function authFiles(config: ProjectConfig): GeneratedFile[] {
  if (config.features.auth === "none") return [];
  const e = ext(config.language);
  const ts = config.language === "ts";
  const files: GeneratedFile[] = [
    {
      path: `src/modules/auth/auth.service.${e}`,
      content: `import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { appEnv } from '../../config/env.js';
import { UnauthorizedError } from '../../lib/errors.js';

const users = new Map();

export const authService = {
  async register(email${ts ? ": string" : ""}, password${ts ? ": string" : ""}) {
    if (users.has(email)) throw new UnauthorizedError('User already exists');
    const hash = await bcrypt.hash(password, 10);
    const user = { id: crypto.randomUUID(), email, passwordHash: hash };
    users.set(email, user);
    return { id: user.id, email: user.email, token: signToken(user) };
  },
  async login(email${ts ? ": string" : ""}, password${ts ? ": string" : ""}) {
    const user = users.get(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedError('Invalid credentials');
    }
    return { id: user.id, email: user.email, token: signToken(user) };
  },
};

function signToken(user${ts ? ": { id: string; email: string }" : ""}) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    appEnv.JWT_SECRET,
    { expiresIn: appEnv.JWT_EXPIRES_IN },
  );
}
`,
    },
  ];

  if (config.framework === "express") {
    files.push({
      path: `src/modules/auth/auth.route.${e}`,
      content: `import { Router } from 'express';
import { authService } from './auth.service.js';
${config.features.validation ? `import { z } from 'zod';
import { validateBody } from '../../middleware/validate.js';

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
` : ""}
export const authRouter = Router();

authRouter.post('/register'${config.features.validation ? ", validateBody(credsSchema)" : ""}, async (req, res, next) => {
  try {
    const result = await authService.register(req.body.email, req.body.password);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login'${config.features.validation ? ", validateBody(credsSchema)" : ""}, async (req, res, next) => {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});
`,
    });
    files.push({
      path: `src/middleware/auth.${e}`,
      content: ts
        ? `import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { appEnv } from '../config/env.js';
import { UnauthorizedError } from '../lib/errors.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new UnauthorizedError());
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), appEnv.JWT_SECRET);
    (req as Request & { user?: unknown }).user = payload;
    next();
  } catch {
    next(new UnauthorizedError('Invalid token'));
  }
}
`
        : `import jwt from 'jsonwebtoken';
import { appEnv } from '../config/env.js';
import { UnauthorizedError } from '../lib/errors.js';

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new UnauthorizedError());
    return;
  }
  try {
    req.user = jwt.verify(header.slice(7), appEnv.JWT_SECRET);
    next();
  } catch {
    next(new UnauthorizedError('Invalid token'));
  }
}
`,
    });
  } else if (config.framework === "fastify") {
    files.push({
      path: `src/modules/auth/auth.routes.${e}`,
      content: `${ts ? "import type { FastifyInstance } from 'fastify';\n" : ""}import { authService } from './auth.service.js';

export async function authRoutes(app${ts ? ": FastifyInstance" : ""}) {
  app.post('/register', async (req, reply) => {
    const body = req.body${ts ? " as { email: string; password: string }" : ""};
    const result = await authService.register(body.email, body.password);
    return reply.code(201).send({ success: true, data: result });
  });
  app.post('/login', async (req) => {
    const body = req.body${ts ? " as { email: string; password: string }" : ""};
    const result = await authService.login(body.email, body.password);
    return { success: true, data: result };
  });
}
`,
    });
  } else {
    files.push({
      path: `src/modules/auth/auth.routes.${e}`,
      content: `import { Hono } from 'hono';
import { authService } from './auth.service.js';

export const authRoutes = new Hono();

authRoutes.post('/register', async (c) => {
  const body = await c.req.json();
  const result = await authService.register(body.email, body.password);
  return c.json({ success: true, data: result }, 201);
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const result = await authService.login(body.email, body.password);
  return c.json({ success: true, data: result });
});
`,
    });
  }

  return files;
}
