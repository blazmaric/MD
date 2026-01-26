import { useState, useEffect } from 'react';
import { api } from '../api';
import type { User, Snapshot } from '../types';
import SummaryCards from './SummaryCards';
import LogViewer from './LogViewer';
import TrafficChart from './TrafficChart';
import PingTester from './PingTester';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');

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
      console.log('Received snapshot data:', data);
      setSnapshot(data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch summary');
    }
  }

  function hasPermission(permission: string): boolean {
    return user.permissions.includes(permission) || user.permissions.includes('admin_all');
  }

  return (
    <div className="space-y-6">
      {hasPermission('view_summary') && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">System Status</h2>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
          <SummaryCards snapshot={snapshot} />
        </div>
      )}

      {hasPermission('view_traffic') && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Traffic</h2>
          <TrafficChart />
        </div>
      )}

      {hasPermission('view_logs') && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Logs</h2>
          <LogViewer />
        </div>
      )}

      {hasPermission('use_ping') && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Ping Tester</h2>
          <PingTester />
        </div>
      )}

      {!hasPermission('view_summary') && !hasPermission('view_logs') && !hasPermission('view_traffic') && !hasPermission('use_ping') && (
        <div className="text-center py-12">
          <p className="text-slate-600">You don't have permission to view any dashboard content.</p>
          <p className="text-sm text-slate-500 mt-2">Contact your administrator for access.</p>
        </div>
      )}
    </div>
  );
}
