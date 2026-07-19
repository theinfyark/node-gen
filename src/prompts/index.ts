import * as p from '@clack/prompts';
import path from 'node:path';
import pc from 'picocolors';
import type {
  ProjectConfig,
  Language,
  Framework,
  PackageManager,
  ModuleSystem,
  NodeVersion,
  AuthProvider,
  Database,
  Orm,
  LoggerChoice,
  CacheChoice,
  DocsChoice,
  TestRunner,
  ValidationChoice,
  Architecture,
} from '../core/types.js';
import { defaultConfig } from '../core/generator.js';

function isCancel(value: unknown): boolean {
  if (p.isCancel(value)) {
    p.cancel('Scaffold cancelled.');
    process.exit(0);
  }
  return false;
}

export async function runPrompts(cwd = process.cwd()): Promise<ProjectConfig> {
  p.intro(
    pc.bgCyan(pc.black(' node-gen ')) + ' Enterprise Node.js backend generator',
  );

  const projectName = await p.text({
    message: 'Project name',
    placeholder: 'my-api',
    validate: (v) => {
      if (!v || !/^[a-z0-9._-]+$/i.test(v)) return 'Use a valid package name';
    },
  });
  isCancel(projectName);

  const language = await p.select({
    message: 'Language',
    options: [
      { value: 'ts', label: 'TypeScript', hint: 'recommended' },
      { value: 'js', label: 'JavaScript' },
    ],
  });
  isCancel(language);

  const framework = await p.select({
    message: 'Framework',
    options: [
      { value: 'express', label: 'Express' },
      { value: 'fastify', label: 'Fastify' },
      { value: 'hono', label: 'Hono' },
      { value: 'koa', label: 'Koa' },
    ],
  });
  isCancel(framework);

  const packageManager = await p.select({
    message: 'Package manager',
    options: [
      { value: 'npm', label: 'npm' },
      { value: 'pnpm', label: 'pnpm' },
      { value: 'yarn', label: 'yarn' },
      { value: 'bun', label: 'bun' },
    ],
  });
  isCancel(packageManager);

  const moduleSystem = await p.select({
    message: 'Module system',
    options: [
      { value: 'esm', label: 'ESM', hint: 'recommended' },
      { value: 'cjs', label: 'CommonJS' },
    ],
  });
  isCancel(moduleSystem);

  const nodeVersion = await p.select({
    message: 'Node.js version',
    options: [
      { value: '22.23.1', label: 'v22.23.1', hint: 'recommended' },
      { value: '24.18.0', label: 'v24.18.0' },
      { value: '22', label: '22 LTS (major)' },
      { value: '20', label: '20 LTS (major)' },
    ],
  });
  isCancel(nodeVersion);

  const portChoice = await p.select({
    message: 'Port',
    options: [
      { value: '3000', label: '3000' },
      { value: '4000', label: '4000' },
      { value: '5000', label: '5000' },
      { value: '8080', label: '8080' },
      { value: 'custom', label: 'Custom' },
    ],
  });
  isCancel(portChoice);

  let port = Number(portChoice);
  if (portChoice === 'custom') {
    const custom = await p.text({
      message: 'Custom port',
      placeholder: '3000',
      validate: (v) => {
        const n = Number(v);
        if (!n || n < 1 || n > 65535) return 'Enter a valid port';
      },
    });
    isCancel(custom);
    port = Number(custom);
  }

  const architecture = await p.select({
    message: 'Architecture',
    options: [
      {
        value: 'mvc',
        label: 'MVC (models / views / controllers + routes)',
        hint: 'recommended',
      },
      {
        value: 'layered',
        label: 'Layered (modules with services / stores)',
      },
    ],
  });
  isCancel(architecture);
  const optional = await p.group(
    {
      auth: () =>
        p.confirm({ message: 'Add authentication?', initialValue: false }),
      validation: () =>
        p.confirm({ message: 'Add request validation?', initialValue: true }),
      database: () =>
        p.confirm({ message: 'Add a database?', initialValue: false }),
      cache: () =>
        p.confirm({ message: 'Add Redis cache?', initialValue: false }),
      logger: () =>
        p.confirm({ message: 'Configure logger?', initialValue: true }),
      docs: () =>
        p.confirm({ message: 'Add API documentation?', initialValue: false }),
      docker: () => p.confirm({ message: 'Add Docker?', initialValue: false }),
      ci: () =>
        p.confirm({ message: 'Add GitHub Actions CI?', initialValue: true }),
      security: () =>
        p.confirm({
          message: 'Enable security middleware defaults?',
          initialValue: true,
        }),
      testing: () => p.confirm({ message: 'Add tests?', initialValue: true }),
      monitoring: () =>
        p.confirm({ message: 'Add monitoring stub?', initialValue: true }),
      gitInit: () =>
        p.confirm({
          message: 'Initialize git repository?',
          initialValue: true,
        }),
      githubRepo: () =>
        p.confirm({
          message: 'Create GitHub repo with gh?',
          initialValue: false,
        }),
    },
    {
      onCancel: () => {
        p.cancel('Scaffold cancelled.');
        process.exit(0);
      },
    },
  );

  let auth: AuthProvider = 'none';
  if (optional.auth) {
    const a = await p.select({
      message: 'Auth provider',
      options: [
        { value: 'jwt', label: 'JWT' },
        { value: 'passport', label: 'Passport (local + JWT)' },
        { value: 'auth0', label: 'Auth0' },
        { value: 'okta', label: 'Okta' },
        { value: 'keycloak', label: 'Keycloak' },
      ],
    });
    isCancel(a);
    auth = a as AuthProvider;
  }

  let validation: ValidationChoice = 'none';
  if (optional.validation) {
    const v = await p.select({
      message: 'Validation library',
      options: [
        { value: 'zod', label: 'Zod', hint: 'recommended' },
        { value: 'joi', label: 'Joi' },
      ],
    });
    isCancel(v);
    validation = v as ValidationChoice;
  }

  let database: Database = 'none';
  let orm: Orm = 'none';
  if (optional.database) {
    const db = await p.select({
      message: 'Database',
      options: [
        { value: 'postgresql', label: 'PostgreSQL' },
        { value: 'mongodb', label: 'MongoDB' },
        { value: 'mysql', label: 'MySQL' },
        { value: 'sqlite', label: 'SQLite' },
      ],
    });
    isCancel(db);
    database = db as Database;

    const ormOpts =
      database === 'mongodb'
        ? [
            { value: 'mongoose', label: 'Mongoose' },
            { value: 'prisma', label: 'Prisma' },
            { value: 'none', label: 'None' },
          ]
        : [
            { value: 'prisma', label: 'Prisma', hint: 'recommended' },
            { value: 'drizzle', label: 'Drizzle' },
            { value: 'none', label: 'None' },
          ];
    const o = await p.select({ message: 'ORM', options: ormOpts });
    isCancel(o);
    orm = o as Orm;
  }

  let logger: LoggerChoice = 'none';
  if (optional.logger) {
    const l = await p.select({
      message: 'Logger',
      options: [
        { value: 'pino', label: 'Pino', hint: 'recommended' },
        { value: 'winston', label: 'Winston' },
        { value: 'structured-logger-kit', label: 'structured-logger-kit' },
      ],
    });
    isCancel(l);
    logger = l as LoggerChoice;
  }

  let docs: DocsChoice = 'none';
  if (optional.docs) {
    const d = await p.select({
      message: 'API docs',
      options: [
        { value: 'swagger', label: 'Swagger UI', hint: 'recommended' },
        { value: 'scalar', label: 'Scalar' },
        { value: 'openapi', label: 'OpenAPI JSON only' },
      ],
    });
    isCancel(d);
    docs = d as DocsChoice;
  }

  let testing: TestRunner = 'none';
  if (optional.testing) {
    const t = await p.select({
      message: 'Test runner',
      options: [
        { value: 'vitest', label: 'Vitest', hint: 'recommended' },
        { value: 'jest', label: 'Jest' },
        { value: 'mocha', label: 'Mocha + Chai' },
      ],
    });
    isCancel(t);
    testing = t as TestRunner;
  }

  const cache: CacheChoice = optional.cache ? 'redis' : 'none';
  const name = String(projectName);

  return defaultConfig({
    projectName: name,
    targetDir: path.join(cwd, name),
    language: language as Language,
    framework: framework as Framework,
    packageManager: packageManager as PackageManager,
    moduleSystem: moduleSystem as ModuleSystem,
    nodeVersion: nodeVersion as NodeVersion,
    port,
    architecture: architecture as Architecture,
    features: {
      auth,
      validation,
      database,
      orm,
      cache,
      logger,
      docs,
      docker: Boolean(optional.docker),
      ci: Boolean(optional.ci),
      security: Boolean(optional.security),
      testing,
      monitoring: Boolean(optional.monitoring),
      gitInit: Boolean(optional.gitInit),
      githubRepo: Boolean(optional.githubRepo),
    },
  });
}
