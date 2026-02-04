import { Power, AlertCircle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import type { Snapshot } from '../types';

interface SummaryCardsProps {
  snapshot: Snapshot | null;
  onReboot?: () => void;
}

export default function SummaryCards({ snapshot, onReboot }: SummaryCardsProps) {
  const { t } = useLanguage();

  if (!snapshot) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 text-center text-slate-600 dark:text-slate-400">
        {t('loading')}
      </div>
    );
  }

  function formatUptime(seconds?: number): string {
    if (!seconds) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }

  function formatSpeed(bytesPerSec?: number | string | null): string {
    const numBytes = Number(bytesPerSec);
    if (isNaN(numBytes) || numBytes == null) return '0 bps';
    const bitsPerSec = numBytes * 8;
    const units = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    let i = 0;
    let value = bitsPerSec;
    while (value >= 1000 && i < units.length - 1) {
      value /= 1000;
      i++;
    }
    return `${value.toFixed(1)} ${units[i]}`;
  }

  function formatBytes(bytes?: number | string | null): string {
    const numBytes = Number(bytes);
    if (isNaN(numBytes) || numBytes == null) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let value = numBytes;
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i++;
    }
    return `${value.toFixed(2)} ${units[i]}`;
  }

  return (
    <div className="space-y-4">
      {snapshot.stale && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <span className="text-yellow-800 dark:text-yellow-300">{t('dataStale')}</span>
        </div>
      )}

      {!snapshot.online && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-red-800 dark:text-red-300">{t('mikrotikOffline')}: {snapshot.error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">📊 Poraba & Hitrost</h3>

          <div className="space-y-6">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 uppercase">SKUPNA PORABA (VXLAN)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Prejeto</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {formatBytes(snapshot.vxlan_rx_bytes)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Poslano</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {formatBytes(snapshot.vxlan_tx_bytes)}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 uppercase">TRENUTNA HITROST (AKTIVNI WAN)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Download</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {formatSpeed(snapshot.current_speed_rx)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Upload</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {formatSpeed(snapshot.current_speed_tx)}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 uppercase">KVALITETA POVEZAVE (DO GATEWAYA)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Latenca</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">25 ms</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Jitter</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">3 ms</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">💻 Sistem & Viri</h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Javni IP: <span className="font-normal">{snapshot.public_ip || 'N/A'}</span>
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Delovanje: <span className="font-normal">{formatUptime(snapshot.system_uptime)}</span>
              </p>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-900 dark:text-slate-100">CPU</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {snapshot.system_cpu_percent != null ? Number(snapshot.system_cpu_percent).toFixed(0) : '0'}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full transition-all"
                    style={{ width: `${snapshot.system_cpu_percent || 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-900 dark:text-slate-100">Pomnilnik</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {snapshot.system_ram_percent != null ? Number(snapshot.system_ram_percent).toFixed(0) : '0'}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all"
                    style={{ width: `${snapshot.system_ram_percent || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {onReboot && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <button
                  onClick={onReboot}
                  className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Power className="w-5 h-5" />
                  Ponovno zaženi
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
