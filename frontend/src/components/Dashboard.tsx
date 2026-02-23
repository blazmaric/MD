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
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(interval);
  }, [user]);

  async function fetchDashboardData() {
    try {
      const data = await api.dashboard.getData();
      setSnapshot(data.summary);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
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

  return (
    <div className="space-y-6 pb-8">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {snapshot && (
        <div className="flex justify-end">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Osveženo: {new Date(snapshot.snapshot_ts).toLocaleTimeString('sl-SI')}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <LteStatus snapshot={snapshot} />
        <WlanStatus snapshot={snapshot} />
        <Wlan5Status />
      </div>

      <SummaryCards
        snapshot={snapshot}
        onReboot={user.is_admin ? () => setShowRebootDialog(true) : undefined}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="w-full">
          <InterfaceList />
        </div>
        <div className="w-full">
          <PingTester />
        </div>
      </div>

      <div className="w-full">
        <GpsMap snapshot={snapshot} />
      </div>

      <div className="w-full">
        <SmsManager />
      </div>

      <LogViewer />

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
