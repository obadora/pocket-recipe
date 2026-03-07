# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run lint     # Run ESLint
npm test         # Run tests (Vitest, single run)
npm run test:watch  # Run tests in watch mode

# Prisma
npx prisma migrate dev   # Apply migrations and regenerate client
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma studio        # Open Prisma Studio GUI for the database
```

## Architecture

This is a **Next.js 16 App Router** project called "pocket-recipe" — a recipe management app. It uses the **dual-client pattern**: Supabase for authentication and Prisma for all database operations.

### Authentication (Supabase)

Authentication is handled via Supabase with three context-specific clients:

- `app/utils/supabase/client.ts` — Browser/Client Components (`createBrowserClient`)
- `app/utils/supabase/server.ts` — Server Components (`createServerClient` with Next.js cookies)
- `app/utils/supabase/middleware.ts` — Session refresh in middleware (`updateSession`)

`middleware.ts` at the root runs `updateSession` on every request (excluding static assets) to keep Supabase sessions alive via cookie refresh.

### Database (Prisma + Supabase PostgreSQL)

Prisma 7 connects via the `@prisma/adapter-pg` driver adapter (`PrismaPg`) rather than Prisma's native connection. The singleton client is in `lib/prisma.ts` (prevents connection exhaustion in dev with hot reload).

`prisma.config.ts` at the root is a Prisma 7 config file — it loads `.env.local` via `dotenv` and points to `prisma/schema.prisma`. This means `DATABASE_URL` must be in `.env.local`, not `.env`.

Schema models (`prisma/schema.prisma`):
- `User` — linked to Supabase Auth user by UUID, owns recipes
- `Recipe` — has `sourceType` ('url' | 'photo' | 'manual'), belongs to a User
- `Ingredient` — ordered list items on a Recipe
- `Step` — ordered steps on a Recipe
- `Category` / `RecipeCategory` — many-to-many category tagging

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                  # Supabase PostgreSQL connection string for Prisma
NEXT_PUBLIC_SITE_URL=          # Full origin URL (e.g. http://localhost:3000) for OAuth redirects
```

### Styling

Tailwind CSS v4 via `@tailwindcss/postcss`. No separate `tailwind.config.js` — configuration is handled through PostCSS.

### Route Structure

- `app/(auth)/` — Route group for unauthenticated pages (`/login`, `/signup`). Server Actions are in `app/(auth)/actions.ts`.
- `app/auth/callback/route.ts` — OAuth callback handler (`/auth/callback`). Exchanges code for session and upserts the user into Prisma DB.
- All other routes are protected: `middleware.ts` redirects unauthenticated users to `/login`.

### User Sync Pattern

Supabase Auth and Prisma `User` table are kept in sync via `prisma.user.upsert` at two entry points:
1. `signIn` in `app/(auth)/actions.ts` — on email/password login
2. `app/auth/callback/route.ts` — on OAuth (Google) login

### Testing

**Development follows TDD (Test-Driven Development). Always write tests before implementation.**

1. Write a failing test (RED)
2. Implement the minimum code to pass (GREEN)
3. Refactor if needed

Vitest is configured in `vitest.config.ts` with two projects:

| Project | Environment | File pattern | Target |
|---|---|---|---|
| `unit` | node | `*.test.ts` | Server Actions, utilities |
| `component` | happy-dom | `*.test.tsx` | React components |

Tests live alongside source files (e.g. `app/(auth)/actions.test.ts`).

Key conventions:
- Use `vi.hoisted()` when defining mock variables used inside `vi.mock()` factory functions
- Component tests use `@testing-library/react` and `@testing-library/user-event`
- Setup file for component tests: `vitest.setup.ts` (imports `@testing-library/jest-dom`)

### Dev Utilities

`app/test/page.tsx` is a connection test page (`/test`) that verifies Supabase Auth and Prisma DB connectivity — useful during setup.
