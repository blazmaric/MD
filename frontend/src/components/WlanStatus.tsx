import { useState } from 'react';
import { Wifi, Search, X } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../LanguageContext';
import type { Snapshot } from '../types';

interface WlanStatusProps {
  snapshot: Snapshot | null;
}

interface ScanResult {
  ssid: string;
  signal: number;
  frequency: number;
  channel: number;
}

export default function WlanStatus({ snapshot }: WlanStatusProps) {
  const { t } = useLanguage();
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [showScanPopup, setShowScanPopup] = useState(false);

  async function handleScan() {
    setScanning(true);
    setShowScanPopup(true);
    try {
      const data = await api.wifi.scan();
      setScanResults(data.networks || []);
    } catch (err) {
      console.error('Failed to scan WiFi:', err);
    } finally {
      setScanning(false);
    }
  }

  if (!snapshot) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wifi className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('wlanStatus')}</h3>
        </div>
        <p className="text-slate-600 dark:text-slate-400">{t('loading')}</p>
      </div>
    );
  }

  const isWlanActive = snapshot.gateway_type === 'WiFi';

  return (
    <>
      <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-slate-800 dark:to-slate-800 rounded-xl shadow-lg border border-cyan-100 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-4 px-6 pt-6">
          <div className="p-2 bg-cyan-600 rounded-lg">
            <Wifi className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('wlanStatus')}</h3>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            isWlanActive
              ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isWlanActive ? 'bg-cyan-500' : 'bg-slate-400'}`}></div>
            {isWlanActive ? t('connected') : t('disconnected')}
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="space-y-4">
            {isWlanActive && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 uppercase font-medium">SSID</p>
                  <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                    {snapshot.wifi_ssid || 'N/A'}
                  </p>
                </div>
                <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 uppercase font-medium">{t('signal')}</p>
                  <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                    {snapshot.wifi_signal ? `${snapshot.wifi_signal} dBm` : 'N/A'}
                  </p>
                </div>
                <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 uppercase font-medium">TX</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {snapshot.wifi_tx_rate || 'N/A'}
                  </p>
                </div>
                <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 uppercase font-medium">RX</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {snapshot.wifi_rx_rate || 'N/A'}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleScan}
              disabled={scanning}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white rounded-lg font-medium disabled:opacity-50 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              {scanning ? t('scanning') : t('scanWlan')}
            </button>
          </div>
        </div>
      </div>

      {showScanPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('wlanScanTitle')}</h3>
              <button
                onClick={() => setShowScanPopup(false)}
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {scanning ? (
                <p className="text-center py-8 text-slate-600 dark:text-slate-400">{t('scanning')}</p>
              ) : scanResults.length === 0 ? (
                <p className="text-center py-8 text-slate-600 dark:text-slate-400">{t('noNetworksFound')}</p>
              ) : (
                <div className="space-y-2">
                  {scanResults.map((network, index) => (
                    <div
                      key={index}
                      className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{network.ssid}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {t('channelLabel')} {network.channel} • {network.frequency} MHz
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {network.signal} dBm
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
