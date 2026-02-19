import { useState, useEffect } from 'react';
import { Wifi, Search, Lock, AlertTriangle, WifiOff } from 'lucide-react';
import { api } from '../api';
import type { WiFiNetwork, Snapshot } from '../types';

interface WiFiScannerProps {
  snapshot: Snapshot | null;
}

export default function WiFiScanner(_props: WiFiScannerProps) {
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
    }, 30000);

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
          setNetworks(job.result || []);
          const msg = 'Skeniranje uspešno zaključeno!';
          setSuccess(msg);
          showToast(msg, 'success');
          setTimeout(() => setSuccess(''), 3000);
          await loadScanResults();
          return true;
        }

        if (job.status === 'failed') {
          const errorMsg = job.error || 'Skeniranje ni uspelo';
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

    const msg = 'Skeniranje časovno poteklo - prosim poskusite znova';
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
        const msg = 'LTE povezava ni aktivna. Skeniranje ni mogoče, saj bi prekinilo aktivno povezavo.';
        setError(msg);
        showToast(msg, 'warning');
        return;
      }

      if (!confirm('Skeniranje bo začasno prekinilo WiFi povezavo. LTE bo ohranil povezljivost.\n\nNadaljujem?')) {
        return;
      }
    } else if (!confirm('OPOZORILO: Force scan bo prekinil aktivno povezavo!\n\nSamo nadaljujte, če imate fizični dostop do naprave ali alternativno povezavo.\n\nNadaljujem?')) {
      return;
    }

    setScanning(true);
    setError('');
    try {
      const data = await api.wifi.scan(shouldForce);
      if (data.jobId) {
        await pollScanJob(data.jobId);
      } else {
        const msg = 'Neveljaven odgovor strežnika';
        setError(msg);
        showToast(msg, 'error');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Napaka pri skeniranju WiFi';
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
      await api.wifi.connect(selectedSsid, password);
      const msg = `Uspešno povezan z ${selectedSsid}!`;
      setSuccess(msg);
      showToast(msg, 'success');
      setSelectedSsid('');
      setPassword('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Napaka pri povezavi z WiFi';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Wifi className="w-5 h-5" />
          WiFi Scanner (2.4 GHz)
        </h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={forceMode}
              onChange={(e) => setForceMode(e.target.checked)}
              disabled={scanning || checkingLte}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 focus:ring-blue-500 disabled:opacity-50"
            />
            <span className="select-none">Force scan</span>
          </label>
          <button
            onClick={() => handleScan()}
            disabled={scanning || checkingLte || (!forceMode && lteConnected === false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {!forceMode && lteConnected === false ? (
              <>
                <WifiOff className="w-4 h-4" />
                LTE ni povezan
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                {scanning ? 'Skeniram...' : checkingLte ? 'Preverjam LTE...' : 'Skeniraj omrežja'}
              </>
            )}
          </button>
        </div>
      </div>

      {!forceMode && lteConnected === false && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-800 dark:text-red-300 text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-1">LTE ni povezan</div>
            <div>WiFi skeniranje zahteva aktivno LTE povezavo. Skeniranje začasno prekine WiFi, zato mora biti LTE na voljo za vzdrževanje povezljivosti. Če imate fizični dostop, lahko omogočite "Force scan".</div>
          </div>
        </div>
      )}

      {forceMode && (
        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg text-orange-800 dark:text-orange-300 text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-1">OPOZORILO: Force scan način</div>
            <div>Skeniranje bo prekinilo aktivno povezavo! Nadaljujte samo, če imate fizični dostop do naprave ali alternativno povezavo.</div>
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
        <div className="space-y-2">
          {networks.map((network, idx) => (
            <div
              key={idx}
              className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
              onClick={() => setSelectedSsid(network.ssid)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{network.ssid}</span>
                    {network.security && <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {network.address} | Ch: {network.channel} | Signal: {network.signal} dBm
                  </div>
                </div>
                {selectedSsid === network.ssid && (
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Izbrano</span>
                )}
              </div>
            </div>
          ))}

          {selectedSsid && (
            <form onSubmit={handleConnect} className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Poveži se z {selectedSsid}</h4>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Geslo
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={connecting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {connecting ? 'Povezujem...' : 'Poveži'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSsid('');
                    setPassword('');
                  }}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  Prekliči
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {networks.length === 0 && !scanning && !error && (
        <p className="text-center py-8 text-slate-600 dark:text-slate-400">Omrežij ni najdenih. Klikni Skeniraj za iskanje WiFi omrežij.</p>
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
