import { useState, useEffect } from 'react';
import { UserPlus, Edit, Trash2, Shield, Ban } from 'lucide-react';
import { api } from '../api';
import type { User } from '../types';

const ALL_PERMISSIONS = [
  { value: 'admin_all', label: 'Admin (All Permissions)', group: 'Admin' },
  { value: 'view_system_status', label: 'View System Status Card', group: 'Dashboard' },
  { value: 'view_lte_status', label: 'View LTE Status Card', group: 'Dashboard' },
  { value: 'view_wlan_status', label: 'View WLAN 2.4 Status Card', group: 'Dashboard' },
  { value: 'view_wlan5_status', label: 'View WLAN 5 Status Card', group: 'Dashboard' },
  { value: 'view_wlan5_clients', label: 'View WLAN5 Clients', group: 'Dashboard' },
  { value: 'view_interface_list', label: 'View Interface List', group: 'Dashboard' },
  { value: 'view_summary_cards', label: 'View Summary Cards (Usage & Speed)', group: 'Dashboard' },
  { value: 'view_gps', label: 'View GPS Location', group: 'Dashboard' },
  { value: 'view_traffic', label: 'View Traffic Chart', group: 'Features' },
  { value: 'view_logs', label: 'View System Logs', group: 'Features' },
  { value: 'view_sms', label: 'View SMS Inbox', group: 'Features' },
  { value: 'send_sms', label: 'Send & Delete SMS', group: 'Features' },
  { value: 'use_ping', label: 'Use Ping Tester', group: 'Features' },
  { value: 'manage_wifi', label: 'Manage WiFi (Scan & Connect)', group: 'Features' },
  { value: 'manage_users', label: 'Manage Users', group: 'Admin' },
  { value: 'system_reboot', label: 'System Reboot', group: 'Admin' },
];

interface UsersPageProps {
  currentUser: User;
}

export default function UsersPage({ currentUser }: UsersPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    permissions: [] as string[],
    is_active: true
  });
  const [error, setError] = useState('');

  const isAdmin = currentUser.permissions.includes('admin_all');
  const AVAILABLE_PERMISSIONS = isAdmin
    ? ALL_PERMISSIONS
    : ALL_PERMISSIONS.filter(p => p.value !== 'admin_all' && p.value !== 'manage_users' && p.value !== 'system_reboot');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const data = await api.users.list();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingUser(null);
    setFormData({ username: '', password: '', permissions: [], is_active: true });
    setError('');
    setShowModal(true);
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      permissions: user.permissions,
      is_active: user.is_active ?? true
    });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      if (editingUser) {
        await api.users.update(editingUser.id, {
          password: formData.password || undefined,
          permissions: formData.permissions,
          is_active: formData.is_active
        });
      } else {
        await api.users.create(formData);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  }

  async function handleDisable(user: User) {
    if (!confirm(`Are you sure you want to disable user "${user.username}"?`)) {
      return;
    }

    try {
      await api.users.disable(user.id);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable user');
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE user "${user.username}"? This action cannot be undone!`)) {
      return;
    }

    try {
      await api.users.delete(user.id);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  }

  function togglePermission(permission: string) {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">User Management</h2>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {error && !showModal && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-600 dark:text-slate-400">Loading users...</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Shield className="w-5 h-5 text-slate-400 mr-2" />
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.map((perm) => (
                        <span
                          key={perm}
                          className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.is_active
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        title="Edit user"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user.is_active ? (
                        <button
                          onClick={() => handleDisable(user)}
                          className="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300"
                          title="Disable user"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleDelete(user)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        title="Permanently delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                {editingUser ? 'Edit User' : 'Create User'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    required
                    disabled={!!editingUser}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Password {editingUser && '(leave empty to keep current)'}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    required={!editingUser}
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Permissions
                  </label>
                  <div className="space-y-4">
                    {['Admin', 'Dashboard', 'Features'].map((group) => (
                      <div key={group}>
                        <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-2">{group}</h4>
                        <div className="space-y-2 pl-2">
                          {AVAILABLE_PERMISSIONS.filter(p => p.group === group).map((perm) => (
                            <label key={perm.value} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.permissions.includes(perm.value)}
                                onChange={() => togglePermission(perm.value)}
                                className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">Active</span>
                  </label>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-400">
                    {error}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {editingUser ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
