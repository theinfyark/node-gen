/** Helpers for template generation. */

export function isTs(language: "ts" | "js"): boolean {
  return language === "ts";
}

export function ext(language: "ts" | "js"): string {
  return language === "ts" ? "ts" : "js";
}

export function toPascal(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

export function packageJsonType(moduleSystem: "esm" | "cjs"): "module" | undefined {
  return moduleSystem === "esm" ? "module" : undefined;
}

export function importStyle(moduleSystem: "esm" | "cjs", language: "ts" | "js"): "esm" | "cjs" {
  if (language === "ts") return "esm";
  return moduleSystem;
}

export function render(template: string, vars: Record<string, string | number | boolean>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v === undefined ? "" : String(v);
  });
}
