import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OMNIROUTER_API_KEY;
const baseURL = 'https://api.omnirouter.xyz/v1';

if (!apiKey) {
  console.warn('⚠ OMNIROUTER_API_KEY not set — LLM calls will fail');
}

export const llm = new Anthropic({
  apiKey: apiKey || '',
  baseURL,
});

export const MODEL_ID = 'claude-sonnet-4-20250514';
