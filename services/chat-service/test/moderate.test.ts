/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-07
 * Scope: Unit tests for the chat moderator: true/false replies, fenced and noisy replies, and fail-open on a missing reply.
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createModerator, MODERATION_INSTRUCTION } from '../src/moderation/moderate';

const config = { baseUrl: 'http://x', apiKey: 'k', model: 'default' };
const replying = (reply: string | null) => createModerator(config, async () => reply);

describe('createModerator', () => {
  it('flags only when the model answers true', async () => {
    for (const reply of ['true', 'True', ' true\n', 'true.', '```\ntrue\n```']) assert.equal(await replying(reply)('x'), true, reply);
    for (const reply of ['false', 'False', 'maybe', '', 'true false', 'I think true']) assert.equal(await replying(reply)('x'), false, reply);
  });

  it('fails open when the model cannot be reached', async () => {
    assert.equal(await replying(null)('x'), false);
  });

  it('sends the instruction and the message with temperature 0', async () => {
    let seen: { instruction: string; text: string; temperature?: number } | undefined;
    const moderate = createModerator(config, async (_config, request) => { seen = request; return 'false'; });
    await moderate('hello');
    assert.equal(seen?.instruction, MODERATION_INSTRUCTION);
    assert.equal(seen?.text, 'hello');
    assert.equal(seen?.temperature, 0);
  });
});
