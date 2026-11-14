# School Library System — Frontend

The React and TypeScript web application for the School Library System. It serves librarians,
teachers, and learners at the circulation desk and in the catalog.

The Supabase database, migrations, and Edge Functions live in the
[backend repository](https://github.com/Kenshitawa/library-backend).

## Requirements

- Node.js 20 LTS and npm
- A configured Supabase project (local Supabase CLI/Docker for development)

## Local development

1. Install dependencies:
   ```powershell
   npm ci
   ```
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` for your local Supabase project.
3. Start the frontend:
   ```powershell
   npm run dev
   ```
   Open `http://127.0.0.1:5173`.

Never put a Supabase service-role key, database password, or AI provider key in a `VITE_*`
variable. Vite embeds `VITE_*` values in browser assets.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Type-check and create production assets in `dist/` |
| `npm test` | Run unit and component tests |
| `npm run lint` | Run ESLint |
| `npm run test:e2e` | Run the Playwright librarian workflow |
| `npm run preview` | Preview the production build locally |

For the browser workflow, set `E2E_EMAIL` and `E2E_PASSWORD` to a librarian account in a
disposable test project. The test creates catalog and learner records, issues and returns a book,
downloads both receipts, and exports an inventory report.

## Deployment

Build with `npm ci && npm run build`, then deploy `dist/` to a static host configured to serve
`index.html` for client-side routes. Configure the production Supabase URL and public anon key in
the frontend host. Configure allowed redirect URLs in Supabase Auth to match the deployed site.

Apply database changes and deploy Edge Functions from the backend repository before or alongside
the frontend release. See its README for migrations, roles, secrets, scheduled jobs, and the
production checklist.

The interface defaults to Kenyan shillings (KES), `en-KE`, and `Africa/Nairobi`. Library-specific
settings can be changed by an active librarian.
