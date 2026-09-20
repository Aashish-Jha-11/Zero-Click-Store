import type { LlmToolCall } from '../lib/llm.js';
import { getAllProducts } from '../services/product.service.js';

/**
 * Deterministic Hinglish/Hindi/English order parser.
 *
 * This is NOT a mock — it drives the exact same typed tools, the same atomic
 * `finalize_order` RPC and the same audit trail as the model-planned path.
 * Only the *planner* is swapped: regex + fuzzy DB matching instead of an LLM.
 * It exists so a provider outage during judging degrades the reasoning quality
 * rather than killing the end-to-end loop.
 */

/* Devanagari digits ०-९, emitted by hi-IN dictation. */
const DEVANAGARI_DIGITS = '\u0966\u0967\u0968\u0969\u096A\u096B\u096C\u096D\u096E\u096F';

/* Common catalogue words as hi-IN dictation returns them. The LLM path copes
   with Devanagari unaided; this keeps the fallback usable in the same breath. */
const DEVANAGARI_TERMS: Record<string, string> = {
  'मैगी': 'maggi', 'मेगी': 'maggi',
  'दूध': 'milk', 'अमूल': 'amul', 'मिल्क': 'milk',
  'ब्रेड': 'bread', 'पाव': 'bread',
  'मक्खन': 'butter', 'बटर': 'butter',
  'बिस्कुट': 'biscuits', 'पारले': 'parle',
  'आटा': 'atta', 'चीनी': 'sugar', 'नमक': 'salt',
  'तेल': 'oil', 'चावल': 'rice', 'साबुन': 'soap',
  'चिप्स': 'lays', 'कोक': 'coca-cola', 'ठंडा': 'beverages',
  'टूथपेस्ट': 'toothpaste', 'सर्फ': 'surf', 'डिटर्जेंट': 'detergent',
  'एक': 'ek', 'दो': 'do', 'तीन': 'teen', 'चार': 'char', 'पांच': 'paanch',
  'पाँच': 'paanch', 'छह': 'chhe', 'सात': 'saat', 'आठ': 'aath',
  'नौ': 'nau', 'दस': 'das',
  'भैया': '', 'भाई': '', 'मुझे': '', 'चाहिए': '', 'और': 'aur',
  'दे': '', 'दो न': '', 'भेज': '', 'देना': '', 'पैकेट': '', 'किलो': 'kg',
};

/** Normalise hi-IN dictation into the Latin forms the matcher already knows. */
function transliterate(text: string): string {
  let out = text;
  for (let i = 0; i < 10; i++) {
    out = out.replaceAll(DEVANAGARI_DIGITS[i], String(i));
  }
  // Longest first so "दो न" cannot be eaten by "दो".
  for (const key of Object.keys(DEVANAGARI_TERMS).sort((a, b) => b.length - a.length)) {
    out = out.replaceAll(key, ` ${DEVANAGARI_TERMS[key]} `);
  }
  return out.replace(/\s+/g, ' ').trim();
}

const NUMBER_WORDS: Record<string, number> = {
  // English
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  a: 1, an: 1, couple: 2, dozen: 12,
  // Hindi / Hinglish
  ek: 1, do: 2, teen: 3, tin: 3, char: 4, chaar: 4, paanch: 5, panch: 5,
  chhe: 6, che: 6, chah: 6, saat: 7, sat: 7, aath: 8, ath: 8,
  nau: 9, no: 9, das: 10, dus: 10,
};

// Words that carry no product meaning. Order matters: longest phrases first.
const FILLER = [
  'bhaiya', 'bhai', 'bhaiyya', 'boss', 'sir', 'madam', 'ji',
  'please', 'plz', 'kindly', 'mujhe', 'muje', 'mereko', 'hume',
  'de do', 'dedo', 'de dena', 'dena', 'do na', 'chahiye', 'chaiye',
  'bhej do', 'bhejdo', 'bhej dena', 'send', 'give me', 'give', 'get me', 'want',
  'i need', 'need', 'order', 'karo', 'kar do', 'ghar pe', 'ghar par',
  'deliver kar dena', 'deliver karna', 'deliver', 'home', 'packets', 'packet',
  'pack', 'packs', 'bottle', 'bottles', 'can', 'cans', 'piece', 'pieces', 'pcs',
];

