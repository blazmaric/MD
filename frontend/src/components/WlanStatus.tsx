import { useState, useEffect } from 'react';
import { Wifi, Search, X, Star, Eye, EyeOff, CheckCircle } from 'lucide-react';
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
  running: string;
  disabled: string;
}

interface SavedNetwork {
  id: string;
  ssid: string;
  macAddress: string;
  connected: boolean;
  password: string;
  securityProfile: string;
}

function formatSpeed(bytesPerSec: number | string | null | undefined): string {
  const bytes = typeof bytesPerSec === 'number' ? bytesPerSec : (typeof bytesPerSec === 'string' && bytesPerSec !== '' ? parseFloat(bytesPerSec) : null);
  if (!bytes || isNaN(bytes)) return '0 Kbps';

  const kbps = (bytes * 8) / 1000;
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
  const [selectedSsid, setSelectedSsid] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string>('');
  const [connectSuccess, setConnectSuccess] = useState<string>('');
  const [showSavedNetworksPopup, setShowSavedNetworksPopup] = useState(false);
  const [savedNetworks, setSavedNetworks] = useState<SavedNetwork[]>([]);
  const [loadingSavedNetworks, setLoadingSavedNetworks] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [switchingNetwork, setSwitchingNetwork] = useState<string | null>(null);

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

  async function fetchSavedNetworks() {
    setLoadingSavedNetworks(true);
    try {
      const data = await api.wifi.getSavedNetworks('wlan24');
      setSavedNetworks(data.networks || []);
    } catch (err) {
      console.error('Failed to fetch saved networks:', err);
    } finally {
      setLoadingSavedNetworks(false);
    }
  }

  function togglePasswordVisibility(networkId: string) {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(networkId)) {
        newSet.delete(networkId);
      } else {
        newSet.add(networkId);
      }
      return newSet;
    });
  }

  async function handleSwitchNetwork(networkId: string) {
    if (!confirm('Preklapljam na izbrano omrežje. Nadaljujem?')) {
      return;
    }

    setSwitchingNetwork(networkId);
    try {
      await api.wifi.switchNetwork(networkId, 'wlan24');
      setConnectSuccess('Preklapljanje uspešno! Povezava se vzpostavlja...');
      setTimeout(() => {
        setConnectSuccess('');
        setShowSavedNetworksPopup(false);
        fetchWlan24Status();
      }, 3000);
    } catch (err: any) {
      setConnectError(err.message || 'Preklapljanje ni uspelo');
      setTimeout(() => setConnectError(''), 5000);
    } finally {
      setSwitchingNetwork(null);
    }
  }

  function handleShowSavedNetworks() {
    setShowSavedNetworksPopup(true);
    fetchSavedNetworks();
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

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setConnectError('');
    setConnectSuccess('');

    try {
      await api.wifi.connect(selectedSsid, password);
      const msg = `Uspešno povezan z ${selectedSsid}!`;
      setConnectSuccess(msg);
      setSelectedSsid('');
      setPassword('');

      // Close popup after success
      setTimeout(() => {
        setShowScanPopup(false);
        setConnectSuccess('');
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Napaka pri povezavi';
      setConnectError(errorMsg);
      console.error('Failed to connect:', err);
    } finally {
      setConnecting(false);
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
  const isWlan24Disabled = wlan24Status?.disabled === 'true';
  const shouldShowPrimaryBadge = isWlanActive && !isWlan24Disabled;

  return (
    <>
      <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-slate-800 dark:to-slate-800 rounded-xl shadow-lg border border-cyan-100 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-4 px-6 pt-6">
          <div className="p-2 bg-cyan-600 rounded-lg">
            <Wifi className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('wlanStatus')}</h3>
            {shouldShowPrimaryBadge && (
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
                <div
                  className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3 cursor-pointer hover:bg-white/80 dark:hover:bg-slate-700/60 transition-colors"
                  onClick={handleShowSavedNetworks}
                  title="Klikni za ogled shranjenih omrežij"
                >
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
              disabled={scanning || checkingLte || lteConnected === false || isWlan24Disabled}
              className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all shadow-lg flex items-center justify-center gap-2 ${
                lteConnected === false || isWlan24Disabled
                  ? 'bg-slate-400 dark:bg-slate-600 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white hover:shadow-xl disabled:opacity-50'
              }`}
              title={
                isWlan24Disabled
                  ? 'WLAN 2.4 interface je onemogočen'
                  : lteConnected === false
                    ? 'LTE povezava ni stabilna - gumb je onemogočen'
                    : ''
              }
            >
              <Search className="w-4 h-4" />
              {checkingLte
                ? 'Preverjam LTE...'
                : scanning
                  ? t('scanning')
                  : isWlan24Disabled
                    ? 'WLAN 2.4 onemogočen'
                    : lteConnected === false
                      ? 'LTE ni stabilen'
                      : t('scanWlan')
              }
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
              {connectSuccess && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                  <p className="text-green-700 dark:text-green-400 font-semibold">{connectSuccess}</p>
                </div>
              )}

              {connectError && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-red-700 dark:text-red-400 font-semibold">Napaka pri povezavi</p>
                  <p className="text-red-600 dark:text-red-500 text-sm mt-1">{connectError}</p>
                </div>
              )}

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
                <div className="space-y-3">
                  {scanResults.map((network, index) => {
                    const isSelected = selectedSsid === network.ssid;

                    return (
                      <div key={index} className="space-y-2">
                        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{network.ssid}</span>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Signal: {network.signal} dBm | Ch: {network.channel} | Freq: {network.frequency} MHz
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedSsid(network.ssid);
                                setPassword('');
                                setConnectError('');
                              }}
                              disabled={connecting}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                            >
                              Poveži
                            </button>
                          </div>
                        </div>

                        {isSelected && (
                          <form onSubmit={handleConnect} className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg space-y-3">
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">Poveži se z {selectedSsid}</h4>
                            <div>
                              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Geslo <span className="text-slate-500">(opcijsko za odprta omrežja)</span>
                              </label>
                              <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                placeholder="Pustite prazno za odprta omrežja"
                                autoFocus
                              />
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
                              <strong>Napomba:</strong> Povezava bo shranjena v MikroTik connect-list za samodejno povezovanje, ko bo omrežje v dosegu.
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={connecting}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {connecting ? 'Povezujem...' : 'Poveži'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSsid('');
                                  setPassword('');
                                }}
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                              >
                                Prekliči
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSavedNetworksPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Shranjena WiFi omrežja</h2>
              <button
                onClick={() => setShowSavedNetworksPopup(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-6">
              {connectSuccess && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400">
                  {connectSuccess}
                </div>
              )}

              {connectError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                  {connectError}
                </div>
              )}

              {loadingSavedNetworks ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
                  <p className="mt-2 text-slate-600 dark:text-slate-400">Nalagam shranjena omrežja...</p>
                </div>
              ) : savedNetworks.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Wifi className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Ni shranjenih omrežij</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedNetworks.map(network => (
                    <div
                      key={network.id}
                      className={`border rounded-lg p-4 transition-all ${
                        network.connected
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Wifi className={`w-5 h-5 ${network.connected ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{network.ssid}</h3>
                          {network.connected && (
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                        {!network.connected && (
                          <button
                            onClick={() => handleSwitchNetwork(network.id)}
                            disabled={switchingNetwork !== null}
                            className="px-3 py-1 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {switchingNetwork === network.id ? 'Preklapljam...' : 'Poveži'}
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {network.macAddress && network.macAddress !== '00:00:00:00:00:00' && (
                          <div className="text-sm">
                            <span className="text-slate-600 dark:text-slate-400">MAC: </span>
                            <span className="text-slate-900 dark:text-slate-100 font-mono">{network.macAddress}</span>
                          </div>
                        )}

                        {network.password && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Geslo: </span>
                            <code className="flex-1 text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded font-mono text-slate-900 dark:text-slate-100">
                              {visiblePasswords.has(network.id) ? network.password : '••••••••'}
                            </code>
                            <button
                              onClick={() => togglePasswordVisibility(network.id)}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                              title={visiblePasswords.has(network.id) ? 'Skrij geslo' : 'Prikaži geslo'}
                            >
                              {visiblePasswords.has(network.id) ? (
                                <EyeOff className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                              ) : (
                                <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                              )}
                            </button>
                          </div>
                        )}

                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Security: {network.securityProfile}
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
