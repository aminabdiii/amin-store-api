# Amin Store API

Local REST backend built with NestJS 12.3.2, Fastify 5.12.7, Prisma 7.10.1, PostgreSQL 18.6 and Node.js 24. The existing frontend is a requirements reference and has not been modified.

## Application structure

`src/main.ts` starts the application. `src/bootstrap.ts` configures the Fastify adapter, native plugins, validation and Swagger. The root `app.module.ts`, `app.controller.ts` and `app.service.ts` define dependency wiring and the health endpoint.

Each feature has its own `*.module.ts`, `*.controller.ts`, `*.service.ts` and DTOs. Administrator controllers are separate `admin-*.controller.ts` files. Database lifecycle and module wiring are separate in `common/database.service.ts` and `common/database.module.ts`.

Class, method and property decorators each occupy their own line, with the declaration below them. ESLint enforces this convention; `pnpm format` applies layout fixes before Prettier.

## Run locally

```sh
cp .env.example .env
# Set a local PostgreSQL password in POSTGRES_PASSWORD and DATABASE_URL.
# Generate JWT_SECRET, for example: openssl rand -hex 48
pnpm install
pnpm db:up
pnpm db:generate
pnpm db:deploy
pnpm dev
```

The API binds to `127.0.0.1:3001`. PostgreSQL is exposed on `127.0.0.1:5433` with a named persistent volume. Uploaded/imported images persist under `MEDIA_DIR` (default `./media`); preserve this folder alongside database backups. No deployment is configured.

- Swagger: <http://localhost:3001/docs>
- OpenAPI JSON: <http://localhost:3001/docs/openapi.json>
- Health: <http://localhost:3001/api/v1/health>

`PORT`, `POSTGRES_PORT`, `DATABASE_URL`, `DATABASE_POOL_MAX`, `JWT_SECRET`, `CORS_ORIGINS`, `MEDIA_DIR` and `MEDIA_PUBLIC_URL` are configured in `.env`. Changing a PostgreSQL password after volume initialization also requires an explicit database password change; changing the environment alone does not modify existing database credentials.

## Data and authentication

See [import instructions](docs/import.md) for dry-run, controlled username conflict resolution, asset conversion, idempotency and reconciliation. Existing user UUIDs, bcrypt credentials and public content/product identifiers are retained. Old sessions are invalidated. Password hashes upgrade to Argon2id on successful login. The imported administrator can sign in with their existing email/password; there are no default credentials.

Registration always creates a customer. Access tokens expire after 15 minutes. Refresh tokens expire after 30 days and rotate on each refresh; only their hashes are stored. A refresh request returns a replacement access/refresh pair in its JSON body. Reusing a refresh token invalidates its session family. Logout, password change and account disabling revoke applicable sessions. Profile updates cannot change roles.

## Business rules

- All money is USD, serialized as decimal strings with two places. A discounted unit is rounded half-up to cents before multiplying by quantity. Shipping charges and taxes are zero in this version.
- Options are relational groups/values with independent sellable variants. Newly created/imported variants have zero stock. An administrator must adjust real inventory before purchase.
- `POST /cart/items` adds quantity to an existing variant; `PATCH /cart/items/:variantId` sets its quantity. Prices, ownership and product snapshots are never accepted from the browser.
- `POST /orders` requires `{}` and an `Idempotency-Key` header (8–100 letters, digits, `_` or `-`). Reusing the key returns its existing order. Cart locking and conditional stock updates prevent double checkout and overselling.
- Checkout stores immutable order lines and inventory movements, and empties the cart in one transaction. Delivery estimates use the longest product lead time.
- Order progression: `PLACED → PROCESSING → SHIPPED → DELIVERED`. Administrators may cancel before shipment; stock actually deducted by that order is restored exactly once. Historical imports never deduct stock and cannot invent restock movements.
- `paymentStatus` is `NOT_COLLECTED` for new orders and `LEGACY_UNKNOWN` for historical orders. No gateway or payment collection is implemented.
- Public reviews are approved-only; ratings derive from approved reviews. Products are archived and users disabled rather than destroying order history.
- Product options can be replaced only while all variants have zero stock and no cart, order or inventory history references. Once used, create a new product instead of invalidating existing selections.

## Contract and frontend integration

Routes are under `/api/v1`. Lists return `{ "data": [], "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } }`; maximum `limit` is 100. Errors return `{ "statusCode": 400, "code": "...", "message": "...", "requestId": "..." }`. Unknown fields are rejected. Dates are ISO/UTC; a delivery date is a calendar date.

Use `cart`, `cartItems`, `quantity`, `options`, `shippingLeadDays`, `rating` and `orders`. [Frontend service mapping](docs/frontend-api-mapping.md) documents the migration from direct Supabase usage. This API is not a Supabase protocol emulator; the existing frontend requires a separate integration change.

Images accept authenticated multipart uploads up to 5 MB: `/media/avatar` for the current user's avatar, `/media/images` for administrators. PNG/JPEG/WebP signatures and pixel bounds are checked, metadata is stripped, and output is encoded as immutable WebP. Store returned asset IDs in catalog/content requests; do not construct storage URLs.

Fastify handles multipart uploads, security headers, static media and rate limits with native plugins. Uploads accept exactly one `file` part and no additional fields. JSON bodies are limited to 1 MB. Per-IP request limits are 500 API requests, 40 authentication requests and 100 product-view increments per minute; request-limit errors use the standard API error body and `Retry-After` header.

## Verify

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

API tests require a migrated dedicated database named with an `_test` suffix. Set `TEST_DATABASE_URL` in `.env`, create that database and run `prisma migrate deploy` with its URL before `pnpm test`. Tests never truncate the source database. Import integration additionally requires a fresh dedicated `IMPORT_TEST_DATABASE_URL`; see the import guide. Ordinary test runs skip that opt-in fixture import.

Use `pnpm format` to apply Prettier. Logs contain request identifiers, route templates and timings; credentials, request bodies and tokens are not logged. All implementation and validation are local.
