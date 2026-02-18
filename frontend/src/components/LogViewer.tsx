import { useState, useEffect } from 'react';
import { Search, AlertCircle, AlertTriangle, Info, FileText } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../LanguageContext';
import type { Log } from '../types';

const LOGS_PER_PAGE = 10;

export default function LogViewer() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<Log[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [category, severity, currentPage]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const data = await api.logs.get({
        category: category || undefined,
        severity: severity || undefined,
        search: search || undefined,
        limit: LOGS_PER_PAGE,
        offset: (currentPage - 1) * LOGS_PER_PAGE
      });
      setLogs(data.logs);
      setTotalCount(data.count);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  }

  const totalPages = Math.ceil(totalCount / LOGS_PER_PAGE);
  const pageNumbers = [];
  const maxPagesToShow = 7;

  if (totalPages <= maxPagesToShow) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    if (currentPage <= 3) {
      for (let i = 1; i <= 5; i++) pageNumbers.push(i);
      pageNumbers.push(-1);
      pageNumbers.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pageNumbers.push(1);
      pageNumbers.push(-1);
      for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      pageNumbers.push(1);
      pageNumbers.push(-1);
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i);
      pageNumbers.push(-1);
      pageNumbers.push(totalPages);
    }
  }

  function getSeverityColor(sev: string): string {
    switch (sev) {
      case 'error': return 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
      case 'warning': return 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
      default: return 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
    }
  }

  function getSeverityIcon(sev: string) {
    switch (sev) {
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t('logs')}</h3>
        </div>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchLogs')}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="">{t('allCategories')}</option>
            <option value="wifi">WiFi</option>
            <option value="vpn">VPN</option>
            <option value="firewall">Firewall</option>
            <option value="lte">LTE</option>
            <option value="dns">DNS</option>
            <option value="auth">Auth</option>
            <option value="system">System</option>
            <option value="network">Network</option>
          </select>

          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="">{t('allSeverities')}</option>
            <option value="error">{t('error')}</option>
            <option value="warning">{t('warning')}</option>
            <option value="info">{t('info')}</option>
          </select>

          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {t('search')}
          </button>
        </form>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-600 dark:text-slate-400">{t('loadingLogs')}</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-600 dark:text-slate-400">{t('noLogsFound')}</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                  {t('time')}
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                  {t('category')}
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                  {t('severity')}
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                  {t('messageLog')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-2 py-2 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                    <div className="font-mono">
                      {new Date(log.log_time).toLocaleString('sl-SI', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {log.category}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getSeverityColor(log.severity)}`}>
                      {getSeverityIcon(log.severity)}
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-900 dark:text-slate-100">
                    <div className="break-words">
                      {log.message}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && !loading && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {t('showingLogs')} {((currentPage - 1) * LOGS_PER_PAGE) + 1} {t('toLogs')} {Math.min(currentPage * LOGS_PER_PAGE, totalCount)} {t('ofLogs')} {totalCount} {t('logsText')}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-slate-700 dark:text-slate-300"
            >
              {t('previous')}
            </button>
            {pageNumbers.map((pageNum, idx) => (
              pageNum === -1 ? (
                <span key={`ellipsis-${idx}`} className="px-3 py-1 text-slate-400">...</span>
              ) : (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 border rounded text-sm ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {pageNum}
                </button>
              )
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-slate-700 dark:text-slate-300"
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
