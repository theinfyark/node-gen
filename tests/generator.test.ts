import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createProject, defaultConfig } from "../src/index.js";

describe("createProject", () => {
  it("scaffolds express+ts with health and items", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "node-gen-"));
    const targetDir = path.join(root, "demo-api");
    const result = await createProject(
      defaultConfig({
        projectName: "demo-api",
        targetDir,
        framework: "express",
        language: "ts",
        skipInstall: true,
        skipGit: true,
        features: {
          auth: "jwt",
          validation: true,
          database: "none",
          orm: "none",
          cache: "none",
          logger: "pino",
          apiDocs: true,
          docker: true,
          ci: true,
          security: true,
          testing: true,
          monitoring: true,
          gitInit: false,
          githubRepo: false,
        },
      }),
    );

    expect(result.files.length).toBeGreaterThan(10);
    expect(existsSync(path.join(targetDir, "package.json"))).toBe(true);
    expect(existsSync(path.join(targetDir, "src/index.ts"))).toBe(true);
    expect(existsSync(path.join(targetDir, "src/app/create-app.ts"))).toBe(true);
    expect(existsSync(path.join(targetDir, "src/health/health.route.ts"))).toBe(true);
    expect(existsSync(path.join(targetDir, "src/modules/items/items.route.ts"))).toBe(true);
    expect(existsSync(path.join(targetDir, "src/modules/auth/auth.route.ts"))).toBe(true);
    expect(existsSync(path.join(targetDir, "Dockerfile"))).toBe(true);
    expect(existsSync(path.join(targetDir, ".github/workflows/ci.yml"))).toBe(true);
    expect(existsSync(path.join(targetDir, "tests/health.test.ts"))).toBe(true);

    const pkg = JSON.parse(readFileSync(path.join(targetDir, "package.json"), "utf8"));
    expect(pkg.dependencies.express).toBeTruthy();
    expect(pkg.dependencies.zod).toBeTruthy();
    expect(pkg.dependencies["env-ok-kit"]).toBeTruthy();
    expect(pkg.devDependencies.vitest).toBeTruthy();
    expect(pkg.type).toBe("module");

    rmSync(root, { recursive: true, force: true });
  });

  it("scaffolds fastify and hono minimal projects", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "node-gen-"));
    for (const framework of ["fastify", "hono"] as const) {
      const targetDir = path.join(root, framework);
      await createProject(
        defaultConfig({
          projectName: `${framework}-app`,
          targetDir,
          framework,
          language: "ts",
          skipInstall: true,
          skipGit: true,
          features: {
            auth: "none",
            validation: true,
            database: "none",
            orm: "none",
            cache: "none",
            logger: "pino",
            apiDocs: false,
            docker: false,
            ci: false,
            security: true,
            testing: true,
            monitoring: false,
            gitInit: false,
            githubRepo: false,
          },
        }),
      );
      expect(existsSync(path.join(targetDir, "src/index.ts"))).toBe(true);
      expect(existsSync(path.join(targetDir, "package.json"))).toBe(true);
    }
    rmSync(root, { recursive: true, force: true });
  });

  it("dry-run does not write files", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "node-gen-"));
    const targetDir = path.join(root, "dry");
    const result = await createProject(
      defaultConfig({
        projectName: "dry",
        targetDir,
        dryRun: true,
        skipInstall: true,
        skipGit: true,
      }),
    );
    expect(result.files.length).toBeGreaterThan(5);
    expect(existsSync(path.join(targetDir, "package.json"))).toBe(false);
    rmSync(root, { recursive: true, force: true });
  });
});
