import { useState, useEffect } from 'react';
import { Globe, Moon, Sun } from 'lucide-react';
import { api } from './api';
import { useLanguage } from './LanguageContext';
import { useTheme } from './ThemeContext';
import type { User } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UsersPage from './components/UsersPage';

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'users'>('dashboard');

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const userData = await api.auth.me();
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(username: string, password: string) {
    const result = await api.auth.login(username, password);
    setUser(result.user);
  }

  async function handleLogout() {
    try {
      await api.auth.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setView('dashboard');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-slate-600 dark:text-slate-400">{t('loading')}</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const canManageUsers = user.permissions.includes('manage_users') || user.permissions.includes('admin_all');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">MikroTik {t('dashboard')}</h1>
              <div className="flex space-x-4">
                <button
                  onClick={() => setView('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    view === 'dashboard'
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {t('dashboard')}
                </button>
                {canManageUsers && (
                  <button
                    onClick={() => setView('users')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      view === 'users'
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {t('users')}
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                title={theme === 'light' ? 'Dark mode' : 'Light mode'}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setLanguage(language === 'sl' ? 'en' : 'sl')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                title="Change language / Spremeni jezik"
              >
                <Globe className="w-4 h-4" />
                {language.toUpperCase()}
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400">{user.username}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'dashboard' ? (
          <Dashboard user={user} />
        ) : (
          <UsersPage />
        )}
      </main>
    </div>
  );
}
