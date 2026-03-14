import { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import type { Snapshot } from '../types';

export default function TrafficStatus({ snapshot }: { snapshot: Snapshot | null }) {
  const { t } = useLanguage();

  function formatBytes(bytes: number | string | null | undefined): string {
    const numBytes = Number(bytes);
    if (isNaN(numBytes) || numBytes == null) return '0 B';
    if (numBytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let value = numBytes;
    while (value >= 1000 && i < units.length - 1) {
      value /= 1000;
      i++;
    }
    return `${value.toFixed(2)} ${units[i]}`;
  }

  function formatSpeed(bps: number | string | null | undefined): string {
    const numBps = Number(bps);
    if (isNaN(numBps) || numBps == null) return '0 bps';
    if (numBps === 0) return '0 bps';
    const units = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    let i = 0;
    let value = numBps;
    while (value >= 1000 && i < units.length - 1) {
      value /= 1000;
      i++;
    }
    return `${value.toFixed(2)} ${units[i]}`;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
        VXLAN Promet
      </h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Skupaj Prejeto</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatBytes(snapshot?.vxlan_rx_bytes)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Skupaj Poslano</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatBytes(snapshot?.vxlan_tx_bytes)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div>
            <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Trenutna Hitrost RX</p>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
              {formatSpeed(snapshot?.current_speed_rx)}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Trenutna Hitrost TX</p>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
              {formatSpeed(snapshot?.current_speed_tx)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
