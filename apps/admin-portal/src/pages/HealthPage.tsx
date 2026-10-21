/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted HealthPage component into src/pages/HealthPage.tsx.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

export function HealthPage() {
  return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'User Service (M2)', port: 8001, db: 'user_db (PostgreSQL)' },
                { name: 'Supplier Service (M3)', port: 8002, db: 'supplier_db (PostgreSQL)' },
                { name: 'Order Service (M4)', port: 8003, db: 'order_db (PostgreSQL)' },
                { name: 'Credit Service (M5)', port: 8004, db: 'credit_db (PostgreSQL)' },
                { name: 'Notification Service (M6)', port: 8005, db: 'RabbitMQ Message Broker' },
              ].map((svc) => (
                <div
                  key={svc.name}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{svc.name}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Port: {svc.port} | Runtime: Node (tsx)</p>
                    <p className="text-sm text-slate-400 font-mono mt-1">Storage: {svc.db}</p>
                  </div>
                  <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>ONLINE</span>
                  </span>
                </div>
              ))}
            </div>
  );
}
