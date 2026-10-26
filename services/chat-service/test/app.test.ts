/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Smoke test for the scaffolded Chat Service app: /health names the service and /ready follows the readiness
 * probe. Exists so the workspace has a classified test:unit suite for the CI matrix from the first commit.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../src/app';

describe('Chat Service app', () => {
  let server: Server;
  let url: string;
  let ready = false;

  before(async () => {
    const app = createApp({ port: 0, isReady: async () => ready, status: () => ({ rabbitmq: 'DOWN' }) });
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('answers /health with the service name and the status fields', async () => {
    const res = await fetch(`${url}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.service, 'chat-service');
    assert.equal(body.status, 'UP');
    assert.equal(body.rabbitmq, 'DOWN');
  });

  it('answers /ready with 503 until the probe passes, then 200', async () => {
    assert.equal((await fetch(`${url}/ready`)).status, 503);
    ready = true;
    const res = await fetch(`${url}/ready`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { service: 'chat-service', status: 'READY' });
  });

  it('rejects a malformed JSON body with 400', async () => {
    const res = await fetch(`${url}/health`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
    assert.equal(res.status, 400);
  });
});
