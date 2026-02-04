import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
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
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Povezani klienti (wlan5)
        </h3>
        <button
          onClick={fetchClients}
          disabled={loading}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors"
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
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                  MAC Naslov
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                  IP Naslov
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                  Ime naprave
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                  Signal
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                  RX/TX Hitrost
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                  Akcije
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client['.id']} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 text-sm font-mono text-slate-900 dark:text-slate-100">
                    {client['mac-address']}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                    192.168.1.101
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                    Uporabnik-PC
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                    {client['signal-strength']} dBm
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                    {client['tx-rate']} / {client['rx-rate']}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDisconnect(client['.id'], client['mac-address'])}
                      disabled={disconnecting === client['.id']}
                      className="px-4 py-1.5 text-sm text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                    >
                      Prekini
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
