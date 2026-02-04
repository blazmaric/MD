import { useState, useEffect } from 'react';
import { MessageSquare, Send, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useLanguage } from '../LanguageContext';
import type { SmsMessage } from '../types';

const SMS_PER_PAGE = 4;

export default function SmsManager() {
  const { t } = useLanguage();
  const [allMessages, setAllMessages] = useState<SmsMessage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchInbox();
  }, []);

  async function fetchInbox() {
    setLoading(true);
    try {
      const data = await api.sms.inbox();
      setAllMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to fetch SMS inbox:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(msgId: string) {
    if (!confirm(t('confirmDeleteSms'))) return;

    setDeleting(msgId);
    try {
      await api.sms.delete(msgId);
      await fetchInbox();
      setSuccess(t('smsDeleted'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete SMS');
    } finally {
      setDeleting(null);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSending(true);

    try {
      await api.sms.send(phone, message);
      setSuccess(t('smsSent'));
      setPhone('');
      setMessage('');
      fetchInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {t('sendSms')}
          </h3>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('phoneNumber')}
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+386..."
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('message')}
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={160}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              required
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{message.length}/160 {t('characters')}</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400 text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? t('sending') : t('send')}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('smsInbox')}</h3>
          <button
            onClick={fetchInbox}
            disabled={loading}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-50"
            title={t('refresh')}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {allMessages.length === 0 ? (
          <p className="text-center py-8 text-slate-600 dark:text-slate-400">{t('noMessages')}</p>
        ) : (
          <>
            <div className="space-y-3">
              {allMessages.slice((currentPage - 1) * SMS_PER_PAGE, currentPage * SMS_PER_PAGE).map((msg) => (
                <div key={msg['.id']} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{msg.phone}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{msg.timestamp}</span>
                      <button
                        onClick={() => handleDelete(msg['.id'])}
                        disabled={deleting === msg['.id']}
                        className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50"
                        title={t('deleteSms')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{msg.message}</p>
                </div>
              ))}
            </div>

            {Math.ceil(allMessages.length / SMS_PER_PAGE) > 1 && (
              <div className="mt-4 flex items-center justify-between border-t dark:border-slate-700 pt-4">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('showing')} {((currentPage - 1) * SMS_PER_PAGE) + 1} {t('to')} {Math.min(currentPage * SMS_PER_PAGE, allMessages.length)} {t('of')} {allMessages.length}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-slate-700 dark:text-slate-300"
                  >
                    {t('previous')}
                  </button>
                  {Array.from({ length: Math.ceil(allMessages.length / SMS_PER_PAGE) }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 border rounded text-sm ${
                        currentPage === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(Math.ceil(allMessages.length / SMS_PER_PAGE), currentPage + 1))}
                    disabled={currentPage === Math.ceil(allMessages.length / SMS_PER_PAGE)}
                    className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-slate-700 dark:text-slate-300"
                  >
                    {t('next')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
