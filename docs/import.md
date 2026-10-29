# Legacy import

The importer reads the compressed SQL backup and storage ZIP locally. It imports only application data from recognized PostgreSQL `COPY ... FROM stdin` sections. SQL statements, roles, functions, triggers, policies, sessions, refresh tokens, and infrastructure tables are never executed or imported. Keep both input files unchanged for reproducible retries.

Run the default audit after installing dependencies:

```sh
pnpm import:legacy --backup '/absolute/path/backup.gz' --storage '/absolute/path/storage.zip' --dry-run
```

The audit reads all source records and image bytes, validates identities, options, prices, ZIP boundaries, image signatures and dimensions, resolves media references, and reconciles application table counts. `readyToApply` is false when hard identity conflicts remain. It does not connect to the database or create media files. Standard output contains aggregate counts only: no identities, passwords, signed URLs, file paths, or source hashes. Invalid identities and duplicate emails always block apply before any writes. Username collisions also block apply unless the explicit resolution policy below is selected.

After reviewing the counts, run against an empty, migrated local database:

```sh
pnpm import:legacy --backup '/absolute/path/backup.gz' --storage '/absolute/path/storage.zip' --apply --resolve-usernames
```

The supplied source has two username collisions after lowercase normalization. Review a second dry-run with `--resolve-usernames` before applying. This explicit policy sorts identities by creation time and UUID, keeps the first canonical username, and suffixes later collisions with the UUID prefix, extending it if needed. It never merges users or changes emails/UUIDs. Protected `migration.usernames` records preserve original and replacement names; the aggregate report distinguishes normalization and collision renames. Without this flag, the source remains blocked.

`--apply` is mandatory for mutation. `--apply` and `--dry-run` cannot be combined. Configuration comes from `.env`: `DATABASE_URL` must target localhost, `127.0.0.1`, or `::1`; `MEDIA_DIR` selects local storage; `MEDIA_PUBLIC_URL` selects the public media prefix. The default media directory is `./media` and default prefix is `http://localhost:3001/media`.

An apply takes an advisory lock and imports all relational data in one serializable transaction. A unique `ImportRun.sourceHash` combines both input file hashes. An exact repeat returns the previous aggregate report and preserves subsequent live changes. Different inputs or a populated database without the matching completed run abort; incremental merging requires a reviewed migration. Legacy IDs are inserted explicitly and all affected integer sequences are advanced after insertion.

Image files use immutable content hashes and signature-derived extensions. ZIP paths cannot escape the archive root, symlinks are forbidden, and limits are 10,000 entries, 20 MiB per entry, 512 MiB total expansion, and 40 million image pixels. Valid SVG logos are converted to PNG after rejecting active markup, document entities and external references; original SVG bytes are never published. Protected `migration.media` records retain conversion provenance. Non-image or invalid image entries are counted by quarantine reason and are never published; protected `storage.assets` records retain rejected paths. For the supplied ZIP, 199 assets are accepted (16 SVGs converted), and two empty placeholders are quarantined. One source asset reference has no corresponding local file. Missing assets are counted, image fields become null, and matching old public or signed storage URLs in rich content are rewritten or removed. Existing immutable filenames must contain identical bytes. No source download URLs are fetched.

Files are written before the database transaction. A failed import can leave unreferenced content-addressed files; they cannot replace another asset and a retry checks their bytes. Do not delete the media directory during a retry. Missing media is an explicit audit issue, not a fallback to old storage.

Auth identities preserve UUID, email, username, full name and bcrypt hash. Only the relational `public.users` role grants administrator access. User metadata cannot grant roles. Orphan profile records and carts are kept in `LegacyRecord`; orphan historical order owners remain nullable and retain their legacy owner IDs. Archive payloads recursively remove password, token, secret and credential keys and strip URL query strings. `LegacyRecord` is internal migration evidence and must have no public endpoint.

Products retain category routes, IDs, exact decimal prices, discounts, shipping delay, availability flags, descriptions, image ordering and canonical color/size/warranty options. Every complete option combination receives a zero-stock variant. Approved imported reviews determine ratings. Historical orders retain original totals, dates, delivery state, decimal line snapshots and selections. Three supplied totals contain old floating-point arithmetic artifacts beyond two decimal places. They are rounded directly to cents with half-up decimal arithmetic, without recomputing from current prices or lines; protected `migration.order-totals` records preserve the exact source strings. They never debit inventory. Deleted current products yield nullable references while line snapshots remain available.

Carts resolve only complete, valid selections to exact variants. Ambiguous, duplicate, missing or invalid lines are archived; the cart requires resolution. Nonempty shadow `carts.purchases` arrays are archived separately. Per-table source reconciliation counts each business row once; `cartLines` separately reconciles embedded lines and `historicalOrderItems` counts embedded order snapshots. Infrastructure/authentication records outside the documented business tables are deliberately excluded.

Verification:

```sh
node -r ts-node/register --test test/import.test.ts
# Use a dedicated empty database with the application migrations already applied:
IMPORT_TEST_DATABASE_URL='postgresql://user:password@localhost:5432/empty_import_test' node -r ts-node/register --test test/import-integration.test.ts
```

The optional database test performs a complete actual-source import, checks reconciliation and zero inventory, edits a product, repeats the import, and verifies the edit survives. It retains the imported data and refuses a second fresh initialization, so use a new dedicated database for another run.
