# Formie Craft Starters

This starter hosts the Craft-first Formie demos that are not headless apps.

It currently includes:

- `/barba` for a Craft-hosted Barba.js multi-page starter
- `/sprig` for a Sprig-driven reactive Twig starter
- `/datastar` for a Datastar-driven signal + server patch starter

All three starters render the same Formie demo forms from the local Craft site:

- `singlePage`
- `multiPage`
- `advanced`

## Browser startup model

These starters are the Craft-first examples where Formie still renders the HTML and owns the browser behavior.

- the starter templates now rely on Formie's built-in startup script and DOM observation for page swaps and reactive updates
- per-form `initJs: false` remains the escape hatch when a starter wants to defer startup for a specific rendered form
- page-level observation stays with the emitted startup script through `useObserver`
- plugin-rendered pages get front-end translations from Craft automatically through Formie's inline JSON translation seed

If you move one of these starters toward a more app-owned integration, keep that split in mind: form-scoped startup opt-out on the rendered form, page-scoped observation on the emitted browser script.

## Setup

The starter includes a committed seed database so local installs match the hosted demos.

1. Install the local seed:

```bash
scripts/install-local-seed.sh
```

2. Open the site:

```text
https://craft.ddev.site:8443/
```

3. Log in to the control panel when needed:

```text
https://craft.ddev.site:8443/admin
Username: admin
Password: password
```

If you prefer to run the steps manually:

```bash
ddev start
ddev composer install
ddev import-db --file=seeds/formie-starters.sql.gz
ddev craft up --interactive=0
ddev craft project-config/apply --interactive=0
ddev craft clear-caches/all
```

## Seed Data

The canonical seed files are:

```text
seeds/formie-starters.sql.gz
```

The SQL seed creates an exact local copy of the hosted starter, including Craft, plugins, project config state, and the demo Formie forms.

Keep the seed safe for public use:

- `admin` / `password` is intentional for local clones only
- do not add real submissions, sessions, queue jobs, tokens, or private credentials
- do not commit production-only database dumps
- do not commit ad-hoc `*pre-reset*.sql.gz` backups

## Hosted Reset

The hosted starter should use the same public seed, then immediately harden the admin password with a production-only value stored outside git.

Keep the nightly reset script in Forge or private operations notes rather than in this public starter repo. The reset should import `seeds/formie-starters.sql.gz`, run Craft updates, apply project config, set the private admin password, and clear caches.

Run the reset nightly so visitors can make real demo submissions without the hosted database accumulating long-lived test data or abuse. Restrict production control-panel access separately with Forge/Nginx basic auth, an IP allowlist, or another server-level control.

## What To Validate

- the index page is a minimal centered chooser with the Formie logo at the top and Verbb logo at the bottom
- the Barba starter runs wholly inside the Craft install, including its multi-page routes
- the Sprig starter swaps the active demo cleanly while keeping the page focused on the form
- the Datastar starter patches the active demo cleanly while keeping the page focused on the form
- all three Formie demo handles render and submit correctly in a normal Craft/Twig environment
- deferred-start flows still only opt specific forms out, without disabling Formie's browser startup for the whole page
- the visual shell matches the other starter demos closely enough for public starter hosting
