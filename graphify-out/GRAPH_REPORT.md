# Graph Report - amin-store-api  (2026-10-30)

## Corpus Check
- 75 files · ~24,143 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .example 1, .toml 1)

## Summary
- 798 nodes · 1886 edges · 29 communities (24 shown, 5 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 88 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `85ed44cf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- catalog.service.ts
- migration.sql
- core.ts
- ContentService
- fail
- orders.service.ts
- ProfileDto
- .avatar
- Database
- dependencies
- package.json
- @nestjs/common
- scripts
- compilerOptions
- devDependencies
- ReviewDto
- ContentController
- bootstrap.ts
- openapi.ts
- api.test.ts
- .prettierrc.json
- eslint.config.mjs
- prepare-vercel.mjs
- implementation-plan.md
- dist_src_bootstrap
- OrdersService
- home_amin_projects_amin_store_api_dist_src_bootstrap_createapp
- vercel.json
- index.mjs

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 39 edges
2. `PageQuery` - 38 edges
3. `fail()` - 33 edges
4. `Database` - 28 edges
5. `CurrentUser` - 26 edges
6. `Principal` - 26 edges
7. `@nestjs/swagger` - 25 edges
8. `CatalogService` - 23 edges
9. `scripts` - 22 edges
10. `buildPlan()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `AppController` --references--> `Public()`  [EXTRACTED]
  src/app.controller.ts → src/auth/auth.guard.ts
- `CatalogController` --references--> `Public()`  [EXTRACTED]
  src/catalog/catalog.controller.ts → src/auth/auth.guard.ts
- `ContentController` --references--> `Public()`  [EXTRACTED]
  src/content/content.controller.ts → src/auth/auth.guard.ts
- `AdminCatalogController` --references--> `Admin()`  [EXTRACTED]
  src/catalog/admin-catalog.controller.ts → src/auth/auth.guard.ts
- `AdminContentController` --references--> `Admin()`  [EXTRACTED]
  src/content/admin-content.controller.ts → src/auth/auth.guard.ts

## Import Cycles
- None detected.

## Communities (29 total, 5 thin omitted)

### Community 0 - "catalog.service.ts"
Cohesion: 0.05
Nodes (48): ArrayMaxSize, ArrayUnique, IsArray, AdminCatalogController, ApiBearerAuth, ApiTags, Body, Controller (+40 more)

### Community 1 - "migration.sql"
Cohesion: 0.06
Nodes (70): "Article", Article_createdAt_id_idx, Article_imageId_idx, "Brand", Brand_imageId_idx, "Cart", Cart_userId_key, "CartItem" (+62 more)

### Community 2 - "core.ts"
Cohesion: 0.07
Nodes (52): ref_node_assert, ref_node_child_process, ref_node_fs, ref_node_os, ref_node_readline, ref_node_test, ref_node_zlib, @prisma/adapter-pg (+44 more)

### Community 3 - "ContentService"
Cohesion: 0.10
Nodes (22): AdminContentController, ApiBearerAuth, ApiTags, Body, Controller, Delete, Param, Patch (+14 more)

### Community 4 - "fail"
Cohesion: 0.11
Nodes (25): HttpCode, IsEmail, AuthController, ApiBearerAuth, ApiTags, Body, Controller, Post (+17 more)

### Community 5 - "orders.service.ts"
Cohesion: 0.10
Nodes (26): @prisma/client, CartController, ApiBearerAuth, ApiTags, Body, Controller, Delete, Param (+18 more)

### Community 6 - "ProfileDto"
Cohesion: 0.09
Nodes (20): AdminUsersController, ApiBearerAuth, ApiTags, Body, Controller, Get, Param, Patch (+12 more)

### Community 7 - ".avatar"
Cohesion: 0.09
Nodes (21): ApiConsumes, Frontend integration contract, Legacy import, Amin Store API, Application structure, Business rules, Contract and frontend integration, Data and authentication (+13 more)

### Community 8 - "Database"
Cohesion: 0.09
Nodes (10): AppController, ApiTags, Controller, Get, AppService, Injectable, AuthGuard, Injectable (+2 more)

### Community 10 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, argon2, bcryptjs, class-transformer, class-validator, dotenv, fastify, @fastify/helmet (+17 more)

### Community 12 - "package.json"
Cohesion: 0.07
Nodes (27): description, engines, node, name, packageManager, private, version, argon2 (+19 more)

### Community 13 - "@nestjs/common"
Cohesion: 0.06
Nodes (55): Global, class-validator, @nestjs/common, @nestjs/core, @nestjs/swagger, Admin(), CurrentUser, Principal (+47 more)

### Community 14 - "scripts"
Cohesion: 0.09
Nodes (22): scripts, build, build:vercel, clean, db:deploy, db:format, db:generate, db:migrate (+14 more)

### Community 16 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, module, moduleResolution, outDir (+7 more)

### Community 17 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, esbuild, eslint, @nestjs/testing, prettier, prisma, supertest, ts-node (+9 more)

### Community 19 - "ReviewDto"
Cohesion: 0.06
Nodes (29): AdminReviewsController, ApiBearerAuth, ApiTags, Body, Controller, Delete, Get, Param (+21 more)

### Community 21 - "ContentController"
Cohesion: 0.25
Nodes (6): ContentController, ApiTags, Controller, Get, Param, Query

### Community 22 - "bootstrap.ts"
Cohesion: 0.13
Nodes (12): Catch, fastify, @fastify/helmet, @fastify/multipart, @fastify/rate-limit, @fastify/static, @nestjs/platform-fastify, AppModule (+4 more)

### Community 23 - "openapi.ts"
Cohesion: 0.27
Nodes (11): array(), documentResponses(), image, integer, money, object(), options, page() (+3 more)

### Community 24 - "api.test.ts"
Cohesion: 0.21
Nodes (11): bcryptjs, ref_node_crypto, ref_node_path, reflect-metadata, sharp, supertest, createApp(), configuration() (+3 more)

### Community 26 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 31 - "OrdersService"
Cohesion: 0.07
Nodes (23): ApiHeader, Headers, AdminOrdersController, ApiBearerAuth, ApiTags, Body, Controller, Get (+15 more)

### Community 33 - "vercel.json"
Cohesion: 0.22
Nodes (8): includeFiles, buildCommand, framework, functions, api/index.mjs, outputDirectory, rewrites, $schema

### Community 34 - "index.mjs"
Cohesion: 0.50
Nodes (4): getApplication(), handler(), dist_vercel_bootstrap, swagger-ui-dist

## Knowledge Gaps
- **130 isolated node(s):** `singleQuote`, `trailingComma`, `printWidth`, `semi`, `name` (+125 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 267 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `catalog.service.ts`, `fail`, `orders.service.ts`, `package.json`, `bootstrap.ts`, `api.test.ts`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Why does `@nestjs/swagger` connect `@nestjs/common` to `catalog.service.ts`, `fail`, `orders.service.ts`, `package.json`, `bootstrap.ts`, `openapi.ts`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `PageQuery` connect `@nestjs/common` to `catalog.service.ts`, `orders.service.ts`, `ProfileDto`, `ReviewDto`, `ContentController`, `OrdersService`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `singleQuote`, `trailingComma`, `printWidth` to the rest of the system?**
  _130 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `catalog.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05277777777777778 - nodes in this community are weakly interconnected._
- **Should `migration.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.0579476861167002 - nodes in this community are weakly interconnected._
- **Should `core.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07374890254609306 - nodes in this community are weakly interconnected._