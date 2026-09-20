'use client';

import React, { useState, useTransition } from 'react';
import {
  Shield,
  Laptop,
  Smartphone,
  Globe,
  Trash2,
  LogOut,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  revokeSessionAction,
  revokeAllOtherSessionsAction,
} from '@/actions/security';

export interface UserSession {
  id: string;
  deviceType?: string | null;
  deviceName?: string | null;
  browserName?: string | null;
  browserVersion?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  lastActiveAt?: string | null;
  isCurrent?: boolean;
}

interface ActiveSessionsCardProps {
  sessions: UserSession[];
}

/**
 * Renders the active user sessions panel with real-time revocation controls.
 * Features optimistic transitions, current-device suicide protection, and bulk revocation.
 */
export const ActiveSessionsCard: React.FC<ActiveSessionsCardProps> = ({
  sessions,
}) => {
  const [isPending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showConfirmAll, setShowConfirmAll] = useState(false);

  const handleRevoke = (sessionId: string, isCurrent?: boolean) => {
    setRevokingId(sessionId);
    setFeedback(null);

    startTransition(async () => {
      const res = await revokeSessionAction(sessionId, isCurrent);
      setRevokingId(null);
      if (!res.success) {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to revoke session',
        });
      } else {
        setFeedback({
          type: 'success',
          message: res.message || 'Session revoked successfully',
        });
      }
    });
  };

  const handleRevokeAllOther = () => {
    setShowConfirmAll(false);
    setFeedback(null);

    startTransition(async () => {
      const res = await revokeAllOtherSessionsAction();
      if (!res.success) {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to revoke other sessions',
        });
      } else {
        setFeedback({
          type: 'success',
          message: res.message || 'Other sessions revoked',
        });
      }
    });
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl p-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white tracking-wide">
              Active Sessions
            </h2>
            <p className="text-xs text-slate-400">
              Devices currently authenticated to your Aegis account
            </p>
          </div>
        </div>

        {otherSessionsCount > 0 && (
          <button
            onClick={() => setShowConfirmAll(true)}
            disabled={isPending}
            className="self-start sm:self-auto text-xs px-3.5 py-2 rounded-xl font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Revoke All Other Devices ({otherSessionsCount})
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {showConfirmAll && (
        <div className="mt-4 p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-200 text-xs">
          <p className="font-semibold mb-2">
            Are you sure you want to log out of all other devices?
          </p>
          <p className="text-rose-300/80 mb-3">
            This will immediately terminate all active refresh tokens and edge
            sessions across all other browsers and devices.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleRevokeAllOther}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium"
            >
              Confirm Revocation
            </button>
            <button
              onClick={() => setShowConfirmAll(false)}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-white/[0.04] mt-2">
        {sessions.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No active sessions found.
          </p>
        ) : (
          sessions.map((session) => {
            const isMobile =
              session.deviceType === 'mobile' ||
              session.deviceType === 'tablet';
            const Icon = isMobile ? Smartphone : Laptop;

            return (
              <div
                key={session.id}
                className="py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-white/[0.01] rounded-xl px-2"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-300 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">
                        {session.deviceName ||
                          `${session.browserName || 'Browser'} on ${session.osName || 'Unknown OS'}`}
                      </span>
                      {session.isCurrent && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Current Device
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-slate-500" />
                        {session.ipAddress || '127.0.0.1'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {session.lastActiveAt
                          ? `Active ${new Date(session.lastActiveAt).toLocaleDateString()} ${new Date(session.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : `Created ${new Date(session.createdAt).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="self-end sm:self-center">
                  <button
                    onClick={() => handleRevoke(session.id, session.isCurrent)}
                    disabled={isPending && revokingId === session.id}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                      session.isCurrent
                        ? 'border-white/10 hover:bg-white/10 text-slate-300'
                        : 'border-rose-500/20 hover:bg-rose-500/20 text-rose-300'
                    } disabled:opacity-50`}
                  >
                    {session.isCurrent ? (
                      <>
                        <LogOut className="w-3.5 h-3.5" />
                        Log Out
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        Revoke
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
