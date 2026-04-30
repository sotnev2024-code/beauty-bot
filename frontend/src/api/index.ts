import axios, { type AxiosInstance } from 'axios';

import type {
  BookingDetail,
  ClientDetail,
  ClientListItem,
  ConversationDetail,
  ConversationSummary,
  DashboardData,
  FunnelDetail,
  FunnelPresetSummary,
  FunnelSummary,
  Master,
  MasterUpdate,
  OverviewData,
  ScheduleBreak,
  ScheduleEntry,
  Service,
  ServiceCreate,
  SlotsResponse,
  TimeOff,
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
  update: (id: number, payload: Partial<ServiceCreate>) =>
    api.patch<Service>(`/services/${id}`, payload).then((r) => r.data),
  remove: (id: number) => api.delete(`/services/${id}`).then(() => undefined),
};

export const Schedule = {
  get: () =>
    api
      .get<{
        schedules: ScheduleEntry[];
        breaks: ScheduleBreak[];
        time_offs: TimeOff[];
      }>('/schedule')
      .then((r) => r.data),
  replace: (entries: ScheduleEntry[]) =>
    api.put<ScheduleEntry[]>('/schedule', entries).then((r) => r.data),
  addBreak: (payload: { weekday: number; start_time: string; end_time: string }) =>
    api.post<ScheduleBreak>('/schedule/breaks', payload).then((r) => r.data),
  removeBreak: (id: number) =>
    api.delete(`/schedule/breaks/${id}`).then(() => undefined),
  addTimeOff: (payload: { date_from: string; date_to: string; reason?: string }) =>
    api.post<TimeOff>('/schedule/time-offs', payload).then((r) => r.data),
  removeTimeOff: (id: number) =>
    api.delete(`/schedule/time-offs/${id}`).then(() => undefined),
};

export const Funnels = {
  presets: () => api.get<FunnelPresetSummary[]>('/funnels/presets').then((r) => r.data),
  list: () => api.get<FunnelSummary[]>('/funnels').then((r) => r.data),
  get: (id: number) => api.get<FunnelDetail>(`/funnels/${id}`).then((r) => r.data),
  seed: (preset_key: string, activate = true) =>
    api
      .post<FunnelDetail>('/funnels/seed-preset', { preset_key, activate })
      .then((r) => r.data),
  update: (id: number, payload: Partial<FunnelDetail>) =>
    api.patch<FunnelDetail>(`/funnels/${id}`, payload).then((r) => r.data),
  remove: (id: number) => api.delete(`/funnels/${id}`).then(() => undefined),
};

export const BusinessConnections = {
  status: () =>
    api.get<{ enabled: boolean }>('/business-connections/status').then((r) => r.data),
};

export const Bookings = {
  list: (params?: { from_date?: string; to_date?: string }) =>
    api.get<BookingDetail[]>('/bookings', { params }).then((r) => r.data),
  create: (payload: {
    service_id: number;
    client_telegram_id: number;
    client_name?: string;
    client_phone?: string;
    starts_at: string;
  }) => api.post<BookingDetail>('/bookings', payload).then((r) => r.data),
  reschedule: (id: number, starts_at: string) =>
    api.patch<BookingDetail>(`/bookings/${id}`, { starts_at }).then((r) => r.data),
  cancel: (id: number) => api.delete(`/bookings/${id}`).then(() => undefined),
};

export const Clients = {
  list: (params?: { q?: string; segment?: string }) =>
    api.get<ClientListItem[]>('/clients', { params }).then((r) => r.data),
  get: (id: number) => api.get<ClientDetail>(`/clients/${id}`).then((r) => r.data),
  update: (id: number, payload: { name?: string; phone?: string; notes?: string }) =>
    api.patch<ClientDetail>(`/clients/${id}`, payload).then((r) => r.data),
  addTag: (id: number, tag: string) =>
    api.post<string[]>(`/clients/${id}/tags`, { tag }).then((r) => r.data),
};

export const Conversations = {
  list: () => api.get<ConversationSummary[]>('/conversations').then((r) => r.data),
  get: (id: number) =>
    api.get<ConversationDetail>(`/conversations/${id}`).then((r) => r.data),
  takeover: (id: number, hours?: number) =>
    api
      .post<ConversationDetail>(`/conversations/${id}/takeover`, { hours })
      .then((r) => r.data),
  release: (id: number) =>
    api.post<ConversationDetail>(`/conversations/${id}/release`).then((r) => r.data),
};

export const Slots = {
  list: (params: { service_id: number; from_date?: string; days_ahead?: number }) =>
    api.get<SlotsResponse>('/slots', { params }).then((r) => r.data),
  lock: (service_id: number, starts_at: string) =>
    api
      .post<{
        locked: boolean;
        starts_at: string;
        ends_at: string;
        alternative: { starts_at: string; ends_at: string } | null;
      }>('/slots/lock', { service_id, starts_at })
      .then((r) => r.data),
};

export const Analytics = {
  dashboard: () => api.get<DashboardData>('/analytics/dashboard').then((r) => r.data),
  overview: (params?: { from_date?: string; to_date?: string }) =>
    api.get<OverviewData>('/analytics/overview', { params }).then((r) => r.data),
};
