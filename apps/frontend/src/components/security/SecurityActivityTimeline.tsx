'use client';

import React, { useState, useTransition } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Globe,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { fetchMoreAuditLogsAction } from '@/actions/security';

export interface SecurityAuditLogItem {
  id: string;
  eventId: string;
  action: string;
  status: string;
  ipAddress: string;
  city?: string | null;
  country?: string | null;
  browserName?: string | null;
  osName?: string | null;
  deviceType?: string | null;
  deviceName?: string | null;
  riskScore?: number | null;
  createdAt: string;
}

interface SecurityActivityTimelineProps {
  initialLogs: SecurityAuditLogItem[];
  totalLogs: number;
}

/**
 * Visualizes the immutable security audit trail with risk-weighted status badges,
 * geolocation insights, and interactive client-side pagination.
 */
export const SecurityActivityTimeline: React.FC<SecurityActivityTimelineProps> = ({
  initialLogs,
  totalLogs,
}) => {
  const [logs, setLogs] = useState<SecurityAuditLogItem[]>(initialLogs);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasMore = logs.length < totalLogs;

  const handleLoadMore = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetchMoreAuditLogsAction(logs.length, 15);
      if (res.success && res.data?.logs) {
        setLogs((prev) => [...prev, ...res.data!.logs]);
      } else {
        setError(res.error || 'Failed to load additional logs');
      }
    });
  };

  const getEventBadge = (action: string, status: string) => {
    if (status === 'CRITICAL' || action.includes('impossible_travel')) {
      return {
        label: 'CRITICAL',
        color:
          'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20',
        icon: AlertOctagon,
      };
    }
    if (status === 'WARNING' || action.includes('new_device')) {
      return {
        label: 'WARNING',
        color:
          'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
        icon: AlertTriangle,
      };
    }
    return {
      label: 'INFO',
      color:
        'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20',
      icon: CheckCircle2,
    };
  };

  const formatActionTitle = (action: string) => {
    switch (action) {
      case 'auth.login.success':
        return 'Successful Sign-In';
      case 'auth.anomaly.new_device':
        return 'Sign-In from New Device';
      case 'auth.anomaly.impossible_travel':
        return 'Impossible Travel Detected (Blocked)';
      case 'auth.session.revoke':
        return 'Session Revoked';
      case 'auth.password.change':
        return 'Password Changed';
      default:
        return action.replace(/\./g, ' ').toUpperCase();
    }
  };

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl p-6 shadow-2xl">
      <div className="flex items-center justify-between pb-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white tracking-wide">
              Security Activity Trail
            </h2>
            <p className="text-xs text-slate-400">
              Audit logs stamped with cryptographic anomaly evaluation ({logs.length} of {totalLogs})
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No audit records recorded yet.
          </p>
        ) : (
          logs.map((log) => {
            const badge = getEventBadge(log.action, log.status);
            const BadgeIcon = badge.icon;
            const locationStr =
              log.city && log.country
                ? `${log.city}, ${log.country}`
                : log.city || log.country || 'Location Unknown';

            return (
              <div
                key={log.id}
                className="p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border ${badge.color}`}
                    >
                      <BadgeIcon className="w-3 h-3 shrink-0" />
                      {badge.label}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {formatActionTitle(log.action)}
                    </h3>
                    <div className="flex items-center gap-3.5 mt-1 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {locationStr}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-slate-400">
                        <Globe className="w-3.5 h-3.5 text-slate-500" />
                        {log.ipAddress}
                      </span>
                      {log.browserName && (
                        <span className="text-slate-500">
                          • {log.browserName} on {log.osName || 'Unknown OS'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right sm:self-center shrink-0">
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <p className="mt-4 text-center text-xs text-rose-400">{error}</p>
      )}

      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] transition-all disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading events...
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Load More Activity ({totalLogs - logs.length} remaining)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
