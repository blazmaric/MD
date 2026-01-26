import { useState, useEffect } from 'react';
import { Power, AlertTriangle } from 'lucide-react';
import { api } from '../api';
import type { User, Snapshot } from '../types';
import SummaryCards from './SummaryCards';
import LogViewer from './LogViewer';
import TrafficChart from './TrafficChart';
import PingTester from './PingTester';
import SmsManager from './SmsManager';
import WiFiScanner from './WiFiScanner';
import InterfaceList from './InterfaceList';
import Wlan5Clients from './Wlan5Clients';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
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
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900">System Status</h2>
            {hasPermission('admin_all') && (
              <button
                onClick={() => setShowRebootDialog(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
              >
                <Power className="w-4 h-4" />
                Reboot MikroTik
              </button>
            )}
          </div>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          <SummaryCards snapshot={snapshot} />
        </div>
      )}

      {hasPermission('view_summary') && (
        <InterfaceList />
      )}

      {hasPermission('view_summary') && (
        <Wlan5Clients />
      )}

      {hasPermission('manage_wifi') && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">WiFi Scanner (Wlan2.4)</h2>
          <WiFiScanner snapshot={snapshot} />
        </div>
      )}

      {hasPermission('view_traffic') && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Traffic</h2>
          <TrafficChart />
        </div>
      )}

      {hasPermission('use_ping') && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Ping Tester</h2>
          <PingTester />
        </div>
      )}

      {hasPermission('view_sms') && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">SMS</h2>
          <SmsManager />
        </div>
      )}

      {hasPermission('view_logs') && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Logs</h2>
          <LogViewer />
        </div>
      )}

      {!hasPermission('view_summary') && !hasPermission('view_logs') && !hasPermission('view_traffic') && !hasPermission('use_ping') && (
        <div className="text-center py-12">
          <p className="text-slate-600">You don't have permission to view any dashboard content.</p>
          <p className="text-sm text-slate-500 mt-2">Contact your administrator for access.</p>
        </div>
      )}

      {showRebootDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Confirm Reboot</h3>
            </div>
            <p className="text-slate-700 mb-6">
              Are you sure you want to reboot the MikroTik device? This will interrupt all connections for a few minutes.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleReboot}
                disabled={rebooting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {rebooting ? 'Rebooting...' : 'Yes, Reboot'}
              </button>
              <button
                onClick={() => setShowRebootDialog(false)}
                disabled={rebooting}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
