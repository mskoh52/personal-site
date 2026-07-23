import { createServer } from "node:http";
import { existsSync, statSync, createReadStream } from "node:fs";
import { join, resolve, extname, normalize } from "node:path";
import { spawnSync } from "node:child_process";
import { loadPackageEnv } from "./load-env.mjs";

loadPackageEnv(process.env.TARGET || "local");

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const publicDir = resolve(process.env.PUBLIC_DIR || "public");
const spaFallback = process.env.SPA_FALLBACK === "1";

if (process.env.BUILD_FIRST === "1") {
  const result = spawnSync("npm", ["run", "build"], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm"
};

function fileForUrl(url) {
  const pathname = decodeURIComponent(new URL(url, "http://local").pathname);
  const cleanPath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let filePath = resolve(join(publicDir, cleanPath));

  if (!filePath.startsWith(publicDir)) return null;
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  if (!existsSync(filePath) && spaFallback) {
    filePath = join(publicDir, "index.html");
  }

  return filePath;
}

createServer((req, res) => {
  const filePath = fileForUrl(req.url);

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  res.writeHead(200, {
    "content-type": types[extname(filePath)] || "application/octet-stream",
    "cache-control": "no-store"
  });

  createReadStream(filePath).pipe(res);
}).listen(port, host, () => {
  console.log(`Serving ${publicDir}`);
  console.log(`Local: http://${host}:${port}`);
});
