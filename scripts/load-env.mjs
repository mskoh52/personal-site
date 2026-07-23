// scripts/load-env.mjs
import { readFileSync } from "node:fs";

export function loadPackageEnv(target = "local") {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  );

  const sharedEnv = pkg.appHub?.env || {};
  const targetEnv = pkg.appHub?.targets?.[target] || {};

  for (const [key, value] of Object.entries({ ...sharedEnv, ...targetEnv })) {
    process.env[key] ??= String(value);
  }
}
