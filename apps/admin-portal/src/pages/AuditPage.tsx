/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted AuditPage component into src/pages/AuditPage.tsx.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

export function AuditPage() {
  return (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Audit Trail & Dispute Resolution</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Immutable ledger of supplier modifications, administrative status toggles, and errand activity.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg text-sm font-mono text-slate-600 space-y-2">
                <div className="text-emerald-700 font-bold">
                  [AUDIT LOG READY] All supplier status updates are persisted with timestamped audit records.
                </div>
                <div>• Storage: PostgreSQL table `suppliers` in database `supplier_db`</div>
                <div>• RBAC Enforcement: Authenticated JWT with role checking (ADMIN only)</div>
                <div>• Soft Delete Guarantee: Record retains historical references while isActive = false</div>
              </div>
            </div>
  );
}
