import type { ProjectConfig, GeneratedFile, DepMap } from '../../core/types.js';
import { ver } from '../../core/versions.js';
import { ext } from '../../utils/helpers.js';

const OIDC_PROVIDERS = new Set(['auth0', 'okta', 'keycloak']);

export function authDeps(config: ProjectConfig): DepMap {
  if (config.features.auth === 'none') return {};
  if (OIDC_PROVIDERS.has(config.features.auth)) {
    return { jose: ver('jose') };
  }
  const d: DepMap = {
    jsonwebtoken: ver('jsonwebtoken'),
    bcryptjs: ver('bcryptjs'),
  };
  if (config.features.auth === 'passport') {
    d.passport = ver('passport');
    d['passport-jwt'] = ver('passport-jwt');
    d['passport-local'] = ver('passport-local');
  }
  return d;
}

export function authDevDeps(config: ProjectConfig): DepMap {
  if (config.features.auth === 'none' || config.language !== 'ts') return {};
  if (OIDC_PROVIDERS.has(config.features.auth)) return {};
  const d: DepMap = {
    '@types/jsonwebtoken': ver('@types/jsonwebtoken'),
    '@types/bcryptjs': ver('@types/bcryptjs'),
  };
  if (config.features.auth === 'passport') {
    d['@types/passport'] = ver('@types/passport');
    d['@types/passport-jwt'] = ver('@types/passport-jwt');
    d['@types/passport-local'] = ver('@types/passport-local');
  }
  return d;
}

function oidcEnvBlock(auth: string): string {
  if (auth === 'auth0') {
    return `AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.example.com
AUTH_JWKS_URI=https://your-tenant.auth0.com/.well-known/jwks.json
AUTH_ISSUER=https://your-tenant.auth0.com/
`;
  }
  if (auth === 'okta') {
    return `OKTA_DOMAIN=https://your-org.okta.com
OKTA_AUDIENCE=api://default
AUTH_JWKS_URI=https://your-org.okta.com/oauth2/default/v1/keys
AUTH_ISSUER=https://your-org.okta.com/oauth2/default
`;
  }
  // keycloak
  return `KEYCLOAK_REALM_URL=https://keycloak.example.com/realms/myrealm
KEYCLOAK_CLIENT_ID=my-api
AUTH_JWKS_URI=https://keycloak.example.com/realms/myrealm/protocol/openid-connect/certs
AUTH_ISSUER=https://keycloak.example.com/realms/myrealm
`;
}

export function oidcEnvLines(config: ProjectConfig): string[] {
  if (!OIDC_PROVIDERS.has(config.features.auth)) return [];
  return oidcEnvBlock(config.features.auth).trim().split('\n');
}

function oidcMiddlewareSource(config: ProjectConfig): string {
  const e = ext(config.language);
  const ts = config.language === 'ts';
  const provider = config.features.auth;

  const common = `import { createRemoteJWKSet, jwtVerify } from 'jose';
import { appEnv } from '../config/env.js';
import { UnauthorizedError } from '../lib/errors.js';

const jwks = createRemoteJWKSet(new URL(appEnv.AUTH_JWKS_URI));

export async function verifyAccessToken(token${ts ? ': string' : ''}) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: appEnv.AUTH_ISSUER,
    audience: appEnv.AUTH_AUDIENCE,
  });
  return payload;
}
`;

  if (config.framework === 'express') {
    return `${common}
${ts ? "import type { Request, Response, NextFunction } from 'express';\n" : ''}
export function requireAuth(req${ts ? ': Request' : ''}, _res${ts ? ': Response' : ''}, next${ts ? ': NextFunction' : ''}) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new UnauthorizedError());
    return;
  }
  verifyAccessToken(header.slice(7))
    .then((payload) => {
      (req${ts ? ' as Request & { user?: unknown }' : ''}).user = payload;
      next();
    })
    .catch(() => next(new UnauthorizedError('Invalid token')));
}
`;
  }

  if (config.framework === 'fastify') {
    return `${common}
export async function requireAuth(req${ts ? ': { headers: { authorization?: string }; user?: unknown }' : ''}) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedError();
  req.user = await verifyAccessToken(header.slice(7));
}
`;
  }

  if (config.framework === 'koa') {
    return `${common}
export async function requireAuth(ctx${ts ? ': { get: (h: string) => string; state: Record<string, unknown> }' : ''}, next${ts ? ': () => Promise<void>' : ''}) {
  const header = ctx.get('authorization');
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedError();
  ctx.state.user = await verifyAccessToken(header.slice(7));
  await next();
}
`;
  }

  // hono
  return `${common}
export async function requireAuth(c${ts ? ': { req: { header: (n: string) => string | undefined }; set: (k: string, v: unknown) => void }' : ''}, next${ts ? ': () => Promise<void>' : ''}) {
  const header = c.req.header('authorization');
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedError();
  c.set('user', await verifyAccessToken(header.slice(7)));
  await next();
}
`;
}

