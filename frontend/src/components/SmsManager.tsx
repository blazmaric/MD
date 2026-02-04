import { useState, useEffect } from 'react';
import { MessageSquare, Send, RefreshCw, Trash2 } from 'lucide-react';
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
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

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

  async function handleDelete(msgId: string) {
    setDeleting(msgId);
    try {
      await api.sms.delete(msgId);
      await fetchInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete SMS');
      setTimeout(() => setError(''), 3000);
    } finally {
      setDeleting(null);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSending(true);

    try {
      await api.sms.send(phone, message);
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
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('sms')}</h3>
      </div>

      <form onSubmit={handleSend} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('phoneNumber')}
          className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          required
        />
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('message')}
          maxLength={160}
          className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          required
        />
        <button
          type="submit"
          disabled={sending}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          {sending ? t('sending') : t('send')}
        </button>
      </form>

      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('smsInbox')}</h4>
        <button
          onClick={fetchInbox}
          disabled={loading}
          className="p-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-center py-4 text-sm text-slate-600 dark:text-slate-400">{t('noMessages')}</p>
        ) : (
          messages.map((msg) => (
            <div key={msg['.id']} className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
              <div className="flex justify-between items-start gap-2 mb-1">
                <span className="font-medium text-sm text-slate-900 dark:text-slate-100">{msg.phone}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{msg.timestamp}</span>
                  <button
                    onClick={() => handleDelete(msg['.id'])}
                    disabled={deleting === msg['.id']}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">{msg.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
