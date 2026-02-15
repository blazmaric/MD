import { useState, useEffect } from 'react';
import { Network, RefreshCw } from 'lucide-react';
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
      const etherInterfaces = (data.interfaces || []).filter((iface: Interface) =>
        iface.name.startsWith('ether')
      );
      setInterfaces(etherInterfaces);
    } catch (err) {
      console.error('Failed to fetch interfaces:', err);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(iface: Interface): string {
    if (iface.disabled === 'true') return 'bg-slate-400';
    if (iface.running === 'true') return 'bg-green-500';
    return 'bg-red-500';
  }

  function getStatusText(iface: Interface): string {
    if (iface.disabled === 'true') return t('disabled');
    if (iface.running === 'true') return t('up');
    return t('down');
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
        <div className="flex flex-wrap gap-3">
          {interfaces.map((iface) => (
            <div
              key={iface['.id']}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
            >
              <div className={`w-3 h-3 rounded-full ${getStatusColor(iface)}`} />
              <span className="font-semibold text-slate-900 dark:text-slate-100">{iface.name}</span>
              <span className="text-xs text-slate-600 dark:text-slate-400">{getStatusText(iface)}</span>
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
