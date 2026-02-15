import { useState, useEffect, useMemo, useRef } from 'react';
import { AlertTriangle, RotateCcw, Save } from 'lucide-react';
import { Responsive } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface GridLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
}

type Layout = GridLayout;
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

const DEFAULT_LAYOUTS: { [key: string]: Layout[] } = {
  lg: [
    { i: 'summary', x: 0, y: 0, w: 12, h: 2, minW: 12, maxW: 12, minH: 2, maxH: 3 },
    { i: 'interfaces', x: 0, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'ping', x: 6, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'lte', x: 0, y: 6, w: 4, h: 4, minW: 4, minH: 3 },
    { i: 'wlan24', x: 4, y: 6, w: 4, h: 4, minW: 4, minH: 3 },
    { i: 'wlan5', x: 8, y: 6, w: 4, h: 4, minW: 4, minH: 3 },
    { i: 'wlan5clients', x: 0, y: 10, w: 6, h: 5, minW: 4, minH: 4 },
    { i: 'gps', x: 6, y: 10, w: 6, h: 5, minW: 4, minH: 4 },
    { i: 'sms', x: 0, y: 15, w: 12, h: 6, minW: 6, minH: 5 },
    { i: 'logs', x: 0, y: 21, w: 12, h: 7, minW: 6, minH: 5 },
  ],
  md: [
    { i: 'summary', x: 0, y: 0, w: 10, h: 2, minW: 10, maxW: 10, minH: 2, maxH: 3 },
    { i: 'interfaces', x: 0, y: 2, w: 5, h: 4, minW: 5, minH: 3 },
    { i: 'ping', x: 5, y: 2, w: 5, h: 4, minW: 5, minH: 3 },
    { i: 'lte', x: 0, y: 6, w: 5, h: 4, minW: 5, minH: 3 },
    { i: 'wlan24', x: 5, y: 6, w: 5, h: 4, minW: 5, minH: 3 },
    { i: 'wlan5', x: 0, y: 10, w: 5, h: 4, minW: 5, minH: 3 },
    { i: 'wlan5clients', x: 5, y: 10, w: 5, h: 5, minW: 5, minH: 4 },
    { i: 'gps', x: 0, y: 15, w: 10, h: 5, minW: 5, minH: 4 },
    { i: 'sms', x: 0, y: 20, w: 10, h: 6, minW: 10, minH: 5 },
    { i: 'logs', x: 0, y: 26, w: 10, h: 7, minW: 10, minH: 5 },
  ],
  sm: [
    { i: 'summary', x: 0, y: 0, w: 6, h: 2, minW: 6, maxW: 6, minH: 2, maxH: 3 },
    { i: 'interfaces', x: 0, y: 2, w: 6, h: 4, minW: 6, minH: 3 },
    { i: 'ping', x: 0, y: 6, w: 6, h: 4, minW: 6, minH: 3 },
    { i: 'lte', x: 0, y: 10, w: 6, h: 4, minW: 6, minH: 3 },
    { i: 'wlan24', x: 0, y: 14, w: 6, h: 4, minW: 6, minH: 3 },
    { i: 'wlan5', x: 0, y: 18, w: 6, h: 4, minW: 6, minH: 3 },
    { i: 'wlan5clients', x: 0, y: 22, w: 6, h: 5, minW: 6, minH: 4 },
    { i: 'gps', x: 0, y: 27, w: 6, h: 5, minW: 6, minH: 4 },
    { i: 'sms', x: 0, y: 32, w: 6, h: 6, minW: 6, minH: 5 },
    { i: 'logs', x: 0, y: 38, w: 6, h: 7, minW: 6, minH: 5 },
  ],
};

