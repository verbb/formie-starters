# Forge Deployment

Use the hosted starter site as the release-candidate gate for Formie 4. Deploy and verify the starters before tagging a Formie beta or publishing new npm packages.

## Release-Candidate Inputs

A Forge server cannot use the local DDEV mount from the Verbb workspace. Before deploying, the starter repository must resolve every dependency from a remotely accessible source:

1. Review the current Formie `beta` work and create a clean release-candidate commit containing the backend state used by the refreshed project config and seed.
2. Push that commit to a temporary release-candidate branch or the existing `beta` branch. This makes the source installable; it does not require a Composer tag, Craft Plugin Store release, or npm publication.
3. Update `craft/composer.lock` against that remote commit and confirm the lock records its exact commit hash.
4. Remove the temporary `dompdf/dompdf` version alias from `craft/composer.json` if the release-candidate Formie metadata resolves Dompdf 3 normally.
5. Keep the five frontend packages on their currently tested versions for the first Forge deployment. The Vue starter's local compatibility component covers the unpublished adapter fix.
6. Run `npm run check` and `npm run assemble:hosted`, then commit and push a starter release-candidate branch.

Do not point Forge at an unreviewed moving branch. The Composer lockfile and starter commit should identify the exact code that passed local validation.

## Forge Site

Provision one PHP site so Craft and all static frontends share the same origin:

- Repository: the public Formie starters repository.
- Branch: the starter release-candidate branch for the first deployment.
- PHP: 8.3 or a newer Craft-compatible version.
- Database: MySQL 8.
- Node.js: 22, matching the currently validated local build.
- Web directory: `/craft/web`, relative to the checked-out repository.
- Domain: use a password-protected preview hostname first, then `formie-starters.verbb.io` after acceptance.

Enable Forge's option to expose the site's environment variables to the deployment script. Keep the preview behind a Forge security rule or equivalent access control until it is ready for public use.

Craft must be able to write to `craft/storage`, `craft/web/cpresources`, and `craft/config/license.key`. The deployment user also needs permission to replace the five ignored static output directories below `craft/web`.

### Align the PHP Versions

Installing a PHP version on the server does not automatically select it for either the site or the command line. Configure the actual Forge site to use PHP 8.3 or 8.4, then either make the same version the server's CLI default or invoke it explicitly. Confirm both runtimes before deploying:

```bash
php -v
php8.4 -v
php8.4 /home/forge/your-site-directory/current/craft/craft install/check --interactive=0
```

The `craft/craft` executable uses `#!/usr/bin/env php`, so running it directly uses the server's CLI default. Prefer `"$FORGE_PHP" craft/craft` in deployment scripts; Forge resolves that variable to the PHP version selected for the site. Configure scheduled jobs, daemons, and queue workers with the same version.

## Environment

Start from `craft/.env.example.production` and configure the Forge site's environment. At minimum, supply:

```dotenv
CRAFT_APP_ID=formie-starters-production
CRAFT_ENVIRONMENT=production
CRAFT_DB_DRIVER=mysql
CRAFT_DB_SERVER=127.0.0.1
CRAFT_DB_PORT=3306
CRAFT_DB_DATABASE=
CRAFT_DB_USER=
CRAFT_DB_PASSWORD=
CRAFT_DB_SCHEMA=public
CRAFT_DB_TABLE_PREFIX=
CRAFT_SECURITY_KEY=
PRIMARY_SITE_URL=https://preview-hostname.example
CRAFT_DEV_MODE=false
CRAFT_ALLOW_ADMIN_CHANGES=false
CRAFT_DISALLOW_ROBOTS=true
VITE_FORMIE_BASE_URL=https://preview-hostname.example
NEXT_PUBLIC_FORMIE_BASE_URL=https://preview-hostname.example
NUXT_PUBLIC_FORMIE_BASE_URL=https://preview-hostname.example
FORMIE_ALLOWED_ORIGINS=
```

Generate a unique `CRAFT_SECURITY_KEY`; do not copy a local or production key into a preview environment. The frontends and Craft are same-origin in this layout, so `FORMIE_ALLOWED_ORIGINS` should remain empty. If they are intentionally split across origins, list only the exact public frontend origins.

Change the four public URLs to `https://formie-starters.verbb.io` for the production deployment and set `CRAFT_DISALLOW_ROBOTS=false` when the site should be indexed.

## Deployment Script

