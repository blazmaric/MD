import { useState, useEffect } from 'react';
import { Network, RefreshCw, Wifi, Activity } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../LanguageContext';

interface Interface {
  '.id': string;
  name: string;
  type: string;
  running: string;
  disabled: string;
  'actual-mtu'?: string;
  'link-rate'?: string;
  'rx-byte'?: string;
  'tx-byte'?: string;
}

export default function InterfaceList() {
  const { t } = useLanguage();
  const [interfaces, setInterfaces] = useState<Interface[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInterfaces();
    const interval = setInterval(fetchInterfaces, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchInterfaces() {
    setLoading(true);
    try {
      const data = await api.interfaces.list();
      const filteredInterfaces = (data.interfaces || []).filter((iface: Interface) =>
        iface.name.startsWith('ether') || iface.name.startsWith('lte') || iface.name.startsWith('wlan')
      );
      setInterfaces(filteredInterfaces);
    } catch (err) {
      console.error('Failed to fetch interfaces:', err);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(iface: Interface): string {
    if (iface.disabled === 'true') return 'bg-slate-400 dark:bg-slate-600';
    if (iface.running === 'true') return 'bg-green-500 dark:bg-green-600';
    return 'bg-red-500 dark:bg-red-600';
  }

  function getStatusBadge(iface: Interface): string {
    if (iface.disabled === 'true') return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    if (iface.running === 'true') return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  }

  function getStatusText(iface: Interface): string {
    if (iface.disabled === 'true') return t('disabled');
    if (iface.running === 'true') return t('up');
    return t('down');
  }

  function getInterfaceIcon(name: string) {
    if (name.startsWith('wlan')) return <Wifi className="w-4 h-4" />;
    if (name.startsWith('lte')) return <Activity className="w-4 h-4" />;
    return <Network className="w-4 h-4" />;
  }

  function formatBytes(bytes?: string): string {
    if (!bytes) return '0 B';
    const numBytes = parseInt(bytes, 10);
    if (isNaN(numBytes)) return '0 B';
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
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          {t('interfaceStatus')}
        </h3>
        <button
          onClick={fetchInterfaces}
          disabled={loading}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors"
          title={t('refresh')}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-6">
        <div className="space-y-3">
          {interfaces.map((iface) => (
            <div
              key={iface['.id']}
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(iface)} animate-pulse`} />
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    {getInterfaceIcon(iface.name)}
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{iface.name}</span>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(iface)}`}>
                  {getStatusText(iface)}
                </span>
              </div>

              <div className="flex items-center gap-6 text-sm">
                {iface.type && (
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="font-medium">{iface.type}</span>
                  </div>
                )}
                {iface['actual-mtu'] && (
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="text-xs">MTU:</span> <span className="font-medium">{iface['actual-mtu']}</span>
                  </div>
                )}
                <div className="flex gap-4 text-xs">
                  <div className="text-right">
                    <div className="text-slate-500 dark:text-slate-400">RX</div>
                    <div className="font-medium text-blue-600 dark:text-blue-400">{formatBytes(iface['rx-byte'])}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-500 dark:text-slate-400">TX</div>
                    <div className="font-medium text-cyan-600 dark:text-cyan-400">{formatBytes(iface['tx-byte'])}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {interfaces.length === 0 && !loading && (
          <p className="text-center py-8 text-slate-600 dark:text-slate-400">{t('noInterfacesFound')}</p>
        )}
      </div>
    </div>
  );
}
