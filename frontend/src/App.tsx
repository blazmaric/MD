import { useState, useEffect } from 'react';
import { Globe, Moon, Sun, Menu, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [view]);

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

  const canManageUsers = user.is_admin;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
                MikroTik
              </h1>
              {canManageUsers && (
                <div className="hidden lg:flex space-x-2">
                  <button
                    onClick={() => setView('dashboard')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      view === 'dashboard'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t('dashboard')}
                  </button>
                  <button
                    onClick={() => setView('users')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      view === 'users'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t('users')}
                  </button>
                </div>
              )}
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title={theme === 'light' ? 'Dark mode' : 'Light mode'}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setLanguage(language === 'sl' ? 'en' : 'sl')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Change language / Spremeni jezik"
              >
                <Globe className="w-4 h-4" />
                {language.toUpperCase()}
              </button>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 px-2">{user.username}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                {t('logout')}
              </button>
            </div>
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title={theme === 'light' ? 'Dark mode' : 'Light mode'}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="px-4 py-3 space-y-2">
              {canManageUsers && (
                <>
                  <button
                    onClick={() => {
                      setView('dashboard');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      view === 'dashboard'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t('dashboard')}
                  </button>
                  <button
                    onClick={() => {
                      setView('users');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      view === 'users'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t('users')}
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
                </>
              )}
              <button
                onClick={() => {
                  setLanguage(language === 'sl' ? 'en' : 'sl');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Globe className="w-5 h-5" />
                <span>Jezik / Language: {language.toUpperCase()}</span>
              </button>
              <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
              <div className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                Uporabnik / User: <span className="font-medium text-slate-900 dark:text-slate-100">{user.username}</span>
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors"
              >
                {t('logout')}
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'dashboard' ? (
          <Dashboard user={user} />
        ) : (
          <UsersPage currentUser={user} />
        )}
      </main>
    </div>
  );
}
