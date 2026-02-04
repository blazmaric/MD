import { useState, useEffect, useRef } from 'react';
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
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: any } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!data || !svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const history = data.history.slice().reverse();
    const chartWidth = 760;
    const offsetX = 20;
    const xStep = chartWidth / Math.max(history.length - 1, 1);

    const index = Math.round((mouseX - offsetX) / xStep);

    if (index >= 0 && index < history.length) {
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        data: history[index]
      });
    }
  }

  function handleMouseLeave() {
    setTooltip(null);
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('trafficHistory')}</h3>
          <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPeriod('day')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'day'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {t('day')}
          </button>
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {t('week')}
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {t('month')}
          </button>
          <button
            onClick={() => setShowResetDialog(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2"
            title={t('resetHistory')}
          >
            <Trash2 className="w-4 h-4" />
            {t('reset')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">{t('loadingTrafficData')}</div>
      ) : !data ? (
        <div className="text-center py-8 text-slate-600 dark:text-slate-400">{t('noTrafficData')}</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t('totalReceived')}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatBytes(data.totals.total_rx)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{t('totalTransmitted')}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatBytes(data.totals.total_tx)}</p>
            </div>
          </div>

          {data.history.length > 0 && (
            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t('trafficOverTime')}</h4>
              <div className="relative" style={{ height: '300px', width: '100%' }}>
                <svg
                  ref={svgRef}
                  width="100%"
                  height="300"
                  viewBox="0 0 800 300"
                  preserveAspectRatio="none"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  style={{ cursor: 'crosshair' }}
                >
                  {(() => {
                    const history = data.history.slice().reverse();
                    const maxValue = Math.max(
                      ...history.map(d => Math.max(
                        parseInt(String(d.rx_bytes_delta)) || 0,
                        parseInt(String(d.tx_bytes_delta)) || 0
                      )),
                      1
                    );
                    const chartHeight = 250;
                    const chartWidth = 760;
                    const offsetX = 20;
                    const offsetY = 20;
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
                {tooltip && (
                  <div
                    className="fixed z-50 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-lg p-3 pointer-events-none"
                    style={{
                      left: `${tooltip.x + 10}px`,
                      top: `${tooltip.y - 10}px`,
                      transform: 'translateY(-100%)'
                    }}
                  >
                    <div className="font-semibold mb-1">
                      {new Date(tooltip.data.time_bucket).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-1 bg-blue-600 rounded"></div>
                      <span>RX: {formatBytes(tooltip.data.rx_bytes_delta)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-1 bg-green-600 rounded"></div>
                      <span>TX: {formatBytes(tooltip.data.tx_bytes_delta)}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-6 justify-center mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1 bg-blue-600 rounded"></div>
                  <span className="text-slate-600 dark:text-slate-400">{t('received')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-1 bg-green-600 rounded"></div>
                  <span className="text-slate-600 dark:text-slate-400">{t('transmitted')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>

    {showResetDialog && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4">{t('confirmReset')}</h3>
          <p className="text-slate-700 dark:text-slate-300 mb-6">
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
              className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50"
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
