// AI Assistance Disclosure:
// Tool: Codex (model: GPT-6), date: 2026-11-08
// Scope: Generate fresh database, RabbitMQ and demo sign-in credentials while preserving broker permissions.
// Author review: <to be completed by the author>

// AI-generated (edited by ngkhengyang)
const { createHash, randomBytes } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const definitions = require('../../../docker/rabbitmq/definitions.json');

const output = process.argv[2];
if (!output) throw new Error('Supply a new private JSON file path outside the repository.');

const password = () => randomBytes(32).toString('hex');
const runtime = { broker_cookie: password() };
for (const user of ['alice', 'bob', 'admin']) {
  runtime['seed_password_' + user] = randomBytes(12).toString('hex');
}
for (const name of ['user', 'supplier', 'order', 'credit', 'notification', 'chat', 'cdc']) {
  runtime['db_' + name] = password();
}

const users = definitions.users.filter(({ name }) => name !== 'credit_test').map((user) => {
  const name = user.name === 'campus_admin' ? 'admin' : user.name.replace(/_service$/, '');
  const value = password();
  runtime['rabbit_' + name] = value;
  const salt = randomBytes(4);
  const hash = createHash('sha256').update(salt).update(value, 'utf8').digest();
  return { ...user, password_hash: Buffer.concat([salt, hash]).toString('base64') };
});

runtime.broker_definitions = JSON.stringify({
  users,
  vhosts: definitions.vhosts,
  exchanges: definitions.exchanges,
  permissions: definitions.permissions.filter(({ user }) => user !== 'credit_test'),
  topic_permissions: definitions.topic_permissions,
  // Consumers declare quorum queues after all three nodes are running.
});
writeFileSync(resolve(output), JSON.stringify(runtime, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
