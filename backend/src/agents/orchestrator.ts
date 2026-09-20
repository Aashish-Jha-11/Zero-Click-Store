import { chat, isLlmConfigured, LLM_PROVIDER, LLM_MODEL, type LlmMessage, type LlmToolCall } from '../lib/llm.js';
import { SYSTEM_PROMPT } from './prompts.js';
import { TOOL_DEFINITIONS } from './schemas.js';
import { planDeterministically } from './fallback-parser.js';
import { handleSearchProducts } from '../tools/search-products.js';
import { handleCheckInventory } from '../tools/check-inventory.js';
import { handleGetPrice } from '../tools/get-price.js';
import { handleCalculateCart } from '../tools/calculate-cart.js';
import { handleCreateOrder } from '../tools/finalize-order.js';
import { logActivity, type EventType } from '../services/activity.service.js';
import { getAlertsForProducts, type LowStockItem } from '../services/alerts.service.js';

export interface AgentEvent {
  type: EventType;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface AgentResult {
  success: boolean;
  response: string;
  order?: Record<string, unknown>;
  events: AgentEvent[];
  /** 'llm' = model-planned. 'fallback' = deterministic parser (LLM unreachable). */
  mode: 'llm' | 'fallback';
  /** Items this order pushed to or below the restock threshold. */
  lowStockAlerts?: LowStockItem[];
  provider: string;
  model: string;
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

const TOOL_EVENT_MAP: Record<string, EventType> = {
  search_products: 'product_found',
  check_inventory: 'inventory_checked',
  get_price: 'price_verified',
  calculate_cart: 'price_verified',
  create_order: 'order_created',
};

/** Human-readable audit line for a tool execution. */
function describeToolResult(name: string, input: any, result: any): string {
  switch (name) {
    case 'search_products': {
      const n = result?.products?.length ?? 0;
      return n > 0
        ? `Found ${n} product(s) matching "${input?.query}"`
        : `No products found for "${input?.query}"`;
    }
    case 'check_inventory':
      return result?.available
        ? `Stock confirmed: ${result.availableQuantity} available (requested ${result.requested})`
        : `Insufficient stock: only ${result?.availableQuantity} available (requested ${result?.requested})`;
    case 'get_price':
      return `Price verified: ${result?.productName} @ ₹${result?.unitPrice}`;
    case 'calculate_cart':
      return `Cart calculated: ₹${result?.total}`;
    case 'create_order':
      return `Order #${result?.order_id} created — ₹${result?.total}`;
    default:
      return `Tool ${name} executed`;
  }
}

/** Confirmation text built from a committed order row, used when the model
 *  never got a turn to write one itself. */
function summariseOrder(order: Record<string, unknown>): string {
  const id = order.order_id ? String(order.order_id).slice(0, 8) : null;
  const total = Number(order.total ?? 0).toFixed(2);
  const count = order.items_count ?? '';
  return (
    `Order confirmed \u2705\n\n` +
    `${count} item(s) \u2014 Total: \u20b9${total}` +
    (id ? `\nOrder ID: #${id}` : '') +
    `\nInventory has been updated.`
  );
}

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

  // Executes one tool call against the real DB and records the audit event.
  let orderData: Record<string, unknown> | undefined;
  let lowStockAlerts: LowStockItem[] = [];
  const execute = async (call: LlmToolCall): Promise<string> => {
    const handler = TOOL_HANDLERS[call.name];
    if (!handler) {
      return JSON.stringify({ error: `Unknown tool: ${call.name}` });
    }
    try {
      const result = await handler(storeId, call.args);
      await addEvent(TOOL_EVENT_MAP[call.name] || 'intent_parsed', describeToolResult(call.name, call.args, result), {
        tool: call.name,
        input: call.args,
        result,
      });
      if (call.name === 'create_order') {
        orderData = result;
        await addEvent('inventory_updated', 'Inventory deducted for ordered items');

        // Bonus: warn the shopkeeper the instant a sale drops an item below
        // the restock threshold, rather than on the next dashboard load.
        const ids = (call.args?.items ?? []).map((i: any) => i.productId).filter(Boolean);
        lowStockAlerts = await getAlertsForProducts(ids);
        for (const a of lowStockAlerts) {
          await addEvent(
            'low_stock_alert',
            a.severity === 'out_of_stock'
              ? `Out of stock: ${a.name} — reorder now`
              : `Low stock: ${a.name} — only ${a.stock_quantity} left`,
            { productId: a.id, severity: a.severity, remaining: a.stock_quantity }
          );
        }
      }
      return JSON.stringify(result);
    } catch (err: any) {
      await addEvent('workflow_failed', `Tool ${call.name} failed: ${err.message}`, { tool: call.name });
      return JSON.stringify({ error: err.message });
    }
  };

  await addEvent('request_received', `Customer request: "${userMessage}"`);

  // ---------- Path A: model-planned ----------
  if (isLlmConfigured()) {
    try {
      const messages: LlmMessage[] = [{ role: 'user', content: userMessage }];
      const MAX_ITERATIONS = 16;

      for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
        const turn = await chat({ system: SYSTEM_PROMPT, messages, tools: TOOL_DEFINITIONS });

        if (turn.toolCalls.length === 0) {
          await addEvent('confirmation_sent', 'Confirmation generated for customer');
          return {
            success: true,
            response: turn.text || 'Request processed.',
            order: orderData,
            events,
            lowStockAlerts,
            mode: 'llm',
            provider: LLM_PROVIDER,
            model: LLM_MODEL,
          };
        }

        if (iteration === 1) {
          await addEvent('intent_parsed', `Intent decomposed into ${turn.toolCalls.length} tool call(s)`, {
            tools: turn.toolCalls.map((c) => c.name),
          });
        }

        messages.push({ role: 'assistant', content: turn.text, toolCalls: turn.toolCalls });

        for (const call of turn.toolCalls) {
          const content = await execute(call);
          messages.push({ role: 'tool', toolCallId: call.id, name: call.name, content });
        }
      }

      // Ran out of reasoning turns. If the order was already committed we must
      // NOT report failure — the row and the stock deduction are real.
      if (orderData) {
        await addEvent('confirmation_sent', 'Confirmation generated from committed order');
        return {
          success: true,
          response: summariseOrder(orderData),
          order: orderData,
          events,
          lowStockAlerts,
          mode: 'llm',
          provider: LLM_PROVIDER,
          model: LLM_MODEL,
        };
      }

      await addEvent('workflow_failed', 'Agent exceeded maximum reasoning iterations');
      return {
        success: false,
        response: 'The request could not be completed. Please try again.',
        events,
        mode: 'llm',
        provider: LLM_PROVIDER,
        model: LLM_MODEL,
        error: 'Max iterations exceeded',
      };
    } catch (err: any) {
      // Provider down / key invalid / rate limited — do NOT fail the demo.
      console.error('[Orchestrator] LLM path failed, falling back:', err.message);

      // If the order already committed before the provider died, stop here.
      // Re-planning would deduct stock a second time.
      if (orderData) {
        await addEvent('confirmation_sent', 'Confirmation generated from committed order');
        return {
          success: true,
          response: summariseOrder(orderData),
          order: orderData,
          events,
          lowStockAlerts,
          mode: 'llm',
          provider: LLM_PROVIDER,
          model: LLM_MODEL,
        };
      }

      await addEvent('intent_parsed', `LLM unavailable (${err.message.slice(0, 80)}) — switching to deterministic parser`);
    }
  }

  // ---------- Path B: deterministic fallback ----------
  // Same tools, same DB writes, same audit trail — only the planner differs.
  const plan = await planDeterministically(storeId, userMessage);

  await addEvent('intent_parsed', `Intent parsed deterministically: ${plan.summary}`, {
    parser: 'deterministic',
    items: plan.parsedItems,
  });

  if (plan.calls.length === 0) {
    await addEvent('clarification_needed', plan.reply);
    return {
      success: false,
      response: plan.reply,
      events,
      mode: 'fallback',
      provider: LLM_PROVIDER,
      model: 'deterministic-parser',
    };
  }

  for (const call of plan.calls) {
    await execute(call);
  }

  await addEvent('confirmation_sent', 'Confirmation generated for customer');

  return {
    success: !!orderData || plan.blocked.length === 0,
    response: plan.buildReply(orderData),
    order: orderData,
    events,
    lowStockAlerts,
    mode: 'fallback',
    provider: LLM_PROVIDER,
    model: 'deterministic-parser',
  };
}
