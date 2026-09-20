import { llm, MODEL_ID } from '../lib/llm.js';
import { SYSTEM_PROMPT } from './prompts.js';
import { TOOL_DEFINITIONS } from './schemas.js';
import { handleSearchProducts } from '../tools/search-products.js';
import { handleCheckInventory } from '../tools/check-inventory.js';
import { handleGetPrice } from '../tools/get-price.js';
import { handleCalculateCart } from '../tools/calculate-cart.js';
import { handleCreateOrder } from '../tools/finalize-order.js';
import { logActivity, type EventType } from '../services/activity.service.js';

interface AgentEvent {
  type: EventType;
  message: string;
  metadata?: Record<string, unknown>;
}

interface AgentResult {
  success: boolean;
  response: string;
  order?: Record<string, unknown>;
  events: AgentEvent[];
  error?: string;
}

type ToolHandler = (storeId: string, input: any) => Promise<any>;

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  search_products: handleSearchProducts,
  check_inventory: handleCheckInventory,
  get_price: handleGetPrice,
  calculate_cart: handleCalculateCart,
  create_order: handleCreateOrder,
};

// Map tool names to activity event types
const TOOL_EVENT_MAP: Record<string, EventType> = {
  search_products: 'product_found',
  check_inventory: 'inventory_checked',
  get_price: 'price_verified',
  calculate_cart: 'price_verified',
  create_order: 'order_created',
};

export async function runAgent(
  storeId: string,
  requestId: string,
  userMessage: string
): Promise<AgentResult> {
  const events: AgentEvent[] = [];

  const addEvent = async (type: EventType, message: string, metadata?: Record<string, unknown>) => {
    events.push({ type, message, metadata });
    await logActivity(storeId, requestId, type, message, metadata);
  };

  try {
    await addEvent('request_received', `Customer request: "${userMessage}"`);

    // Build messages for Claude
    const messages: Array<{ role: 'user' | 'assistant'; content: any }> = [
      { role: 'user', content: userMessage },
    ];

    let finalResponse = '';
    let orderData: Record<string, unknown> | undefined;
    const MAX_ITERATIONS = 10;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      iteration++;

      const response = await llm.messages.create({
        model: MODEL_ID,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: TOOL_DEFINITIONS as any,
        messages,
      });

      // Check if we got a text response (done) or tool calls
      const textBlocks = response.content.filter((b) => b.type === 'text');
      const toolBlocks = response.content.filter((b) => b.type === 'tool_use');

      if (response.stop_reason === 'end_turn' || toolBlocks.length === 0) {
        // Final text response
        finalResponse = textBlocks.map((b) => ('text' in b ? b.text : '')).join('\n');
        await addEvent('confirmation_sent', 'Order confirmation generated');
        break;
      }

      // Process tool calls
      if (iteration === 1) {
        await addEvent('intent_parsed', 'Request understood, processing...');
      }

      // Add assistant's response to messages
      messages.push({ role: 'assistant', content: response.content });

      // Execute each tool call and collect results
      const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];

      for (const toolCall of toolBlocks) {
        if (toolCall.type !== 'tool_use') continue;

        const handler = TOOL_HANDLERS[toolCall.name];
        if (!handler) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: JSON.stringify({ error: `Unknown tool: ${toolCall.name}` }),
          });
          continue;
        }

        try {
          const result = await handler(storeId, toolCall.input as any);
          const eventType = TOOL_EVENT_MAP[toolCall.name] || 'intent_parsed';

          // Build descriptive event message
          let eventMsg = `Tool ${toolCall.name} executed`;
          if (toolCall.name === 'search_products') {
            const products = result.products || [];
            eventMsg = products.length > 0
              ? `Found ${products.length} product(s) matching "${(toolCall.input as any).query}"`
              : `No products found for "${(toolCall.input as any).query}"`;
          } else if (toolCall.name === 'check_inventory') {
            eventMsg = result.available
              ? `Stock confirmed: ${result.availableQuantity} available (requested ${result.requested})`
              : `Insufficient stock: only ${result.availableQuantity} available (requested ${result.requested})`;
          } else if (toolCall.name === 'calculate_cart') {
            eventMsg = `Cart calculated: ₹${result.total}`;
          } else if (toolCall.name === 'create_order') {
            eventMsg = `Order #${result.order_id} created — ₹${result.total}`;
            orderData = result;
            await addEvent('inventory_updated', 'Inventory deducted for ordered items');
          }

          await addEvent(eventType, eventMsg, { tool: toolCall.name, result });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: JSON.stringify(result),
          });
        } catch (err: any) {
          await addEvent('workflow_failed', `Tool ${toolCall.name} failed: ${err.message}`);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: JSON.stringify({ error: err.message }),
          });
        }
      }

      // Add tool results as a user message
      messages.push({ role: 'user', content: toolResults });
    }

    if (!finalResponse && iteration >= MAX_ITERATIONS) {
      await addEvent('workflow_failed', 'Agent exceeded maximum iterations');
      return {
        success: false,
        response: 'The request could not be completed. Please try again.',
        events,
        error: 'Max iterations exceeded',
      };
    }

    return {
      success: true,
      response: finalResponse,
      order: orderData,
      events,
    };
  } catch (err: any) {
    await addEvent('workflow_failed', `Agent error: ${err.message}`);
    return {
      success: false,
      response: "We couldn't process the request right now. Please try again.",
      events,
      error: err.message,
    };
  }
}
