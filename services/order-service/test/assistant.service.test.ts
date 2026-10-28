/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Unit and integration tests for F6 Natural-Language Errand Assistant service and draft endpoint.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { createApp } from '../src/app';
import { createAssistantService } from '../src/assistant/assistant.service';
import { createOrderService } from '../src/orders/order.service';
import {
  makeFakeOrderRepository,
  makeFakeSupplierClient,
  startTestServer,
} from './helpers';

const ALICE_ID = '20000000-0000-4000-8000-000000000001';
const SUPPLIER_ID = '10000000-0000-4000-8000-000000000001';

describe('Assistant Service & Draft Extraction', () => {
  it('rejects empty or whitespace prompts with an error', async () => {
    const fakeSupplier = makeFakeSupplierClient({});
    const assistant = createAssistantService(fakeSupplier.client, {
      soclaasBaseUrl: 'http://localhost:9999',
      soclaasApiKey: '',
      soclaasModel: 'default',
    });

    await assert.rejects(
      async () => assistant.parseErrandDraft('   '),
      /Errand prompt must not be empty/
    );
  });

  it('uses offline fallback when API key is empty and matches supplier and deadline', async () => {
    const fakeSupplier = makeFakeSupplierClient({
      [SUPPLIER_ID]: {
        id: SUPPLIER_ID,
        name: 'Frontier Canteen',
        campusZone: 'Science',
        isActive: true,
      },
    });

    const assistant = createAssistantService(fakeSupplier.client, {
      soclaasBaseUrl: 'http://localhost:9999',
      soclaasApiKey: '',
      soclaasModel: 'default',
    });

    const draft = await assistant.parseErrandDraft(
      'Get 2 chicken rice from Frontier Canteen by 2pm for 8 credits'
    );

    assert.equal(draft.supplierId, SUPPLIER_ID);
    assert.equal(draft.matchedSupplierName, 'Frontier Canteen');
    assert.equal(draft.rewardCredits, 8);
    // D1 §3.3 timing rule: absolute deadline preserves durationMinutes = 30
    assert.equal(draft.durationMinutes, 30);
    assert.match(draft.specialNotes || '', /Requested delivery deadline: by 2pm/i);
    assert.ok(draft.warnings && draft.warnings.some((w) => w.includes('Clock deadline')));
  });

  it('enforces D1 §3.3 clock deadline constraint and duration bounds from LLM payload', async () => {
    const fakeSupplier = makeFakeSupplierClient({
      [SUPPLIER_ID]: {
        id: SUPPLIER_ID,
        name: 'Starbucks UTown',
        campusZone: 'UTown',
        isActive: true,
      },
    });

    // Mock global fetch for SoCLaaS chat completions
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
      const [url] = args;
      if (typeof url === 'string' && url.includes('/chat/completions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    supplierName: 'Starbucks UTown',
                    items: [
                      { itemDescription: 'Iced Caramel Macchiato', quantity: 2, estimatedUnitCost: 7.2 },
                    ],
                    itemDescription: '2x Iced Caramel Macchiato',
                    totalEstimatedCost: 14.4,
                    dropoffLocation: 'COM3 Level 2 Study Bench',
                    rewardCredits: 7,
                    durationMinutes: 45,
                    requestedDeadline: 'by 3:15pm',
                    specialNotes: 'Less ice please',
                  }),
                },
              },
            ],
          }),
        } as unknown as globalThis.Response;
      }
      return originalFetch(...args);
    }) as typeof fetch;

    try {
      const assistant = createAssistantService(fakeSupplier.client, {
        soclaasBaseUrl: 'https://soclaas.fake/v1',
        soclaasApiKey: 'mock-key',
        soclaasModel: 'default',
      });

      const draft = await assistant.parseErrandDraft(
        'Grab 2 iced caramel macchiato from Starbucks UTown to COM3 L2 by 3:15pm for 7 credits, less ice'
      );

      assert.equal(draft.supplierId, SUPPLIER_ID);
      assert.equal(draft.matchedSupplierName, 'Starbucks UTown');
      assert.equal(draft.itemDescription, '2x Iced Caramel Macchiato');
      assert.equal(draft.dropoffLocation, 'COM3 Level 2 Study Bench');
      assert.equal(draft.rewardCredits, 7);
      assert.equal(draft.durationMinutes, 45);
      assert.match(draft.specialNotes || '', /Less ice please/);
      assert.match(draft.specialNotes || '', /Requested delivery deadline: by 3:15pm/);
      assert.ok(draft.warnings && draft.warnings.some((w) => w.includes('Clock deadline "by 3:15pm"')));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  describe('HTTP POST /api/orders/assistant/draft', () => {
    function setupApp() {
      const fakeRepo = makeFakeOrderRepository();
      const fakeSupplier = makeFakeSupplierClient({
        [SUPPLIER_ID]: {
          id: SUPPLIER_ID,
          name: 'The Deck',
          campusZone: 'Arts',
          isActive: true,
        },
      });

      const orderService = createOrderService({
        repository: fakeRepo.repo,
        supplierClient: fakeSupplier.client,
      });

      const assistantService = createAssistantService(fakeSupplier.client, {
        soclaasBaseUrl: 'http://localhost:9999',
        soclaasApiKey: '',
        soclaasModel: 'default',
      });

      const authenticate = (req: Request, res: Response, next: NextFunction) => {
        const userId = req.headers['x-user-id'] as string;
        if (!userId) {
          return res.status(401).json({ success: false, error: 'Unauthorized: missing credentials' });
        }
        res.locals.auth = { userId, role: 'STUDENT', sessionId: 'test-session' };
        next();
      };

      const app = createApp({
        orderService,
        assistantService,
        authenticate,
        port: 0,
        isReady: async () => true,
      });

      return { app };
    }

    it('rejects unauthenticated requests with 401', async () => {
      const { app } = setupApp();
      const server = await startTestServer(app);
      try {
        const res = await fetch(`${server.url}/api/orders/assistant/draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'Waffles from The Deck' }),
        });
        assert.equal(res.status, 401);
      } finally {
        await server.close();
      }
    });

    it('rejects empty prompt with 400 Bad Request', async () => {
      const { app } = setupApp();
      const server = await startTestServer(app);
      try {
        const res = await fetch(`${server.url}/api/orders/assistant/draft`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': ALICE_ID,
          },
          body: JSON.stringify({ prompt: '   ' }),
        });
        assert.equal(res.status, 400);
        const data = (await res.json()) as { success: boolean; error: string };
        assert.equal(data.success, false);
      } finally {
        await server.close();
      }
    });

    it('successfully extracts draft via authenticated POST endpoint', async () => {
      const { app } = setupApp();
      const server = await startTestServer(app);
      try {
        const res = await fetch(`${server.url}/api/orders/assistant/draft`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': ALICE_ID,
          },
          body: JSON.stringify({ prompt: 'Waffles from The Deck for 6 credits' }),
        });
        assert.equal(res.status, 200);
        const data = (await res.json()) as { success: boolean; data: any };
        assert.equal(data.success, true);
        assert.equal(data.data.supplierId, SUPPLIER_ID);
        assert.equal(data.data.matchedSupplierName, 'The Deck');
        assert.equal(data.data.rewardCredits, 6);
      } finally {
        await server.close();
      }
    });
  });
});
