import axios, { type AxiosInstance } from 'axios';

import type {
  BookingDetail,
  BotSettings as BotSettingsType,
  BotSettingsUpdate,
  ClientDetail,
  ClientListItem,
  ConversationDetail,
  ConversationSummary,
  DashboardData,
  KnowledgeItem,
  KnowledgeItemCreate,
  Master,
  MasterUpdate,
  OverviewData,
  ReturnCampaign,
  ReturnSettings,
  ReturnSettingsUpdate,
  ScheduleBreak,
  ScheduleEntry,
  Service,
  ServiceCategory,
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
  onboardingStatus: () =>
    api
      .get<import('./types').OnboardingStatus>('/me/onboarding-status')
      .then((r) => r.data),
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

export const TestDialog = {
  send: (payload: {
    history: { role: 'user' | 'assistant'; text: string }[];
    user_message: string;
    funnel_id?: number;
    step_position?: number;
  }) =>
    api
      .post<{
        reply: string;
        actions: { type: string; [k: string]: unknown }[];
        escalate: boolean;
        collected_data: Record<string, unknown>;
      }>('/test/dialog', payload)
      .then((r) => r.data),
};

export const BotSettings = {
  get: () => api.get<BotSettingsType>('/bot/settings').then((r) => r.data),
  update: (payload: BotSettingsUpdate) =>
    api.patch<BotSettingsType>('/bot/settings', payload).then((r) => r.data),
  enable: () => api.post<BotSettingsType>('/bot/enable').then((r) => r.data),
  disable: () => api.post<BotSettingsType>('/bot/disable').then((r) => r.data),
};

export const Categories = {
  list: () => api.get<ServiceCategory[]>('/categories').then((r) => r.data),
  create: (payload: { name: string; position?: number }) =>
    api.post<ServiceCategory>('/categories', payload).then((r) => r.data),
  update: (id: number, payload: { name?: string; position?: number }) =>
    api.patch<ServiceCategory>(`/categories/${id}`, payload).then((r) => r.data),
  remove: (id: number) => api.delete(`/categories/${id}`).then(() => undefined),
  reorder: (ordered_ids: number[]) =>
    api
      .post<ServiceCategory[]>('/categories/reorder', { ordered_ids })
      .then((r) => r.data),
};

export const Knowledge = {
  list: () => api.get<KnowledgeItem[]>('/bot/knowledge').then((r) => r.data),
  create: (payload: KnowledgeItemCreate) =>
    api.post<KnowledgeItem>('/bot/knowledge', payload).then((r) => r.data),
  update: (id: number, payload: Partial<KnowledgeItemCreate>) =>
    api.patch<KnowledgeItem>(`/bot/knowledge/${id}`, payload).then((r) => r.data),
  remove: (id: number) =>
    api.delete(`/bot/knowledge/${id}`).then(() => undefined),
};

export const ReturnSettingsApi = {
  get: () => api.get<ReturnSettings>('/bot/return-settings').then((r) => r.data),
  update: (payload: ReturnSettingsUpdate) =>
    api.patch<ReturnSettings>('/bot/return-settings', payload).then((r) => r.data),
  enable: () =>
    api.post<ReturnSettings>('/bot/return-settings/enable').then((r) => r.data),
  disable: () =>
    api.post<ReturnSettings>('/bot/return-settings/disable').then((r) => r.data),
};

export const BotReminders = {
  enable: () => api.post<BotSettingsType>('/bot/reminders/enable').then((r) => r.data),
  disable: () =>
    api.post<BotSettingsType>('/bot/reminders/disable').then((r) => r.data),
};

export const ReturnCampaigns = {
  list: (params?: { status?: string; from_date?: string; to_date?: string }) =>
    api
      .get<ReturnCampaign[]>('/bot/return-campaigns', { params })
      .then((r) => r.data),
  forClient: (clientId: number) =>
    api
      .get<ReturnCampaign[]>(`/clients/${clientId}/return-history`)
      .then((r) => r.data),
};

export const Billing = {
  plan: () => api.get<import('./types').PlanInfo>('/billing/plan').then((r) => r.data),
  history: () =>
    api.get<import('./types').PaymentRow[]>('/billing/history').then((r) => r.data),
  roi: () => api.get<import('./types').RoiData>('/billing/roi').then((r) => r.data),
  checkout: (plan: 'pro' | 'pro_plus', annual = false) =>
    api
      .post<import('./types').CheckoutResponse>('/billing/checkout', { plan, annual })
      .then((r) => r.data),
};
