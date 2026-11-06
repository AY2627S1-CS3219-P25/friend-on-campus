/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-05
 * Scope: Moved the SoCLaaS chat-completions call out of order-service/src/assistant/assistant.service.ts (written by
 * yanhwee) into a shared package and made it generic: the caller supplies the instruction and the text, and gets the
 * model's reply back. Added parseJsonReply for callers that ask for JSON.
 * Author review: <to be completed by the author>
 */
// AI-generated (edited by jagdeepsh)

/** Connection settings for the SoCLaaS gateway (SOCLAAS_BASE_URL, SOCLAAS_API_KEY, SOCLAAS_MODEL). */
export interface SoclaasConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface LlmRequest {
  /** What the model should do with the text, e.g. "Translate the user's message into English." */
  instruction: string;
  /** The user text the instruction applies to. */
  text: string;
  temperature?: number;
  timeoutMs?: number;
}

/**
 * Sends one instruction plus text to SoCLaaS and returns the model's reply as plain text.
 * Returns null when no API key is set, the gateway errors or times out, or the reply is empty,
 * so callers decide their own fallback.
 */
export async function callSoclaas(config: SoclaasConfig, request: LlmRequest): Promise<string | null> {
  if (!config.apiKey || config.apiKey.trim() === '') return null;

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'default',
        messages: [
          { role: 'system', content: request.instruction },
          { role: 'user', content: request.text },
        ],
        temperature: request.temperature ?? 0.1,
      }),
      signal: AbortSignal.timeout(request.timeoutMs ?? 10_000),
    });

    if (!response.ok) {
      console.warn(`[llm] SoCLaaS returned HTTP ${response.status}: ${await response.text()}`);
      return null;
    }

    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn('[llm] Failed to call SoCLaaS API:', err);
    return null;
  }
}

/** Strips optional ```json fences from a reply and parses it. Throws if the reply is not valid JSON. */
export function parseJsonReply<T>(reply: string): T {
  return JSON.parse(reply.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()) as T;
}
