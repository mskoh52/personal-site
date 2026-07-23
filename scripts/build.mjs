import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { loadPackageEnv } from "./load-env.mjs";

loadPackageEnv(process.env.TARGET || "local");

const projectRoot = process.cwd();
const outputDirectory = path.join(projectRoot, "public");
const configPath = path.join(projectRoot, "sites.config.json");
const sourceDirectory = path.join(projectRoot, "src");

function run(command, options = {}) {
  const result = spawnSync(command, {
    cwd: options.cwd ?? projectRoot,
    env: process.env,
    shell: true,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command}`);
  }
}

function resolveInstallCommand(repositoryDirectory, configuredCommand) {
  if (configuredCommand) return configuredCommand;
  if (existsSync(path.join(repositoryDirectory, "pnpm-lock.yaml"))) return "corepack pnpm install --frozen-lockfile";
  if (existsSync(path.join(repositoryDirectory, "yarn.lock"))) return "corepack yarn install --immutable";
  if (existsSync(path.join(repositoryDirectory, "package-lock.json"))) return "npm ci";
  if (existsSync(path.join(repositoryDirectory, "package.json"))) return "npm install";
  return null;
}

function validateConfig(apps) {
  const slugs = new Set();

  for (const app of apps) {
    if (!app.name || !app.slug || !app.repositoryEnv) {
      throw new Error("Every site needs name, slug, and repositoryEnv values.");
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(app.slug)) {
      throw new Error(`Invalid slug '${app.slug}'. Use lowercase letters, numbers, and hyphens.`);
    }
    if (slugs.has(app.slug)) throw new Error(`Duplicate slug '${app.slug}'.`);
    slugs.add(app.slug);
  }
}

async function buildApp(app, workDirectory) {
  const repository = process.env[app.repositoryEnv];
  if (!repository) return { ...app, configured: false };

  const repositoryDirectory = path.join(workDirectory, app.slug);
  const branch = app.branchEnv ? process.env[app.branchEnv] : "";
  const branchArgument = branch ? `--branch ${JSON.stringify(branch)}` : "";

  console.log(`\nBuilding ${app.name}`);
  run(`git clone --depth 1 ${branchArgument} ${JSON.stringify(repository)} ${JSON.stringify(repositoryDirectory)}`);

  const installCommand = app.installCommandEnv ? process.env[app.installCommandEnv] : "";
  const resolvedInstallCommand = resolveInstallCommand(repositoryDirectory, installCommand);
  if (resolvedInstallCommand) run(resolvedInstallCommand, { cwd: repositoryDirectory });

  const buildCommand = (app.buildCommandEnv && process.env[app.buildCommandEnv]) || "node build.js";
  run(buildCommand, { cwd: repositoryDirectory });

  const appDistDirectory = path.join(repositoryDirectory, "dist");
  const appIndexPath = path.join(appDistDirectory, "index.html");
  if (!existsSync(appIndexPath)) {
    throw new Error(`${app.name} did not produce dist/index.html.`);
  }

  await cp(appDistDirectory, path.join(outputDirectory, app.slug), { recursive: true });
  return { ...app, configured: true };
}

function renderCard(app, index) {
  const number = String(index + 1).padStart(2, "0");
  if (!app.configured) {
    return `
      <article class="app-card app-card--disabled" aria-label="${app.name} is not configured">
        <div class="app-card__number">${number}</div>
        <div class="app-card__content">
          <p class="app-card__status">Configuration needed</p>
          <h2>${app.name}</h2>
          <p>${app.description ?? "Static web application."}</p>
          <span class="app-card__action">Set ${app.repositoryEnv}</span>
        </div>
      </article>`;
  }

  return `
      <a class="app-card" href="${app.slug}/">
        <div class="app-card__number">${number}</div>
        <div class="app-card__content">
          <p class="app-card__status"><span></span> Ready to open</p>
          <h2>${app.name}</h2>
          <p>${app.description ?? "Static web application."}</p>
          <span class="app-card__action">Launch application <b aria-hidden="true">↗</b></span>
        </div>
      </a>`;
}

async function renderIndex(apps) {
  const template = await readFile(path.join(sourceDirectory, "index.html"), "utf8");
  const html = template
    .replace("{{APP_CARDS}}", apps.map(renderCard).join("\n"))

  await writeFile(path.join(outputDirectory, "index.html"), html);
  await cp(path.join(sourceDirectory, "styles.css"), path.join(outputDirectory, "styles.css"));
}

async function main() {
  const apps = JSON.parse(await readFile(configPath, "utf8"));
  validateConfig(apps);

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  const workDirectory = await mkdtemp(path.join(tmpdir(), "static-app-hub-"));

  try {
    const builtApps = [];
    for (const app of apps) builtApps.push(await buildApp(app, workDirectory));
    await renderIndex(builtApps);
    console.log(`\nPublished ${builtApps.filter((app) => app.configured).length} application(s).`);
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
