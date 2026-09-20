'use client';

import React, { useState, useTransition } from 'react';
import {
  Laptop,
  Smartphone,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Calendar,
} from 'lucide-react';
import { untrustDeviceAction } from '@/actions/security';

export interface TrustedDevice {
  id: string;
  userId: string;
  deviceFingerprint: string;
  deviceType?: string | null;
  deviceName?: string | null;
  browserName?: string | null;
  osName?: string | null;
  ipAddress?: string | null;
  city?: string | null;
  country?: string | null;
  isTrusted: boolean;
  createdAt: string;
  lastSeenAt: string;
}

interface TrustedDevicesCardProps {
  devices: TrustedDevice[];
}

/**
 * Manages recognized physical devices recorded in the cryptographic audit schema.
 * Allows users to untrust devices, which forces re-verification on subsequent sign-ins.
 */
export const TrustedDevicesCard: React.FC<TrustedDevicesCardProps> = ({
  devices,
}) => {
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleUntrust = (deviceId: string) => {
    setRemovingId(deviceId);
    setFeedback(null);

    startTransition(async () => {
      const res = await untrustDeviceAction(deviceId);
      setRemovingId(null);
      if (!res.success) {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to remove device',
        });
      } else {
        setFeedback({
          type: 'success',
          message: res.message || 'Device removed from recognized list',
        });
      }
    });
  };

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl p-6 shadow-2xl">
      <div className="flex items-center justify-between pb-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white tracking-wide">
              Remembered Devices
            </h2>
            <p className="text-xs text-slate-400">
              Hardware fingerprints recognized by the deep-lane anomaly detector
            </p>
          </div>
        </div>
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

      <div className="divide-y divide-white/[0.04] mt-2">
        {devices.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No remembered devices registered. New sign-ins will trigger security notifications.
          </p>
        ) : (
          devices.map((device) => {
            const isMobile =
              device.deviceType === 'mobile' || device.deviceType === 'tablet';
            const Icon = isMobile ? Smartphone : Laptop;
            const location =
              device.city && device.country
                ? `${device.city}, ${device.country}`
                : device.city || device.country || 'Location Unknown';

            return (
              <div
                key={device.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-white/[0.01] rounded-xl px-2"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-300 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white">
                      {device.deviceName ||
                        `${device.browserName || 'Browser'} on ${device.osName || 'Unknown OS'}`}
                    </h3>

                    <div className="flex items-center gap-3.5 mt-1.5 text-xs text-slate-400 flex-wrap">
                      <span>{location}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Last seen {new Date(device.lastSeenAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="self-end sm:self-center">
                  <button
                    onClick={() => handleUntrust(device.id)}
                    disabled={isPending && removingId === device.id}
                    className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Untrust
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
