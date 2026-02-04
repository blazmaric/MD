import { Signal } from 'lucide-react';
import type { Snapshot } from '../types';

interface LteStatusProps {
  snapshot: Snapshot | null;
}

export default function LteStatus({ snapshot }: LteStatusProps) {
  if (!snapshot) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Signal className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">📶 LTE Status</h3>
        </div>
        <p className="text-slate-600 dark:text-slate-400">Nalaganje...</p>
      </div>
    );
  }

  const isLteActive = snapshot.gateway_type === 'LTE';

  function getSignalQuality(rsrp?: number | null): { label: string; color: string } {
    if (!rsrp) return { label: 'N/A', color: 'text-slate-500' };
    if (rsrp >= -80) return { label: 'Odlično', color: 'text-green-500' };
    if (rsrp >= -90) return { label: 'Dobro', color: 'text-green-400' };
    if (rsrp >= -100) return { label: 'Srednje', color: 'text-yellow-500' };
    if (rsrp >= -110) return { label: 'Slabo', color: 'text-orange-500' };
    return { label: 'Zelo slabo', color: 'text-red-500' };
  }

  const signalQuality = getSignalQuality(snapshot.lte_rsrp);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Signal className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">📶 LTE Status</h3>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            isLteActive
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isLteActive ? 'bg-green-500' : 'bg-slate-400'}`}></div>
            {isLteActive ? 'AKTIVNO' : 'NEAKTIVNO'}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Operater</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {snapshot.lte_operator || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Kakovost signala</p>
              <p className={`text-sm font-semibold ${signalQuality.color}`}>
                {signalQuality.label}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">RSRP</span>
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                {snapshot.lte_rsrp ? `${snapshot.lte_rsrp} dBm` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">RSRQ</span>
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                {snapshot.lte_rsrq ? `${snapshot.lte_rsrq} dB` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">RSSI</span>
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                {snapshot.lte_rssi ? `${snapshot.lte_rssi} dBm` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">SINR</span>
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                {snapshot.lte_sinr ? `${snapshot.lte_sinr} dB` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
