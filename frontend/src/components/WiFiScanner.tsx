import { useState, useEffect } from 'react';
import { Wifi, Search, Lock, AlertTriangle } from 'lucide-react';
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

  useEffect(() => {
    loadScanResults();
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

  async function handleScan(forceMode = false) {
    setError('');
    setSuccess('');

    if (!forceMode) {
      setCheckingLte(true);
      const isLteConnected = await checkLte();
      setCheckingLte(false);

      if (!isLteConnected) {
        setError('LTE interface is not connected. Scanning WiFi may disconnect your current connection.');
        const forceScan = confirm('⚠️ WARNING: LTE is not connected!\n\nScanning WiFi will temporarily disconnect your current connection. If you are connected via WiFi, you will lose access.\n\nDo you want to force the scan anyway?');
        if (forceScan) {
          return handleScan(true);
        }
        return;
      }

      if (!confirm('Scanning will temporarily disconnect WiFi. LTE is active and will maintain connectivity.\n\nContinue with scan?')) {
        return;
      }
    }

    setScanning(true);
    setError('');
    try {
      const data = await api.wifi.scan(forceMode);
      setNetworks(data.networks || []);
      setSuccess('Scan completed successfully!');
      setTimeout(() => setSuccess(''), 3000);
      await loadScanResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan WiFi');
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
      setSuccess(`Successfully connected to ${selectedSsid}!`);
      setSelectedSsid('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to WiFi');
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
        <button
          onClick={() => handleScan()}
          disabled={scanning || checkingLte}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          {scanning ? 'Scanning...' : checkingLte ? 'Checking LTE...' : 'Scan Networks'}
        </button>
      </div>

      {lteConnected === false && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-800 dark:text-red-300 text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-1">LTE Not Connected</div>
            <div>WiFi scanning requires LTE to be connected. Scanning will temporarily disconnect WiFi, so LTE must be available to maintain connectivity.</div>
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
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Selected</span>
                )}
              </div>
            </div>
          ))}

          {selectedSsid && (
            <form onSubmit={handleConnect} className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg space-y-3">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Connect to {selectedSsid}</h4>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Password
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
                  {connecting ? 'Connecting...' : 'Connect'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSsid('');
                    setPassword('');
                  }}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {networks.length === 0 && !scanning && (
        <p className="text-center py-8 text-slate-600 dark:text-slate-400">No networks found. Click Scan to search for WiFi networks.</p>
      )}
    </div>
  );
}
