import { useState, useEffect } from 'react';
import { Wifi, RefreshCw } from 'lucide-react';
import { api } from '../api';

interface Wlan5Interface {
  '.id': string;
  name: string;
  ssid?: string;
  frequency?: string;
  'channel-width'?: string;
  'tx-power'?: string;
  disabled?: string;
  running?: string;
}

export default function Wlan5Status() {
  const [wlan5Info, setWlan5Info] = useState<Wlan5Interface | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWlan5Info();
    const interval = setInterval(fetchWlan5Info, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchWlan5Info() {
    setLoading(true);
    try {
      const data = await api.interfaces.list();
      const wlan5 = data.interfaces?.find((iface: Wlan5Interface) => iface.name === 'wlan5');
      setWlan5Info(wlan5 || null);
    } catch (err) {
      console.error('Failed to fetch WLAN 5 info:', err);
    } finally {
      setLoading(false);
    }
  }

  const isActive = wlan5Info?.running === 'true' && wlan5Info?.disabled !== 'true';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">📡 WLAN 5 GHz</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              isActive
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-slate-400'}`}></div>
              {isActive ? 'AKTIVNO' : 'NEAKTIVNO'}
            </div>
            <button
              onClick={fetchWlan5Info}
              disabled={loading}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors"
              title="Osveži"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {!wlan5Info ? (
          <p className="text-center text-slate-600 dark:text-slate-400">Nalaganje...</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">SSID</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {wlan5Info.ssid || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Frekvenca</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {wlan5Info.frequency ? `${wlan5Info.frequency} MHz` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Širina kanala</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {wlan5Info['channel-width'] || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">TX moč</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {wlan5Info['tx-power'] ? `${wlan5Info['tx-power']} dBm` : 'N/A'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
