import { Signal, Star } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import type { Snapshot } from '../types';

interface LteStatusProps {
  snapshot: Snapshot | null;
}

export default function LteStatus({ snapshot }: LteStatusProps) {
  const { t } = useLanguage();

  if (!snapshot) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Signal className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('lteStatus')}</h3>
        </div>
        <p className="text-slate-600 dark:text-slate-400">{t('loading')}</p>
      </div>
    );
  }

  const isLteActive = snapshot.gateway_type === 'LTE';

  function getSignalQuality(rsrp?: number | null): { label: string; color: string } {
    if (!rsrp) return { label: 'N/A', color: 'text-slate-500' };
    if (rsrp >= -80) return { label: t('excellent'), color: 'text-green-500' };
    if (rsrp >= -90) return { label: t('good'), color: 'text-green-400' };
    if (rsrp >= -100) return { label: t('moderate'), color: 'text-yellow-500' };
    if (rsrp >= -110) return { label: t('poor'), color: 'text-orange-500' };
    return { label: t('veryPoor'), color: 'text-red-500' };
  }

  const signalQuality = getSignalQuality(snapshot.lte_rsrp);

  return (
    <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-slate-800 dark:to-slate-800 rounded-xl shadow-lg border border-rose-100 dark:border-slate-700">
      <div className="flex items-center gap-3 mb-4 px-6 pt-6">
        <div className="p-2 bg-rose-600 rounded-lg">
          <Signal className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('lteStatus')}</h3>
          {isLteActive && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400" />
              <p className="text-xs text-yellow-700 dark:text-yellow-400 font-bold uppercase tracking-wide">Primarni Gateway</p>
            </div>
          )}
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
          isLteActive
            ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isLteActive ? 'bg-rose-500' : 'bg-slate-400'}`}></div>
          {isLteActive ? t('active') : t('inactive')}
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 uppercase font-medium">{t('operator')}</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {snapshot.lte_operator || 'N/A'}
            </p>
          </div>

          <div className="bg-white/60 dark:bg-slate-700/40 rounded-lg p-3">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 uppercase font-medium">{t('signalQuality')}</p>
            <p className={`text-lg font-bold ${signalQuality.color}`}>
              {signalQuality.label}
            </p>
          </div>
        </div>

        <div className="mt-4 bg-white/60 dark:bg-slate-700/40 rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">RSRP</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {snapshot.lte_rsrp != null && snapshot.lte_rsrp !== '' ? `${snapshot.lte_rsrp} dBm` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">RSRQ</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {snapshot.lte_rsrq != null && snapshot.lte_rsrq !== '' ? `${snapshot.lte_rsrq} dB` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">RSSI</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {snapshot.lte_rssi != null && snapshot.lte_rssi !== '' ? `${snapshot.lte_rssi} dBm` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">SINR</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {snapshot.lte_sinr != null && snapshot.lte_sinr !== '' ? `${snapshot.lte_sinr} dB` : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
