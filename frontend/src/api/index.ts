import axios, { type AxiosInstance } from 'axios';

import type {
  BookingDetail,
  ClientListItem,
  ConversationSummary,
  DashboardData,
  FunnelPresetSummary,
  FunnelSummary,
  Master,
  MasterUpdate,
  ScheduleEntry,
  Service,
  ServiceCreate,
} from './types';

export type { Master, MasterUpdate, Service, ServiceCreate } from './types';

function makeClient(): AxiosInstance {
  const inst = axios.create({
    baseURL: '/api',
    timeout: 15_000,
  });
  inst.interceptors.request.use((config) => {
    const initData = window.Telegram?.WebApp?.initData;
    if (initData) {
      config.headers.set?.('X-Telegram-Init-Data', initData);
    }
    return config;
  });
  return inst;
}

export const api = makeClient();

export const Me = {
  get: () => api.get<Master>('/me').then((r) => r.data),
  update: (payload: MasterUpdate) =>
    api.patch<Master>('/me', payload).then((r) => r.data),
};

export const Services = {
  list: () => api.get<Service[]>('/services').then((r) => r.data),
  create: (payload: ServiceCreate) =>
    api.post<Service>('/services', payload).then((r) => r.data),
  remove: (id: number) => api.delete(`/services/${id}`).then(() => undefined),
};

export const Schedule = {
  get: () =>
    api
      .get<{ schedules: ScheduleEntry[]; breaks: unknown[]; time_offs: unknown[] }>(
        '/schedule'
      )
      .then((r) => r.data),
  replace: (entries: ScheduleEntry[]) =>
    api.put<ScheduleEntry[]>('/schedule', entries).then((r) => r.data),
};

export const Funnels = {
  presets: () => api.get<FunnelPresetSummary[]>('/funnels/presets').then((r) => r.data),
  list: () => api.get<FunnelSummary[]>('/funnels').then((r) => r.data),
  seed: (preset_key: string, activate = true) =>
    api
      .post<FunnelSummary>('/funnels/seed-preset', { preset_key, activate })
      .then((r) => r.data),
};

export const BusinessConnections = {
  // We poll /me — connections are reflected on the master via internal logic;
  // for now we expose a placeholder. A dedicated /api/business-connections
  // endpoint will land in Stage 9 alongside the connect screen polish.
  status: () => api.get<{ enabled: boolean }>('/business-connections/status').then((r) => r.data),
};

export const Bookings = {
  list: (params?: { from_date?: string; to_date?: string }) =>
    api
      .get<BookingDetail[]>('/bookings', { params })
      .then((r) => r.data),
};

export const Clients = {
  list: (params?: { q?: string; segment?: string }) =>
    api
      .get<ClientListItem[]>('/clients', { params })
      .then((r) => r.data),
};

export const Conversations = {
  list: () => api.get<ConversationSummary[]>('/conversations').then((r) => r.data),
};

export const Analytics = {
  dashboard: () => api.get<DashboardData>('/analytics/dashboard').then((r) => r.data),
};
