/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-05
 * Scope: Unit tests for the English check and the batch translator (skip for English targets, order, failure).
 * Author review: <to be completed by the author>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-06
 * Scope: PR #228 review tests: Latin-script non-English sentences with shared short words ('no', 'a', 'on', 'in', 'ok')
 * still require translation, and an empty API key returns null even when all messages are plain English.
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
// AI-generated (edited by yanhwee)
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createTranslator, needsTranslation } from '../src/translation/translate';

const config = { baseUrl: 'http://x', apiKey: 'k', model: 'default' };

describe('needsTranslation', () => {
  it('skips plain English and text with no letters', () => {
    for (const text of ['I am at the lobby', 'ok', 'omw!', '123 :)', '👍', 'Where are you?']) assert.equal(needsTranslation(text), false, text);
  });
  it('asks for anything non-ASCII or not recognisably English, including Latin-script sentences with shared particles', () => {
    for (const text of [
      '我在大堂',
      'Saya sudah sampai',
      'Saya tunggu di lobi ok',
      'No puedo ir a la entrada',
      'On arrive dans 5 minutes',
      'Ich bin in der Mensa',
      'estoy aquí',
      'café at utown',
    ]) {
      assert.equal(needsTranslation(text), true, text);
    }
  });
});

describe('createTranslator', () => {
  it('sends one batch and keeps the order', async () => {
    const calls: string[] = [];
    const translate = createTranslator(config, async (_c, request) => { calls.push(request.text); return JSON.stringify(['I am at the lobby', 'Thanks']); });
    assert.deepEqual(await translate(['我在大堂', '谢谢'], 'English'), ['I am at the lobby', 'Thanks']);
    assert.equal(calls.length, 1);
  });
  it('does not send plainly English text to an English target', async () => {
    const sent: string[][] = [];
    const translate = createTranslator(config, async (_c, request) => { const texts = JSON.parse(request.text) as string[]; sent.push(texts); return JSON.stringify(texts.map(() => 'Thanks')); });
    assert.deepEqual(await translate(['see you at the lobby', '谢谢'], 'English'), ['see you at the lobby', 'Thanks']);
    assert.deepEqual(sent, [['谢谢']]);
  });
  it('sends English text when the target is another language', async () => {
    const translate = createTranslator(config, async (_c, request) => { assert.match(request.instruction, /Chinese \(Simplified\)/); return JSON.stringify(['我到了']); });
    assert.deepEqual(await translate(['I am here'], 'Chinese (Simplified)'), ['我到了']);
  });
  it('returns null when the API key is missing or the model fails or answers with the wrong shape', async () => {
    assert.equal(await createTranslator({ ...config, apiKey: '' })(['I am at the lobby'], 'English'), null);
    assert.equal(await createTranslator(config, async () => null)(['我在大堂'], 'English'), null);
    assert.equal(await createTranslator(config, async () => '["only one"]')(['a', 'b', '我'], 'English'), null);
    assert.equal(await createTranslator(config, async () => 'not json')(['我'], 'English'), null);
  });
});
