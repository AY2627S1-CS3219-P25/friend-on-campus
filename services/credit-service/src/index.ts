/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Wired the credit store, service and Express app and retained server startup.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import { createApp } from './app';
import { config } from './config';
import { createCreditService } from './credits/service';
import { createCreditStore } from './credits/store';

const store = createCreditStore();
const credits = createCreditService(store);
const app = createApp({ credits, port: config.port });

app.listen(config.port, () => {
  console.log(`🚀 [Credit Service] running on port ${config.port} with tsx`);
});
