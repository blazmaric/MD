import { Network } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

interface Interface {
  '.id': string;
  name: string;
  type: string;
  running: string;
  disabled: string;
  'actual-mtu'?: string;
  'link-rate'?: string;
  traffic?: {
    'rx-bits-per-second'?: string;
    'tx-bits-per-second'?: string;
  };
}

interface InterfaceListProps {
  interfaces: Interface[];
  publicIp: string | null;
}

export default function InterfaceList({ interfaces: propInterfaces, publicIp }: InterfaceListProps) {
  const { t } = useLanguage();

  const sortedInterfaces = [...propInterfaces].sort((a: Interface, b: Interface) => {
    const aMatch = a.name.match(/^ether(\d+)/);
    const bMatch = b.name.match(/^ether(\d+)/);
    const aNum = aMatch ? parseInt(aMatch[1]) : 0;
    const bNum = bMatch ? parseInt(bMatch[1]) : 0;
    return aNum - bNum;
  });

  const interfaces = sortedInterfaces;

  function formatBitsPerSecond(bps?: string | number): string {
    const numBps = Number(bps);
    if (isNaN(numBps) || numBps == null || numBps === 0) return '0 bps';

    const units = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    let i = 0;
    let value = numBps;

    while (value >= 1000 && i < units.length - 1) {
      value /= 1000;
      i++;
    }

    return `${value.toFixed(1)} ${units[i]}`;
  }

  function getStatusColor(iface: Interface): string {
    if (iface.disabled === 'true') return 'bg-slate-400 dark:bg-slate-600';
    if (iface.running === 'true') return 'bg-green-500 dark:bg-green-600';
    return 'bg-red-500 dark:bg-red-600';
  }

  function getStatusBadge(iface: Interface): string {
    if (iface.disabled === 'true') return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    if (iface.running === 'true') return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  }

  function getStatusText(iface: Interface): string {
    if (iface.disabled === 'true') return t('disabled');
    if (iface.running === 'true') return t('up');
    return t('down');
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Network className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('interfaceStatus')}
        </h3>
      </div>

      <div className="p-3">
        <div className="space-y-2">
          {interfaces.map((iface) => (
            <div
              key={iface['.id']}
              className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-200 dark:border-slate-600"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(iface)}`} />
                  <span className="font-medium text-sm text-slate-900 dark:text-slate-100">{iface.name}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${getStatusBadge(iface)}`}>
                  {getStatusText(iface)}
                </span>
              </div>
              {iface.running === 'true' && iface.traffic && (
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 pl-4">
                  <span>RX: {formatBitsPerSecond(iface.traffic['rx-bits-per-second'])}</span>
                  <span>TX: {formatBitsPerSecond(iface.traffic['tx-bits-per-second'])}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {interfaces.length === 0 && (
          <p className="text-center py-6 text-sm text-slate-600 dark:text-slate-400">{t('noInterfacesFound')}</p>
        )}
      </div>
    </div>
  );
}
