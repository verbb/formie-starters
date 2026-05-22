# Formie Web Components Starter

Vanilla + Vite review app for `formie-form` (server-rendered mode) and `<formie-core-form>` (client-rendered mode). Same transport stories as the React/Vue starters, without a framework shell.

This starter imports the browser CSS directly and calls `registerFormieWebComponents()` during app startup, so custom elements are registered before the preview routes mount examples.

## Setup

1. Install workspace dependencies from the monorepo root (the folder that contains both `formie-plugin-repo` and `formie-starters-repo`):

```bash
npm install
```

2. Copy the starter environment file:

```bash
cp formie-starters-repo/web/.env.example formie-starters-repo/web/.env
```

If you are already inside `formie-starters-repo`, use `cp web/.env.example web/.env`.

3. Set **`VITE_FORMIE_BASE_URL`** in `.env` to your Craft site origin (the example file uses a typical ddev URL). The browser calls Craft **directly** from the Vite dev origin (port **5176** by default), so ensure Craft allows that origin for CORS (and cookies if you rely on session cookies across sites).

4. Optional: **`VITE_FORMIE_GRAPHQL_ENDPOINT`** if GraphQL is not `{base}/api`.

5. Optional form handles:

- `VITE_FORMIE_SINGLE_PAGE_HANDLE`
- `VITE_FORMIE_MULTI_PAGE_HANDLE`
- `VITE_FORMIE_ADVANCED_HANDLE`

6. Start the app:

```bash
npm run dev -w starter-wc
```

If you prefer an explicit prefix from the monorepo root:

```bash
npm run dev --prefix formie-starters-repo/web
```

7. Open the URL Vite prints (typically [http://localhost:5176](http://localhost:5176)).

## Locale and translations

This starter is app-owned, so translations are app-owned too.

- plugin-rendered Craft pages get browser translations seeded automatically by Craft
- this starter should provide any non-English browser strings explicitly through the browser package APIs when it needs them
- do not assume a Craft-side preload global in these routes

## Recommended review path

1. `html/rest`
2. `html/graphql`
3. `component/rest`
4. `component/graphql`

Each route should reach a successful submission for at least one form example before sign-off.
