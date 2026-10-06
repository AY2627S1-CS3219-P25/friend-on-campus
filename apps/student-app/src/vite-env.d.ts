/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-06
 * Scope: Vite client types plus the app's own VITE_* variables, so import.meta.env is typed.
 * Author review: <to be completed by Reallyeasy1>
 */
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "false" hides the "WS Hub: …" connection status line in the header. Anything else shows it. */
  readonly VITE_SHOW_WS_STATUS?: string;
}
