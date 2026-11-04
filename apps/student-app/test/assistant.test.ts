/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Unit tests for student-app parseErrandDraft API helper (F6).
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ParsedErrandDraftDTO } from '@campus-errand/common-dtos';
import type { AuthFetchFn } from '../src/api/auth';
import { parseErrandDraft } from '../src/api/orders';

test('parseErrandDraft sends prompt to /api/orders/assistant/draft and returns draft DTO', async () => {
  let calledUrl = '';
  let calledMethod = '';
  let calledBody = '';

  const mockDraft: ParsedErrandDraftDTO = {
    supplierId: '10000000-0000-4000-8000-000000000001',
    supplierName: 'Starbucks UTown',
    matchedSupplierName: 'Starbucks UTown',
    itemDescription: '2x Iced Americano',
    dropoffLocation: 'COM3 L2',
    rewardCredits: 6,
    durationMinutes: 30,
    specialNotes: 'Requested delivery deadline: by 2pm',
    warnings: ['Clock deadline "by 2pm" preserved in Special Notes.'],
  };

  const mockAuthFetch: AuthFetchFn = async (input, init) => {
    calledUrl = String(input);
    calledMethod = init?.method || 'GET';
    calledBody = String(init?.body || '');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockDraft,
      }),
    } as unknown as Response;
  };

  const draft = await parseErrandDraft(mockAuthFetch, '2 iced americano from starbucks by 2pm');

  assert.equal(calledUrl, '/api/orders/assistant/draft');
  assert.equal(calledMethod, 'POST');
  assert.deepEqual(JSON.parse(calledBody), { prompt: '2 iced americano from starbucks by 2pm' });
  assert.equal(draft.supplierId, '10000000-0000-4000-8000-000000000001');
  assert.equal(draft.itemDescription, '2x Iced Americano');
  assert.equal(draft.rewardCredits, 6);
  assert.equal(draft.durationMinutes, 30);
  assert.equal(draft.warnings?.length, 1);
});

test('parseErrandDraft throws descriptive error when backend response is not ok', async () => {
  const mockAuthFetch: AuthFetchFn = async () => {
    return {
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: 'Prompt is required and must be a non-empty string.',
      }),
    } as unknown as Response;
  };

  await assert.rejects(
    async () => parseErrandDraft(mockAuthFetch, ''),
    /Prompt is required/
  );
});
