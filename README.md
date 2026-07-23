# Static App Hub

A small Netlify project that builds two existing GitHub-hosted static web apps and presents them from one shared index page. Each source repository is cloned during the Netlify build, its `build.js` script is run, and its complete `dist` directory is published under a dedicated path.

## Technologies

- Node.js 22 build script
- Static HTML and CSS
- Netlify build and hosting
- GitHub repositories as application sources

## Configure the applications

The default entries live in `sites.config.json`. Change each app's `name`, `description`, and `slug` to match the projects, then add these environment variables in Netlify:

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_ONE_REPOSITORY` | Yes | Git clone URL for the first repository |
| `APP_TWO_REPOSITORY` | Yes | Git clone URL for the second repository |
| `APP_ONE_BRANCH` | No | Branch or tag; defaults to the repository's default branch |
| `APP_TWO_BRANCH` | No | Branch or tag; defaults to the repository's default branch |
| `APP_ONE_INSTALL_COMMAND` | No | Overrides automatic dependency installation |
| `APP_TWO_INSTALL_COMMAND` | No | Overrides automatic dependency installation |
| `APP_ONE_BUILD_COMMAND` | No | Overrides the default `node build.js` command |
| `APP_TWO_BUILD_COMMAND` | No | Overrides the default `node build.js` command |

For public repositories, use an HTTPS clone URL such as `https://github.com/organization/repository.git`. Private repositories need Git credentials available to the Netlify build environment; do not store credentials in `sites.config.json`.

After deployment, the hub is available at `/`, while the applications are served at `/app-one/` and `/app-two/` unless their slugs are changed.

Each application must generate `dist/index.html`. Any additional files inside `dist` are copied with it. Application asset URLs should be relative or configured for the application's published slug.

## Run locally

Set the repository variables in your shell and run:

```bash
APP_ONE_REPOSITORY="https://github.com/example/first-app.git" \
APP_TWO_REPOSITORY="https://github.com/example/second-app.git" \
npm run build
```

Open `public/index.html` through any static file server. If repository variables are omitted, the build still creates the hub and displays configuration instructions in place of active links.
