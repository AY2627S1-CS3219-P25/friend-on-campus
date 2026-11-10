// AI Assistance Disclosure:
// Tool: Google Antigravity Agent; Codex (model: GPT-5.6 Terra), date: 2026-09-23 to 2026-10-21
// Scope: Implemented a local Ed25519 JWT key-pair generator that emits Base64URL environment values; updated across 2 AI-assisted revisions through D4 wrap-up (removed OS-specific clipboard copying logic and simplified script to print generated Ed25519 JWT keys directly to stdout).
// Author review: I validated correctness, edited for style, and verified with automated tests.
import { generateKeyPairSync } from 'node:crypto';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
console.log(`JWT_PRIVATE_KEY=${privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64url')}`);
console.log(`JWT_PUBLIC_KEY=${publicKey.export({ format: 'der', type: 'spki' }).toString('base64url')}`);
