/**
 * Stable dependency versions for generated projects.
 * Prefer known-good latest stables (no alpha/beta/RC).
 * Updated for node-gen 1.0.0.
 */
export const VERSIONS = {
  // frameworks
  express: '^5.1.0',
  fastify: '^5.3.3',
  hono: '^4.7.11',
  '@hono/node-server': '^1.14.3',
  koa: '^2.16.1',
  '@koa/router': '^13.1.0',
  '@koa/cors': '^5.0.0',
  'koa-bodyparser': '^4.4.1',
  'koa-helmet': '^8.0.1',
  'koa-compress': '^5.1.1',
  'koa-ratelimit': '^5.1.0',
  // security / http
  helmet: '^8.1.0',
  cors: '^2.8.5',
  compression: '^1.8.0',
  'express-rate-limit': '^7.5.0',
  '@fastify/helmet': '^13.0.1',
  '@fastify/cors': '^11.0.1',
  '@fastify/rate-limit': '^10.2.2',
  '@fastify/compress': '^8.0.1',
  // auth
  jsonwebtoken: '^9.0.2',
  passport: '^0.7.0',
  'passport-jwt': '^4.0.1',
  'passport-local': '^1.0.0',
  bcryptjs: '^3.0.2',
  // validation
  zod: '^3.25.28',
  joi: '^17.13.3',
  // auth oidc
  jose: '^6.0.11',
  // orm / db
  prisma: '^6.9.0',
  '@prisma/client': '^6.9.0',
  drizzleorm: '^0.44.1',
  'drizzle-orm': '^0.44.1',
  'drizzle-kit': '^0.31.1',
  mongoose: '^8.15.1',
  pg: '^8.16.0',
  mysql2: '^3.14.1',
  'better-sqlite3': '^11.10.0',
  // cache
  ioredis: '^5.6.1',
  // logger
  pino: '^9.7.0',
  'pino-http': '^10.4.0',
  'pino-pretty': '^13.0.0',
  winston: '^3.17.0',
  'structured-logger-kit': '^1.0.1',
  // env
  'env-ok': '^1.0.2',
  dotenv: '^16.5.0',
  // docs
  '@scalar/express-api-reference': '^0.7.31',
  '@fastify/swagger': '^9.5.0',
  '@fastify/swagger-ui': '^5.2.2',
  'swagger-ui-express': '^5.0.1',
  'koa2-swagger-ui': '^5.11.0',
  // types
  '@types/express': '^5.0.2',
  '@types/cors': '^2.8.18',
  '@types/compression': '^1.8.0',
  '@types/jsonwebtoken': '^9.0.9',
  '@types/passport': '^1.0.17',
  '@types/passport-jwt': '^4.0.1',
  '@types/passport-local': '^1.0.38',
  '@types/bcryptjs': '^2.4.6',
  '@types/koa': '^2.15.0',
  '@types/koa__router': '^12.0.4',
  '@types/koa__cors': '^5.0.0',
  '@types/koa-bodyparser': '^4.3.12',
  '@types/koa-compress': '^4.0.6',
  '@types/swagger-ui-express': '^4.1.8',
  '@types/node': '^22.15.30',
  // tooling
  typescript: '^5.8.3',
  tsx: '^4.19.4',
  vitest: '^3.2.3',
  jest: '^29.7.0',
  'ts-jest': '^29.3.4',
  '@types/jest': '^29.5.14',
  mocha: '^11.5.0',
  chai: '^5.2.0',
  '@types/mocha': '^10.0.10',
  '@types/chai': '^5.2.2',
  'tsc-alias': '^1.8.16',
} as const;

export type VersionKey = keyof typeof VERSIONS;

export function ver(name: string): string {
  if (name in VERSIONS) return VERSIONS[name as VersionKey];
  return 'latest';
}
