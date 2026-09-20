import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react';
import { serverFetch } from '@/lib/server-fetch';
import {
  ActiveSessionsCard,
  UserSession,
} from '@/components/security/ActiveSessionsCard';
import {
  SecurityActivityTimeline,
  SecurityAuditLogItem,
} from '@/components/security/SecurityActivityTimeline';
import {
  TrustedDevicesCard,
  TrustedDevice,
} from '@/components/security/TrustedDevicesCard';

interface SessionsResponse {
  success: boolean;
  data: UserSession[];
}

interface AuditLogsResponse {
  logs: SecurityAuditLogItem[];
  total: number;
}

interface DevicesResponse {
  devices: TrustedDevice[];
}

export const dynamic = 'force-dynamic';

/**
 * Security Center page providing centralized observability and incident response.
 * Uses Promise.allSettled for a fail-open microservice retrieval model.
 */
export default async function SecuritySettingsPage() {
  const [sessionsResult, auditLogsResult, devicesResult] =
    await Promise.allSettled([
      serverFetch<SessionsResponse>('/auth/sessions'),
      serverFetch<AuditLogsResponse>('/audit/logs?limit=15'),
      serverFetch<DevicesResponse>('/audit/devices'),
    ]);

  const sessions: UserSession[] =
    sessionsResult.status === 'fulfilled' &&
    sessionsResult.value.success &&
    sessionsResult.value.data?.data
      ? sessionsResult.value.data.data
      : [];

  const auditLogs: SecurityAuditLogItem[] =
    auditLogsResult.status === 'fulfilled' &&
    auditLogsResult.value.success &&
    auditLogsResult.value.data?.logs
      ? auditLogsResult.value.data.logs
      : [];

  const totalLogs: number =
    auditLogsResult.status === 'fulfilled' &&
    auditLogsResult.value.success &&
    typeof auditLogsResult.value.data?.total === 'number'
      ? auditLogsResult.value.data.total
      : auditLogs.length;

  const devices: TrustedDevice[] =
    devicesResult.status === 'fulfilled' &&
    devicesResult.value.success &&
    devicesResult.value.data?.devices
      ? devicesResult.value.data.devices
      : [];

  const hasAuditDegradation =
    auditLogsResult.status === 'rejected' ||
    !auditLogsResult.value.success ||
    devicesResult.status === 'rejected' ||
    !devicesResult.value.success;

  return (
    <div className="relative min-h-screen bg-[#070b14] text-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Command Dashboard
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Security Center
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Protected
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Active session management, hardware trust registry, and immutable audit telemetry.
            </p>
          </div>
        </div>

        {/* Degraded State Alert */}
        {hasAuditDegradation && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Telemetry Service Connecting</p>
              <p className="text-amber-200/80 mt-0.5">
                The audit analytics pipeline is synchronizing or restarting. Active session
                controls remain fully functional.
              </p>
            </div>
          </div>
        )}

        {/* Security Cards Grid */}
        <div className="space-y-8">
          <ActiveSessionsCard sessions={sessions} />
          <TrustedDevicesCard devices={devices} />
          <SecurityActivityTimeline initialLogs={auditLogs} totalLogs={totalLogs} />
        </div>
      </div>
    </div>
  );
}
