import dotenv from 'dotenv';

dotenv.config();

/**
 * Provider-agnostic LLM layer.
 *
 * Drop ANY one of these keys into backend/.env and the agent works:
 *   GROQ_API_KEY, CEREBRAS_API_KEY, ANTHROPIC_API_KEY,
 *   OPENAI_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY
 *
 * Everything except Anthropic speaks the OpenAI /chat/completions dialect,
 * so there are exactly two wire adapters. The orchestrator never sees either —
 * it works against the neutral types below.
 */

// ---------- Neutral types the orchestrator talks in ----------

export interface LlmToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface LlmToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export type LlmMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: LlmToolCall[] }
  | { role: 'tool'; toolCallId: string; name: string; content: string };

export interface LlmTurn {
  text: string;
  toolCalls: LlmToolCall[];
}

// ---------- Provider resolution ----------

interface ProviderConfig {
  name: string;
  dialect: 'openai' | 'anthropic';
  baseUrl: string;
  apiKey: string;
  model: string;
}

const CANDIDATES: Array<{
  name: string;
  envKey: string;
  dialect: 'openai' | 'anthropic';
  baseUrl: string;
  model: string;
}> = [
  {
    name: 'groq',
    envKey: 'GROQ_API_KEY',
    dialect: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'openai/gpt-oss-120b',
  },
  {
    name: 'cerebras',
    envKey: 'CEREBRAS_API_KEY',
    dialect: 'openai',
    baseUrl: 'https://api.cerebras.ai/v1',
    model: 'llama-3.3-70b',
  },
  {
    name: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    dialect: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-haiku-4-5-20251001',
  },
  {
    name: 'openai',
    envKey: 'OPENAI_API_KEY',
    dialect: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  {
    name: 'openrouter',
    envKey: 'OPENROUTER_API_KEY',
    dialect: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-3.5-haiku',
  },
  {
    name: 'gemini',
    envKey: 'GEMINI_API_KEY',
    dialect: 'openai', // Gemini ships an OpenAI-compatible endpoint
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
  },
  {
    name: 'omnirouter',
    envKey: 'OMNIROUTER_API_KEY',
    dialect: 'anthropic',
    baseUrl: 'https://api.omnirouter.xyz/v1',
    model: 'claude-sonnet-4-20250514',
  },
];

function resolveProvider(): ProviderConfig | null {
  const forced = process.env.LLM_PROVIDER?.toLowerCase().trim();
  const pool = forced ? CANDIDATES.filter((c) => c.name === forced) : CANDIDATES;

  for (const c of pool) {
    const apiKey = process.env[c.envKey]?.trim();
    if (!apiKey) continue;
    return {
      name: c.name,
      dialect: (process.env.LLM_DIALECT as 'openai' | 'anthropic') || c.dialect,
      baseUrl: (process.env.LLM_BASE_URL || c.baseUrl).replace(/\/+$/, ''),
      apiKey,
      model: process.env.LLM_MODEL || c.model,
    };
  }
  return null;
}

const provider = resolveProvider();

export const LLM_PROVIDER = provider?.name ?? 'none';
export const LLM_MODEL = provider?.model ?? 'none';

export function isLlmConfigured(): boolean {
  return provider !== null;
}

if (!provider) {
  console.warn(
    '⚠  No LLM key found. Set one of GROQ_API_KEY / CEREBRAS_API_KEY / ANTHROPIC_API_KEY /\n' +
      '   OPENAI_API_KEY / OPENROUTER_API_KEY / GEMINI_API_KEY in backend/.env.\n' +
      '   The agent will run on the deterministic fallback parser until then.'
  );
} else {
  console.log(`🧠 LLM provider: ${provider.name} (${provider.model})`);
}

// ---------- Wire adapters ----------

const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 30000);

