import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../LanguageContext';
import type { TrafficData } from '../types';

export default function TrafficChart() {
  const { t } = useLanguage();
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h3 className="text-lg font-semibold text-slate-900">{t('trafficHistory')}</h3>
          <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPeriod('day')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'day'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('day')}
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('week')}
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t('month')}
          </button>
          <button
            onClick={() => setShowResetDialog(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors flex items-center gap-2"
            title={t('resetHistory')}
          >
            <Trash2 className="w-4 h-4" />
            {t('reset')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-600">{t('loadingTrafficData')}</div>
      ) : !data ? (
        <div className="text-center py-8 text-slate-600">{t('noTrafficData')}</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm text-slate-600 mb-1">{t('totalReceived')}</p>
              <p className="text-2xl font-bold text-slate-900">{formatBytes(data.totals.total_rx)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">{t('totalTransmitted')}</p>
              <p className="text-2xl font-bold text-slate-900">{formatBytes(data.totals.total_tx)}</p>
            </div>
          </div>

          {data.history.length > 0 && (
            <>
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-4">{t('trafficOverTime')}</h4>
                <div className="relative" style={{ height: '250px', width: '100%' }}>
                  <svg width="100%" height="250" viewBox="0 0 800 250" preserveAspectRatio="none">
                    {(() => {
                      const history = data.history.slice().reverse();
                      const maxValue = Math.max(
                        ...history.map(d => Math.max(
                          parseInt(String(d.rx_bytes_delta)) || 0,
                          parseInt(String(d.tx_bytes_delta)) || 0
                        )),
                        1
                      );
                      const chartHeight = 200;
                      const chartWidth = 760;
                      const offsetX = 20;
                      const offsetY = 10;
                      const points = history.length;
                      const xStep = chartWidth / Math.max(points - 1, 1);

                      const rxPath = history.map((d, i) => {
                        const x = offsetX + i * xStep;
                        const value = parseInt(String(d.rx_bytes_delta)) || 0;
                        const y = offsetY + chartHeight - (value / maxValue * chartHeight);
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ');

                      const txPath = history.map((d, i) => {
                        const x = offsetX + i * xStep;
                        const value = parseInt(String(d.tx_bytes_delta)) || 0;
                        const y = offsetY + chartHeight - (value / maxValue * chartHeight);
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ');

                      return (
                        <g>
                          <line x1={offsetX} y1={offsetY} x2={offsetX} y2={offsetY + chartHeight} stroke="#cbd5e1" strokeWidth="1" />
                          <line x1={offsetX} y1={offsetY + chartHeight} x2={offsetX + chartWidth} y2={offsetY + chartHeight} stroke="#cbd5e1" strokeWidth="1" />
                          <path d={rxPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                          <path d={txPath} fill="none" stroke="#10b981" strokeWidth="2.5" />
                          {history.map((d, i) => {
                            const x = offsetX + i * xStep;
                            const rxValue = parseInt(String(d.rx_bytes_delta)) || 0;
                            const txValue = parseInt(String(d.tx_bytes_delta)) || 0;
                            const rxY = offsetY + chartHeight - (rxValue / maxValue * chartHeight);
                            const txY = offsetY + chartHeight - (txValue / maxValue * chartHeight);
                            return (
                              <g key={i}>
                                <circle cx={x} cy={rxY} r="4" fill="#3b82f6" />
                                <circle cx={x} cy={txY} r="4" fill="#10b981" />
                              </g>
                            );
                          })}
                        </g>
                      );
                    })()}
                  </svg>
                </div>
                <div className="flex gap-6 justify-center mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-1 bg-blue-600 rounded"></div>
                    <span className="text-slate-600">{t('received')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-1 bg-green-600 rounded"></div>
                    <span className="text-slate-600">{t('transmitted')}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">
                        {t('timePeriod')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">
                        {t('rx')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">
                        {t('tx')}
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
            </>
          )}
        </div>
      )}
    </div>

    {showResetDialog && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-bold text-red-600 mb-4">{t('confirmReset')}</h3>
          <p className="text-slate-700 mb-6">
            {t('resetWarning')}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {resetting ? t('resetting') : t('yesReset')}
            </button>
            <button
              onClick={() => setShowResetDialog(false)}
              disabled={resetting}
              className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 disabled:opacity-50"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
