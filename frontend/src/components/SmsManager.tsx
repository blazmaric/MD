import { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw } from 'lucide-react';
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
        <div className="p-6">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase">{t('smsReceived')}</h4>
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-center py-8 text-sm text-slate-600 dark:text-slate-400">{t('noMessages')}</p>
            ) : (
              messages.slice(0, 4).map((msg) => (
                <div key={msg['.id']} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{msg.phone}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{msg.timestamp}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{msg.message}</p>
                </div>
              ))
            )}
            {messages.length > 4 && (
              <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
                {messages.length - 4} {t('moreMessages')}
              </p>
            )}
          </div>
        </div>

        <div className="p-6">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase">{t('smsSendLabel')}</h4>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+386"
                className="w-full px-4 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                required
              />
            </div>
            <div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('messagePlaceholder')}
                rows={6}
                maxLength={160}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                required
              />
            </div>
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={sending}
              className="w-full px-6 py-3 bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white text-sm rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {sending ? t('smsSending') : t('smsSend')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
