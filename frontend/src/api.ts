import type { User, Snapshot, Log, TrafficData } from './types';

async function apiFetch(path: string, options?: RequestInit) {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),

    logout: () =>
      apiFetch('/auth/logout', { method: 'POST' }),

    me: (): Promise<User> =>
      apiFetch('/auth/me'),
  },

  summary: {
    get: (): Promise<Snapshot> =>
      apiFetch('/summary'),
  },

  dashboard: {
    getData: () =>
      apiFetch('/dashboard-data'),
  },

  traffic: {
    get: (params?: { period?: string; interface?: string }): Promise<TrafficData> => {
      const query = new URLSearchParams();
      if (params?.period) query.append('period', params.period);
      if (params?.interface) query.append('interface', params.interface);

      return apiFetch(`/traffic?${query.toString()}`);
    },

    reset: () =>
      apiFetch('/traffic/history', { method: 'DELETE' }),

    getMonthlyUsage: (params?: { year?: number; month?: number }) => {
      const query = new URLSearchParams();
      if (params?.year) query.append('year', params.year.toString());
      if (params?.month) query.append('month', params.month.toString());
      return apiFetch(`/traffic/monthly-usage?${query.toString()}`);
    },

    getAllMonthlyUsage: () =>
      apiFetch('/traffic/monthly-usage/all'),

    getUsageLog: (params?: { period?: string }) => {
      const query = new URLSearchParams();
      if (params?.period) query.append('period', params.period);
      return apiFetch(`/traffic/usage-log?${query.toString()}`);
    },
  },

  ping: {
    send: (address: string, count?: number, sourceInterface?: string) =>
      apiFetch('/ping', {
        method: 'POST',
        body: JSON.stringify({ address, count, interface: sourceInterface }),
      }),
  },

  system: {
    reboot: () =>
      apiFetch('/system/reboot', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
  },

  sms: {
    inbox: () =>
      apiFetch('/sms/inbox'),

    send: (phone: string, message: string) =>
      apiFetch('/sms/send', {
        method: 'POST',
        body: JSON.stringify({ phone, message }),
      }),

    delete: (smsId: string) =>
      apiFetch(`/sms/${smsId}`, { method: 'DELETE' }),
  },

  wifi: {
    checkLte: () =>
      apiFetch('/wifi/lte-check'),

    scan: (force = false) =>
      apiFetch('/wifi/scan', {
        method: 'POST',
        body: JSON.stringify({ force })
      }),

    getScanJob: (jobId: string) =>
      apiFetch(`/wifi/scan-job/${jobId}`),

    getScanResults: (interfaceName?: string) => {
      const query = new URLSearchParams();
      if (interfaceName) query.append('interface', interfaceName);
      return apiFetch(`/wifi/scan-results?${query.toString()}`);
    },

    connect: (ssid: string, password?: string) =>
      apiFetch('/wifi/connect', {
        method: 'POST',
        body: JSON.stringify({ ssid, password }),
      }),

    registrationTable: (interfaceName?: string) => {
      const query = new URLSearchParams();
      if (interfaceName) query.append('interface', interfaceName);
      return apiFetch(`/wifi/registration-table?${query.toString()}`);
    },

    disconnectClient: (clientId: string) =>
      apiFetch(`/wifi/client/${clientId}`, { method: 'DELETE' }),

    wlan5Status: () =>
      apiFetch('/wifi/wlan5/status'),

    wlan24Status: () =>
      apiFetch('/wifi/wlan24/status'),

    getSavedNetworks: (interfaceName = 'wlan24') =>
      apiFetch(`/wifi/saved-networks?interface=${interfaceName}`),

    switchNetwork: (networkId: string, interfaceName = 'wlan24') =>
      apiFetch('/wifi/switch-network', {
        method: 'POST',
        body: JSON.stringify({ networkId, interface: interfaceName }),
      }),
  },

  interfaces: {
    list: () =>
      apiFetch('/interfaces'),
    listAll: () =>
      apiFetch('/interfaces/all'),
  },

  users: {
    list: (): Promise<{ users: User[] }> =>
      apiFetch('/users'),

    create: (data: { username: string; password: string; is_admin?: boolean; is_active?: boolean }) =>
      apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: { password?: string; is_admin?: boolean; is_active?: boolean }) =>
      apiFetch(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    disable: (id: string) =>
      apiFetch(`/users/${id}`, { method: 'DELETE' }),

    delete: (id: string) =>
      apiFetch(`/users/${id}?permanent=true`, { method: 'DELETE' }),
  },

  layout: {
    get: () =>
      apiFetch('/layout'),

    save: (layout: any[]) =>
      apiFetch('/layout', {
        method: 'POST',
        body: JSON.stringify({ layout }),
      }),

    reset: () =>
      apiFetch('/layout', { method: 'DELETE' }),
  },

  gps: {
    get: () =>
      apiFetch('/gps'),
  },
};
