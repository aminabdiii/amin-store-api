# Frontend integration contract

The frontend remains unchanged. Replace its Supabase service implementation in a separate task; preserve UI behavior while adapting to canonical API response fields. All routes below use `/api/v1` and authenticated routes require `Authorization: Bearer <accessToken>`.

| Existing service / behavior               | REST replacement                                                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `signInOrLoginApi.signInUser`             | `POST /auth/register` with `email`, `username`, `fullName`, `password`; returns `user`, `accessToken`, `refreshToken`, `expiresIn`                            |
| `loginUserApi`, refresh, logout           | `POST /auth/login`, `POST /auth/refresh` with `refreshToken`, `POST /auth/logout`                                                                             |
| Current user, role, profile               | `GET /users/me`, `PATCH /users/me` with `fullName`; role is included in the user response                                                                     |
| Change password                           | `POST /auth/password` with `currentPassword` and new `password`; sign in again afterward                                                                      |
| Upload avatar                             | `POST /media/avatar`, multipart `file`; updates the current user's avatar automatically                                                                       |
| List/delete users                         | `GET /admin/users`, `PATCH /admin/users/:id` with `active: false`; administrator-only                                                                         |
| Home newest/limited products              | `GET /products?sort=newest&limit=12`                                                                                                                          |
| Discounted products                       | `GET /products?discounted=true&limit=12`                                                                                                                      |
| Product/category list                     | `GET /products?category=<slug>&search=...&sort=...&available=true&preSale=true&discounted=true&page=1&limit=9`                                                |
| Product detail/related/views              | `GET /products/:id`, `GET /products/:id/related`, `POST /products/:id/views`                                                                                  |
| Product creation/update                   | `POST /admin/products`, `PATCH /admin/products/:id`; category and media references use IDs                                                                    |
| Product images                            | `POST /media/images` then use returned IDs as `imageIds`                                                                                                      |
| Stock adjustment/audit                    | `POST /admin/variants/:id/inventory` with signed `delta` and `reason`; `GET` same route for history                                                           |
| Categories                                | `GET /categories`; administrator `POST /admin/categories`, `PATCH`/`DELETE /admin/categories/:id`                                                             |
| Read/change cart                          | `GET /cart`, `POST /cart/items` with `variantId`, `quantity`, `PATCH /cart/items/:variantId` with `quantity`, `DELETE /cart/items/:variantId`, `DELETE /cart` |
| Complete purchase                         | `POST /orders` with `{}` and `Idempotency-Key`; the server calculates totals and empties cart atomically                                                      |
| Own purchase history                      | `GET /orders`, `GET /orders/:id`                                                                                                                              |
| All purchases/delivery                    | `GET /admin/orders`, `GET /admin/orders/:id`, `PATCH /admin/orders/:id/status` with a valid next `status`                                                     |
| Product comments                          | `GET /products/:id/reviews`, `POST /reviews` with `productId`, `content`, `rating`                                                                            |
| Comment moderation                        | `GET /admin/reviews`, `PATCH /admin/reviews/:id` with `approved`, `DELETE /admin/reviews/:id`                                                                 |
| Articles                                  | `GET /articles`, `GET /articles/:id`, administrator `POST /admin/articles`, `PATCH`/`DELETE /admin/articles/:id`                                              |
| Questions, popular brands, store features | `GET /faqs`, `/brands`, `/features`; corresponding administrator `POST /admin/...`, `PATCH`/`DELETE /admin/.../:id`                                           |

Product sorting values: `default`, `newest`, `cheapest`, `most-expensive`, `rate`, `most-view`, `fastest-shipping`. Boolean filters accept the strings `true` and `false`.

Product responses expose `price`, `discount`, `rating`, `views`, `shippingLeadDays`, `isPreSale`, `saleEnabled`, computed `isAvailable`, `category`, `images`, `options` and `variants`. Each variant has an `id`, `stock` and canonical option map, such as `{ "color": "red", "size": "S" }`. Select a variant in the client and submit its ID, instead of copying product objects into the cart.

Cart responses expose `cartItems`, authoritative `total`, `currency` and `requiresResolution`. Clear and rebuild a migrated cart marked `requiresResolution`; it contains ambiguous legacy selections and cannot be checked out. Quantities must be positive integers, never `count`. Monetary strings must not be converted to binary floating-point for authoritative calculations.

Order responses contain `items` with immutable `unitPrice`, `netUnitPrice`, `quantity`, `discount`, selected `options`, title and image snapshot. Legacy records can have `productId`/`variantId` null because their original products no longer exist.

The API returns profile fields directly (`fullName`, `username`, `avatar`) instead of Supabase `user_metadata`. It never returns a password hash, refresh-token hash, migration archive, legacy owner ID or administrator credential. Role changes and account disabling invalidate sessions.
