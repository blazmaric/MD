import { useState } from 'react';
import { api } from '../api';

export default function PingTester() {
  const [address, setAddress] = useState('8.8.8.8');
  const [sourceInterface, setSourceInterface] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePing(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const data = await api.ping.send(address, 4, sourceInterface || undefined);
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ping failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">🏓 Ping Tester</h3>

      <form onSubmit={handlePing} className="space-y-4">
        <div>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">Vmesnik za ping:</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="interface"
                value=""
                checked={sourceInterface === ''}
                onChange={(e) => setSourceInterface(e.target.value)}
                className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-900 dark:text-slate-100">LTE</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="interface"
                value="wlan2.4"
                checked={sourceInterface === 'wlan2.4'}
                onChange={(e) => setSourceInterface(e.target.value)}
                className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-900 dark:text-slate-100">WLAN</span>
            </label>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="8.8.8.8"
            className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Pinging...' : 'Ping'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
