// API DTOs — kept hand-written and synced with backend Pydantic schemas.

export type Plan = 'trial' | 'pro' | 'pro_plus';
export type FunnelType = 'main' | 'return' | 'cold';
export type ConversationState = 'bot' | 'human_takeover';
export type MessageDirection = 'in' | 'out' | 'master';
export type BookingStatus = 'scheduled' | 'done' | 'cancelled' | 'no_show';

export interface Master {
  id: number;
  telegram_id: number;
  telegram_username: string | null;
  name: string | null;
  niche: string | null;
  timezone: string;
  plan: Plan;
  trial_ends_at: string | null;
  subscription_active_until: string | null;
  bot_enabled: boolean;
  voice: string | null;
  greeting: string | null;
  rules: string | null;
  created_at: string;
}

export interface MasterUpdate {
  name?: string;
  niche?: string;
  timezone?: string;
  voice?: string;
  greeting?: string;
  rules?: string;
  bot_enabled?: boolean;
}

export interface Service {
  id: number;
  name: string;
  duration_minutes: number;
  price: string;
  description: string | null;
  group: string | null;
  is_active: boolean;
}

export interface ServiceCreate {
  name: string;
  duration_minutes: number;
  price: string;
  description?: string;
  group?: string;
  is_active?: boolean;
}

export interface ScheduleEntry {
  id?: number;
  weekday: number;
  start_time: string; // HH:MM
  end_time: string;
  is_working: boolean;
}

export interface FunnelPresetSummary {
  key: string;
  name: string;
  type: FunnelType;
  steps_count: number;
}

export interface FunnelSummary {
  id: number;
  name: string;
  type: FunnelType;
  is_active: boolean;
  preset_key: string | null;
}

export interface DashboardData {
  today_bookings: number;
  today_revenue: string;
  week_bookings: number;
  week_revenue: string;
  pending_takeovers: number;
  bot_enabled: boolean;
}

export interface BookingDetail {
  id: number;
  service_id: number | null;
  client_id: number;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  price: string | null;
  source: string | null;
  notes: string | null;
  client_name: string | null;
  client_phone: string | null;
  service_name: string | null;
}

export interface ClientListItem {
  id: number;
  telegram_id: number;
  name: string | null;
  phone: string | null;
  notes: string | null;
  visits_total: number;
  last_visit_at: string | null;
  segments: string[];
}

export interface ConversationSummary {
  id: number;
  client_id: number;
  client_name: string | null;
  state: ConversationState;
  takeover_until: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
}
