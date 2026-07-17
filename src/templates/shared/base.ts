import type { ProjectConfig, GeneratedFile, DepMap } from '../../core/types.js';
import { ver } from '../../core/versions.js';
import { ext, packageJsonType, toPascal } from '../../utils/helpers.js';

export function basePackageJson(
  config: ProjectConfig,
  deps: DepMap,
  devDeps: DepMap,
  scripts: Record<string, string>,
): GeneratedFile {
  const pkg: Record<string, unknown> = {
    name: config.projectName,
    version: '1.0.0',
    private: true,
    description: `Scaffolded with node-gen — ${config.framework} backend`,
    engines: { node: `>=${config.nodeVersion}` },
    scripts,
    dependencies: sortMap(deps),
    devDependencies: sortMap(devDeps),
  };
  const type = packageJsonType(config.moduleSystem);
  if (type) pkg.type = type;
  if (config.language === 'ts') {
    pkg.main = './dist/index.js';
  } else {
    pkg.main =
      config.moduleSystem === 'esm' ? './src/index.js' : './src/index.js';
  }
  return {
    path: 'package.json',
    content: `${JSON.stringify(pkg, null, 2)}\n`,
  };
}

function sortMap(m: DepMap): DepMap {
  return Object.fromEntries(
    Object.entries(m).sort(([a], [b]) => a.localeCompare(b)),
  );
}

export function gitignoreFile(): GeneratedFile {
  return {
    path: '.gitignore',
    content: `node_modules/
dist/
coverage/
.env
.env.local
.env.*.local
*.log
.DS_Store
uploads/
.prisma/
`,
  };
}

export function editorconfigFile(): GeneratedFile {
  return {
    path: '.editorconfig',
    content: `root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
`,
  };
}

export function envFiles(config: ProjectConfig): GeneratedFile[] {
  const lines = [
    `PORT=${config.port}`,
    'HOST=0.0.0.0',
    'NODE_ENV=development',
    'API_PREFIX=/api',
    'API_VERSION=v1',
    'LOG_LEVEL=info',
  ];
  const auth = config.features.auth;
  if (auth === 'jwt' || auth === 'passport') {
    lines.push('JWT_SECRET=change-me-to-a-long-random-secret');
    lines.push('JWT_EXPIRES_IN=7d');
  } else if (auth === 'auth0') {
    lines.push('AUTH0_DOMAIN=your-tenant.auth0.com');
    lines.push('AUTH0_AUDIENCE=https://api.example.com');
    lines.push(
      'AUTH_JWKS_URI=https://your-tenant.auth0.com/.well-known/jwks.json',
    );
    lines.push('AUTH_ISSUER=https://your-tenant.auth0.com/');
    lines.push('AUTH_AUDIENCE=https://api.example.com');
  } else if (auth === 'okta') {
    lines.push('OKTA_DOMAIN=https://your-org.okta.com');
    lines.push('OKTA_AUDIENCE=api://default');
    lines.push(
      'AUTH_JWKS_URI=https://your-org.okta.com/oauth2/default/v1/keys',
    );
    lines.push('AUTH_ISSUER=https://your-org.okta.com/oauth2/default');
    lines.push('AUTH_AUDIENCE=api://default');
  } else if (auth === 'keycloak') {
    lines.push(
      'KEYCLOAK_REALM_URL=https://keycloak.example.com/realms/myrealm',
    );
    lines.push('KEYCLOAK_CLIENT_ID=my-api');
    lines.push(
      'AUTH_JWKS_URI=https://keycloak.example.com/realms/myrealm/protocol/openid-connect/certs',
    );
    lines.push('AUTH_ISSUER=https://keycloak.example.com/realms/myrealm');
    lines.push('AUTH_AUDIENCE=my-api');
  }
  if (config.features.database === 'postgresql') {
    lines.push(
      'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app',
    );
  } else if (config.features.database === 'mysql') {
    lines.push('DATABASE_URL=mysql://root:root@localhost:3306/app');
  } else if (config.features.database === 'mongodb') {
    lines.push('DATABASE_URL=mongodb://localhost:27017/app');
  } else if (config.features.database === 'sqlite') {
    lines.push('DATABASE_URL=file:./dev.db');
  }
  if (config.features.cache === 'redis') {
    lines.push('REDIS_URL=redis://localhost:6379');
  }
  lines.push('STORAGE_PATH=./uploads');

  const body = `${lines.join('\n')}\n`;
  const names = [
    '.env.example',
    '.env.local',
    '.env.dev',
    '.env.stg',
    '.env.prod',
    '.env.test',
  ];
  return names.map((name) => ({
    path: name,
    content:
      name === '.env.example'
        ? body
        : body.replace('NODE_ENV=development', `NODE_ENV=${envName(name)}`),
  }));
}

