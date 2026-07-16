export { createProject, defaultConfig } from "./core/generator.js";
export { registerPlugin, getPlugins, clearPlugins } from "./core/registry.js";
export { registerBuiltinPlugins } from "./plugins/index.js";
export type {
  ProjectConfig,
  GenerateResult,
  GeneratorPlugin,
  PluginContext,
  GeneratedFile,
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
} from "./core/types.js";
