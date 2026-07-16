import type { GeneratorPlugin } from "../core/types.js";
import { registerPlugin, clearPlugins } from "../core/registry.js";

/** Built-in plugins — reserved for extension points (monitoring stub, etc.). */
const monitoringPlugin: GeneratorPlugin = {
  id: "monitoring-stub",
  applies: (c) => c.features.monitoring,
  apply: (ctx) => {
    const e = ctx.config.language === "ts" ? "ts" : "js";
    ctx.addFile({
      path: `src/telemetry/metrics.${e}`,
      content: `/** Lightweight metrics stub — swap for Prometheus/OTel later. */
const counters = new Map();

export const metrics = {
  inc(name${ctx.config.language === "ts" ? ": string" : ""}, by = 1) {
    counters.set(name, (counters.get(name) ?? 0) + by);
  },
  get(name${ctx.config.language === "ts" ? ": string" : ""}) {
    return counters.get(name) ?? 0;
  },
  snapshot() {
    return Object.fromEntries(counters);
  },
};
`,
    });
  },
};

export function registerBuiltinPlugins(): void {
  clearPlugins();
  registerPlugin(monitoringPlugin);
}
