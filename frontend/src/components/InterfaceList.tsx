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
    if (iface.disabled === 'true') return 'bg-gray-500';
    if (iface.running === 'true') return 'bg-green-500';
    return 'bg-red-500';
  }

  function getStatusText(iface: Interface): string {
    if (iface.disabled === 'true') return t('disabled').toUpperCase();
    if (iface.running === 'true') return t('up').toUpperCase();
    return t('down').toUpperCase();
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Network className="w-5 h-5" />
          {t('interfaceStatus')}
        </h3>
        <button
          onClick={fetchInterfaces}
          disabled={loading}
          className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-50"
          title={t('refresh')}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {interfaces.map((iface) => (
          <div
            key={iface['.id']}
            className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg text-center"
          >
            <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${getStatusColor(iface)}`} />
            <div className="font-semibold text-slate-900 dark:text-slate-100">{iface.name}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">{getStatusText(iface)}</div>
            {iface.running === 'true' && iface['link-rate'] && (
              <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">{iface['link-rate']}</div>
            )}
          </div>
        ))}
      </div>

      {interfaces.length === 0 && !loading && (
        <p className="text-center py-8 text-slate-600 dark:text-slate-400">{t('noInterfacesFound')}</p>
      )}
    </div>
  );
}