function envName(file: string): string {
  if (file.includes('prod')) return 'production';
  if (file.includes('stg')) return 'staging';
  if (file.includes('test')) return 'test';
  if (file.includes('dev')) return 'development';
  return 'development';
}

export function tsconfigFile(config: ProjectConfig): GeneratedFile | null {
  if (config.language !== 'ts') return null;
  const content = {
    compilerOptions: {
      target: 'ES2022',
      module: config.moduleSystem === 'esm' ? 'NodeNext' : 'CommonJS',
      moduleResolution: config.moduleSystem === 'esm' ? 'NodeNext' : 'Node',
      lib: ['ES2022'],
      outDir: 'dist',
      rootDir: 'src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      declaration: true,
      sourceMap: true,
      types: ['node'],
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist', 'tests'],
  };
  return {
    path: 'tsconfig.json',
    content: `${JSON.stringify(content, null, 2)}\n`,
  };
}

export function eslintPrettierFiles(config: ProjectConfig): GeneratedFile[] {
  const e = ext(config.language);
  return [
    {
      path: 'eslint.config.js',
      content: `/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];
`,
    },
    {
      path: '.prettierrc',
      content: `{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
`,
    },
    {
      path: `src/config/env.${e}`,
      content: envConfigSource(config),
    },
  ];
}

function authEnvFields(config: ProjectConfig): string {
  const auth = config.features.auth;
  if (auth === 'jwt' || auth === 'passport') {
    return `  JWT_SECRET: { type: String, default: 'dev-secret-change-me' },
  JWT_EXPIRES_IN: { type: String, default: '7d' },
`;
  }
  if (auth === 'auth0' || auth === 'okta' || auth === 'keycloak') {
    return `  AUTH_JWKS_URI: String,
  AUTH_ISSUER: String,
  AUTH_AUDIENCE: String,
`;
  }
  return '';
}

function envConfigSource(config: ProjectConfig): string {
  const authFields = authEnvFields(config);
  const dbField =
    config.features.database !== 'none'
      ? `  DATABASE_URL: { type: String, default: 'file:./dev.db' },
`
      : '';
  const redisField =
    config.features.cache === 'redis'
      ? `  REDIS_URL: { type: String, default: 'redis://localhost:6379' },
`
      : '';
  const typeExport =
    config.language === 'ts' ? `\nexport type AppEnv = typeof appEnv;\n` : '';
  return `import { config as loadEnv } from 'dotenv';
import { env, Port } from 'env-ok';

loadEnv({ path: process.env.ENV_FILE ?? '.env.local' });

export const appEnv = env({
  PORT: { type: Port, default: ${config.port} },
  HOST: { type: String, default: '0.0.0.0' },
  NODE_ENV: { type: String, default: 'development' },
  API_PREFIX: { type: String, default: '/api' },
  API_VERSION: { type: String, default: 'v1' },
  LOG_LEVEL: { type: String, default: 'info' },
${authFields}${dbField}${redisField}  STORAGE_PATH: { type: String, default: './uploads' },
});
${typeExport}`;
}

export function readmeFile(config: ProjectConfig): GeneratedFile {
  const title = toPascal(config.projectName);
  const pm = config.packageManager;
  const run = pm === 'npm' ? 'npm run' : pm;
  return {
    path: 'README.md',
    content: `# ${title}

Enterprise Node.js backend generated by [\`node-gen\`](https://www.npmjs.com/package/node-gen).

## Stack

- **Framework:** ${config.framework}
- **Language:** ${config.language === 'ts' ? 'TypeScript' : 'JavaScript'}
- **Module:** ${config.moduleSystem.toUpperCase()}
- **Node:** ${config.nodeVersion}
${config.features.database !== 'none' ? `- **Database:** ${config.features.database}\n` : ''}${config.features.orm !== 'none' ? `- **ORM:** ${config.features.orm}\n` : ''}${config.features.auth !== 'none' ? `- **Auth:** ${config.features.auth}\n` : ''}${config.features.validation !== 'none' ? `- **Validation:** ${config.features.validation}\n` : ''}${config.features.logger !== 'none' ? `- **Logger:** ${config.features.logger}\n` : ''}

## Quick Start

\`\`\`bash
${pm} install
${run} dev
\`\`\`

Health check: [http://localhost:${config.port}/health](http://localhost:${config.port}/health)

## Scripts

| Script | Description |
|--------|-------------|
| \`dev\` | Start development server |
| \`build\` | Compile TypeScript (if applicable) |
| \`start\` | Run production server |
| \`test\` | Run tests |
| \`typecheck\` | TypeScript type check |

## Environment

Copy \`.env.example\` to \`.env.local\` and adjust values. Validated via \`env-ok\`.

## Architecture

Layered modules under \`src/modules/\` — routes → controllers → services → repositories.

## License

MIT
`,
  };
}

export function sharedErrorFiles(config: ProjectConfig): GeneratedFile[] {
  const e = ext(config.language);
  const ts = config.language === 'ts';
  return [
    {
      path: `src/lib/errors.${e}`,
      content: ts
        ? `export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code = 'APP_ERROR',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', public details?: unknown) {
    super(400, message, 'VALIDATION_ERROR');
  }
}
`
        : `export class AppError extends Error {
  constructor(statusCode, message, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details) {
    super(400, message, 'VALIDATION_ERROR');
    this.details = details;
  }
}
`,
    },
  ];
}

export function loggerFile(config: ProjectConfig): GeneratedFile {
  const e = ext(config.language);
  const choice = config.features.logger;
  const envImport = '../config/env.js';
  if (choice === 'structured-logger-kit') {
    return {
      path: `src/lib/logger.${e}`,
      content: `import { createLogger } from 'structured-logger-kit';
import { appEnv } from '${envImport}';

export const logger = createLogger({
  level: appEnv.LOG_LEVEL,
  format: appEnv.NODE_ENV === 'production' ? 'json' : 'pretty',
  name: '${config.projectName}',
});
`,
    };
  }
  if (choice === 'winston') {
    return {
      path: `src/lib/logger.${e}`,
      content: `import winston from 'winston';
import { appEnv } from '${envImport}';

export const logger = winston.createLogger({
  level: appEnv.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    appEnv.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple()),
  ),
  defaultMeta: { service: '${config.projectName}' },
  transports: [new winston.transports.Console()],
});
`,
    };
  }
  if (choice === 'none') {
    return {
      path: `src/lib/logger.${e}`,
      content: `export const logger = {
  info: (...args${config.language === 'ts' ? ': unknown[]' : ''}) => console.log('[info]', ...args),
  error: (...args${config.language === 'ts' ? ': unknown[]' : ''}) => console.error('[error]', ...args),
  warn: (...args${config.language === 'ts' ? ': unknown[]' : ''}) => console.warn('[warn]', ...args),
  debug: (...args${config.language === 'ts' ? ': unknown[]' : ''}) => console.debug('[debug]', ...args),
};
`,
    };
  }
  return {
    path: `src/lib/logger.${e}`,
    content: `import pino from 'pino';
import { appEnv } from '${envImport}';

export const logger = pino({
  level: appEnv.LOG_LEVEL,
  transport:
    appEnv.NODE_ENV === 'production'
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true } },
});
`,
  };
}

export function defaultScripts(config: ProjectConfig): Record<string, string> {
  const e = ext(config.language);
  const isTs = config.language === 'ts';
  const scripts: Record<string, string> = {
    start: isTs ? 'node dist/index.js' : `node src/index.${e}`,
  };
  if (isTs) {
    scripts.dev = 'tsx watch src/index.ts';
    scripts.build = 'tsc -p tsconfig.json';
    scripts.typecheck = 'tsc --noEmit';
  } else {
    scripts.dev = `node --watch src/index.${e}`;
  }
  if (config.features.orm === 'prisma') {
    scripts['db:generate'] = 'prisma generate';
    scripts['db:migrate'] = 'prisma migrate dev';
    scripts['db:push'] = 'prisma db push';
  }
  if (config.features.orm === 'drizzle') {
    scripts['db:generate'] = 'drizzle-kit generate';
    scripts['db:migrate'] = 'drizzle-kit migrate';
  }
  return scripts;
}

export function baseDevDeps(config: ProjectConfig): DepMap {
  const d: DepMap = {};
  if (config.language === 'ts') {
    d.typescript = ver('typescript');
    d.tsx = ver('tsx');
    d['@types/node'] = ver('@types/node');
  }
  return d;
}

export function baseDeps(config: ProjectConfig): DepMap {
  const d: DepMap = {
    dotenv: ver('dotenv'),
    'env-ok': ver('env-ok'),
  };
  if (config.features.logger === 'pino') {
    d.pino = ver('pino');
    d['pino-pretty'] = ver('pino-pretty');
  }
  if (config.features.logger === 'winston') {
    d.winston = ver('winston');
  }
  if (config.features.logger === 'structured-logger-kit') {
    d['structured-logger-kit'] = ver('structured-logger-kit');
  }
  return d;
}
