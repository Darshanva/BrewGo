# BrewGo

A Swiggy/Zomato-style beverage ordering app for Bangalore cafes — covering coffee (hot & cold), tea, smoothies, mojitos, and beverages.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/brew-go run dev` — run the frontend (port auto-assigned)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui (wouter routing, React Query)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle schema files (cafes, menu_items, orders, reviews)
- `lib/api-client-react/` — generated React Query hooks (do not edit manually)
- `lib/api-zod/` — generated Zod validators (do not edit manually)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/brew-go/src/pages/` — React page components
- `artifacts/brew-go/src/components/` — Shared UI components
- `artifacts/brew-go/src/lib/cart-context.tsx` — Cart state (persisted to localStorage)

## Architecture decisions

- **Contract-first API**: OpenAPI spec drives codegen; both server (Zod) and client (React Query hooks) derive from it.
- **Orval collision fix**: Endpoints with BOTH path params AND query params generate colliding `Params` types. Fixed by removing query params from `getCafeMenu` — menu filtering happens client-side or via the `/menu-items/search` endpoint.
- **Cart scoped to one cafe**: Adding items from a different cafe clears the current cart automatically.
- **categories stored as JSON text**: The `categories` column in `cafes` is a JSON string in a text column — parse with `JSON.parse()` on read.
- **Numeric decimals**: DB uses `numeric`/`text` for price/rating; always parse with `Number()` when doing arithmetic.

## Product

- **Home**: Featured cafes (with discounts), trending drinks, category shortcuts
- **Browse Cafes**: Filter by Bangalore area + beverage category + sort order; 10 real cafes seeded
- **Cafe Detail**: Hero image, menu with category tabs, Add/update quantity inline, sticky cart bar, reviews + review form
- **Search**: Full-text search across cafes and menu items; category filter pills
- **Cart**: Item management, Bangalore delivery addresses, order summary, place order
- **Orders**: Order history with status badges
- **Order Tracking**: Real-time status progression with "simulate advance" button for demo

## Seed data

10 Bangalore cafes across Koramangala, Indiranagar, HSR Layout, MG Road, Jayanagar, Whitefield, and Marathahalli. 51 menu items across all 5 categories. 17 reviews.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do not run `pnpm dev` at workspace root — use per-package filter commands or restart_workflow.
- After schema changes: run `pnpm --filter @workspace/db run push`, then reseed if needed.
- After OpenAPI changes: run `pnpm --filter @workspace/api-spec run codegen`.
- API server binds on port 8080; shared proxy routes `/api/*` to it.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
