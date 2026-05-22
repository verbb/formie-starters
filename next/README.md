# Formie Next Starter

This starter is a lighter Next.js companion to the main React review app. It covers the same four public transport/mode stories in a simpler single-page host.

## Setup

1. Install workspace dependencies from the monorepo root (the folder that contains both `formie-plugin-repo` and `formie-starters-repo`):

```bash
npm install
```

2. Copy the environment file:

```bash
cp formie-starters-repo/next/.env.example formie-starters-repo/next/.env.local
```

If you are already inside `formie-starters-repo`, use `cp next/.env.example next/.env.local`.

3. Set **`NEXT_PUBLIC_FORMIE_BASE_URL`** in `.env.local` to your Craft site origin (the example file uses a typical ddev URL). The browser calls Craft **directly** from `http://localhost:3001`, so ensure Craft allows that origin for CORS (and cookies if you rely on session cookies across sites).

4. Optional: **`NEXT_PUBLIC_FORMIE_GRAPHQL_ENDPOINT`** if GraphQL is not `{base}/api`.

5. Optional form handles:

- `NEXT_PUBLIC_FORMIE_SINGLE_PAGE_HANDLE`
- `NEXT_PUBLIC_FORMIE_MULTI_PAGE_HANDLE`
- `NEXT_PUBLIC_FORMIE_ADVANCED_HANDLE`

6. Start the app:

```bash
npm run dev -w starter-next
```

7. Open [http://localhost:3001](http://localhost:3001).

## Locale and translations

This starter is a headless app, so locale and browser translations belong to the app rather than to Craft's plugin-rendered startup path.

- plugin-rendered Craft pages seed browser translations automatically
- this starter should inject translated browser strings explicitly when it needs non-English validation or UI copy
- do not rely on Craft preloading translations into the page for these routes

## What To Validate

- HTML REST rendering
- HTML GraphQL rendering
- component REST form preview
- component GraphQL form preview
- successful submission and multipage flow for at least one example
