import { useState } from 'react';
import { Send } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../LanguageContext';

export default function PingTester() {
  const { t } = useLanguage();
  const [address, setAddress] = useState('8.8.8.8');
  const [count, setCount] = useState(4);
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
      const data = await api.ping.send(address, count, sourceInterface || undefined);
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ping failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <form onSubmit={handlePing} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-2">
              {t('targetAddress')}
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="8.8.8.8"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="source" className="block text-sm font-medium text-slate-700 mb-2">
              {t('sourceInterface')}
            </label>
            <select
              id="source"
              value={sourceInterface}
              onChange={(e) => setSourceInterface(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('defaultGateway')}</option>
              <option value="lte1">LTE</option>
              <option value="wlan2.4">WiFi 2.4GHz</option>
              <option value="wlan5">WiFi 5GHz</option>
            </select>
          </div>

          <div>
            <label htmlFor="count" className="block text-sm font-medium text-slate-700 mb-2">
              {t('pingCount')}
            </label>
            <input
              id="count"
              type="number"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10))}
              min="1"
              max="10"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          {loading ? t('pinging') : t('sendPing')}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h4 className="font-semibold text-slate-900 mb-3">{t('pingResults')}</h4>
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
