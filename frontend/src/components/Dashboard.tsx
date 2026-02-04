import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../LanguageContext';
import type { User, Snapshot } from '../types';
import SummaryCards from './SummaryCards';
import LogViewer from './LogViewer';
import PingTester from './PingTester';
import SmsManager from './SmsManager';
import InterfaceList from './InterfaceList';
import Wlan5Clients from './Wlan5Clients';
import LteStatus from './LteStatus';
import WlanStatus from './WlanStatus';
import Wlan5Status from './Wlan5Status';
import GpsMap from './GpsMap';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const { t } = useLanguage();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [showRebootDialog, setShowRebootDialog] = useState(false);
  const [rebooting, setRebooting] = useState(false);

  useEffect(() => {
    if (hasPermission('view_summary')) {
      fetchSummary();
      const interval = setInterval(fetchSummary, 3000);
      return () => clearInterval(interval);
    }
  }, [user]);

  async function fetchSummary() {
    try {
      const data = await api.summary.get();
      setSnapshot(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch summary');
    }
  }

  async function handleReboot() {
    setRebooting(true);
    try {
      await api.system.reboot();
      alert('MikroTik is rebooting. Please wait a few minutes...');
      setShowRebootDialog(false);
    } catch (err) {
      alert('Failed to reboot: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setRebooting(false);
    }
  }

  function hasPermission(permission: string): boolean {
    return user.permissions.includes(permission) || user.permissions.includes('admin_all');
  }

  return (
    <div className="space-y-6">
      {hasPermission('view_summary') && (
        <div className="space-y-2">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          {snapshot && (
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Osveženo: {new Date(snapshot.snapshot_ts).toLocaleTimeString('sl-SI')}
              </p>
            </div>
          )}
          <SummaryCards snapshot={snapshot} onReboot={hasPermission('admin_all') ? () => setShowRebootDialog(true) : undefined} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {hasPermission('view_summary') && (
          <InterfaceList />
        )}

        {hasPermission('use_ping') && (
          <PingTester />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {hasPermission('view_summary') && (
          <LteStatus snapshot={snapshot} />
        )}

        {hasPermission('view_summary') && (
          <WlanStatus snapshot={snapshot} />
        )}

        {hasPermission('view_summary') && (
          <Wlan5Status />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {hasPermission('view_summary') && (
          <Wlan5Clients />
        )}

        {hasPermission('view_summary') && (
          <GpsMap snapshot={snapshot} />
        )}
      </div>

      {hasPermission('view_sms') && (
        <SmsManager />
      )}

      {hasPermission('view_logs') && (
        <LogViewer />
      )}

      {!hasPermission('view_summary') && !hasPermission('view_logs') && !hasPermission('view_traffic') && !hasPermission('use_ping') && (
        <div className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-400">{t('noPermission')}</p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">{t('contactAdmin')}</p>
        </div>
      )}

      {showRebootDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">{t('confirmReboot')}</h3>
            </div>
            <p className="text-slate-700 dark:text-slate-300 mb-6">
              {t('rebootWarning')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleReboot}
                disabled={rebooting}
                className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg font-medium hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50"
              >
                {rebooting ? t('rebooting') : t('yesReboot')}
              </button>
              <button
                onClick={() => setShowRebootDialog(false)}
                disabled={rebooting}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
