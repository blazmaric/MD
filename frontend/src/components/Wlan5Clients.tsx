import { useState, useEffect } from 'react';
import { RefreshCw, X, Wifi, Search, Lock } from 'lucide-react';
import { api } from '../api';
import type { Snapshot, WiFiNetwork } from '../types';

interface WirelessClient {
  '.id': string;
  interface: string;
  'mac-address': string;
  'signal-strength': string;
  'signal-to-noise': string;
  'tx-rate': string;
  'rx-rate': string;
  uptime: string;
  bytes?: string;
}

interface Wlan5ClientsProps {
  snapshot: Snapshot | null;
}

export default function Wlan5Clients({ snapshot }: Wlan5ClientsProps) {
  const [clients, setClients] = useState<WirelessClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showScanPopup, setShowScanPopup] = useState(false);
  const [networks, setNetworks] = useState<WiFiNetwork[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<WiFiNetwork | null>(null);
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const lteActive = snapshot?.gateway_type === 'LTE';

  useEffect(() => {
    fetchClients();
    const interval = setInterval(fetchClients, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchClients() {
    setLoading(true);
    try {
      const data = await api.wifi.registrationTable('wlan5');
      setClients(data.clients || []);
    } catch (err) {
      console.error('Failed to fetch wireless clients:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect(clientId: string, mac: string) {
    if (!confirm(`Disconnect client ${mac}?`)) return;

    setDisconnecting(clientId);
    try {
      await api.wifi.disconnectClient(clientId);
      await fetchClients();
    } catch (err) {
      alert('Failed to disconnect client: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDisconnecting(null);
    }
  }

  async function handleScan() {
    setScanning(true);
    setError('');
    setNetworks([]);
    try {
      const data = await api.wifi.scan();
      setNetworks(data.networks || []);
      setShowScanPopup(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan WiFi');
    } finally {
      setScanning(false);
    }
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedNetwork) return;

    setConnecting(true);
    setError('');
    try {
      await api.wifi.connect(selectedNetwork.ssid, password);
      setShowScanPopup(false);
      setSelectedNetwork(null);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to WiFi');
    } finally {
      setConnecting(false);
    }
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            WiFi (wlan2.4)
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleScan}
              disabled={scanning || !lteActive}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={!lteActive ? 'Scan only available when LTE is active' : 'Scan for networks'}
            >
              <Search className="w-4 h-4" />
              {scanning ? 'Scanning...' : 'Scan Networks'}
            </button>
            <button
              onClick={fetchClients}
              disabled={loading}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {!lteActive && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-yellow-800 dark:text-yellow-300 text-sm">
            WiFi scan is only available when LTE is the active gateway
          </div>
        )}

        {clients.length === 0 ? (
          <p className="text-center py-8 text-slate-600 dark:text-slate-400">No active clients</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                    MAC Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                    Signal
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                    TX Rate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                    RX Rate
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                    Uptime
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {clients.map((client) => (
                  <tr key={client['.id']} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-4 py-3 text-sm font-mono text-slate-900 dark:text-slate-100">
                      {client['mac-address']}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {client['signal-strength']} dBm
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {client['tx-rate']}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {client['rx-rate']}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {client.uptime}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDisconnect(client['.id'], client['mac-address'])}
                        disabled={disconnecting === client['.id']}
                        className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50"
                        title="Disconnect"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showScanPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">WiFi Networks</h3>
              <button
                onClick={() => {
                  setShowScanPopup(false);
                  setSelectedNetwork(null);
                  setPassword('');
                  setError('');
                }}
                className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {networks.length === 0 ? (
              <p className="text-center py-8 text-slate-600 dark:text-slate-400">No networks found</p>
            ) : (
              <div className="space-y-2">
                {networks.map((network, idx) => (
                  <div
                    key={idx}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedNetwork?.ssid === network.ssid
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => setSelectedNetwork(network)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{network.ssid}</span>
                        {network.security && <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                      </div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">{network['signal-strength']} dBm</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedNetwork && (
              <form onSubmit={handleConnect} className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg space-y-3">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Connect to {selectedNetwork.ssid}</h4>
                <div>
                  <label htmlFor="wifi-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Password
                  </label>
                  <input
                    id="wifi-password"
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
                      setSelectedNetwork(null);
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
        </div>
      )}
    </>
  );
}
