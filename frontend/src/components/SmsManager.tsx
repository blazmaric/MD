import { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../LanguageContext';
import type { SmsMessage } from '../types';

export default function SmsManager() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const messagesPerPage = 4;

  useEffect(() => {
    fetchInbox();
  }, []);

  async function fetchInbox() {
    setLoading(true);
    try {
      const data = await api.sms.inbox();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to fetch SMS inbox:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSending(true);

    try {
      await api.sms.send(phone, message);
      setSuccess(`SMS uspešno poslan na ${phone}`);
      setPhone('');
      setMessage('');
      setTimeout(() => setSuccess(''), 5000);
      fetchInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(msgId: string) {
    try {
      await api.sms.delete(msgId);
      fetchInbox();
    } catch (err) {
      console.error('Failed to delete SMS:', err);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-pink-600 dark:text-pink-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('smsMessages')}</h3>
        </div>
        <button
          onClick={fetchInbox}
          disabled={loading}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors"
          title={t('refresh')}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700">
        <div className="p-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">{t('smsReceived')}</h4>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-center py-3 text-xs text-slate-600 dark:text-slate-400">{t('noMessages')}</p>
            ) : (
              <>
                {messages.slice(currentPage * messagesPerPage, (currentPage + 1) * messagesPerPage).map((msg) => (
                  <div key={msg['.id']} className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-200 dark:border-slate-600">
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">{msg.phone}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(msg.timestamp).toLocaleString('sl-SI', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          }).replace(',', '')}
                        </span>
                        <button
                          onClick={() => handleDelete(msg['.id'])}
                          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{msg.message}</p>
                  </div>
                ))}
                {messages.length > messagesPerPage && (
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded disabled:opacity-50"
                    >
                      {t('previous')}
                    </button>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {t('pageOf').replace('{current}', String(currentPage + 1)).replace('{total}', String(Math.ceil(messages.length / messagesPerPage)))}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(Math.ceil(messages.length / messagesPerPage) - 1, currentPage + 1))}
                      disabled={currentPage >= Math.ceil(messages.length / messagesPerPage) - 1}
                      className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded disabled:opacity-50"
                    >
                      {t('next')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="p-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">{t('smsSendLabel')}</h4>
          <form onSubmit={handleSend} className="space-y-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+386"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              required
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('messagePlaceholder')}
              rows={2}
              maxLength={160}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
              required
            />
            {error && (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-red-700 dark:text-red-400 text-xs">
                {error}
              </div>
            )}
            {success && (
              <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded text-green-700 dark:text-green-400 text-xs">
                {success}
              </div>
            )}
            <button
              type="submit"
              disabled={sending}
              className="w-full px-4 py-2 bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white text-xs rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow hover:shadow-md"
            >
              {sending ? t('smsSending') : t('smsSend')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
