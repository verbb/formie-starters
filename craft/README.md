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

1. Start the local Craft site:

```bash
ddev start
```

2. Install PHP dependencies if needed:

```bash
ddev composer install
```

3. Apply project config and ensure plugins are installed:

```bash
ddev craft project-config/apply
ddev craft plugin/install sprig
ddev craft plugin/install datastar
```

4. Open the site:

```text
https://craft.ddev.site:8443/
```

## What To Validate

- the index page is a minimal centered chooser with the Formie logo at the top and Verbb logo at the bottom
- the Barba starter runs wholly inside the Craft install, including its multi-page routes
- the Sprig starter swaps the active demo cleanly while keeping the page focused on the form
- the Datastar starter patches the active demo cleanly while keeping the page focused on the form
- all three Formie demo handles render and submit correctly in a normal Craft/Twig environment
- deferred-start flows still only opt specific forms out, without disabling Formie's browser startup for the whole page
- the visual shell matches the other starter demos closely enough for public starter hosting
