import { useState, useEffect } from 'react';
import { Wifi, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../LanguageContext';

interface Wlan5Status {
  ssid: string;
  authenticatedClients: number;
  registeredClients: number;
  noiseFloor: string;
  status: string;
  wmmEnabled: boolean;
  rxMbps: string;
  txMbps: string;
  disabled?: string;
  running?: string;
}

export default function Wlan5Status() {
  const { t } = useLanguage();
  const [wlan5Info, setWlan5Info] = useState<Wlan5Status | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWlan5Info();
    const interval = setInterval(fetchWlan5Info, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchWlan5Info() {
    setLoading(true);
    try {
      const data = await api.wifi.wlan5Status();
      setWlan5Info(data.status);
    } catch (err) {
      console.error('Failed to fetch WLAN 5 info:', err);
    } finally {
      setLoading(false);
    }
  }

  const isActive = wlan5Info?.running === 'true' && wlan5Info?.disabled !== 'true';

  return (
    <div className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-slate-800 dark:to-slate-800 rounded-xl shadow-lg border border-blue-100 dark:border-slate-700">
      <div className="flex items-center gap-3 mb-4 px-6 pt-6">
        <div className="p-2 bg-blue-600 rounded-lg">
          <Wifi className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('wlan5Status')}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            isActive
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
            {isActive ? t('active') : t('inactive')}
          </div>
          <button
            onClick={fetchWlan5Info}
            disabled={loading}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/40 rounded-lg disabled:opacity-50 transition-colors"
            title={t('refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-6 pb-6">
        {!wlan5Info ? (
          <p className="text-center text-slate-600 dark:text-slate-400">{t('loading')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 uppercase font-medium">SSID</p>
              <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                {wlan5Info.ssid}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 uppercase font-medium">{t('connectedClients')}</p>
              <p className="text-base font-bold text-sky-600 dark:text-sky-400">
                {wlan5Info.authenticatedClients}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 uppercase font-medium">Status</p>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {wlan5Info.status}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 uppercase font-medium">Noise Floor</p>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {wlan5Info.noiseFloor} dBm
              </p>
            </div>
            <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 uppercase font-medium">RX Speed</p>
              <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                {wlan5Info.rxMbps} Mbps
              </p>
            </div>
            <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 uppercase font-medium">TX Speed</p>
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                {wlan5Info.txMbps} Mbps
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
