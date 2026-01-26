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

  logs: {
    get: (params?: { category?: string; severity?: string; search?: string; limit?: number; offset?: number }) => {
      const query = new URLSearchParams();
      if (params?.category) query.append('category', params.category);
      if (params?.severity) query.append('severity', params.severity);
      if (params?.search) query.append('search', params.search);
      if (params?.limit) query.append('limit', params.limit.toString());
      if (params?.offset) query.append('offset', params.offset.toString());

      return apiFetch(`/logs?${query.toString()}`) as Promise<{ logs: Log[]; count: number }>;
    },
  },

  traffic: {
    get: (params?: { period?: string; interface?: string }): Promise<TrafficData> => {
      const query = new URLSearchParams();
      if (params?.period) query.append('period', params.period);
      if (params?.interface) query.append('interface', params.interface);

      return apiFetch(`/traffic?${query.toString()}`);
    },
  },

  ping: {
    send: (address: string, count?: number) =>
      apiFetch('/ping', {
        method: 'POST',
        body: JSON.stringify({ address, count }),
      }),
  },

  users: {
    list: (): Promise<{ users: User[] }> =>
      apiFetch('/users'),

    create: (data: { username: string; password: string; permissions?: string[]; is_active?: boolean }) =>
      apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: { password?: string; permissions?: string[]; is_active?: boolean }) =>
      apiFetch(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiFetch(`/users/${id}`, { method: 'DELETE' }),
  },
};
