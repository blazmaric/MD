import { useState } from 'react';
import { Activity, X } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../LanguageContext';

interface PingResult {
  seq: number;
  time: number | null;
  timeout: boolean;
  host: string;
}

export default function PingTester() {
  const { t } = useLanguage();
  const [address, setAddress] = useState('8.8.8.8');
  const [sourceInterface, setSourceInterface] = useState('');
  const [results, setResults] = useState<PingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePing(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.ping.send(address, 4, sourceInterface || undefined);
      setResults(data.pings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ping failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setResults([]);
    setError('');
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          {t('pingTester')}
        </h3>
      </div>

      <div className="p-3">
        <form onSubmit={handlePing} className="space-y-3">
          <div>
            <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">{t('interfaceForPing')}:</p>
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="interface"
                  value=""
                  checked={sourceInterface === ''}
                  onChange={(e) => setSourceInterface(e.target.value)}
                  className="w-3 h-3 text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-900 dark:text-slate-100">LTE</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="interface"
                  value="wlan2.4"
                  checked={sourceInterface === 'wlan2.4'}
                  onChange={(e) => setSourceInterface(e.target.value)}
                  className="w-3 h-3 text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-900 dark:text-slate-100">WLAN</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="8.8.8.8"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t('pinging') : t('pingButton')}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-xs">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-3 space-y-2">
            {results.map((ping) => (
              <div
                key={ping.seq}
                className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-200 dark:border-slate-600"
              >
                <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                  Ping #{ping.seq} - {ping.host}:{' '}
                  {ping.timeout ? (
                    <span className="text-red-600 dark:text-red-400">Timeout</span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400">{ping.time} ms</span>
                  )}
                </p>
              </div>
            ))}
            <button
              onClick={handleClear}
              className="w-full px-3 py-2 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
