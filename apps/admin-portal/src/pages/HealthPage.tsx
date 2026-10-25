/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Wired HealthPage to live /health and /ready probes across all 5 microservices, displaying liveness, readiness, latency, and storage status.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted HealthPage component into src/pages/HealthPage.tsx.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

import { RefreshCw } from 'lucide-react';
import { ServiceHealthStatus } from '../api/health';

interface HealthPageProps {
  servicesHealth: ServiceHealthStatus[];
  isLoadingHealth: boolean;
  onRefresh: () => void;
}

export function HealthPage({
  servicesHealth,
  isLoadingHealth,
  onRefresh,
}: HealthPageProps) {
  const allUnknown = servicesHealth.every((s) => s.overall === 'UNKNOWN');
  const readyCount = servicesHealth.filter((s) => s.overall === 'ONLINE').length;
  const lastChecked = servicesHealth[0]?.checkedAt
    ? new Date(servicesHealth[0].checkedAt).toLocaleTimeString()
    : null;

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm text-slate-900">
            Live Liveness &amp; Readiness Probes (N4)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Probing <code className="font-mono text-slate-700">/health</code> (process liveness) and{' '}
            <code className="font-mono text-slate-700">/ready</code> (database &amp; broker readiness) across all 5 services
            {lastChecked ? ` • Last checked at ${lastChecked}` : ''}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              allUnknown
                ? 'bg-slate-100 text-slate-600 border-slate-200'
                : readyCount === servicesHealth.length && servicesHealth.length > 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : readyCount > 0
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {allUnknown ? 'Pending...' : `${readyCount} / ${servicesHealth.length} Ready`}
          </span>
          <button
            onClick={onRefresh}
            disabled={isLoadingHealth}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-60 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHealth ? 'animate-spin' : ''}`} />
            <span>{isLoadingHealth ? 'Probing...' : 'Probe Now'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {servicesHealth.map((svc) => {
          const badgeClass =
            svc.overall === 'UNKNOWN'
              ? 'bg-slate-100 text-slate-600 border-slate-200'
              : svc.overall === 'ONLINE'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : svc.overall === 'DEGRADED'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-rose-50 text-rose-700 border-rose-200';
          const dotClass =
            svc.overall === 'UNKNOWN'
              ? 'bg-slate-400 animate-pulse'
              : svc.overall === 'ONLINE'
              ? 'bg-emerald-500 animate-pulse'
              : svc.overall === 'DEGRADED'
              ? 'bg-amber-500 animate-pulse'
              : 'bg-rose-500';

          return (
            <div
              key={svc.key}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{svc.name}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Port: {svc.port}
                    {svc.latencyMs !== null
                      ? ` | Latency: ${svc.latencyMs} ms`
                      : svc.checkedAt === ''
                      ? ' | Pending'
                      : ' | Unreachable'}
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-1">Storage: {svc.db}</p>
                  {svc.details && (
                    <p className="text-xs text-slate-500 font-mono mt-1">{svc.details}</p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${badgeClass}`}
                >
                  <span className={`w-2 h-2 rounded-full ${dotClass}`} />
                  <span>{svc.overall === 'UNKNOWN' ? 'PENDING' : svc.overall}</span>
                </span>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`px-2 py-0.5 rounded font-mono font-semibold ${
                    svc.liveness === 'UNKNOWN'
                      ? 'bg-slate-100 text-slate-600'
                      : svc.liveness === 'UP'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  /health: {svc.liveness === 'UNKNOWN' ? 'PENDING' : svc.liveness}
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-semibold ${
                    svc.readiness === 'UNKNOWN'
                      ? 'bg-slate-100 text-slate-600'
                      : svc.readiness === 'READY'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  /ready: {svc.readiness === 'UNKNOWN' ? 'PENDING' : svc.readiness}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
