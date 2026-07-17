/** Project configuration collected from CLI prompts or programmatic API. */

export type Language = "ts" | "js";
export type Framework = "express" | "fastify" | "hono" | "koa";
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
export type ModuleSystem = "esm" | "cjs";
export type NodeVersion = "20" | "22" | "22.23.1" | "24.18.0";
export type AuthProvider =
  | "jwt"
  | "passport"
  | "auth0"
  | "okta"
  | "keycloak"
  | "none";
export type Database = "postgresql" | "mongodb" | "mysql" | "sqlite" | "none";
export type Orm = "prisma" | "drizzle" | "mongoose" | "none";
export type LoggerChoice = "pino" | "winston" | "structured-logger-kit" | "none";
export type ValidationChoice = "none" | "zod" | "joi";
export type CacheChoice = "redis" | "none";
export type DocsChoice = "none" | "swagger" | "scalar" | "openapi";
export type TestRunner = "none" | "vitest" | "jest" | "mocha";

export interface ProjectConfig {
  projectName: string;
  targetDir: string;
  language: Language;
  framework: Framework;
  packageManager: PackageManager;
  moduleSystem: ModuleSystem;
  nodeVersion: NodeVersion;
  port: number;
  architecture: "layered";
  features: {
    auth: AuthProvider;
    validation: ValidationChoice;
    database: Database;
    orm: Orm;
    cache: CacheChoice;
    logger: LoggerChoice;
    docs: DocsChoice;
    docker: boolean;
    ci: boolean;
    security: boolean;
    testing: TestRunner;
    monitoring: boolean;
    gitInit: boolean;
    githubRepo: boolean;
  };
  /** Skip interactive prompts / install (for tests). */
  skipInstall?: boolean;
  skipGit?: boolean;
  dryRun?: boolean;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface DepMap {
  [name: string]: string;
}

export interface PluginContext {
  config: ProjectConfig;
  addFile: (file: GeneratedFile) => void;
  addDependency: (name: string, version?: string) => void;
  addDevDependency: (name: string, version?: string) => void;
  addScript: (name: string, command: string) => void;
}

export interface GeneratorPlugin {
  id: string;
  /** Return true if this plugin should run for the given config. */
  applies: (config: ProjectConfig) => boolean;
  apply: (ctx: PluginContext) => void | Promise<void>;
}

export interface GenerateResult {
  targetDir: string;
  files: string[];
  packageManager: PackageManager;
  installRan: boolean;
  auditOk: boolean | null;
  gitInit: boolean;
}
