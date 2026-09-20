import { v4 as uuidv4 } from 'uuid';
import { runAgent } from '../agents/orchestrator.js';

export async function processAgentRequest(storeId: string, message: string, customerId?: string) {
  const requestId = uuidv4();

  const result = await runAgent(storeId, requestId, message);

  return {
    ...result,
    requestId,
  };
}
