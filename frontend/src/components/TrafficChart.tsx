import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../api';
import type { TrafficData } from '../types';

export default function TrafficChart() {
  const [data, setData] = useState<TrafficData | null>(null);
  const [period, setPeriod] = useState('day');
  const [loading, setLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchTraffic();
  }, [period]);

  async function fetchTraffic() {
    setLoading(true);
    try {
      const result = await api.traffic.get({ period });
      setData(result);
    } catch (err) {
      console.error('Failed to fetch traffic:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await api.traffic.reset();
      alert('Traffic history reset successfully!');
      setShowResetDialog(false);
      fetchTraffic();
    } catch (err) {
      alert('Failed to reset traffic history: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setResetting(false);
    }
  }

  function formatBytes(bytes: number | string | null | undefined): string {
    const numBytes = Number(bytes);
    if (isNaN(numBytes) || numBytes == null) return '0 B';
    if (numBytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let value = numBytes;
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i++;
    }
    return `${value.toFixed(2)} ${units[i]}`;
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Traffic History</h3>
          <div className="flex space-x-2">
          <button
            onClick={() => setPeriod('day')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'day'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setShowResetDialog(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors flex items-center gap-2"
            title="Reset traffic history"
          >
            <Trash2 className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-600">Loading traffic data...</div>
      ) : !data ? (
        <div className="text-center py-8 text-slate-600">No traffic data available</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Received</p>
              <p className="text-2xl font-bold text-slate-900">{formatBytes(data.totals.total_rx)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Transmitted</p>
              <p className="text-2xl font-bold text-slate-900">{formatBytes(data.totals.total_tx)}</p>
            </div>
          </div>

          {data.history.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                      Time Period
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">
                      RX
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">
                      TX
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.history.slice(0, 10).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {new Date(item.time_bucket).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-900">
                        {formatBytes(item.rx_bytes_delta)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-900">
                        {formatBytes(item.tx_bytes_delta)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>

    {showResetDialog && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-bold text-red-600 mb-4">Confirm Reset</h3>
          <p className="text-slate-700 mb-6">
            Are you sure you want to delete all traffic history? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : 'Yes, Reset'}
            </button>
            <button
              onClick={() => setShowResetDialog(false)}
              disabled={resetting}
              className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
