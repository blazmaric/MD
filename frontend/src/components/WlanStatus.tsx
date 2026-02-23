import { useState, useEffect } from 'react';
import { Wifi, Search, X, Star } from 'lucide-react';
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

interface Wlan24Status {
  status: string;
  ssid: string;
  signalStrength: string;
  txRate: string;
  rxRate: string;
}

function formatSpeed(bytesPerSec: number | null | undefined): string {
  if (!bytesPerSec) return '0 Kbps';

  const kbps = (bytesPerSec * 8) / 1000;
  const mbps = kbps / 1000;

  if (mbps >= 1) {
    return `${mbps.toFixed(1)} Mbps`;
  }
  return `${kbps.toFixed(0)} Kbps`;
}

export default function WlanStatus({ snapshot }: WlanStatusProps) {
  const { t } = useLanguage();
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [showScanPopup, setShowScanPopup] = useState(false);
  const [wlan24Status, setWlan24Status] = useState<Wlan24Status | null>(null);
  const [scanError, setScanError] = useState<string>('');
  const [lteConnected, setLteConnected] = useState<boolean | null>(null);
  const [checkingLte, setCheckingLte] = useState(false);

  useEffect(() => {
    fetchWlan24Status();
    checkLte();

    const statusInterval = setInterval(fetchWlan24Status, 5000);
    const lteInterval = setInterval(checkLte, 30000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(lteInterval);
    };
  }, []);

  async function fetchWlan24Status() {
    try {
      const data = await api.wifi.wlan24Status();
      setWlan24Status(data.status);
    } catch (err) {
      console.error('Failed to fetch WLAN 2.4 status:', err);
    }
  }

  async function checkLte() {
    setCheckingLte(true);
    try {
      const data = await api.wifi.checkLte();
      setLteConnected(data.connected);
      return data.connected;
    } catch (err) {
      console.error('Failed to check LTE:', err);
      setLteConnected(false);
      return false;
    } finally {
      setCheckingLte(false);
    }
  }

  async function pollScanJob(jobId: string) {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const job = await api.wifi.getScanJob(jobId);

        if (job.status === 'completed') {
          setScanResults(job.result || []);
          setScanError('');
          return true;
        }

        if (job.status === 'failed') {
          setScanError(job.error || 'Skeniranje ni uspelo');
          setScanResults([]);
          return false;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (err) {
        console.error('Failed to poll job:', err);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    setScanError('Skeniranje časovno poteklo - prosim poskusite znova');
    return false;
  }

  async function handleScan() {
    setScanError('');
    setScanResults([]);

    // Check LTE before scanning
    setCheckingLte(true);
    const isLteConnected = await checkLte();
    setCheckingLte(false);

    if (!isLteConnected) {
      setScanError('LTE povezava ni stabilna (ping ne dela). Možni vzroki: ni dobroimetja na SIM kartici, slab signal, ali težave z operaterjem.');
      setShowScanPopup(true);
      return;
    }

    if (!confirm('Skeniranje bo začasno prekinilo WiFi povezavo. LTE bo ohranil povezljivost.\n\nNadaljujem?')) {
      return;
    }

    setScanning(true);
    setShowScanPopup(true);

    try {
      const data = await api.wifi.scan(false); // Normal scan - requires LTE
      if (data.jobId) {
        await pollScanJob(data.jobId);
      } else {
        setScanError('Neveljaven odgovor strežnika');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Napaka pri skeniranju WiFi';
      setScanError(errorMsg);
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
            {isWlanActive && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400" />
                <p className="text-xs text-yellow-700 dark:text-yellow-400 font-bold uppercase tracking-wide">Primarni Gateway</p>
              </div>
            )}
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
            {wlan24Status && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 uppercase font-medium">SSID</p>
                  <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                    {wlan24Status.ssid}
                  </p>
                </div>
                <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 uppercase font-medium">{t('signal')}</p>
                  <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                    {wlan24Status.signalStrength}
                  </p>
                </div>
                <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 uppercase font-medium">TX Speed</p>
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    {formatSpeed(snapshot?.wlan_speed_tx)}
                  </p>
                </div>
                <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 uppercase font-medium">RX Speed</p>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">
                    {formatSpeed(snapshot?.wlan_speed_rx)}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleScan}
              disabled={scanning || checkingLte || lteConnected === false}
              className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all shadow-lg flex items-center justify-center gap-2 ${
                lteConnected === false
                  ? 'bg-slate-400 dark:bg-slate-600 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white hover:shadow-xl disabled:opacity-50'
              }`}
              title={lteConnected === false ? 'LTE povezava ni stabilna - gumb je onemogočen' : ''}
            >
              <Search className="w-4 h-4" />
              {checkingLte ? 'Preverjam LTE...' : scanning ? t('scanning') : lteConnected === false ? 'LTE ni stabilen' : t('scanWlan')}
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
              ) : scanError ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-red-700 dark:text-red-400 font-semibold mb-2">Napaka pri skeniranju</p>
                  <p className="text-red-600 dark:text-red-500 text-sm">{scanError}</p>
                </div>
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