const RETRY_STATUSES = new Set([429, 500, 502, 503, 529]);
const MAX_RETRIES = Number(process.env.LLM_MAX_RETRIES || 2);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST with bounded retry on rate limits and transient upstream errors. */
async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<any> {
  let lastErr: any;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await postJsonOnce(url, headers, body);
    } catch (err: any) {
      lastErr = err;
      const retryable = RETRY_STATUSES.has(err?.status);
      if (!retryable || attempt === MAX_RETRIES) break;
      const wait = err.retryAfterMs ?? Math.min(600 * 2 ** attempt, 4000);
      console.warn(`[LLM] ${err.status} — retrying in ${wait}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function postJsonOnce(url: string, headers: Record<string, string>, body: unknown) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      redirect: 'manual',
    });

    const text = await res.text();

    // A parked domain / bad base URL answers with HTML or a redirect, not JSON.
    if (res.status >= 300 && res.status < 400) {
      throw new Error(`LLM endpoint redirected (${res.status}) — LLM_BASE_URL looks wrong: ${url}`);
    }
    if (!res.ok) {
      const err: any = new Error(`LLM HTTP ${res.status}: ${text.slice(0, 300)}`);
      err.status = res.status;
      // Honour Retry-After so the caller can back off intelligently.
      const ra = res.headers.get('retry-after');
      if (ra) err.retryAfterMs = Math.min(Number(ra) * 1000 || 0, 8000);
      throw err;
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`LLM returned non-JSON (base URL probably wrong): ${text.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

function toOpenAiMessages(system: string, messages: LlmMessage[]) {
  const out: any[] = [{ role: 'system', content: system }];
  for (const m of messages) {
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.content });
    } else if (m.role === 'assistant') {
      out.push({
        role: 'assistant',
        content: m.content || null,
        ...(m.toolCalls?.length
          ? {
              tool_calls: m.toolCalls.map((tc) => ({
                id: tc.id,
                type: 'function',
                function: { name: tc.name, arguments: JSON.stringify(tc.args) },
              })),
            }
          : {}),
      });
    } else {
      out.push({ role: 'tool', tool_call_id: m.toolCallId, content: m.content });
    }
  }
  return out;
}

async function chatOpenAi(p: ProviderConfig, system: string, messages: LlmMessage[], tools: LlmToolDef[]): Promise<LlmTurn> {
  const data = await postJson(
    `${p.baseUrl}/chat/completions`,
    { authorization: `Bearer ${p.apiKey}` },
    {
      model: p.model,
      max_tokens: 2048,
      temperature: 0,
      messages: toOpenAiMessages(system, messages),
      tools: tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      })),
      tool_choice: 'auto',
    }
  );

  const choice = data.choices?.[0];
  if (!choice) throw new Error(`LLM returned no choices: ${JSON.stringify(data).slice(0, 300)}`);

  const rawCalls = choice.message?.tool_calls ?? [];
  const toolCalls: LlmToolCall[] = rawCalls.map((tc: any, i: number) => {
    let args: Record<string, any> = {};
    try {
      args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
    } catch {
      args = {};
    }
    return { id: tc.id || `call_${i}`, name: tc.function?.name, args };
  });

  return { text: choice.message?.content ?? '', toolCalls };
}

function toAnthropicMessages(messages: LlmMessage[]) {
  const out: any[] = [];
  for (const m of messages) {
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.content });
    } else if (m.role === 'assistant') {
      const blocks: any[] = [];
      if (m.content) blocks.push({ type: 'text', text: m.content });
      for (const tc of m.toolCalls ?? []) {
        blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.args });
      }
      out.push({ role: 'assistant', content: blocks });
    } else {
      // Anthropic wants tool results batched into a user turn.
      const block = { type: 'tool_result', tool_use_id: m.toolCallId, content: m.content };
      const last = out[out.length - 1];
      if (last?.role === 'user' && Array.isArray(last.content)) last.content.push(block);
      else out.push({ role: 'user', content: [block] });
    }
  }
  return out;
}

async function chatAnthropic(p: ProviderConfig, system: string, messages: LlmMessage[], tools: LlmToolDef[]): Promise<LlmTurn> {
  const data = await postJson(
    `${p.baseUrl}/messages`,
    { 'x-api-key': p.apiKey, 'anthropic-version': '2023-06-01' },
    {
      model: p.model,
      max_tokens: 2048,
      temperature: 0,
      system,
      messages: toAnthropicMessages(messages),
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      })),
    }
  );

  const blocks: any[] = data.content ?? [];
  const text = blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  const toolCalls: LlmToolCall[] = blocks
    .filter((b) => b.type === 'tool_use')
    .map((b) => ({ id: b.id, name: b.name, args: b.input ?? {} }));

  return { text, toolCalls };
}

/** One reasoning turn. Throws if the provider is unreachable — callers fall back. */
export async function chat(opts: {
  system: string;
  messages: LlmMessage[];
  tools: LlmToolDef[];
}): Promise<LlmTurn> {
  if (!provider) throw new Error('No LLM provider configured');
  return provider.dialect === 'anthropic'
    ? chatAnthropic(provider, opts.system, opts.messages, opts.tools)
    : chatOpenAi(provider, opts.system, opts.messages, opts.tools);
}
