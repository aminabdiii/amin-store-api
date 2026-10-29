# Amin Store API implementation

Build a local-only NestJS 12.3.2 / Prisma 7.10.1 / PostgreSQL 18.6 API in this repository. The frontend is a read-only requirements reference. No deployment, frontend modifications, gateway, mail/SMS or favorites.

1. Infrastructure and relational schema: USD Decimal(20,2), variant inventory, constraints, indexed foreign keys, standalone local database.
2. Auth/users: customer/admin guards, ownership, JWT15m, rotating hashed refresh30d, bcrypt upgrade, profiles and last-admin protection.
3. Catalog/content/media: current frontend workflows, canonical fields, bounded pagination, safe local image uploads, OpenAPI.
4. Cart/orders/reviews: authoritative server money, cart lock, atomic checkout/stock ledger, idempotency, cancel once, approved ratings.
5. Safe idempotent import: COPY as data only, protected archive/report, preserve IDs/history, zero initial inventory, rewrite assets.
6. Verify real PostgreSQL behavior, concurrent orders, authentication, migration reconciliation and document frontend service mapping.
