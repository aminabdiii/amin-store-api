# Graph Report - amin-store-api  (2026-10-30)

## Corpus Check
- 77 files · ~25,573 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .example 1, .toml 1)

## Summary
- 809 nodes · 1911 edges · 44 communities (38 shown, 6 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 88 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `24716252`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CreateProductDto
- migration.sql
- core.ts
- content.service.ts
- fail
- http.ts
- @nestjs/swagger
- Amin Store API
- auth.guard.ts
- PageQuery
- dependencies
- media.controller.ts
- package.json
- app.module.ts
- scripts
- OrdersService
- compilerOptions
- devDependencies
- AdminReviewsController
- ReviewDto
- @nestjs/common
- catalog.service.ts
- bootstrap.ts
- openapi.ts
- api.test.ts
- copy-local-to-neon.mjs
- .prettierrc.json
- eslint.config.mjs
- prepare-vercel.mjs
- implementation-plan.md
- dist_src_bootstrap
- CartController
- home_amin_projects_amin_store_api_dist_src_bootstrap_createapp
- vercel.json
- index.mjs
- AdminCatalogController
- CatalogService
- CatalogController
- ProductQuery
- ReviewsController
- cart.controller.ts
- .checkout
- database.module.ts
- dotenv

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

## Communities (44 total, 6 thin omitted)

### Community 0 - "CreateProductDto"
Cohesion: 0.19
Nodes (20): ArrayMaxSize, ArrayUnique, IsArray, CategoryDto, CreateProductDto, InventoryDto, OptionDto, ApiProperty (+12 more)

### Community 1 - "migration.sql"
Cohesion: 0.06
Nodes (70): "Article", Article_createdAt_id_idx, Article_imageId_idx, "Brand", Brand_imageId_idx, "Cart", Cart_userId_key, "CartItem" (+62 more)

### Community 2 - "core.ts"
Cohesion: 0.07
Nodes (53): ref_node_assert, ref_node_child_process, ref_node_fs, ref_node_os, ref_node_path, ref_node_readline, ref_node_test, ref_node_zlib (+45 more)

### Community 3 - "content.service.ts"
Cohesion: 0.07
Nodes (35): AdminContentController, ApiBearerAuth, ApiTags, Body, Controller, Delete, Param, Patch (+27 more)

### Community 4 - "fail"
Cohesion: 0.11
Nodes (24): HttpCode, IsEmail, argon2, jsonwebtoken, AuthController, ApiBearerAuth, ApiTags, Body (+16 more)

### Community 5 - "http.ts"
Cohesion: 0.08
Nodes (26): Catch, class-transformer, @prisma/client, rxjs, AuthGuard, Injectable, createApp(), cartInclude (+18 more)

### Community 6 - "@nestjs/swagger"
Cohesion: 0.08
Nodes (28): class-validator, @nestjs/swagger, presentUser(), CheckoutDto, AdminUsersController, ApiBearerAuth, ApiTags, Body (+20 more)

### Community 7 - "Amin Store API"
Cohesion: 0.17
Nodes (9): Frontend integration contract, Legacy import, Amin Store API, Application structure, Business rules, Contract and frontend integration, Data and authentication, Run locally (+1 more)

### Community 8 - "auth.guard.ts"
Cohesion: 0.17
Nodes (12): Admin(), CurrentUser, Principal, Get, OrdersController, ApiBearerAuth, ApiTags, Controller (+4 more)

### Community 9 - "PageQuery"
Cohesion: 0.16
Nodes (12): PageQuery, pageResult(), skip(), ApiPropertyOptional, IsInt, Max, Min, Type (+4 more)

### Community 10 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, argon2, bcryptjs, class-transformer, class-validator, dotenv, fastify, @fastify/helmet (+17 more)

### Community 11 - "media.controller.ts"
Cohesion: 0.17
Nodes (13): ApiConsumes, Req, ApiRequest, body, MediaController, ApiBearerAuth, ApiBody, ApiTags (+5 more)

### Community 12 - "package.json"
Cohesion: 0.10
Nodes (20): description, engines, node, name, packageManager, private, version, eslint (+12 more)

### Community 13 - "app.module.ts"
Cohesion: 0.09
Nodes (20): AppController, ApiTags, Controller, Get, AppModule, Module, AppService, Injectable (+12 more)

### Community 14 - "scripts"
Cohesion: 0.09
Nodes (22): scripts, build, build:vercel, clean, db:deploy, db:format, db:generate, db:migrate (+14 more)

### Community 15 - "OrdersService"
Cohesion: 0.12
Nodes (14): AdminOrdersController, ApiBearerAuth, ApiTags, Body, Controller, Get, Param, Patch (+6 more)

### Community 16 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, module, moduleResolution, outDir (+7 more)

### Community 17 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, esbuild, eslint, @nestjs/testing, prettier, prisma, supertest, ts-node (+9 more)

### Community 18 - "AdminReviewsController"
Cohesion: 0.20
Nodes (8): AdminReviewsController, ApiBearerAuth, ApiTags, Body, Controller, Delete, Param, Patch

### Community 19 - "ReviewDto"
Cohesion: 0.18
Nodes (10): Body, Post, ReviewDto, ApiProperty, IsInt, IsString, Length, Matches (+2 more)

### Community 20 - "@nestjs/common"
Cohesion: 0.33
Nodes (7): @nestjs/common, ModerateDto, IsBoolean, ReviewsModule, Module, ReviewsService, Injectable

### Community 21 - "catalog.service.ts"
Cohesion: 0.25
Nodes (6): Patch, UpdateCategoryDto, UpdateProductDto, combinations(), OptionInput, signature()

### Community 22 - "bootstrap.ts"
Cohesion: 0.25
Nodes (7): fastify, @fastify/helmet, @fastify/multipart, @fastify/rate-limit, @fastify/static, @nestjs/core, @nestjs/platform-fastify

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

### Community 31 - "CartController"
Cohesion: 0.14
Nodes (11): CartController, ApiBearerAuth, ApiTags, Body, Controller, Delete, Param, Patch (+3 more)

### Community 33 - "vercel.json"
Cohesion: 0.22
Nodes (8): includeFiles, buildCommand, framework, functions, api/index.mjs, outputDirectory, rewrites, $schema

### Community 34 - "index.mjs"
Cohesion: 0.50
Nodes (4): getApplication(), handler(), dist_vercel_bootstrap, swagger-ui-dist

### Community 35 - "AdminCatalogController"
Cohesion: 0.20
Nodes (8): AdminCatalogController, ApiBearerAuth, ApiTags, Body, Controller, Delete, Param, Post

### Community 36 - "CatalogService"
Cohesion: 0.33
Nodes (3): CatalogService, Injectable, presentProduct()

### Community 37 - "CatalogController"
Cohesion: 0.24
Nodes (6): CatalogController, ApiTags, Controller, Get, Param, Post

### Community 38 - "ProductQuery"
Cohesion: 0.31
Nodes (5): Get, Query, Query, ProductQuery, IsIn

### Community 39 - "ReviewsController"
Cohesion: 0.22
Nodes (7): ReviewsController, ApiBearerAuth, ApiTags, Controller, Get, Param, Query

### Community 40 - "cart.controller.ts"
Cohesion: 0.46
Nodes (6): CartItemDto, QuantityDto, ApiProperty, IsInt, Max, Min

### Community 41 - ".checkout"
Cohesion: 0.33
Nodes (5): ApiHeader, Headers, ApiBody, Body, Post

### Community 42 - "database.module.ts"
Cohesion: 0.50
Nodes (3): Global, DatabaseModule, Module

## Knowledge Gaps
- **132 isolated node(s):** `singleQuote`, `trailingComma`, `printWidth`, `semi`, `name` (+127 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 269 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `content.service.ts`, `fail`, `http.ts`, `@nestjs/swagger`, `auth.guard.ts`, `cart.controller.ts`, `database.module.ts`, `media.controller.ts`, `package.json`, `app.module.ts`, `catalog.service.ts`, `bootstrap.ts`, `api.test.ts`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `@nestjs/swagger` connect `@nestjs/swagger` to `content.service.ts`, `fail`, `http.ts`, `cart.controller.ts`, `auth.guard.ts`, `media.controller.ts`, `package.json`, `app.module.ts`, `@nestjs/common`, `catalog.service.ts`, `bootstrap.ts`, `openapi.ts`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `PageQuery` connect `PageQuery` to `content.service.ts`, `http.ts`, `ProductQuery`, `ReviewsController`, `auth.guard.ts`, `@nestjs/swagger`, `OrdersService`, `@nestjs/common`, `catalog.service.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `singleQuote`, `trailingComma`, `printWidth` to the rest of the system?**
  _132 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `migration.sql` be split into smaller, more focused modules?**
  _Cohesion score 0.0579476861167002 - nodes in this community are weakly interconnected._
- **Should `core.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07412008281573498 - nodes in this community are weakly interconnected._
- **Should `content.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07003129890453834 - nodes in this community are weakly interconnected._