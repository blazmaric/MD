import { Activity, Wifi, Signal, Cpu, HardDrive, Network, AlertCircle } from 'lucide-react';
import type { Snapshot } from '../types';

interface SummaryCardsProps {
  snapshot: Snapshot | null;
}

export default function SummaryCards({ snapshot }: SummaryCardsProps) {
  if (!snapshot) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-slate-600">
        Loading system data...
      </div>
    );
  }

  console.log('Rendering SummaryCards with snapshot:', snapshot);

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
    if (rsrp >= -80) return { color: 'text-green-600', text: 'Excellent' };
    if (rsrp >= -90) return { color: 'text-green-500', text: 'Good' };
    if (rsrp >= -100) return { color: 'text-yellow-600', text: 'Fair' };
    return { color: 'text-red-600', text: 'Poor' };
  }

  const signalQuality = getSignalQuality(snapshot.lte_rsrp);

  return (
    <div className="space-y-4">
      {snapshot.stale && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <span className="text-yellow-800">Data is stale - last update took longer than expected</span>
        </div>
      )}

      {!snapshot.online && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">MikroTik is offline: {snapshot.error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Connection Status</h3>
            <Activity className={`w-5 h-5 ${snapshot.online ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <p className={`text-2xl font-bold ${snapshot.online ? 'text-green-600' : 'text-red-600'}`}>
            {snapshot.online ? 'Online' : 'Offline'}
          </p>
          {snapshot.active_uplink && (
            <p className="text-sm text-slate-500 mt-2">Gateway: {snapshot.active_uplink}</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">LTE Signal</h3>
            <Signal className={`w-5 h-5 ${signalQuality.color}`} />
          </div>
          <p className={`text-2xl font-bold ${signalQuality.color}`}>
            {signalQuality.text}
          </p>
          {snapshot.lte_operator && (
            <p className="text-sm text-slate-500 mt-2">{snapshot.lte_operator}</p>
          )}
          {snapshot.lte_rsrp && (
            <div className="text-xs text-slate-500 mt-2 space-y-1">
              <div>RSRP: {snapshot.lte_rsrp} dBm</div>
              {snapshot.lte_rsrq && <div>RSRQ: {snapshot.lte_rsrq} dB</div>}
              {snapshot.lte_sinr && <div>SINR: {snapshot.lte_sinr} dB</div>}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">WiFi</h3>
            <Wifi className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {snapshot.wifi_ssid || 'N/A'}
          </p>
          {snapshot.wifi_status && (
            <p className="text-sm text-slate-500 mt-2">Status: {snapshot.wifi_status}</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">CPU</h3>
            <Cpu className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {snapshot.system_cpu_percent != null ? Number(snapshot.system_cpu_percent).toFixed(1) : '0'}%
          </p>
          <p className="text-sm text-slate-500 mt-2">Uptime: {formatUptime(snapshot.system_uptime)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Memory</h3>
            <HardDrive className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {snapshot.system_ram_percent != null ? Number(snapshot.system_ram_percent).toFixed(1) : '0'}%
          </p>
          <p className="text-sm text-slate-500 mt-2">Used</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">Current Speed</h3>
            <Network className="w-5 h-5 text-teal-600" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">RX:</span>
              <span className="text-sm font-semibold text-slate-900">
                {formatSpeed(snapshot.current_speed_rx)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">TX:</span>
              <span className="text-sm font-semibold text-slate-900">
                {formatSpeed(snapshot.current_speed_tx)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 md:col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-600">VXLAN Total Traffic</h3>
            <Network className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600 mb-1">Received</p>
              <p className="text-xl font-bold text-slate-900">{formatBytes(snapshot.vxlan_rx_bytes)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Transmitted</p>
              <p className="text-xl font-bold text-slate-900">{formatBytes(snapshot.vxlan_tx_bytes)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
