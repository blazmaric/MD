import { useState, useEffect } from 'react';
import { RefreshCw, X, Wifi } from 'lucide-react';
import { api } from '../api';

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

export default function Wlan5Clients() {
  const [clients, setClients] = useState<WirelessClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Wifi className="w-5 h-5" />
          WiFi (wlan5)
        </h3>
        <button
          onClick={fetchClients}
          disabled={loading}
          className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

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
  );
}