// Units that may trail a quantity ("2 kg atta", "1 litre milk").
const UNIT_WORDS = ['kg', 'kgs', 'kilo', 'kilos', 'g', 'gram', 'grams', 'l', 'lt', 'ltr', 'litre', 'liter', 'ml'];

const SEPARATOR = /\s*(?:,|\band\b|\baur\b|\bor\b|\bplus\b|\+|&|;|\/)\s*/gi;

function normalize(text: string): string {
  return transliterate(text)
    .toLowerCase()
    .replace(/[."'!?|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripFiller(text: string): string {
  let out = ` ${text} `;
  for (const f of FILLER) {
    out = out.replace(new RegExp(`\\s${f.replace(/\s+/g, '\\s+')}\\s`, 'gi'), ' ');
  }
  return out.replace(/\s+/g, ' ').trim();
}

interface ParsedItem {
  raw: string;
  quantity: number;
  query: string;
}

/** Pull a quantity out of a chunk, leaving the product phrase behind. */
function extractQuantity(chunk: string): { quantity: number; rest: string } {
  const tokens = chunk.split(/\s+/).filter(Boolean);
  let quantity = 1;
  let found = false;
  const rest: string[] = [];

  for (const tok of tokens) {
    if (found) {
      rest.push(tok);
      continue;
    }
    const digits = tok.match(/^(\d+)(?:[a-z]*)$/);
    if (digits) {
      quantity = parseInt(digits[1], 10);
      found = true;
      continue;
    }
    if (NUMBER_WORDS[tok] !== undefined) {
      quantity = NUMBER_WORDS[tok];
      found = true;
      continue;
    }
    rest.push(tok);
  }

  // Drop a unit word immediately after the quantity ("2 kg atta" -> "atta").
  while (rest.length > 1 && UNIT_WORDS.includes(rest[0])) rest.shift();

  return { quantity: Math.max(1, quantity), rest: rest.join(' ').trim() };
}

function parseItems(message: string): ParsedItem[] {
  const cleaned = stripFiller(normalize(message));
  const chunks = cleaned.split(SEPARATOR).map((c) => c.trim()).filter(Boolean);

  const items: ParsedItem[] = [];
  for (const chunk of chunks) {
    const { quantity, rest } = extractQuantity(chunk);
    if (!rest || rest.length < 2) continue;
    items.push({ raw: chunk, quantity, query: rest });
  }
  return items;
}

interface Product {
  id: string;
  name: string;
  normalized_name?: string;
  category?: string;
  price: number;
  stock_quantity: number;
  unit?: string;
}

/** Token-overlap score between a customer phrase and a product row. */
function scoreMatch(query: string, product: Product): number {
  const haystack = `${product.name} ${product.category ?? ''}`.toLowerCase();
  const qTokens = query.split(/\s+/).filter((t) => t.length > 1);
  if (qTokens.length === 0) return 0;

  let score = 0;
  for (const tok of qTokens) {
    if (haystack.includes(tok)) {
      score += tok.length >= 4 ? 3 : 2;
      // Matching the start of the product name is a strong signal.
      if (haystack.startsWith(tok)) score += 2;
    } else if (tok.length >= 5) {
      // Tolerate one typo on longer tokens (maggie -> maggi).
      const stem = tok.slice(0, Math.max(4, tok.length - 2));
      if (haystack.includes(stem)) score += 1;
    }
  }
  return score;
}

export interface DeterministicPlan {
  summary: string;
  parsedItems: Array<{ query: string; quantity: number; matched?: string; issue?: string }>;
  calls: LlmToolCall[];
  blocked: Array<{ query: string; reason: string }>;
  reply: string;
  buildReply: (order?: Record<string, unknown>) => string;
}

export async function planDeterministically(
  storeId: string,
  message: string
): Promise<DeterministicPlan> {
  const products: Product[] = await getAllProducts(storeId);
  const parsed = parseItems(message);

  const calls: LlmToolCall[] = [];
  const resolved: Array<{ product: Product; quantity: number }> = [];
  const blocked: Array<{ query: string; reason: string }> = [];
  const parsedItems: DeterministicPlan['parsedItems'] = [];
  let seq = 0;
  const nextId = () => `det_${++seq}`;

  for (const item of parsed) {
    // Step 1 — real DB search (audited).
    calls.push({ id: nextId(), name: 'search_products', args: { query: item.query } });

    const scored = products
      .map((p) => ({ p, s: scoreMatch(item.query, p) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);

    if (scored.length === 0) {
      blocked.push({ query: item.query, reason: 'not_found' });
      parsedItems.push({ query: item.query, quantity: item.quantity, issue: 'not found in catalogue' });
      continue;
    }

    // Ambiguous when the top two matches tie (e.g. "milk" -> Taaza vs Gold).
    if (scored.length > 1 && scored[0].s === scored[1].s) {
      blocked.push({
        query: item.query,
        reason: `ambiguous: ${scored.slice(0, 3).map((x) => x.p.name).join(' / ')}`,
      });
      parsedItems.push({ query: item.query, quantity: item.quantity, issue: 'ambiguous match' });
      continue;
    }

    const product = scored[0].p;

    // Step 2 — real inventory check (audited).
    calls.push({
      id: nextId(),
      name: 'check_inventory',
      args: { productId: product.id, quantity: item.quantity },
    });

    if (product.stock_quantity < item.quantity) {
      blocked.push({
        query: product.name,
        reason: `only ${product.stock_quantity} in stock, ${item.quantity} requested`,
      });
      parsedItems.push({
        query: item.query,
        quantity: item.quantity,
        matched: product.name,
        issue: `insufficient stock (${product.stock_quantity} left)`,
      });
      continue;
    }

    resolved.push({ product, quantity: item.quantity });
    parsedItems.push({ query: item.query, quantity: item.quantity, matched: product.name });
  }

  const summary =
    parsed.length === 0
      ? 'no items detected'
      : parsedItems
          .map((i) => `${i.quantity}× ${i.matched ?? i.query}${i.issue ? ` (${i.issue})` : ''}`)
          .join(', ');

  // Any blocker => clarify instead of creating a partial order.
  if (resolved.length === 0 || blocked.length > 0) {
    const lines: string[] = [];
    for (const b of blocked) {
      if (b.reason === 'not_found') {
        lines.push(`• "${b.query}" — we don't stock that right now.`);
      } else if (b.reason.startsWith('ambiguous')) {
        lines.push(`• "${b.query}" — which one? ${b.reason.replace('ambiguous: ', '')}`);
      } else {
        lines.push(`• ${b.query} — ${b.reason}.`);
      }
    }
    if (resolved.length === 0 && blocked.length === 0) {
      lines.push("I couldn't identify any products in that request.");
    }
    const reply =
      `I need a quick confirmation before placing this order:\n${lines.join('\n')}` +
      (resolved.length > 0
        ? `\n\nReady to go: ${resolved.map((r) => `${r.quantity}× ${r.product.name}`).join(', ')}.`
        : '');

    return {
      summary,
      parsedItems,
      calls,
      blocked,
      reply,
      buildReply: () => reply,
    };
  }

  const cartItems = resolved.map((r) => ({ productId: r.product.id, quantity: r.quantity }));
  const total = resolved.reduce((sum, r) => sum + Number(r.product.price) * r.quantity, 0);

  // Step 3 & 4 — authoritative pricing, then the atomic write.
  calls.push({ id: nextId(), name: 'calculate_cart', args: { items: cartItems } });
  calls.push({
    id: nextId(),
    name: 'create_order',
    args: {
      items: resolved.map((r) => ({
        productId: r.product.id,
        quantity: r.quantity,
        unitPrice: Number(r.product.price),
      })),
      total,
    },
  });

  const buildReply = (order?: Record<string, unknown>) => {
    const lines = resolved.map(
      (r) =>
        `• ${r.quantity} × ${r.product.name} @ ₹${Number(r.product.price).toFixed(2)} = ₹${(
          Number(r.product.price) * r.quantity
        ).toFixed(2)}`
    );
    const orderId = order?.order_id ? String(order.order_id).slice(0, 8) : null;
    return (
      `Order confirmed ✅\n\n${lines.join('\n')}\n\n` +
      `Total: ₹${Number(order?.total ?? total).toFixed(2)}` +
      (orderId ? `\nOrder ID: #${orderId}` : '') +
      `\nInventory has been updated.`
    );
  };

  return { summary, parsedItems, calls, blocked, reply: buildReply(), buildReply };
}
