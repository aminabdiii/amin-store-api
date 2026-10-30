# Graph Report - amin-store-api  (2026-10-30)

## Corpus Check
- 74 files · ~23,509 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .example 1, .toml 1)

## Summary
- 790 nodes · 1869 edges · 35 communities (29 shown, 6 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 88 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `de44031d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- catalog.service.ts
- migration.sql
- core.ts
- content.service.ts
- auth.service.ts
- fail
- users.service.ts
- .avatar
- app.module.ts
- CartController
- dependencies
- AdminOrdersController
- package.json
- @nestjs/common
- scripts
- class-validator
- compilerOptions
- devDependencies
- PageQuery
- ReviewDto
- engines
- ContentController
- bootstrap.ts
- openapi.ts
- api.test.ts
- CatalogController
- .prettierrc.json
- eslint.config.mjs
- esbuild
- implementation-plan.md
- dist_src_bootstrap
- OrdersController
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
9. `scripts` - 21 edges
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

## Communities (35 total, 6 thin omitted)

### Community 0 - "catalog.service.ts"
Cohesion: 0.07
Nodes (41): ArrayMaxSize, ArrayUnique, IsArray, AdminCatalogController, ApiBearerAuth, ApiTags, Body, Controller (+33 more)

### Community 1 - "migration.sql"
Cohesion: 0.06
Nodes (70): "Article", Article_createdAt_id_idx, Article_imageId_idx, "Brand", Brand_imageId_idx, "Cart", Cart_userId_key, "CartItem" (+62 more)

### Community 2 - "core.ts"
Cohesion: 0.07
Nodes (52): ref_node_assert, ref_node_fs, ref_node_os, ref_node_readline, ref_node_test, ref_node_zlib, @prisma/adapter-pg, sanitize-html (+44 more)

### Community 3 - "content.service.ts"
Cohesion: 0.10
Nodes (27): AdminContentController, ApiBearerAuth, ApiTags, Body, Controller, Delete, Param, Patch (+19 more)

### Community 4 - "auth.service.ts"
Cohesion: 0.13
Nodes (21): HttpCode, IsEmail, AuthController, ApiBearerAuth, ApiTags, Body, Controller, Post (+13 more)

### Community 5 - "fail"
Cohesion: 0.06
Nodes (30): ApiHeader, Headers, ref_node_path, @prisma/client, AuthGuard, Injectable, cartInclude, CartService (+22 more)

### Community 6 - "users.service.ts"
Cohesion: 0.09
Nodes (26): presentUser(), AdminUsersController, ApiBearerAuth, ApiTags, Body, Controller, Param, Patch (+18 more)

### Community 7 - ".avatar"
Cohesion: 0.11
Nodes (19): ApiConsumes, Frontend integration contract, Legacy import, Amin Store API, Application structure, Business rules, Contract and frontend integration, Data and authentication (+11 more)

### Community 8 - "app.module.ts"
Cohesion: 0.07
Nodes (27): Global, AppController, ApiTags, Controller, Get, AppModule, Module, AppService (+19 more)

### Community 9 - "CartController"
Cohesion: 0.15
Nodes (10): CartController, ApiBearerAuth, ApiTags, Body, Controller, Delete, Get, Param (+2 more)

### Community 10 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, argon2, bcryptjs, class-transformer, class-validator, dotenv, fastify, @fastify/helmet (+17 more)

### Community 11 - "AdminOrdersController"
Cohesion: 0.14
Nodes (12): AdminOrdersController, ApiBearerAuth, ApiTags, Body, Controller, Get, Param, Patch (+4 more)

### Community 12 - "package.json"
Cohesion: 0.08
Nodes (24): description, name, packageManager, private, version, argon2, class-transformer, dotenv (+16 more)

### Community 13 - "@nestjs/common"
Cohesion: 0.31
Nodes (9): @nestjs/common, @nestjs/swagger, Admin(), CurrentUser, Principal, EntityIdPipe, body, ReviewsService (+1 more)

### Community 14 - "scripts"
Cohesion: 0.10
Nodes (21): scripts, build, build:vercel, clean, db:deploy, db:format, db:generate, db:migrate (+13 more)

### Community 15 - "class-validator"
Cohesion: 0.29
Nodes (8): class-validator, CartItemDto, QuantityDto, ApiProperty, IsInt, Max, Min, CheckoutDto

### Community 16 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, module, moduleResolution, outDir (+7 more)

### Community 17 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, esbuild, eslint, @nestjs/testing, prettier, prisma, supertest, ts-node (+8 more)

### Community 18 - "PageQuery"
Cohesion: 0.19
Nodes (10): PageQuery, pageResult(), skip(), ApiPropertyOptional, IsInt, Max, Min, Type (+2 more)

### Community 19 - "ReviewDto"
Cohesion: 0.06
Nodes (29): AdminReviewsController, ApiBearerAuth, ApiTags, Body, Controller, Delete, Get, Param (+21 more)

### Community 21 - "ContentController"
Cohesion: 0.32
Nodes (6): ContentController, ApiTags, Controller, Get, Param, Query

### Community 22 - "bootstrap.ts"
Cohesion: 0.15
Nodes (13): Catch, fastify, @fastify/helmet, @fastify/multipart, @fastify/rate-limit, @fastify/static, @nestjs/core, @nestjs/platform-fastify (+5 more)

### Community 23 - "openapi.ts"
Cohesion: 0.27
Nodes (11): array(), documentResponses(), image, integer, money, object(), options, page() (+3 more)

### Community 24 - "api.test.ts"
Cohesion: 0.29
Nodes (5): bcryptjs, ref_node_crypto, reflect-metadata, supertest, run

### Community 25 - "CatalogController"
Cohesion: 0.21
Nodes (7): CatalogController, ApiTags, Controller, Get, Param, Post, Query

### Community 26 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 31 - "OrdersController"
Cohesion: 0.22
Nodes (7): OrdersController, ApiBearerAuth, ApiTags, Controller, Get, Param, Query

### Community 33 - "vercel.json"
Cohesion: 0.22
Nodes (8): includeFiles, buildCommand, framework, functions, api/index.mjs, outputDirectory, rewrites, $schema

### Community 34 - "index.mjs"
Cohesion: 0.67
Nodes (3): getApplication(), handler(), dist_vercel_bootstrap

## Knowledge Gaps
- **127 isolated node(s):** `singleQuote`, `trailingComma`, `printWidth`, `semi`, `name` (+122 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 267 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `catalog.service.ts`, `content.service.ts`, `auth.service.ts`, `fail`, `users.service.ts`, `app.module.ts`, `package.json`, `bootstrap.ts`, `api.test.ts`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `@nestjs/swagger` connect `@nestjs/common` to `catalog.service.ts`, `content.service.ts`, `auth.service.ts`, `users.service.ts`, `app.module.ts`, `package.json`, `class-validator`, `bootstrap.ts`, `openapi.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `PageQuery` connect `PageQuery` to `catalog.service.ts`, `content.service.ts`, `fail`, `users.service.ts`, `AdminOrdersController`, `@nestjs/common`, `ReviewDto`, `ContentController`, `OrdersController`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `singleQuote`, `trailingComma`, `printWidth` to the rest of the system?**
  _127 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `catalog.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `migration.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.0579476861167002 - nodes in this community are weakly interconnected._
- **Should `core.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07327001356852103 - nodes in this community are weakly interconnected._