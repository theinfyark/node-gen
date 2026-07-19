import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createProject, defaultConfig } from '../src/index.js';

describe('createProject', () => {
  it('scaffolds express+ts with health and items', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-gen-'));
    const targetDir = path.join(root, 'demo-api');
    const result = await createProject(
      defaultConfig({
        projectName: 'demo-api',
        targetDir,
        framework: 'express',
        language: 'ts',
        skipInstall: true,
        skipGit: true,
        features: {
          auth: 'jwt',
          validation: 'zod',
          database: 'none',
          orm: 'none',
          cache: 'none',
          logger: 'pino',
          docs: 'swagger',
          docker: true,
          ci: true,
          security: true,
          testing: 'vitest',
          monitoring: true,
          gitInit: false,
          githubRepo: false,
        },
      }),
    );

    expect(result.files.length).toBeGreaterThan(10);
    expect(existsSync(path.join(targetDir, 'package.json'))).toBe(true);
    expect(existsSync(path.join(targetDir, 'src/index.ts'))).toBe(true);
    expect(existsSync(path.join(targetDir, 'src/app/create-app.ts'))).toBe(
      true,
    );
    expect(existsSync(path.join(targetDir, 'src/health/health.route.ts'))).toBe(
      true,
    );
    expect(existsSync(path.join(targetDir, 'src/routes/index.ts'))).toBe(true);
    expect(existsSync(path.join(targetDir, 'src/models/items.model.ts'))).toBe(
      true,
    );
    expect(
      existsSync(path.join(targetDir, 'src/controllers/items.controller.ts')),
    ).toBe(true);
    expect(existsSync(path.join(targetDir, 'src/routes/orders.routes.ts'))).toBe(
      true,
    );
    expect(
      existsSync(path.join(targetDir, 'src/routes/profiles.routes.ts')),
    ).toBe(true);
    expect(
      existsSync(path.join(targetDir, 'src/modules/auth/auth.route.ts')),
    ).toBe(true);
    expect(existsSync(path.join(targetDir, 'src/docs/openapi.ts'))).toBe(true);
    expect(existsSync(path.join(targetDir, 'Dockerfile'))).toBe(true);
    expect(existsSync(path.join(targetDir, '.github/workflows/ci.yml'))).toBe(
      true,
    );
    expect(existsSync(path.join(targetDir, 'tests/health.test.ts'))).toBe(true);

    const pkg = JSON.parse(
      readFileSync(path.join(targetDir, 'package.json'), 'utf8'),
    );
    expect(pkg.dependencies.express).toBeTruthy();
    expect(pkg.dependencies.zod).toBeTruthy();
    expect(pkg.dependencies['swagger-ui-express']).toBeTruthy();
    expect(pkg.dependencies['env-ok-kit']).toBeTruthy();
    expect(pkg.dependencies.dotenv).toBeTruthy();
    expect(pkg.devDependencies.vitest).toBeTruthy();
    expect(pkg.devDependencies.eslint).toBeTruthy();
    expect(pkg.devDependencies.prettier).toBeTruthy();
    expect(pkg.devDependencies.nodemon).toBeTruthy();
    expect(pkg.devDependencies['pino-pretty']).toBeTruthy();
    expect(pkg.dependencies['pino-pretty']).toBeUndefined();
    expect(pkg.scripts.dev).toContain('nodemon');
    expect(pkg.type).toBe('module');
    expect(existsSync(path.join(targetDir, 'nodemon.json'))).toBe(true);
    expect(existsSync(path.join(targetDir, '.env'))).toBe(true);
    expect(existsSync(path.join(targetDir, '.env.example'))).toBe(true);
    const envExample = readFileSync(
      path.join(targetDir, '.env.example'),
      'utf8',
    );
    expect(envExample).toContain('APP_NAME=');
    expect(envExample).toContain('CORS_ORIGIN=');
    const envTs = readFileSync(
      path.join(targetDir, 'src/config/env.ts'),
      'utf8',
    );
    expect(envTs).toContain('APP_NAME');
    expect(envTs).toContain('RATE_LIMIT_MAX');
    expect(envTs).toContain('loadEnv()');

    rmSync(root, { recursive: true, force: true });
  });

  it('scaffolds fastify, hono, and koa projects', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-gen-'));
    for (const framework of ['fastify', 'hono', 'koa'] as const) {
      const targetDir = path.join(root, framework);
      await createProject(
        defaultConfig({
          projectName: `${framework}-app`,
          targetDir,
          framework,
          language: 'ts',
          skipInstall: true,
          skipGit: true,
          features: {
            auth: 'none',
            validation: 'zod',
            database: 'none',
            orm: 'none',
            cache: 'none',
            logger: 'pino',
            docs: 'none',
            docker: false,
            ci: false,
            security: true,
            testing: 'jest',
            monitoring: false,
            gitInit: false,
            githubRepo: false,
          },
        }),
      );
      expect(existsSync(path.join(targetDir, 'src/index.ts'))).toBe(true);
      expect(existsSync(path.join(targetDir, 'package.json'))).toBe(true);
      expect(existsSync(path.join(targetDir, 'jest.config.cjs'))).toBe(true);
      const pkg = JSON.parse(
        readFileSync(path.join(targetDir, 'package.json'), 'utf8'),
      );
      expect(pkg.devDependencies.jest).toBeTruthy();
    }
    rmSync(root, { recursive: true, force: true });
  });

  it('scaffolds Auth0 + Joi + Winston', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-gen-'));
    const targetDir = path.join(root, 'oidc-api');
    await createProject(
      defaultConfig({
        projectName: 'oidc-api',
        targetDir,
        framework: 'express',
        skipInstall: true,
        skipGit: true,
        features: {
          auth: 'auth0',
          validation: 'joi',
          database: 'none',
          orm: 'none',
          cache: 'none',
          logger: 'winston',
          docs: 'none',
          docker: false,
          ci: false,
          security: true,
          testing: 'none',
          monitoring: false,
          gitInit: false,
          githubRepo: false,
        },
      }),
    );
    const pkg = JSON.parse(
      readFileSync(path.join(targetDir, 'package.json'), 'utf8'),
    );
    expect(pkg.dependencies.jose).toBeTruthy();
    expect(pkg.dependencies.joi).toBeTruthy();
    expect(pkg.dependencies.winston).toBeTruthy();
    expect(existsSync(path.join(targetDir, 'src/middleware/auth.ts'))).toBe(
      true,
    );
    expect(
      existsSync(path.join(targetDir, 'src/models/items.schema.ts')),
    ).toBe(true);
    const env = readFileSync(path.join(targetDir, '.env.example'), 'utf8');
    expect(env).toContain('AUTH_JWKS_URI');
    rmSync(root, { recursive: true, force: true });
  });

  it('pins Node v22.23.1 and v24.18.0 in engines and Docker', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-gen-'));
    for (const nodeVersion of ['22.23.1', '24.18.0'] as const) {
      const targetDir = path.join(root, nodeVersion);
      await createProject(
        defaultConfig({
          projectName: `node-${nodeVersion.replace(/\./g, '-')}`,
          targetDir,
          nodeVersion,
          skipInstall: true,
          skipGit: true,
          features: {
            ...defaultConfig({ projectName: 'x', targetDir: '/tmp/x' })
              .features,
            docker: true,
            ci: true,
            gitInit: false,
          },
        }),
      );
      const pkg = JSON.parse(
        readFileSync(path.join(targetDir, 'package.json'), 'utf8'),
      );
      expect(pkg.engines.node).toBe(`>=${nodeVersion}`);
      const docker = readFileSync(path.join(targetDir, 'Dockerfile'), 'utf8');
      expect(docker).toContain(`FROM node:${nodeVersion}-alpine`);
      const ci = readFileSync(
        path.join(targetDir, '.github/workflows/ci.yml'),
        'utf8',
      );
      expect(ci).toContain(`node-version: [${nodeVersion}]`);
    }
    rmSync(root, { recursive: true, force: true });
  });

  it('scaffolds valid JavaScript (no import type) with swagger docs', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-gen-'));
    const targetDir = path.join(root, 'js-api');
    await createProject(
      defaultConfig({
        projectName: 'js-api',
        targetDir,
        language: 'js',
        moduleSystem: 'cjs',
        skipInstall: true,
        skipGit: true,
        features: {
          auth: 'none',
          validation: 'none',
          database: 'none',
          orm: 'none',
          cache: 'none',
          logger: 'winston',
          docs: 'swagger',
          docker: false,
          ci: false,
          security: true,
          testing: 'none',
          monitoring: false,
          gitInit: false,
          githubRepo: false,
        },
      }),
    );

    const openapi = readFileSync(
      path.join(targetDir, 'src/docs/openapi.js'),
      'utf8',
    );
    expect(openapi).not.toMatch(/import type/);
    expect(openapi).toContain("from 'swagger-ui-express'");

    const pkg = JSON.parse(
      readFileSync(path.join(targetDir, 'package.json'), 'utf8'),
    );
    expect(pkg.type).toBe('module');
    expect(pkg.devDependencies.nodemon).toBeTruthy();
    expect(pkg.scripts.dev).toContain('nodemon');
    expect(existsSync(path.join(targetDir, 'nodemon.json'))).toBe(true);
    expect(existsSync(path.join(targetDir, '.env'))).toBe(true);

    rmSync(root, { recursive: true, force: true });
  });

  it('scaffolds layered architecture with modules + routes index', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'node-gen-'));
    const targetDir = path.join(root, 'layered-api');
    await createProject(
      defaultConfig({
        projectName: 'layered-api',
        targetDir,
        architecture: 'layered',
        skipInstall: true,
        skipGit: true,
        features: {
          auth: 'none',
          validation: 'zod',
          database: 'none',
          orm: 'none',
          cache: 'none',
          logger: 'pino',
          docs: 'none',
          docker: false,
          ci: false,
          security: false,
          testing: 'none',
          monitoring: false,
          gitInit: false,
          githubRepo: false,
        },
      }),
    );

    expect(
      existsSync(path.join(targetDir, 'src/modules/items/items.route.ts')),
    ).toBe(true);
    expect(existsSync(path.join(targetDir, 'src/routes/index.ts'))).toBe(true);
    const routesIndex = readFileSync(
      path.join(targetDir, 'src/routes/index.ts'),
      'utf8',
    );
    expect(routesIndex).toContain("apiRouter.use('/items'");
    expect(existsSync(path.join(targetDir, 'src/models/items.model.ts'))).toBe(
      false,
    );

    rmSync(root, { recursive: true, force: true });
  });
});
