import { useState } from 'react';
import { Activity, X, Maximize2 } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../LanguageContext';

export default function PingTester() {
  const { t } = useLanguage();
  const [address, setAddress] = useState('8.8.8.8');
  const [sourceInterface, setSourceInterface] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  async function handlePing(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const data = await api.ping.send(address, 4, sourceInterface || undefined);
      setResult(data.result);
      setShowModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ping failed');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setShowModal(false);
    setResult(null);
    setError('');
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
        <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {t('pingTester')}
          </h3>
        </div>

        <div className="p-6">
          <form onSubmit={handlePing} className="space-y-4">
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{t('interfaceForPing')}:</p>
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
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? t('pinging') : t('pingButton')}
              </button>
            </div>
          </form>

          {error && !showModal && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {result && !showModal && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
                View Results
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={handleClose}>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Ping Results: {address}
              </h3>
              <button
                onClick={handleClose}
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-5rem)]">
              {error ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                    {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
