# Formie Starters

Public examples for integrating [Formie](https://verbb.io/craft-plugins/formie) with Craft-rendered pages and modern frontend frameworks.

## Repository Layout

- `craft/` contains the shared Craft CMS site, seed database, and the Sprig, Datastar, and Barba.js examples.
- `react/`, `vue/`, and `web/` are Vite applications.
- `next/` is a Next.js App Router application.
- `nuxt/` is a Nuxt application.

Each frontend is intentionally an independent package with its own lockfile. The root package only coordinates commands across them.

## Install

Install the command runner and each application from its committed lockfile:

```bash
npm ci
npm ci --prefix react
npm ci --prefix vue
npm ci --prefix web
npm ci --prefix next
npm ci --prefix nuxt
```

Copy each application's `.env.example` to its documented local env filename, then install the Craft seed:

```bash
cd craft
scripts/install-local-seed.sh
```

The default Craft URL is `https://craft.ddev.site`. Run `npm run dev` from the repository root to start all five frontend dev servers.

In the `dev` Craft environment, `craft/config/formie.php` allows the localhost ports used by these applications. Set `FORMIE_ALLOWED_ORIGINS` to a comma-separated list when using different frontend origins. Non-development environments allow no cross-origin requests unless that variable is set explicitly.

## Verbb Workspace Plugin Override

The committed Craft install uses the Composer-locked Formie package so a normal clone is self-contained. Inside the Verbb workspace, copy the inactive DDEV override to mount the active `react/plugin` checkout over that package:

```bash
cp craft/.ddev/docker-compose.formie-plugin.yaml.disabled craft/.ddev/docker-compose.formie-plugin.local.yaml
cd craft
ddev restart
```

The local override is ignored by Git. It expects this repository at `~/verbb/formie/react/formie-starters-repo` and the plugin checkout at `~/verbb/formie/react/plugin`.

## Validation

```bash
npm run lint
npm run build
# or both
npm run check
```

Formie's Craft response schema and the frontend npm packages are one public contract. Update and deploy them together; mixing an older frontend package with a newer response can make otherwise successful API responses impossible to render.

## Hosted Builds

`npm run build:hosted` creates assets with the subdirectory base paths used at `formie-starters.verbb.io`:

- React: `/react/`
- Vue: `/vue/`
- Web Components: `/web/`
- Next.js: `/next/`
- Nuxt: `/nuxt/`

Set each framework's public Formie base URL and optional GraphQL endpoint to the hosted Craft origin before building.

`npm run assemble:hosted` builds all five applications and copies their deployable outputs into `craft/web/react`, `craft/web/vue`, `craft/web/web`, `craft/web/next`, and `craft/web/nuxt`. Those generated directories are ignored by Git and are recreated on every deployment.

See [docs/forge-deployment.md](docs/forge-deployment.md) for the release-candidate launch order, Forge configuration, deployment script, Nginx routes, seed import, smoke tests, and rollback plan.
