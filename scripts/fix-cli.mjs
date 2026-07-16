import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(root, "dist", "cli.js");
let code = readFileSync(cliPath, "utf8");
if (!code.startsWith("#!/usr/bin/env node")) {
  code = `#!/usr/bin/env node\n${code}`;
  writeFileSync(cliPath, code);
}
chmodSync(cliPath, 0o755);
