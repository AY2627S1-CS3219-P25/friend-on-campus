// AI Assistance Disclosure:
// Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-23
// Scope: Implemented a local Ed25519 JWT key-pair generator that emits Base64URL environment values.
// Author review: <to be completed by ngkhengyang>
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';

const printOnly = process.argv.slice(2).includes('--print');
const unsupportedArguments = process.argv.slice(2).filter((argument) => argument !== '--print');

if (unsupportedArguments.length > 0) {
  console.error('Usage: npm run generate:jwt-keys [-- --print]');
  process.exit(1);
}

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const environmentValues = [
  `JWT_PRIVATE_KEY=${privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64url')}`,
  `JWT_PUBLIC_KEY=${publicKey.export({ format: 'der', type: 'spki' }).toString('base64url')}`,
].join('\n');

if (printOnly) {
  console.log(environmentValues);
  process.exit(0);
}

const clipboardCommand = {
  win32: ['clip.exe', []],
  darwin: ['pbcopy', []],
  linux: ['xclip', ['-selection', 'clipboard']],
}[process.platform];

if (!clipboardCommand) {
  console.error(`Clipboard copying is not supported on ${process.platform}.`);
  console.error('Run npm run generate:jwt-keys -- --print and copy the values manually.');
  process.exit(1);
}

try {
  execFileSync(clipboardCommand[0], clipboardCommand[1], {
    input: environmentValues,
    stdio: ['pipe', 'ignore', 'ignore'],
  });
  console.log('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY have been copied to the clipboard.');
  console.log('Paste them into your .env file.');
} catch {
  console.error('Could not copy the generated keys to the clipboard.');
  console.error('Run npm run generate:jwt-keys -- --print and copy the values manually.');
  process.exit(1);
}
