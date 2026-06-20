---
name: BrewGo stack and constraints
description: Key non-obvious decisions and gotchas for the BrewGo beverage ordering app
---

## Orval collision fix
Endpoints with BOTH path params AND query params generate colliding `Params` TypeScript types. Fix: remove query params from the endpoint (e.g. `getCafeMenu` has no query params — filtering is client-side or via the `/menu-items/search` endpoint).

**Why:** Orval names both `{operationId}Params` which collides when two endpoint variants share the same operation.

**How to apply:** Whenever you add a new endpoint with path params, avoid adding query params to the same endpoint. Put filtering on a separate `/search` or `/filter` endpoint.

## categories column
`cafes.categories` is a `text` column storing a JSON array string (e.g. `'["coffee","tea"]'`). The API layer parses it before returning. Do not treat it as a native array column.

## Numeric decimals
`price`, `rating`, `deliveryFee` are `numeric`/`text` in the DB. Always parse with `Number()` when doing arithmetic in API routes. The Drizzle ORM returns them as strings.

## Cart context
Cart is scoped to a single cafe. Adding an item from a different cafe silently clears the current cart. Cart is persisted to `localStorage` under key `brewgo_cart`.

## API routing
API server runs on port 8080. Shared proxy routes `/api/*` → port 8080. Frontend uses relative URLs; never hardcode `localhost:8080` in frontend code.

## Seed data
10 cafes, 51 menu items, 17 reviews are loaded via `executeSql` in the code_execution sandbox. Rerun only if DB is reset.
