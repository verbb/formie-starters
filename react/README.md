# Formie React Starter

This is the primary starter for reviewing the public React front-end stack.

It covers:

- `html` mode with REST and GraphQL
- `component` mode with REST and GraphQL
- live response payloads, code snippets, and emitted `formie:*` events

## Setup

1. Install workspace dependencies from the monorepo root (the folder that contains both `formie-plugin-repo` and `formie-starters-repo`):

```bash
npm install
```

2. Copy the starter environment file and point it at your Craft site:

```bash
cp formie-starters-repo/react/.env.example formie-starters-repo/react/.env
```

If you are already inside `formie-starters-repo`, use `cp react/.env.example react/.env`.

3. Set **`VITE_FORMIE_BASE_URL`** in `.env` to your Craft site origin (the example file uses a typical ddev URL). The browser calls Craft **directly** from `http://localhost:5174`, so ensure Craft allows that origin for CORS (and cookies if you rely on session cookies across sites).

4. Optional: **`VITE_FORMIE_GRAPHQL_ENDPOINT`** if GraphQL is not `{base}/api`.

5. Optional form handles:

- `VITE_FORMIE_SINGLE_PAGE_HANDLE`
- `VITE_FORMIE_MULTI_PAGE_HANDLE`
- `VITE_FORMIE_ADVANCED_HANDLE`

6. Start the app:

```bash
npm run dev -w starter-react
```

7. Open [http://localhost:5174](http://localhost:5174).

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
