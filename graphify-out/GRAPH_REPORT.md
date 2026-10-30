# Graph Report - amin-store-api  (2026-10-30)

## Corpus Check
- 76 files · ~25,109 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .example 1, .toml 1)

## Summary
- 808 nodes · 1904 edges · 36 communities (31 shown, 5 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 88 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `053eb46f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- catalog.service.ts
- migration.sql
- core.ts
- content.service.ts
- auth.service.ts
- orders.service.ts
- UsersService
- Amin Store API
- Database
- PageQuery
- dependencies
- http.ts
- package.json
- @nestjs/common
- scripts
- OrdersService
- compilerOptions
- devDependencies
- AdminReviewsController
- ReviewDto
- @nestjs/swagger
- ContentController
- bootstrap.ts
- openapi.ts
- api.test.ts
- copy-local-to-neon.mjs
- .prettierrc.json
- eslint.config.mjs
- prepare-vercel.mjs
- implementation-plan.md
- dist_src_bootstrap
- CurrentUser
- home_amin_projects_amin_store_api_dist_src_bootstrap_createapp
- vercel.json
- index.mjs
- AppController

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

## Communities (36 total, 5 thin omitted)

### Community 0 - "catalog.service.ts"
Cohesion: 0.05
Nodes (52): ArrayMaxSize, ArrayUnique, IsArray, AdminCatalogController, ApiBearerAuth, ApiTags, Body, Controller (+44 more)

### Community 1 - "migration.sql"
Cohesion: 0.06
Nodes (70): "Article", Article_createdAt_id_idx, Article_imageId_idx, "Brand", Brand_imageId_idx, "Cart", Cart_userId_key, "CartItem" (+62 more)

### Community 2 - "core.ts"
Cohesion: 0.07
Nodes (53): ref_node_assert, ref_node_child_process, ref_node_fs, ref_node_os, ref_node_path, ref_node_readline, ref_node_test, ref_node_zlib (+45 more)

### Community 3 - "content.service.ts"
Cohesion: 0.09
Nodes (29): AdminContentController, ApiBearerAuth, ApiTags, Body, Controller, Delete, Param, Patch (+21 more)

### Community 4 - "auth.service.ts"
Cohesion: 0.13
Nodes (22): HttpCode, IsEmail, AuthController, ApiBearerAuth, ApiTags, Body, Controller, Post (+14 more)

### Community 5 - "orders.service.ts"
Cohesion: 0.23
Nodes (11): @prisma/client, cartInclude, CartService, lockCart(), Injectable, lineTotal(), netPrice(), FullProduct (+3 more)

### Community 6 - "UsersService"
Cohesion: 0.06
Nodes (29): AdminUsersController, ApiBearerAuth, ApiTags, Body, Controller, Get, Param, Patch (+21 more)

### Community 7 - "Amin Store API"
Cohesion: 0.17
Nodes (9): Frontend integration contract, Legacy import, Amin Store API, Application structure, Business rules, Contract and frontend integration, Data and authentication, Run locally (+1 more)

### Community 8 - "Database"
Cohesion: 0.14
Nodes (4): AuthGuard, Injectable, Database, Injectable

### Community 9 - "PageQuery"
Cohesion: 0.17
Nodes (11): PageQuery, pageResult(), skip(), ApiPropertyOptional, IsInt, Max, Min, Type (+3 more)

### Community 10 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, argon2, bcryptjs, class-transformer, class-validator, dotenv, fastify, @fastify/helmet (+17 more)

### Community 11 - "http.ts"
Cohesion: 0.20
Nodes (8): @nestjs/core, Admin(), ApiRequest, fail(), body, MediaService, Injectable, UploadedImage

### Community 12 - "package.json"
Cohesion: 0.07
Nodes (26): description, engines, node, name, packageManager, private, version, argon2 (+18 more)

### Community 13 - "@nestjs/common"
Cohesion: 0.17
Nodes (12): Global, @nestjs/common, AppService, Injectable, CartModule, Module, DatabaseModule, Module (+4 more)

### Community 14 - "scripts"
Cohesion: 0.09
Nodes (22): scripts, build, build:vercel, clean, db:deploy, db:format, db:generate, db:migrate (+14 more)

### Community 15 - "OrdersService"
Cohesion: 0.15
Nodes (9): AdminOrdersController, ApiBearerAuth, ApiTags, Controller, Get, Param, Query, OrdersService (+1 more)

### Community 16 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, module, moduleResolution, outDir (+7 more)

### Community 17 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, esbuild, eslint, @nestjs/testing, prettier, prisma, supertest, ts-node (+9 more)

### Community 18 - "AdminReviewsController"
Cohesion: 0.15
Nodes (10): AdminReviewsController, ApiBearerAuth, ApiTags, Body, Controller, Delete, Get, Param (+2 more)

### Community 19 - "ReviewDto"
Cohesion: 0.10
Nodes (17): ReviewsController, ApiBearerAuth, ApiTags, Body, Controller, Get, Param, Post (+9 more)

### Community 20 - "@nestjs/swagger"
Cohesion: 0.32
Nodes (7): @nestjs/swagger, ModerateDto, IsBoolean, ReviewsModule, Module, ReviewsService, Injectable

### Community 21 - "ContentController"
Cohesion: 0.28
Nodes (6): ContentController, ApiTags, Controller, Get, Param, Query

### Community 22 - "bootstrap.ts"
Cohesion: 0.14
Nodes (16): Catch, fastify, @fastify/helmet, @fastify/multipart, @fastify/rate-limit, @fastify/static, @nestjs/platform-fastify, AppModule (+8 more)

### Community 23 - "openapi.ts"
Cohesion: 0.27
Nodes (11): array(), documentResponses(), image, integer, money, object(), options, page() (+3 more)

### Community 24 - "api.test.ts"
Cohesion: 0.29
Nodes (5): bcryptjs, reflect-metadata, sharp, supertest, run

### Community 25 - "copy-local-to-neon.mjs"
Cohesion: 0.23
Nodes (10): ref_node_crypto, pg, args, digest(), remote(), remoteOnce(), select(), sourceURL (+2 more)

### Community 26 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 31 - "CurrentUser"
Cohesion: 0.05
Nodes (45): ApiConsumes, ApiHeader, Headers, class-validator, Req, CurrentUser, Principal, CartController (+37 more)

### Community 33 - "vercel.json"
Cohesion: 0.22
Nodes (8): includeFiles, buildCommand, framework, functions, api/index.mjs, outputDirectory, rewrites, $schema

### Community 34 - "index.mjs"
Cohesion: 0.50
Nodes (4): getApplication(), handler(), dist_vercel_bootstrap, swagger-ui-dist

### Community 35 - "AppController"
Cohesion: 0.29
Nodes (4): AppController, ApiTags, Controller, Get

## Knowledge Gaps
- **132 isolated node(s):** `singleQuote`, `trailingComma`, `printWidth`, `semi`, `name` (+127 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 270 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `catalog.service.ts`, `content.service.ts`, `auth.service.ts`, `orders.service.ts`, `UsersService`, `PageQuery`, `http.ts`, `package.json`, `@nestjs/swagger`, `bootstrap.ts`, `api.test.ts`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `@nestjs/swagger` connect `@nestjs/swagger` to `catalog.service.ts`, `content.service.ts`, `auth.service.ts`, `UsersService`, `http.ts`, `package.json`, `@nestjs/common`, `bootstrap.ts`, `openapi.ts`, `CurrentUser`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `PageQuery` connect `PageQuery` to `catalog.service.ts`, `content.service.ts`, `orders.service.ts`, `UsersService`, `http.ts`, `OrdersService`, `AdminReviewsController`, `ReviewDto`, `@nestjs/swagger`, `ContentController`, `CurrentUser`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `singleQuote`, `trailingComma`, `printWidth` to the rest of the system?**
  _132 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `catalog.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05303030303030303 - nodes in this community are weakly interconnected._
- **Should `migration.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.0579476861167002 - nodes in this community are weakly interconnected._
- **Should `core.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0733162830349531 - nodes in this community are weakly interconnected._