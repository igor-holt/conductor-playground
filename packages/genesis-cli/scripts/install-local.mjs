#!/usr/bin/env node

import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const targetDir = resolve(process.env.HOME ?? "~", ".local/bin");
const targetPath = resolve(targetDir, "genesis-conductor");
const distPath = resolve(packageDir, "dist/index.js");

mkdirSync(targetDir, { recursive: true });
writeFileSync(
  targetPath,
  `#!/usr/bin/env bash\nnode "${distPath}" "$@"\n`,
  { encoding: "utf8" }
);
chmodSync(targetPath, 0o755);

console.log(`Installed genesis-conductor to ${targetPath}`);
