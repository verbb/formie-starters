# Formie Nuxt Starter

This starter is the Nuxt companion to the Vue review app. It covers the same four public transport and rendering stories in a route-based host.

## Setup

1. Install workspace dependencies from the monorepo root (the folder that contains both `formie-plugin-repo` and `formie-starters-repo`):

```bash
npm install
```

2. Copy the starter environment file:

```bash
cp formie-starters-repo/nuxt/.env.example formie-starters-repo/nuxt/.env
```

If you are already inside `formie-starters-repo`, use `cp nuxt/.env.example nuxt/.env`.

3. Set **`NUXT_PUBLIC_FORMIE_BASE_URL`** in `.env` to your Craft site origin (the example file uses a typical ddev URL). The browser calls Craft **directly** from `http://localhost:3002`, so ensure Craft allows that origin for CORS (and cookies if you rely on session cookies across sites).

4. Optional: **`NUXT_PUBLIC_FORMIE_GRAPHQL_ENDPOINT`** if GraphQL is not `{base}/api`.

5. Optional form handles:

- `NUXT_PUBLIC_FORMIE_SINGLE_PAGE_HANDLE`
- `NUXT_PUBLIC_FORMIE_MULTI_PAGE_HANDLE`
- `NUXT_PUBLIC_FORMIE_ADVANCED_HANDLE`

6. Start the app:

```bash
npm run dev -w starter-nuxt
```

7. Open [http://localhost:3002](http://localhost:3002).

## Locale and translations

This starter is a headless app, so locale and browser translations belong to the app rather than to Craft's plugin-rendered startup path.

- plugin-rendered Craft pages seed browser translations automatically
- this starter should inject translated browser strings explicitly when it needs non-English validation or UI copy
- do not rely on Craft preloading translations into the page for these routes

## Recommended Review Path

1. `html/rest`
2. `html/graphql`
3. `component/rest`
4. `component/graphql`

Each route should reach a successful submission for at least one form example before sign-off.
