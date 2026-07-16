import type { GeneratorPlugin } from "./types.js";

const plugins: GeneratorPlugin[] = [];

export function registerPlugin(plugin: GeneratorPlugin): void {
  if (plugins.some((p) => p.id === plugin.id)) {
    throw new Error(`Plugin already registered: ${plugin.id}`);
  }
  plugins.push(plugin);
}

export function getPlugins(): readonly GeneratorPlugin[] {
  return plugins;
}

export function clearPlugins(): void {
  plugins.length = 0;
}

export function resetPlugins(list: GeneratorPlugin[]): void {
  clearPlugins();
  for (const p of list) registerPlugin(p);
}
