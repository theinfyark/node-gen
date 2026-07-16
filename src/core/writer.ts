import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import type { GeneratedFile } from "./types.js";

export function writeFiles(root: string, files: GeneratedFile[], dryRun = false): string[] {
  const written: string[] = [];
  for (const file of files) {
    const abs = path.join(root, file.path);
    if (!dryRun) {
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, file.content, "utf8");
    }
    written.push(file.path);
  }
  return written;
}

export function assertTargetAvailable(targetDir: string, force = false): void {
  if (force) return;
  if (!existsSync(targetDir)) return;
  const entries = readdirSync(targetDir);
  if (entries.length > 0) {
    throw new Error(`Target directory is not empty: ${targetDir}`);
  }
}
