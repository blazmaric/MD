import { Activity, Wifi, Signal, Cpu, HardDrive, Network, AlertCircle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import type { Snapshot } from '../types';

interface SummaryCardsProps {
  snapshot: Snapshot | null;
}

export default function SummaryCards({ snapshot }: SummaryCardsProps) {
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
    return `${days}d ${hours}h`;
  }

  function formatBytes(bytes?: number | string | null): string {
    const numBytes = Number(bytes);
    if (isNaN(numBytes) || numBytes == null) return '0 B';
    if (numBytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let value = numBytes;
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i++;
    }
    return `${value.toFixed(2)} ${units[i]}`;
  }

  function formatSpeed(bytesPerSec?: number | string | null): string {
    const numBytes = Number(bytesPerSec);
    if (isNaN(numBytes) || numBytes == null) return '0 bps';
    if (numBytes === 0) return '0 bps';
    const bitsPerSec = numBytes * 8;
    const units = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    let i = 0;
    let value = bitsPerSec;
    while (value >= 1000 && i < units.length - 1) {
      value /= 1000;
      i++;
    }
    return `${value.toFixed(2)} ${units[i]}`;
  }

  function getSignalQuality(rsrp?: number): { color: string; text: string } {
    if (!rsrp) return { color: 'text-slate-500', text: 'N/A' };
    if (rsrp >= -80) return { color: 'text-green-600', text: t('excellent') };
    if (rsrp >= -90) return { color: 'text-green-500', text: t('good') };
    if (rsrp >= -100) return { color: 'text-yellow-600', text: t('fair') };
    return { color: 'text-red-600', text: t('poor') };
  }

  const signalQuality = getSignalQuality(snapshot.lte_rsrp);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('connectionStatus')}</h3>
            <Activity className={`w-5 h-5 ${snapshot.online ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
          </div>
          <p className={`text-2xl font-bold ${snapshot.online ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {snapshot.online ? t('online') : t('offline')}
          </p>
          {snapshot.active_uplink && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{t('gateway')}: {snapshot.active_uplink}</p>
          )}
          {snapshot.gateway_type && (
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">{t('via')} {snapshot.gateway_type}</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('lteSignal')}</h3>
            <Signal className={`w-5 h-5 ${signalQuality.color} dark:${signalQuality.color.replace('text-', 'text-').replace('-600', '-400').replace('-500', '-400')}`} />
          </div>
          <p className={`text-2xl font-bold ${signalQuality.color} dark:${signalQuality.color.replace('text-', 'text-').replace('-600', '-400').replace('-500', '-400')}`}>
            {signalQuality.text}
          </p>
          {snapshot.lte_operator && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{snapshot.lte_operator}</p>
          )}
          {snapshot.lte_rsrp && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1">
              <div title="Reference Signal Received Power - measures signal strength from cell tower">
                RSRP: {snapshot.lte_rsrp} dBm
              </div>
              {snapshot.lte_rsrq && (
                <div title="Reference Signal Received Quality - measures signal quality and interference">
                  RSRQ: {snapshot.lte_rsrq} dB
                </div>
              )}
              {snapshot.lte_sinr && (
                <div title="Signal to Interference plus Noise Ratio - higher is better for data rates">
                  SINR: {snapshot.lte_sinr} dB
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">WiFi</h3>
            <Wifi className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {snapshot.wifi_ssid || 'N/A'}
          </p>
          {snapshot.wifi_status && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{t('status')}: {snapshot.wifi_status}</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('cpu')}</h3>
            <Cpu className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {snapshot.system_cpu_percent != null ? Number(snapshot.system_cpu_percent).toFixed(1) : '0'}%
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{t('uptime')}: {formatUptime(snapshot.system_uptime)}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('memory')}</h3>
            <HardDrive className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {snapshot.system_ram_percent != null ? Number(snapshot.system_ram_percent).toFixed(1) : '0'}%
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{t('used')}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('currentSpeed')}</h3>
            <Network className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('rx')}:</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatSpeed(snapshot.current_speed_rx)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('tx')}:</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatSpeed(snapshot.current_speed_tx)}
              </span>
            </div>
          </div>
          {snapshot.current_speed_interface && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t('interface')}: {snapshot.current_speed_interface}</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 md:col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('vxlanTotalTraffic')}</h3>
            <Network className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t('received')}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatBytes(snapshot.vxlan_rx_bytes)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t('transmitted')}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatBytes(snapshot.vxlan_tx_bytes)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
