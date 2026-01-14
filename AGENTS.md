# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the Vue 3 app: `views/`, `components/`, `composables/`, `stores/`, `router/`, `api/`, `utils/`, and `assets/`.
- `functions/` hosts Cloudflare Pages Functions (API handlers under `functions/api/`).
- `migrations/` holds D1 SQL migrations.
- `public/` is for static assets served as-is.
- `linmusic_homepage/` contains UI reference mockups (HTML + screenshots).
- Root configuration lives in `vite.config.ts`, `tailwind.config.js`, `wrangler.toml`, and `tsconfig*.json`.

## Build, Test, and Development Commands
- `npm install` installs dependencies.
- `npm run dev` starts the Vite dev server.
- `npm run build` runs `vue-tsc -b` and builds to `dist/`.
- `npm run preview` serves the production build locally.
- `npm run deploy` builds and deploys to Cloudflare Pages.
- D1 migrations: `npx wrangler d1 execute <db-name> --file=./migrations/0001_init.sql` (see `wrangler.toml`).

## Coding Style & Naming Conventions
- Indentation: 2 spaces in `.vue` template/script/style blocks and TS files.
- Strings: use single quotes in TS/JS; use template literals only when interpolation is needed.
- Components: PascalCase filenames (e.g., `PlaylistCard.vue`); views end with `View.vue`.
- Composables: `useX.ts` in `src/composables/`.
- State: Pinia stores in `src/stores/` with concise lowercase names (e.g., `player.ts`).
- Formatting/linting: no ESLint/Prettier config detected, so match existing formatting.

## Testing Guidelines
- No test framework or `test` script is configured in this repo.
- If adding tests, add a script in `package.json`, document how to run it, and keep tests close to the code they cover.

## Commit & Pull Request Guidelines
- This checkout has no `.git` directory, so no commit history conventions are visible.
- If using git, prefer short imperative commit messages and include a scope when helpful (e.g., `frontend:`, `functions:`, `migrations:`).
- PRs should include a concise summary, linked issues, screenshots for UI changes, and migration notes for D1 schema changes.

## Configuration & Deployment Notes
- Cloudflare configuration lives in `wrangler.toml`; keep database IDs and routes up to date.
- Pages Functions routes are under `functions/api/`; keep handlers small and focused.
- Avoid committing secrets; use Cloudflare settings for runtime secrets.
