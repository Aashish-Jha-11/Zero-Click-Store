// Tool definitions for Claude tool_use
export const TOOL_DEFINITIONS = [
  {
    name: 'search_products',
    description:
      'Search the store database for products matching a query. Use this to find product IDs, prices, and stock for items the customer mentions. Always search before creating an order.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Product name or keyword to search (e.g. "Maggi", "milk", "bread")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'check_inventory',
    description:
      'Check if a specific product has enough stock for the requested quantity. Call this for each item before creating an order.',
    input_schema: {
      type: 'object' as const,
      properties: {
        productId: { type: 'string', description: 'The product UUID' },
        quantity: { type: 'number', description: 'How many units the customer wants' },
      },
      required: ['productId', 'quantity'],
    },
  },
  {
    name: 'get_price',
    description: 'Get the current unit price of a product from the database.',
    input_schema: {
      type: 'object' as const,
      properties: {
        productId: { type: 'string', description: 'The product UUID' },
      },
      required: ['productId'],
    },
  },
  {
    name: 'calculate_cart',
    description:
      'Calculate the cart total from a list of items. The backend computes authoritative pricing — never calculate prices yourself.',
    input_schema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              quantity: { type: 'number' },
            },
            required: ['productId', 'quantity'],
          },
          description: 'List of products and quantities',
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'create_order',
    description:
      'Create the order, deduct inventory, and record the audit trail — all in one atomic transaction. Call this ONLY after searching products, checking inventory, and calculating the cart.',
    input_schema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              quantity: { type: 'number' },
              unitPrice: { type: 'number' },
            },
            required: ['productId', 'quantity', 'unitPrice'],
          },
        },
        total: { type: 'number', description: 'The cart total from calculate_cart' },
        customerId: {
          type: 'string',
          description: 'Optional customer ID',
        },
      },
      required: ['items', 'total'],
    },
  },
];