export default function Dashboard({ user }: DashboardProps) {
  const { t } = useLanguage();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [showRebootDialog, setShowRebootDialog] = useState(false);
  const [rebooting, setRebooting] = useState(false);
  const [layouts, setLayouts] = useState(DEFAULT_LAYOUTS);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [width, setWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasPermission('view_summary')) {
      fetchSummary();
      const interval = setInterval(fetchSummary, 3000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    loadLayout();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function loadLayout() {
    try {
      const data = await api.layout.get();
      if (data.layout && data.layout.length > 0) {
        const savedLayouts: any = {};
        ['lg', 'md', 'sm'].forEach(breakpoint => {
          const layoutForBreakpoint = data.layout.filter((item: any) => item.breakpoint === breakpoint);
          if (layoutForBreakpoint.length > 0) {
            savedLayouts[breakpoint] = layoutForBreakpoint.map((item: any) => ({
              i: item.i,
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h,
              minW: item.minW,
              minH: item.minH,
            }));
          }
        });
        if (Object.keys(savedLayouts).length > 0) {
          setLayouts({ ...DEFAULT_LAYOUTS, ...savedLayouts });
        }
      }
    } catch (err) {
      console.error('Failed to load layout:', err);
    }
  }

  async function saveLayout() {
    try {
      const flatLayout: any[] = [];
      Object.entries(layouts).forEach(([breakpoint, layout]) => {
        layout.forEach((item: Layout) => {
          flatLayout.push({
            ...item,
            breakpoint,
          });
        });
      });
      await api.layout.save(flatLayout);
      setHasUnsavedChanges(false);
      alert('Layout uspešno shranjen!');
    } catch (err) {
      alert('Napaka pri shranjevanju layout-a: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  async function resetLayout() {
    if (!confirm('Ali ste prepričani, da želite ponastaviti layout na privzeto postavitev?')) {
      return;
    }
    try {
      await api.layout.reset();
      setLayouts(DEFAULT_LAYOUTS);
      setHasUnsavedChanges(false);
      alert('Layout ponastavljen!');
    } catch (err) {
      alert('Napaka pri ponastavljanju layout-a: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

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

  function onLayoutChange(_layout: any, allLayouts: any) {
    setLayouts(allLayouts);
    setHasUnsavedChanges(true);
  }

  const widgets = useMemo(() => {
    const items = [];

    if (hasPermission('view_traffic') || hasPermission('view_system')) {
      items.push({
        key: 'summary',
        component: <SummaryCards snapshot={snapshot} onReboot={hasPermission('system_reboot') ? () => setShowRebootDialog(true) : undefined} />,
      });
    }

    if (hasPermission('view_interfaces')) {
      items.push({ key: 'interfaces', component: <InterfaceList /> });
    }

    if (hasPermission('use_ping')) {
      items.push({ key: 'ping', component: <PingTester /> });
    }

    if (hasPermission('view_lte')) {
      items.push({ key: 'lte', component: <LteStatus snapshot={snapshot} /> });
    }

    if (hasPermission('view_wlan24')) {
      items.push({ key: 'wlan24', component: <WlanStatus snapshot={snapshot} /> });
    }

    if (hasPermission('view_wlan5')) {
      items.push({ key: 'wlan5', component: <Wlan5Status /> });
    }

    if (hasPermission('view_wlan5_clients')) {
      items.push({ key: 'wlan5clients', component: <Wlan5Clients /> });
    }

    if (hasPermission('view_gps')) {
      items.push({ key: 'gps', component: <GpsMap snapshot={snapshot} /> });
    }

    if (hasPermission('view_sms')) {
      items.push({ key: 'sms', component: <SmsManager /> });
    }

    if (hasPermission('view_logs')) {
      items.push({ key: 'logs', component: <LogViewer /> });
    }

    return items;
  }, [snapshot, user.permissions]);

  const filteredLayouts = useMemo(() => {
    const widgetKeys = widgets.map(w => w.key);
    const filtered: any = {};
    Object.entries(layouts).forEach(([breakpoint, layout]) => {
      filtered[breakpoint] = layout.filter((item: Layout) => widgetKeys.includes(item.i));
    });
    return filtered;
  }, [layouts, widgets]);

  if (widgets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-slate-400">{t('noPermission')}</p>
        <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">{t('contactAdmin')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" ref={containerRef}>
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        {snapshot && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Osveženo: {new Date(snapshot.snapshot_ts).toLocaleTimeString('sl-SI')}
          </p>
        )}
        <div className="flex gap-2">
          {hasUnsavedChanges && (
            <button
              onClick={saveLayout}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"
            >
              <Save className="w-4 h-4" />
              Shrani postavitev
            </button>
          )}
          <button
            onClick={resetLayout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Ponastavi
          </button>
        </div>
      </div>

      <Responsive
        className="layout"
        layouts={filteredLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        width={width}
        rowHeight={70}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        onLayoutChange={onLayoutChange}
      >
        {widgets.map(widget => (
          <div key={widget.key} className="grid-item">
            <div className="drag-handle absolute top-0 left-0 right-0 h-10 cursor-move bg-gradient-to-b from-black/5 to-transparent dark:from-white/5 hover:from-blue-500/20 dark:hover:from-blue-500/20 rounded-t-lg z-10" />
            {widget.component}
          </div>
        ))}
      </Responsive>

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
