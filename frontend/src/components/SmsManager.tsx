import { useState, useEffect } from 'react';
import { api } from '../api';
import type { SmsMessage } from '../types';

export default function SmsManager() {
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
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">SMS Sporočila</h3>
        <button
          onClick={fetchInbox}
          disabled={loading}
          className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          Osveži
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-700">
        <div className="p-6">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase">PREJETO</h4>
          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-center py-8 text-sm text-slate-600 dark:text-slate-400">Ni sporočil</p>
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
                {messages.length - 4} več sporočil...
              </p>
            )}
          </div>
        </div>

        <div className="p-6">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase">POŠLJI</h4>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+386"
                className="w-full px-4 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                required
              />
            </div>
            <div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Sporočilo..."
                rows={6}
                maxLength={160}
                className="w-full px-4 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 resize-none"
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
              className="w-full px-6 py-3 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'Pošiljam...' : 'Pošlji'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
