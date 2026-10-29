import type { OpenAPIObject, ReferenceObject, SchemaObject } from '@nestjs/swagger';

type Schema = SchemaObject | ReferenceObject;
const ref = (name: string): ReferenceObject => ({ $ref: `#/components/schemas/${name}` });
const str: SchemaObject = { type: 'string' };
const integer: SchemaObject = { type: 'integer' };
const money: SchemaObject = {
  type: 'string',
  pattern: '^\\d+\\.\\d{2}$',
  example: '19.99',
  description: 'Exact USD decimal string; never a binary floating-point amount',
};
const object = (properties: Record<string, Schema>, required: string[] = []): SchemaObject => ({
  type: 'object',
  properties,
  required,
});
const array = (items: Schema): SchemaObject => ({ type: 'array', items });
const options: SchemaObject = { type: 'object', additionalProperties: { type: 'string' } };
const image = object(
  { id: { type: 'string', format: 'uuid' }, url: { type: 'string', format: 'uri' } },
  ['id', 'url'],
);
const page = (name: string): SchemaObject =>
  object({ data: array(ref(name)), meta: ref('PageMeta') }, ['data', 'meta']);

export function documentResponses(document: OpenAPIObject): void {
  document.components ??= {};
  document.components.schemas ??= {};
  Object.assign(document.components.schemas, {
    ApiError: object(
      {
        statusCode: integer,
        code: str,
        message: { oneOf: [str, array(str)] },
        requestId: { type: 'string', format: 'uuid' },
      },
      ['statusCode', 'code', 'message', 'requestId'],
    ),
    Success: object({ success: { type: 'boolean', enum: [true] } }, ['success']),
    PageMeta: object({ page: integer, limit: integer, total: integer, totalPages: integer }, [
      'page',
      'limit',
      'total',
      'totalPages',
    ]),
    StoreUser: object(
      {
        id: { type: 'string', format: 'uuid' },
        email: str,
        username: str,
        fullName: str,
        role: { type: 'string', enum: ['CUSTOMER', 'ADMIN'] },
        active: { type: 'boolean' },
        avatar: { ...image, nullable: true },
      },
      ['id', 'email', 'username', 'fullName', 'role', 'active', 'avatar'],
    ),
    AuthTokens: object(
      {
        accessToken: str,
        refreshToken: str,
        tokenType: { type: 'string', enum: ['Bearer'] },
        expiresIn: { type: 'integer', example: 900 },
        user: ref('StoreUser'),
      },
      ['accessToken', 'refreshToken', 'tokenType', 'expiresIn'],
    ),
    StoreVariant: object({ id: integer, stock: { type: 'integer', minimum: 0 }, options }, [
      'id',
      'stock',
      'options',
    ]),
    StoreProduct: object(
      {
        id: integer,
        title: str,
        description: str,
        price: money,
        currency: { type: 'string', enum: ['USD'] },
        discount: { type: 'integer', minimum: 0, maximum: 99 },
        rating: { type: 'string', example: '4.50' },
        shippingLeadDays: integer,
        views: integer,
        isPreSale: { type: 'boolean' },
        saleEnabled: { type: 'boolean' },
        isAvailable: { type: 'boolean' },
        category: ref('StoreCategory'),
        images: array(image),
        options: array(
          object({ id: integer, name: str, values: array(object({ id: integer, value: str })) }),
        ),
        variants: array(ref('StoreVariant')),
      },
      ['id', 'title', 'price', 'currency', 'variants', 'options', 'isAvailable'],
    ),
    StoreCategory: object({
      id: integer,
      title: str,
      slug: str,
      image: { ...image, nullable: true },
    }),
    CartItem: object({
      id: integer,
      variantId: integer,
      productId: integer,
      title: str,
      quantity: { type: 'integer', minimum: 1 },
      price: money,
      discount: integer,
      netUnitPrice: money,
      lineTotal: money,
      stock: integer,
      isAvailable: { type: 'boolean' },
      options,
      imageUrl: { type: 'string', nullable: true },
    }),
    StoreCart: object(
      {
        cartItems: array(ref('CartItem')),
        total: money,
        currency: { type: 'string', enum: ['USD'] },
        requiresResolution: { type: 'boolean' },
      },
      ['cartItems', 'total', 'currency', 'requiresResolution'],
    ),
    OrderItem: object({
      id: integer,
      productId: { type: 'integer', nullable: true },
      variantId: { type: 'integer', nullable: true },
      title: str,
      quantity: integer,
      unitPrice: money,
      netUnitPrice: money,
      discount: integer,
      options,
      imageUrl: { type: 'string', nullable: true },
    }),
    StoreOrder: object(
      {
        id: integer,
        userId: { type: 'string', format: 'uuid', nullable: true },
        status: {
          type: 'string',
          enum: ['PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
        },
        currency: { type: 'string', enum: ['USD'] },
        total: money,
        deliveryDate: { type: 'string', format: 'date-time', nullable: true },
        legacy: { type: 'boolean' },
        paymentStatus: { type: 'string', enum: ['NOT_COLLECTED', 'LEGACY_UNKNOWN'] },
        items: array(ref('OrderItem')),
      },
      ['id', 'status', 'currency', 'total', 'paymentStatus', 'items'],
    ),
    StoreReview: object({
      id: integer,
      productId: integer,
      content: str,
      rating: { type: 'integer', minimum: 1, maximum: 5 },
      approved: { type: 'boolean' },
      user: object({ id: str, fullName: str, avatarUrl: { type: 'string', nullable: true } }),
    }),
    StoreArticle: object({
      id: integer,
      title: str,
      content: str,
      image: { ...image, nullable: true },
    }),
    StoreFaq: object({ id: integer, title: str, description: str }),
    StoreBrand: object({ id: integer, title: str, image: { ...image, nullable: true } }),
    StoreFeature: object({
      id: integer,
      title: str,
      description: str,
      shadowColor: { type: 'string', nullable: true },
      image: { ...image, nullable: true },
    }),
    MediaUpload: object(
      { ...image.properties, mimeType: { type: 'string', enum: ['image/webp'] }, size: integer },
      ['id', 'url', 'mimeType', 'size'],
    ),
  });
  for (const name of [
    'Product',
    'User',
    'Order',
    'Review',
    'Category',
    'Article',
    'Faq',
    'Brand',
    'Feature',
  ])
    document.components.schemas[`${name}Page`] = page(`Store${name}`);
  for (const [path, item] of Object.entries(document.paths)) {
    const route = path.replace('/api/v1', '');
    for (const method of ['get', 'post', 'patch', 'delete'] as const) {
      const operation = item[method];
      if (!operation) continue;
      let name: string | undefined;
      if (/^\/auth\/(register|login|refresh)$/.test(route)) {
        name = 'AuthTokens';
        operation.security = [];
      } else if (route.startsWith('/auth/')) name = 'Success';
      else if (route === '/users/me' || /^\/admin\/users\//.test(route)) name = 'StoreUser';
      else if (route === '/admin/users') name = 'UserPage';
      else if (route.startsWith('/cart')) name = 'StoreCart';
      else if (/^\/(admin\/)?orders/.test(route))
        name = method === 'get' && /\/orders$/.test(route) ? 'OrderPage' : 'StoreOrder';
      else if (route.endsWith('/reviews')) name = method === 'get' ? 'ReviewPage' : 'StoreReview';
      else if (route.startsWith('/admin/reviews/')) name = 'StoreReview';
      else if (/^\/(admin\/)?products/.test(route))
        name =
          route.endsWith('/views') || method === 'delete'
            ? 'Success'
            : method === 'get' && (/\/products$/.test(route) || route.endsWith('/related'))
              ? 'ProductPage'
              : 'StoreProduct';
      else if (route.startsWith('/media/')) name = 'MediaUpload';
      else
        for (const [segment, entity] of Object.entries({
          categories: 'Category',
          articles: 'Article',
          faqs: 'Faq',
          brands: 'Brand',
          features: 'Feature',
        })) {
          if (new RegExp(`^/(admin/)?${segment}(/|$)`).test(route))
            name =
              method === 'delete'
                ? 'Success'
                : method === 'get' && route.endsWith(segment)
                  ? `${entity}Page`
                  : `Store${entity}`;
        }
      if (name) {
        const status =
          Object.keys(operation.responses).find((x) => /^2\d\d$/.test(x)) ??
          (method === 'post' ? '201' : '200');
        operation.responses[status] = {
          description: 'Successful response',
          content: { 'application/json': { schema: ref(name) } },
        };
      }
      for (const status of ['400', '401', '403', '404', '409', '429', '500'])
        operation.responses[status] ??= {
          description: 'Error response',
          content: { 'application/json': { schema: ref('ApiError') } },
        };
    }
  }
}
