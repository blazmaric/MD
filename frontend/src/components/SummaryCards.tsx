import { Power, AlertCircle, TrendingUp, Zap, Server } from 'lucide-react';
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

  function formatUptime(seconds?: number | string | null): string {
    const sec = typeof seconds === 'number' ? seconds : (typeof seconds === 'string' && seconds !== '' ? parseFloat(seconds) : null);
    if (!sec || isNaN(sec)) return 'N/A';
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
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
    while (value >= 1000 && i < units.length - 1) {
      value /= 1000;
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-800 rounded-xl shadow-lg border border-blue-100 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-600 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('usageAndSpeed')}</h3>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 uppercase font-medium">{t('totalUsageVxlan')}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('received')}</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatBytes(snapshot.vxlan_rx_bytes)}
                  </p>
                </div>
                <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('transmitted')}</p>
                  <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                    {formatBytes(snapshot.vxlan_tx_bytes)}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-blue-200 dark:border-slate-700 pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400 uppercase font-medium">{t('currentSpeedWan')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('download')}</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatSpeed(snapshot.current_speed_rx)}
                  </p>
                </div>
                <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('upload')}</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {formatSpeed(snapshot.current_speed_tx)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-600 rounded-lg">
              <Server className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('systemResources')}</h3>
          </div>

          <div className="space-y-4">
            <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('publicIp')}: <span className="font-normal text-slate-600 dark:text-slate-300">{snapshot.public_ip || 'N/A'}</span>
              </p>
            </div>

            <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('uptime')}: <span className="font-normal text-slate-600 dark:text-slate-300">{formatUptime(snapshot.system_uptime)}</span>
              </p>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{t('cpu')}</span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {snapshot.system_cpu_percent != null ? Number(snapshot.system_cpu_percent).toFixed(0) : '0'}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-amber-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${snapshot.system_cpu_percent || 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{t('memory')}</span>
                  <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                    {snapshot.system_ram_percent != null ? Number(snapshot.system_ram_percent).toFixed(0) : '0'}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-400 to-teal-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${snapshot.system_ram_percent || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {onReboot && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <button
                  onClick={onReboot}
                  className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <Power className="w-5 h-5" />
                  {t('rebootButton')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
