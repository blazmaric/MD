import { useState, useEffect } from 'react';
import { Network, RefreshCw } from 'lucide-react';
import { api } from '../api';

interface Interface {
  '.id': string;
  name: string;
  type: string;
  running: string;
  disabled: string;
}

export default function InterfaceList() {
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
    if (iface.disabled === 'true') return 'DISABLED';
    if (iface.running === 'true') return 'UP';
    return 'DOWN';
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Network className="w-5 h-5" />
          Interface Status
        </h3>
        <button
          onClick={fetchInterfaces}
          disabled={loading}
          className="p-2 text-slate-600 hover:text-slate-900 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {interfaces.map((iface) => (
          <div
            key={iface['.id']}
            className="p-4 border border-slate-200 rounded-lg text-center"
          >
            <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${getStatusColor(iface)}`} />
            <div className="font-semibold text-slate-900">{iface.name}</div>
            <div className="text-xs text-slate-600 mt-1">{getStatusText(iface)}</div>
          </div>
        ))}
      </div>

      {interfaces.length === 0 && !loading && (
        <p className="text-center py-8 text-slate-600">No Ethernet interfaces found</p>
      )}
    </div>
  );
}
