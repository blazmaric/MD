import { useState, useEffect } from 'react';
import { RefreshCw, Trash2, Calendar } from 'lucide-react';
import { api } from '../api';

interface UsageLogEntry {
  id: number;
  logged_at: string;
  rx_bytes: number;
  tx_bytes: number;
  total_bytes: number;
}

interface MonthlyUsage {
  year: number;
  month: number;
  rx_bytes: number;
  tx_bytes: number;
  total_bytes: number;
  created_at?: string;
  updated_at?: string;
}

export default function TrafficUsageLog() {
  const [logs, setLogs] = useState<UsageLogEntry[]>([]);
  const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [logsData, monthlyData] = await Promise.all([
        api.traffic.getUsageLog(),
        api.traffic.getMonthlyUsage()
      ]);
      setLogs(logsData.logs || []);
      setMonthlyUsage(monthlyData);
    } catch (err) {
      console.error('Failed to fetch usage data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    try {
      await fetch('/api/traffic/usage-log', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setShowClearDialog(false);
      fetchData();
    } catch (err) {
      alert('Failed to clear log: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  function getMonthName(month: number): string {
    const monthNames = [
      'Januar', 'Februar', 'Marec', 'April', 'Maj', 'Junij',
      'Julij', 'Avgust', 'September', 'Oktober', 'November', 'December'
    ];
    return monthNames[month - 1] || '';
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let value = bytes;
    while (value >= 1000 && i < units.length - 1) {
      value /= 1000;
      i++;
    }
    return `${value.toFixed(2)} ${units[i]}`;
  }

  return (
    <>
      {monthlyUsage && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-6 h-6 text-white" />
            <h3 className="text-xl font-bold text-white">
              Mesečna Poraba: {getMonthName(monthlyUsage.month)} {monthlyUsage.year}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-sm text-blue-100 mb-1">Prejeto</div>
              <div className="text-2xl font-bold text-white">{formatBytes(monthlyUsage.rx_bytes)}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-sm text-blue-100 mb-1">Poslano</div>
              <div className="text-2xl font-bold text-white">{formatBytes(monthlyUsage.tx_bytes)}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-sm text-blue-100 mb-1">Skupaj</div>
              <div className="text-2xl font-bold text-white">{formatBytes(monthlyUsage.total_bytes)}</div>
            </div>
          </div>
          {monthlyUsage.updated_at && (
            <div className="mt-4 text-sm text-blue-100">
              Zadnja posodobitev: {new Date(monthlyUsage.updated_at).toLocaleString('sl-SI')}
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Zgodovina Porabe Podatkov
          </h3>
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Osveži
            </button>
            <button
              onClick={() => setShowClearDialog(true)}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Pobriši
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            Nalaganje...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            Ni zgodovine porabe
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Čas
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Prejeto
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Poslano
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Skupaj
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
                      {new Date(log.logged_at).toLocaleString('sl-SI')}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-slate-700 dark:text-slate-300">
                      {formatBytes(log.rx_bytes)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-slate-700 dark:text-slate-300">
                      {formatBytes(log.tx_bytes)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-slate-900 dark:text-slate-100">
                      {formatBytes(log.total_bytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showClearDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4">
              Potrditev Brisanja
            </h3>
            <p className="text-slate-700 dark:text-slate-300 mb-6">
              Ali ste prepričani, da želite izbrisati celotno zgodovino porabe podatkov?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClear}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
              >
                Pobriši
              </button>
              <button
                onClick={() => setShowClearDialog(false)}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600"
              >
                Prekliči
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