function oidcAuthRouteSource(config: ProjectConfig): string {
  const provider = config.features.auth;
  const label =
    provider === 'auth0' ? 'Auth0' : provider === 'okta' ? 'Okta' : 'Keycloak';

  if (config.framework === 'express') {
    return `import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';

export const authRouter = Router();

/** Protected probe — send Authorization: Bearer <${label} access token> */
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, data: { provider: '${provider}', user: req.user } });
});
`;
  }

  if (config.framework === 'fastify') {
    return `import { requireAuth } from '../../middleware/auth.js';

export async function authRoutes(app) {
  app.get('/me', { preHandler: requireAuth }, async (req) => ({
    success: true,
    data: { provider: '${provider}', user: req.user },
  }));
}
`;
  }

  if (config.framework === 'koa') {
    return `import Router from '@koa/router';
import { requireAuth } from '../../middleware/auth.js';

export const authRouter = new Router({ prefix: '/auth' });

authRouter.get('/me', requireAuth, (ctx) => {
  ctx.body = { success: true, data: { provider: '${provider}', user: ctx.state.user } };
});
`;
  }

  return `import { Hono } from 'hono';
import { requireAuth } from '../../middleware/auth.js';

export const authRoutes = new Hono();

authRoutes.get('/me', requireAuth, (c) =>
  c.json({ success: true, data: { provider: '${provider}', user: c.get('user') } }),
);
`;
}

export function authFiles(config: ProjectConfig): GeneratedFile[] {
  if (config.features.auth === 'none') return [];
  const e = ext(config.language);
  const ts = config.language === 'ts';
  const validation = config.features.validation;

  if (OIDC_PROVIDERS.has(config.features.auth)) {
    const files: GeneratedFile[] = [
      {
        path: `src/middleware/auth.${e}`,
        content: oidcMiddlewareSource(config),
      },
    ];
    if (config.framework === 'express') {
      files.push({
        path: `src/modules/auth/auth.route.${e}`,
        content: oidcAuthRouteSource(config),
      });
    } else if (config.framework === 'koa') {
      files.push({
        path: `src/modules/auth/auth.routes.${e}`,
        content: oidcAuthRouteSource(config),
      });
    } else if (config.framework === 'fastify' || config.framework === 'hono') {
      files.push({
        path: `src/modules/auth/auth.routes.${e}`,
        content: oidcAuthRouteSource(config),
      });
    }
    return files;
  }

  // JWT / Passport local
  const files: GeneratedFile[] = [
    {
      path: `src/modules/auth/auth.service.${e}`,
      content: `import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { appEnv } from '../../config/env.js';
import { UnauthorizedError } from '../../lib/errors.js';

const users = new Map();

export const authService = {
  async register(email${ts ? ': string' : ''}, password${ts ? ': string' : ''}) {
    if (users.has(email)) throw new UnauthorizedError('User already exists');
    const hash = await bcrypt.hash(password, 10);
    const user = { id: crypto.randomUUID(), email, passwordHash: hash };
    users.set(email, user);
    return { id: user.id, email: user.email, token: signToken(user) };
  },
  async login(email${ts ? ': string' : ''}, password${ts ? ': string' : ''}) {
    const user = users.get(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedError('Invalid credentials');
    }
    return { id: user.id, email: user.email, token: signToken(user) };
  },
};

function signToken(user${ts ? ': { id: string; email: string }' : ''}) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    appEnv.JWT_SECRET,
    { expiresIn: appEnv.JWT_EXPIRES_IN },
  );
}
`,
    },
  ];

  const zodCreds = `import { z } from 'zod';
import { validateBody } from '../../middleware/validate.js';

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
`;
  const joiCreds = `import Joi from 'joi';
import { validateBody } from '../../middleware/validate.js';

const credsSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});
`;
  const valImport =
    validation === 'zod' ? zodCreds : validation === 'joi' ? joiCreds : '';
  const valMw = validation !== 'none' ? ', validateBody(credsSchema)' : '';

  if (config.framework === 'express') {
    files.push({
      path: `src/modules/auth/auth.route.${e}`,
      content: `import { Router } from 'express';
import { authService } from './auth.service.js';
${valImport}
export const authRouter = Router();

authRouter.post('/register'${valMw}, async (req, res, next) => {
  try {
    const result = await authService.register(req.body.email, req.body.password);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login'${valMw}, async (req, res, next) => {
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
  } else if (config.framework === 'fastify') {
    files.push({
      path: `src/modules/auth/auth.routes.${e}`,
      content: `${ts ? "import type { FastifyInstance } from 'fastify';\n" : ''}import { authService } from './auth.service.js';

export async function authRoutes(app${ts ? ': FastifyInstance' : ''}) {
  app.post('/register', async (req, reply) => {
    const body = req.body${ts ? ' as { email: string; password: string }' : ''};
    const result = await authService.register(body.email, body.password);
    return reply.code(201).send({ success: true, data: result });
  });
  app.post('/login', async (req) => {
    const body = req.body${ts ? ' as { email: string; password: string }' : ''};
    const result = await authService.login(body.email, body.password);
    return { success: true, data: result };
  });
}
`,
    });
  } else if (config.framework === 'hono') {
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
  // koa auth routes for jwt/passport are in koa template when auth !== none

  return files;
}

export function isOidcAuth(auth: string): boolean {
  return OIDC_PROVIDERS.has(auth);
}
