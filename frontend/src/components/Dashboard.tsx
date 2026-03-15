import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../LanguageContext';
import type { User, Snapshot } from '../types';
import SummaryCards from './SummaryCards';
import LogViewer from './LogViewer';
import SmsManager from './SmsManager';
import InterfaceList from './InterfaceList';
import LteStatus from './LteStatus';
import WlanStatus from './WlanStatus';
import Wlan5Status from './Wlan5Status';
import GpsMap from './GpsMap';
import { wsClient } from '../websocket';

interface DashboardProps {
  user: User;
}

interface DashboardData {
  summary: Snapshot | null;
  wlan5: any;
  interfaces: any[];
  smsMessages: any[];
  publicIp: string | null;
  lte: {
    connected: boolean;
  } | null;
}

export default function Dashboard({ user }: DashboardProps) {
  const { t } = useLanguage();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [showRebootDialog, setShowRebootDialog] = useState(false);
  const [rebooting, setRebooting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();

    const handleSnapshot = (data: any) => {
      setDashboardData(prev => ({
        ...prev!,
        summary: data,
        interfaces: data.interfaces_data ? JSON.parse(data.interfaces_data) : prev?.interfaces || [],
        smsMessages: data.sms_messages ? JSON.parse(data.sms_messages) : prev?.smsMessages || []
      }));
    };

    const handleLteConnectivity = (data: any) => {
      setDashboardData(prev => ({
        ...prev!,
        lte: data
      }));
    };

    wsClient.on('snapshot', handleSnapshot);
    wsClient.on('lte_connectivity', handleLteConnectivity);

    return () => {
      wsClient.off('snapshot', handleSnapshot);
      wsClient.off('lte_connectivity', handleLteConnectivity);
    };
  }, [user]);

  async function fetchDashboardData(manual = false) {
    if (manual) setRefreshing(true);
    try {
      const data = await api.dashboard.getData();
      setDashboardData(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      if (manual) setRefreshing(false);
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

  const snapshot = dashboardData?.summary || null;
  const lteConnected = dashboardData?.lte?.connected ?? null;

  return (
    <div className="space-y-6 pb-8">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {snapshot && (
        <div className="flex justify-end items-center gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Osveženo: {new Date(snapshot.snapshot_ts).toLocaleTimeString('sl-SI')}
          </p>
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
            title="Osveži"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <LteStatus snapshot={snapshot} lteConnected={lteConnected} />
        <WlanStatus snapshot={snapshot} />
        <Wlan5Status wlan5Data={dashboardData?.wlan5 || null} />
      </div>

      <SummaryCards
        snapshot={snapshot}
        onReboot={() => setShowRebootDialog(true)}
      />

      <div className="w-full">
        <SmsManager smsMessages={dashboardData?.smsMessages || []} />
      </div>

      <div className="w-full">
        <GpsMap snapshot={snapshot} />
      </div>

      <div className="w-full">
        <InterfaceList interfaces={dashboardData?.interfaces || []} publicIp={dashboardData?.publicIp || null} />
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
