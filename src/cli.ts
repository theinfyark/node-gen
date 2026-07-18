import { printBanner } from 'node-cli-banner';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { runPrompts } from './prompts/index.js';
import { createProject, defaultConfig } from './core/generator.js';
import type { ProjectConfig } from './core/types.js';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readPackageVersion(): string {
  try {
    const pkgPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      'package.json',
    );
    return (JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string })
      .version;
  } catch {
    return '0.0.0';
  }
}

const VERSION = readPackageVersion();

function printHelp(): void {
  console.log(`node-gen — Enterprise Node.js backend generator

Usage:
  npx node-gen-kit
  npx node-gen-kit [project-name] [options]
  npx node-gen-kit --yes [project-name]

Note:
  npm install node-gen-kit only installs the package.
  Run the CLI above to scaffold a project (interactive terminal required).

Options:
  --yes, -y          Non-interactive defaults (Express + TS + ESM)
  --framework <name> express | fastify | hono | koa
  --lang <name>      ts | js
  --pm <name>        npm | pnpm | yarn | bun
  --skip-install     Do not run package install
  --skip-git         Do not initialize git
  --dry-run          Print file plan without writing
  --help, -h         Show help
  --version, -v      Show version
`);
}

function assertInteractiveTerminal(): void {
  if (process.stdin.isTTY && process.stdout.isTTY) return;

  console.error(`
${pc.red('node-gen needs an interactive terminal.')}

${pc.dim('npm install node-gen-kit')} only adds the package — it does not scaffold.

Run one of:

  ${pc.cyan('npx node-gen-kit')}
  ${pc.cyan('npx node-gen-kit my-api')}
  ${pc.cyan('npx node-gen-kit my-api --yes')}   ${pc.dim('# no prompts')}

Use a real terminal (not a piped/non-TTY session) for interactive mode.
`);
  process.exit(1);
}

function parseArgs(argv: string[]): {
  name?: string;
  yes: boolean;
  help: boolean;
  version: boolean;
  skipInstall: boolean;
  skipGit: boolean;
  dryRun: boolean;
  framework?: string;
  lang?: string;
  pm?: string;
} {
  const out = {
    yes: false,
    help: false,
    version: false,
    skipInstall: false,
    skipGit: false,
    dryRun: false,
  } as ReturnType<typeof parseArgs>;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--version' || a === '-v') out.version = true;
    else if (a === '--yes' || a === '-y') out.yes = true;
    else if (a === '--skip-install') out.skipInstall = true;
    else if (a === '--skip-git') out.skipGit = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--framework') out.framework = argv[++i];
    else if (a === '--lang') out.lang = argv[++i];
    else if (a === '--pm') out.pm = argv[++i];
    else if (!a.startsWith('-') && !out.name) out.name = a;
  }
  return out;
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return 0;
  }
  if (args.version) {
    console.log(VERSION);
    return 0;
  }

  try {
    printBanner({
      title: 'node-gen',
      version: VERSION,
      fields: [
        { label: 'Mission', value: 'Enterprise Node backends' },
        { label: 'Frameworks', value: 'Express · Fastify · Hono · Koa' },
      ],
    });
  } catch {
    console.log(pc.cyan(`\n  node-gen v${VERSION}\n`));
  }

  let config: ProjectConfig;

  if (args.yes) {
    const name = args.name ?? 'my-api';
    config = defaultConfig({
      projectName: name,
      targetDir: path.join(process.cwd(), name),
      ...(args.framework
        ? { framework: args.framework as ProjectConfig['framework'] }
        : {}),
      ...(args.lang
        ? { language: args.lang as ProjectConfig['language'] }
        : {}),
      ...(args.pm
        ? { packageManager: args.pm as ProjectConfig['packageManager'] }
        : {}),
      skipInstall: args.skipInstall,
      skipGit: args.skipGit,
      dryRun: args.dryRun,
      features: {
        auth: 'none',
        validation: 'zod',
        database: 'none',
        orm: 'none',
        cache: 'none',
        logger: 'pino',
        docs: 'none',
        docker: false,
        ci: true,
        security: true,
        testing: 'vitest',
        monitoring: true,
        gitInit: !args.skipGit,
        githubRepo: false,
      },
    });
  } else {
    assertInteractiveTerminal();
    config = await runPrompts(process.cwd());
    if (args.name) {
      config.projectName = args.name;
      config.targetDir = path.join(process.cwd(), args.name);
    }
    config.skipInstall = args.skipInstall;
    config.skipGit = args.skipGit;
    config.dryRun = args.dryRun;
  }

  const spinner = p.spinner();
  spinner.start('Generating project…');
  try {
    const result = await createProject(config);
    spinner.stop(`Created ${result.files.length} files in ${result.targetDir}`);

    p.note(
      [
        `cd ${path.basename(result.targetDir)}`,
        config.skipInstall
          ? `${config.packageManager} install`
          : '# dependencies installed',
        `${config.packageManager === 'npm' ? 'npm run' : config.packageManager} dev`,
        `curl http://localhost:${config.port}/health`,
      ].join('\n'),
      'Next steps',
    );

    if (result.auditOk === false) {
      p.log.warn('Dependency audit reported issues — review with npm audit.');
    }

    p.outro(pc.green('Project ready. Ship something great.'));
    return 0;
  } catch (err) {
    spinner.stop('Generation failed');
    p.log.error(err instanceof Error ? err.message : String(err));
    return 1;
  }
}

const isDirect =
  process.argv[1] &&
  (process.argv[1].endsWith('cli.js') ||
    process.argv[1].endsWith('cli.ts') ||
    process.argv[1].includes('node-gen'));

if (isDirect) {
  main().then((code) => {
    process.exitCode = code;
  });
}
