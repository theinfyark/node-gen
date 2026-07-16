import { spawnSync } from "node:child_process";
import type { PackageManager } from "./types.js";

const INSTALL_CMD: Record<PackageManager, string[]> = {
  npm: ["npm", "install"],
  pnpm: ["pnpm", "install"],
  yarn: ["yarn", "install"],
  bun: ["bun", "install"],
};

const AUDIT_CMD: Record<PackageManager, string[]> = {
  npm: ["npm", "audit", "--audit-level=high"],
  pnpm: ["pnpm", "audit", "--audit-level", "high"],
  yarn: ["yarn", "npm", "audit", "--severity"],
  bun: ["bun", "pm", "ls"], // bun has limited audit; treat as soft check
};

export function runInstall(cwd: string, pm: PackageManager): boolean {
  const [cmd, ...args] = INSTALL_CMD[pm];
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return result.status === 0;
}

export function runAudit(cwd: string, pm: PackageManager): boolean {
  const [cmd, ...args] = AUDIT_CMD[pm];
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  // yarn/bun audit semantics vary; treat non-zero as warning for those
  if (pm === "bun") return true;
  return result.status === 0;
}

export function runGitInit(cwd: string): boolean {
  const init = spawnSync("git", ["init"], { cwd, stdio: "pipe" });
  if (init.status !== 0) return false;
  spawnSync("git", ["add", "-A"], { cwd, stdio: "pipe" });
  spawnSync(
    "git",
    ["commit", "-m", "chore: initial commit from node-gen"],
    { cwd, stdio: "pipe", env: { ...process.env, GIT_AUTHOR_NAME: "node-gen", GIT_AUTHOR_EMAIL: "node-gen@local", GIT_COMMITTER_NAME: "node-gen", GIT_COMMITTER_EMAIL: "node-gen@local" } },
  );
  return true;
}

export function tryCreateGithubRepo(cwd: string, name: string): boolean {
  const result = spawnSync(
    "gh",
    ["repo", "create", name, "--source=.", "--private", "--push"],
    { cwd, stdio: "inherit", shell: process.platform === "win32" },
  );
  return result.status === 0;
}