Use this as the Forge deployment script, retaining Forge's generated PHP-FPM reload command at the end if it supplies one:

```bash
cd /home/forge/your-site-directory

git pull origin "$FORGE_SITE_BRANCH"

"$FORGE_PHP" "$(command -v composer)" --working-dir=craft install \
  --no-dev \
  --no-interaction \
  --prefer-dist \
  --optimize-autoloader

npm ci
npm ci --prefix react
npm ci --prefix vue
npm ci --prefix web
npm ci --prefix next
npm ci --prefix nuxt
npm run assemble:hosted

if "$FORGE_PHP" craft/craft install/check --interactive=0; then
  "$FORGE_PHP" craft/craft up --interactive=0
  "$FORGE_PHP" craft/craft clear-caches/all
else
  echo "Craft is not installed yet; import the clean seed before the next deployment."
fi
```

Replace `/home/forge/your-site-directory` with the checkout path shown by Forge. Keep Forge's generated PHP-FPM reload command at the end of the script. The deploy fails before replacing static files if any frontend build output is missing. `assemble:hosted` then recreates the exact `craft/web/{react,vue,web,next,nuxt}` directories from the five production builds.

## Nginx Routes

Add these locations to the site's Nginx configuration before the general Craft fallback. They provide history fallback for the Vite apps and static-export routing for Next.js and Nuxt:

```nginx
location ^~ /react/ {
    try_files $uri $uri/ /react/index.html;
}

location ^~ /vue/ {
    try_files $uri $uri/ /vue/index.html;
}

location ^~ /web/ {
    try_files $uri $uri/ /web/index.html;
}

location ^~ /next/ {
    try_files $uri $uri.html $uri/ /next/404.html;
}

location ^~ /nuxt/ {
    try_files $uri/index.html $uri /nuxt/404.html;
}
```

Keep Forge's normal PHP handler and Craft root fallback. Test the Nginx configuration before applying it, then reload Nginx through Forge.

## First Database Import

The committed seed is the clean, migrated content baseline. Run the deployment script once so the repository and Composer dependencies are present; the install check safely skips migrations against the empty database. Then import the seed once:

```bash
cd /home/forge/your-site-directory
"$FORGE_PHP" craft/craft db/restore craft/seeds/formie-starters.sql.gz \
  --drop-all-tables=1 \
  --interactive=0
"$FORGE_PHP" craft/craft up --interactive=0
"$FORGE_PHP" craft/craft project-config/apply --force --interactive=0
"$FORGE_PHP" craft/craft clear-caches/all
```

`--drop-all-tables=1` destroys all data in the configured database. Verify the hostname and database name first, take a backup if the database is not disposable, and never place this restore command in the normal deployment script.

After the import succeeds, run **Deploy Now** again. The install check should report that Craft is installed, and the normal migration and cache-clear path should complete.

Do not enable the nightly clean-seed reset until the manual deployment, submission flow, and recovery path have all been verified on the preview host.

## Acceptance Gate

On the preview hostname, verify:

- The Craft home page links to all eight starter families.
- Directly opening nested React, Vue, Web Components, Next.js, and Nuxt URLs does not return a 404.
- REST and GraphQL examples render for both server-rendered and client-rendered modes.
- The single-page component-driven scenario renders the `yourName` field without the missing-metadata error.
- A valid submission succeeds, validation errors display correctly, and the browser console remains clean.
- Preview, Response, Code, and Events tabs reflect the selected example.
- Refreshing each nested URL preserves the route.
- The favicon, static assets, Craft control panel resources, and HTTPS redirects load correctly.
- `php craft/craft up --interactive=0` reports no pending migrations or project-config changes after deployment.
- A database backup can be created and the clean seed can be restored deliberately.

Run the same smoke suite after switching the domain and rebuilding with the production public URLs.

## Rollback

Redeploy the last known-good starter commit through Forge to roll back code and static assets. Database migrations are not reversed by a code rollback, so take a database backup immediately before the first release-candidate migration and before every later schema-changing deployment.

## Publish After Acceptance

Once the deployed starters pass the acceptance gate:

1. Tag and publish the exact tested Formie backend commit as the beta.
2. Publish the frontend npm packages, including the Vue adapter fix.
3. Update the starter Composer and npm lockfiles to the released identifiers without changing the tested source.
4. Remove the temporary Vue compatibility component and any dependency alias that is no longer required.
5. Re-run the full local checks, redeploy, and repeat the smoke suite.
