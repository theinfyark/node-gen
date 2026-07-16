import path from "node:path";
import type {
  ProjectConfig,
  GeneratedFile,
  DepMap,
  GenerateResult,
  PluginContext,
} from "./types.js";
import { getPlugins } from "./registry.js";
import { writeFiles, assertTargetAvailable } from "./writer.js";
import { runInstall, runAudit, runGitInit, tryCreateGithubRepo } from "./hooks.js";
import {
  basePackageJson,
  gitignoreFile,
  editorconfigFile,
  envFiles,
  tsconfigFile,
  eslintPrettierFiles,
  readmeFile,
  sharedErrorFiles,
  loggerFile,
  defaultScripts,
  baseDeps,
  baseDevDeps,
} from "../templates/shared/base.js";
import { expressDeps, expressDevDeps, expressFiles } from "../templates/express/index.js";
import { fastifyDeps, fastifyFiles } from "../templates/fastify/index.js";
import { honoDeps, honoFiles } from "../templates/hono/index.js";
import { authDeps, authDevDeps, authFiles } from "../templates/features/auth.js";
import { ormDeps, ormDevDeps, ormFiles, redisDeps, redisFiles } from "../templates/features/orm.js";
import { docsDeps, docsFiles, dockerFiles, ciFiles } from "../templates/features/infra.js";
import { ver } from "./versions.js";
import { registerBuiltinPlugins } from "../plugins/index.js";

let builtinsRegistered = false;

function ensurePlugins(): void {
  if (!builtinsRegistered) {
    registerBuiltinPlugins();
    builtinsRegistered = true;
  }
}

function mergeDeps(...maps: DepMap[]): DepMap {
  return Object.assign({}, ...maps);
}

function collectCoreFiles(config: ProjectConfig): {
  files: GeneratedFile[];
  deps: DepMap;
  devDeps: DepMap;
  scripts: Record<string, string>;
} {
  const files: GeneratedFile[] = [];
  let deps = baseDeps(config);
  let devDeps = baseDevDeps(config);
  const scripts = defaultScripts(config);

  files.push(gitignoreFile(), editorconfigFile(), readmeFile(config));
  files.push(...envFiles(config));
  const tsconfig = tsconfigFile(config);
  if (tsconfig) files.push(tsconfig);
  files.push(...eslintPrettierFiles(config));
  files.push(...sharedErrorFiles(config));
  files.push(loggerFile(config));

  if (config.features.validation) {
    deps.zod = ver("zod");
  }

  if (config.framework === "express") {
    deps = mergeDeps(deps, expressDeps(config), authDeps(config), ormDeps(config), redisDeps(config), docsDeps(config));
    devDeps = mergeDeps(devDeps, expressDevDeps(config), authDevDeps(config), ormDevDeps(config));
    files.push(...expressFiles(config));
  } else if (config.framework === "fastify") {
    deps = mergeDeps(deps, fastifyDeps(config), authDeps(config), ormDeps(config), redisDeps(config), docsDeps(config));
    devDeps = mergeDeps(devDeps, authDevDeps(config), ormDevDeps(config));
    files.push(...fastifyFiles(config));
  } else {
    deps = mergeDeps(deps, honoDeps(config), authDeps(config), ormDeps(config), redisDeps(config), docsDeps(config));
    devDeps = mergeDeps(devDeps, authDevDeps(config), ormDevDeps(config));
    files.push(...honoFiles(config));
  }

  files.push(...authFiles(config));
  files.push(...ormFiles(config));
  files.push(...redisFiles(config));
  files.push(...docsFiles(config));
  files.push(...dockerFiles(config));
  files.push(...ciFiles(config));

  // OSS docs for generated project
  files.push({
    path: "LICENSE",
    content: `MIT License

Copyright (c) ${new Date().getFullYear()}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`,
  });
  files.push({
    path: "CHANGELOG.md",
    content: `# Changelog

## [1.0.0] - ${new Date().toISOString().slice(0, 10)}

### Added

- Initial project scaffolded by node-gen
`,
  });

  return { files, deps, devDeps, scripts };
}

/** Programmatic project generation. */
export async function createProject(config: ProjectConfig): Promise<GenerateResult> {
  ensurePlugins();
  assertTargetAvailable(config.targetDir, Boolean(config.dryRun));

  const { files, deps, devDeps, scripts } = collectCoreFiles(config);

  const fileMap = new Map<string, GeneratedFile>();
  for (const f of files) fileMap.set(f.path, f);

  const depMap: DepMap = { ...deps };
  const devDepMap: DepMap = { ...devDeps };
  const scriptMap: Record<string, string> = { ...scripts };

  const ctx: PluginContext = {
    config,
    addFile: (file) => {
      fileMap.set(file.path, file);
    },
    addDependency: (name, version = "latest") => {
      depMap[name] = version;
    },
    addDevDependency: (name, version = "latest") => {
      devDepMap[name] = version;
    },
    addScript: (name, command) => {
      scriptMap[name] = command;
    },
  };

  for (const plugin of getPlugins()) {
    if (plugin.applies(config)) {
      await plugin.apply(ctx);
    }
  }

  // package.json last so plugins can mutate deps/scripts
  fileMap.set(
    "package.json",
    basePackageJson(config, depMap, devDepMap, scriptMap),
  );

  const allFiles = [...fileMap.values()];
  const written = writeFiles(config.targetDir, allFiles, config.dryRun);

  let installRan = false;
  let auditOk: boolean | null = null;
  let gitInit = false;

  if (!config.dryRun && !config.skipInstall) {
    installRan = runInstall(config.targetDir, config.packageManager);
    if (installRan) {
      auditOk = runAudit(config.targetDir, config.packageManager);
    }
  }

  if (!config.dryRun && config.features.gitInit && !config.skipGit) {
    gitInit = runGitInit(config.targetDir);
  }

  if (!config.dryRun && config.features.githubRepo) {
    tryCreateGithubRepo(config.targetDir, config.projectName);
  }

  return {
    targetDir: path.resolve(config.targetDir),
    files: written,
    packageManager: config.packageManager,
    installRan,
    auditOk,
    gitInit,
  };
}

export function defaultConfig(partial: Partial<ProjectConfig> & Pick<ProjectConfig, "projectName" | "targetDir">): ProjectConfig {
  return {
    language: "ts",
    framework: "express",
    packageManager: "npm",
    moduleSystem: "esm",
    nodeVersion: "22",
    port: 3000,
    architecture: "layered",
    features: {
      auth: "none",
      validation: true,
      database: "none",
      orm: "none",
      cache: "none",
      logger: "pino",
      apiDocs: false,
      docker: false,
      ci: true,
      security: true,
      testing: true,
      monitoring: true,
      gitInit: true,
      githubRepo: false,
      ...partial.features,
    },
    ...partial,
    projectName: partial.projectName,
    targetDir: partial.targetDir,
  };
}
