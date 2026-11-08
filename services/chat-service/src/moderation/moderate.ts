/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-07
 * Scope: Chat content moderation: asks the SoCLaaS model (through @campus-errand/llm, which is not modified) whether a
 * message is abusive or harmful. Fails open: any problem reaching or reading the model counts as "not flagged".
 * Author review: <to be completed by the author>
 */
// AI-generated (edited by jagdeepsh)
import { callSoclaas, type SoclaasConfig } from '@campus-errand/llm';

const MODERATION_TIMEOUT_MS = 8_000;

export const MODERATION_INSTRUCTION =
  'You are a content moderator for a chat between two university students coordinating a campus errand. '
  + 'Decide whether the user\'s message is abusive, harassing, hateful, threatening, sexually explicit or otherwise harmful. '
  + 'Normal errand talk, mild frustration, slang and messages in any language are NOT flagged. '
  + 'Reply with ONLY the word true if the message should be blocked, or false if it is fine.';

/** Resolves true when the message is flagged. Never rejects; an unreachable or unreadable model means false (fail open). */
export type Moderator = (text: string) => Promise<boolean>;

export function createModerator(config: SoclaasConfig, call: typeof callSoclaas = callSoclaas): Moderator {
  return async (text) => {
    const reply = await call(config, {
      instruction: MODERATION_INSTRUCTION,
      text,
      temperature: 0,
      timeoutMs: MODERATION_TIMEOUT_MS,
    });
    if (!reply) return false;
    const verdict = reply.replace(/```\w*/g, '').trim().toLowerCase().replace(/[.!"'\s]+$/g, '');
    return verdict === 'true';
  };
}
