import { useState } from 'react';
import { Wifi, Search, Lock } from 'lucide-react';
import { api } from '../api';
import type { WiFiNetwork, Snapshot } from '../types';

interface WiFiScannerProps {
  snapshot: Snapshot | null;
}

export default function WiFiScanner({ snapshot }: WiFiScannerProps) {
  const [networks, setNetworks] = useState<WiFiNetwork[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedSsid, setSelectedSsid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const lteActive = snapshot?.gateway_type === 'LTE';

  async function handleScan() {
    if (!lteActive) {
      setError('WiFi scan can only be performed when LTE is active');
      return;
    }

    if (!confirm('Do you really want to scan for WiFi networks? This may temporarily disrupt the WiFi connection.')) {
      return;
    }

    setScanning(true);
    setError('');
    try {
      const data = await api.wifi.scan();
      setNetworks(data.networks || []);
      setSuccess('Scan completed successfully!');
      setTimeout(() => setSuccess(''), 3000);
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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Wifi className="w-5 h-5" />
          WiFi Scanner
        </h3>
        <button
          onClick={handleScan}
          disabled={scanning || !lteActive}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          title={!lteActive ? 'Scan only available when LTE is active' : 'Scan for networks'}
        >
          <Search className="w-4 h-4" />
          {scanning ? 'Scanning...' : 'Scan Networks'}
        </button>
      </div>

      {!lteActive && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          WiFi scan is only available when LTE is the active gateway
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {networks.length > 0 && (
        <div className="space-y-2">
          {networks.map((network, idx) => (
            <div
              key={idx}
              className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => setSelectedSsid(network.ssid)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{network.ssid}</span>
                    {network.security && <Lock className="w-4 h-4 text-slate-500" />}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Channel: {network.channel} | Frequency: {network.frequency} | Signal: {network['signal-strength']} dBm
                  </div>
                </div>
                {selectedSsid === network.ssid && (
                  <span className="text-sm font-medium text-blue-600">Selected</span>
                )}
              </div>
            </div>
          ))}

          {selectedSsid && (
            <form onSubmit={handleConnect} className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <h4 className="font-semibold text-slate-900">Connect to {selectedSsid}</h4>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {networks.length === 0 && !scanning && (
        <p className="text-center py-8 text-slate-600">No networks found. Click Scan to search for WiFi networks.</p>
      )}
    </div>
  );
}
