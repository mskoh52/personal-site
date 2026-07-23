# Project Guide

## Architecture

This is a framework-free static Netlify project. `scripts/build.mjs` is the only build entry point. It reads `sites.config.json`, clones configured application repositories into a temporary directory, installs their dependencies when a recognized package manifest is present, runs each app build, and copies each `dist` directory into `public/<slug>`.

The same script renders `src/index.html` into `public/index.html`. It replaces the application card and online-count placeholders based on build results. `src/styles.css` contains all visual styling and is copied to the publish directory.

## Key paths

- `scripts/build.mjs`: repository cloning, app builds, output copying, and index rendering
- `sites.config.json`: app labels, descriptions, slugs, and environment-variable mappings
- `src/index.html`: landing-page template
- `src/styles.css`: landing-page styles
- `netlify.toml`: Netlify build and publish settings
- `public/`: generated output; never edit or commit it

## Conventions

- Keep the project dependency-free unless a concrete requirement justifies a package.
- Keep repository URLs and credentials out of committed files; read repository locations from Netlify environment variables.
- Use lowercase, hyphenated slugs because they become public URL paths.
- Preserve accessible focus states, semantic HTML, responsive layouts, and reduced-motion support when editing the landing page.
- Treat each source app's `dist` directory as immutable build output and copy it in full.

## Non-obvious decisions

The hub completes successfully when repository variables are missing so a new deployment shows clear setup cards instead of failing with an empty site. Once a repository variable exists, a missing clone, failed app build, or absent `dist/index.html` fails the deployment to avoid publishing stale or incomplete content.
