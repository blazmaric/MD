import { useState, useEffect } from 'react';
import { Wifi, Search, AlertTriangle, WifiOff, RefreshCw } from 'lucide-react';
import { api } from '../api';
import type { WiFiNetwork, Snapshot } from '../types';
import { useLanguage } from '../LanguageContext';

interface WiFiScannerProps {
  snapshot: Snapshot | null;
}

export default function WiFiScanner(_props: WiFiScannerProps) {
  const { t } = useLanguage();
  const [networks, setNetworks] = useState<WiFiNetwork[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedSsid, setSelectedSsid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lteConnected, setLteConnected] = useState<boolean | null>(null);
  const [checkingLte, setCheckingLte] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);
  const [forceMode, setForceMode] = useState(false);

  useEffect(() => {
    loadScanResults();
    checkLte();

    const interval = setInterval(() => {
      checkLte();
    }, 15000); // 15s (was 30s)

    return () => clearInterval(interval);
  }, []);

  async function loadScanResults() {
    try {
      const data = await api.wifi.getScanResults();
      if (data.networks && data.networks.length > 0) {
        setNetworks(data.networks);
      }
    } catch (err) {
      console.error('Failed to load scan results:', err);
    }
  }

  function showToast(message: string, type: 'error' | 'warning' | 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  async function checkLte() {
    setCheckingLte(true);
    try {
      const data = await api.wifi.checkLte();
      console.log('[WiFiScanner] LTE check response:', data);
      const pingResult = data.pingSuccess !== undefined ? data.pingSuccess : data.connected;
      console.log('[WiFiScanner] Setting lteConnected to:', pingResult);
      setLteConnected(pingResult);
      return pingResult;
    } catch (err) {
      console.error('[WiFiScanner] Failed to check LTE:', err);
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
          setNetworks(job.result || []);
          const msg = t('scanCompletedSuccess');
          setSuccess(msg);
          showToast(msg, 'success');
          setTimeout(() => setSuccess(''), 3000);
          await loadScanResults();
          return true;
        }

        if (job.status === 'failed') {
          const errorMsg = job.error || t('scanFailed');
          setError(errorMsg);
          showToast(errorMsg, 'error');
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

    const msg = t('scanTimeout');
    setError(msg);
    showToast(msg, 'error');
    return false;
  }

  async function handleScan(forceModeParam?: boolean) {
    setError('');
    setSuccess('');

    const shouldForce = forceModeParam !== undefined ? forceModeParam : forceMode;

    if (!shouldForce) {
      setCheckingLte(true);
      const isLteConnected = await checkLte();
      setCheckingLte(false);

      if (!isLteConnected) {
        const msg = t('lteNotActive');
        setError(msg);
        showToast(msg, 'warning');
        return;
      }

      if (!confirm(t('confirmScanLte'))) {
        return;
      }
    } else if (!confirm(t('confirmForceScan'))) {
      return;
    }

    setScanning(true);
    setError('');
    try {
      const data = await api.wifi.scan(shouldForce);
      if (data.jobId) {
        await pollScanJob(data.jobId);
      } else {
        const msg = t('invalidServerResponse');
        setError(msg);
        showToast(msg, 'error');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('wifiScanError');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setScanning(false);
    }
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setError('');
    setSuccess('');

    try {
      // Find the network to check if it's secured
      const network = networks.find(n => n.ssid === selectedSsid);
      const isSecured = network?.security === 'secured';

      // Only send password if network is secured or if password is provided
      if (isSecured || password) {
        await api.wifi.connect(selectedSsid, password);
      } else {
        await api.wifi.connect(selectedSsid);
      }

      const msg = t('connectedSuccessfully').replace('{ssid}', selectedSsid);
      setSuccess(msg);
      showToast(msg, 'success');
      setSelectedSsid('');
      setPassword('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('wifiConnectError');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setConnecting(false);
    }
  }

  // Debug logging
  console.log('[WiFiScanner] Render state:', {
    lteConnected,
    checkingLte,
    forceMode,
    scanning,
    buttonDisabled: scanning || checkingLte || (!forceMode && lteConnected === false)
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Wifi className="w-5 h-5" />
          {t('wifiScanner')}
          {checkingLte && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              ({t('checkingLte')})
            </span>
          )}
          {!checkingLte && lteConnected === true && (
            <span className="text-xs text-green-600 dark:text-green-400 font-normal">
              ({t('lteCheckmark')})
            </span>
          )}
          {!checkingLte && lteConnected === false && (
            <span className="text-xs text-red-600 dark:text-red-400 font-normal">
              ({t('lteCross')})
            </span>
          )}
        </h3>
        <div className="flex items-center gap-3">
          {!forceMode && lteConnected === false && (
            <button
              onClick={() => checkLte()}
              disabled={checkingLte}
              className="px-3 py-2 text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              title={t('recheckLte')}
            >
              <RefreshCw className={`w-4 h-4 ${checkingLte ? 'animate-spin' : ''}`} />
              {checkingLte ? t('rechecking') : t('recheckLte')}
            </button>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={forceMode}
              onChange={(e) => setForceMode(e.target.checked)}
              disabled={scanning || checkingLte}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 disabled:opacity-50"
            />
            <span className="select-none">{t('forceScan')}</span>
          </label>
          <button
            onClick={() => handleScan()}
            disabled={scanning || checkingLte || (!forceMode && lteConnected === false)}
            className={`px-4 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors flex items-center gap-2 ${
              !forceMode && lteConnected === false
                ? 'bg-slate-400 dark:bg-slate-600 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            title={!forceMode && lteConnected === false ? t('scanDisabledTitle') : ''}
          >
            {!forceMode && lteConnected === false ? (
              <>
                <WifiOff className="w-4 h-4" />
                {t('lteNotStable')}
              </>
            ) : (
              <>
                <Search className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                {scanning ? t('scanningText') : checkingLte ? t('checkingLteText') : t('scanNetworksBtn')}
              </>
            )}
          </button>
        </div>
      </div>

      {!forceMode && lteConnected === false && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-800 dark:text-red-300 text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-1">{t('scanDisabledTitle')}</div>
            <div className="mb-2">
              {t('scanDisabledMessage')}
            </div>
            <div className="text-xs opacity-90 mb-2">
              <strong>{t('possibleCauses')}</strong>
              <ul className="list-disc ml-4 mt-1">
                <li>{t('causeNoCredit')}</li>
                <li>{t('causeBadSignal')}</li>
                <li>{t('causeApn')}</li>
                <li>{t('causeOperator')}</li>
              </ul>
            </div>
            <div className="text-xs opacity-90">
              {t('autoCheckMessage')}
            </div>
          </div>
        </div>
      )}

      {forceMode && (
        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg text-orange-800 dark:text-orange-300 text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-1">{t('forceScanWarningTitle')}</div>
            <div>{t('forceScanWarningMessage')}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      {networks.length > 0 && (
        <div className="space-y-3">
          {networks.map((network, idx) => {
            const isSecured = network.security === 'secured';
            const isSelected = selectedSsid === network.ssid;

            return (
              <div key={idx} className="space-y-2">
                <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{network.ssid}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t('signalLabel')}: {network.signal} dBm | {t('channelShort')}: {network.channel} | {t('macLabel')}: {network.address}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedSsid(network.ssid);
                        setPassword('');
                        setError('');
                      }}
                      disabled={connecting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      {t('connect')}
                    </button>
                  </div>
                </div>

                {isSelected && (
                  <form onSubmit={handleConnect} className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg space-y-3">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">{t('connectTo').replace('{ssid}', selectedSsid)}</h4>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {t('password')} {!isSecured && <span className="text-slate-500">{t('passwordOptional')}</span>}
                      </label>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        placeholder={isSecured ? t('enterPassword') : t('emptyForOpen')}
                        autoFocus
                      />
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
                      {t('connectNote')}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={connecting}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {connecting ? t('connectingBtn') : t('connectBtn')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSsid('');
                          setPassword('');
                        }}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                      >
                        {t('cancelBtn')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}

      {networks.length === 0 && !scanning && !error && (
        <p className="text-center py-8 text-slate-600 dark:text-slate-400">{t('noNetworksFoundText')}</p>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className={`p-4 rounded-lg shadow-lg border flex items-start gap-3 min-w-[320px] max-w-md ${
            toast.type === 'error' ? 'bg-red-50 dark:bg-red-900/90 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200' :
            toast.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/90 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200' :
            'bg-green-50 dark:bg-green-900/90 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
          }`}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-current opacity-70 hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
