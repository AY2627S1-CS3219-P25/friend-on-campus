/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-05
 * Scope: Display-only translation of chat messages through @campus-errand/llm. Messages go to the model in batches as
 * a JSON array and come back in the same order; when the target is English, text that is plainly English is not sent.
 * Author review: <to be completed by the author>
 */
// AI-generated (edited by jagdeepsh)
import { callSoclaas, parseJsonReply, type SoclaasConfig } from '@campus-errand/llm';

const BATCH_SIZE = 30;
const TRANSLATE_TIMEOUT_MS = 20_000;

// Common English words. Latin-script languages such as Malay or Spanish share the ASCII letters, so ASCII alone does not prove English.
const ENGLISH_WORDS = new Set([
  'the', 'a', 'an', 'i', 'you', 'we', 'he', 'she', 'it', 'they', 'is', 'are', 'am', 'was', 'were', 'be', 'to', 'of',
  'and', 'or', 'in', 'on', 'at', 'for', 'with', 'my', 'your', 'me', 'this', 'that', 'here', 'there', 'can', 'will',
  'please', 'thanks', 'thank', 'ok', 'okay', 'yes', 'no', 'where', 'when', 'what', 'how', 'now', 'omw', 'hi', 'hello',
]);

/** False when the text is plainly English (or has no letters at all), so no API call is needed for an English target. */
export function needsTranslation(text: string): boolean {
  if (!/\p{L}/u.test(text)) return false;
  if (/[^\t\n\r -~]/.test(text.replace(/\p{Extended_Pictographic}|‍|️|[‘’“”…]/gu, ''))) return true;
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  return !words.some((word) => ENGLISH_WORDS.has(word));
}

/** Translations in the same order as `texts`, or null when the model could not be reached or answered badly. */
export type Translator = (texts: string[], language: string) => Promise<string[] | null>;

export function createTranslator(config: SoclaasConfig, call: typeof callSoclaas = callSoclaas): Translator {
  async function translateBatch(texts: string[], language: string): Promise<string[] | null> {
    const instruction =
      `Translate every string in the JSON array the user sends into ${language}. Keep each string's meaning, tone and any emoji. `
      + `Reply with ONLY a JSON array of strings: same length, same order, no markdown and no notes. `
      + `A string already in ${language} must be returned unchanged.`;
    const reply = await call(config, { instruction, text: JSON.stringify(texts), timeoutMs: TRANSLATE_TIMEOUT_MS });
    if (!reply) return null;
    try {
      const parsed = parseJsonReply<unknown>(reply);
      if (Array.isArray(parsed) && parsed.length === texts.length && parsed.every((item) => typeof item === 'string')) return parsed as string[];
    } catch { /* Not JSON: treated as a failed translation below. */ }
    console.warn('[chat-service] Translation reply was not a matching JSON array');
    return null;
  }

  return async (texts, language) => {
    const english = language.trim().toLowerCase() === 'english';
    const result = [...texts];
    const todo = texts.map((text, index) => index).filter((index) => !english || needsTranslation(texts[index]));
    for (let start = 0; start < todo.length; start += BATCH_SIZE) {
      const indexes = todo.slice(start, start + BATCH_SIZE);
      const translated = await translateBatch(indexes.map((index) => texts[index]), language);
      if (!translated) return null;
      indexes.forEach((index, i) => { result[index] = translated[i]; });
    }
    return result;
  };
}
