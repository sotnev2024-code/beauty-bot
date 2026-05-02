// API DTOs — kept hand-written and synced with backend Pydantic schemas.

export type Plan = 'trial' | 'pro' | 'pro_plus';
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
  address: string | null;
  created_at: string;
}

export interface MasterUpdate {
  name?: string;
  niche?: string;
  timezone?: string;
  address?: string;
  bot_enabled?: boolean;
}

export interface OnboardingStatus {
  profile_done: boolean;
  address_done: boolean;
  schedule_done: boolean;
  services_done: boolean;
  voice_done: boolean;
  business_connected: boolean;
  complete: boolean;
}

export interface Service {
  id: number;
  name: string;
  duration_minutes: number;
  price: string;
  description: string | null;
  group: string | null;
  category_id: number | null;
  reminder_after_days: number | null;
  is_active: boolean;
}

export interface ServiceCreate {
  name: string;
  duration_minutes: number;
  price: string;
  description?: string | null;
  group?: string | null;
  category_id?: number | null;
  reminder_after_days?: number | null;
  is_active?: boolean;
}

export type VoiceTone = 'warm' | 'neutral' | 'casual';
export type MessageFormat = 'text' | 'buttons' | 'hybrid';

export interface BotSettings {
  master_id: number;
  greeting: string;
  voice_tone: VoiceTone;
  message_format: MessageFormat;
  is_enabled: boolean;
  reminders_enabled: boolean;
  master_digest_enabled: boolean;
  master_digest_hour: number;
  master_pre_visit_enabled: boolean;
  master_pre_visit_offsets: number[];
  configured_at: string | null;
  updated_at: string;
}

export interface BotSettingsUpdate {
  greeting?: string;
  voice_tone?: VoiceTone;
  message_format?: MessageFormat;
  is_enabled?: boolean;
  master_digest_enabled?: boolean;
  master_digest_hour?: number;
  master_pre_visit_enabled?: boolean;
  master_pre_visit_offsets?: number[];
}

export interface ServiceCategory {
  id: number;
  master_id: number;
  name: string;
  position: number;
  created_at: string;
}

export type KBType =
  | 'address'
  | 'payment'
  | 'techniques'
  | 'sterilization'
  | 'preparation'
  | 'whats_with'
  | 'guarantees'
  | 'restrictions'
  | 'custom';

export interface KnowledgeItem {
  id: number;
  master_id: number;
  type: KBType;
  title: string;
  content: string;
  geolocation_lat: number | null;
  geolocation_lng: number | null;
  yandex_maps_url: string | null;
  is_short: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeItemCreate {
  type: KBType;
  title: string;
  content: string;
  geolocation_lat?: number | null;
  geolocation_lng?: number | null;
  yandex_maps_url?: string | null;
  is_short?: boolean;
  position?: number;
}

export interface ReturnSettings {
  master_id: number;
  is_enabled: boolean;
  trigger_after_days: number;
  discount_percent: number;
  discount_valid_days: number;
  configured_at: string | null;
  updated_at: string;
}

export interface ReturnSettingsUpdate {
  trigger_after_days?: number;
  discount_percent?: number;
  discount_valid_days?: number;
}

export interface ReturnCampaign {
  id: number;
  master_id: number;
  client_id: number;
  sent_at: string;
  discount_percent: number;
  discount_valid_until: string;
  status: 'sent' | 'responded' | 'booked' | 'expired' | 'expired_late_response';
  responded_at: string | null;
  booking_id: number | null;
  message_id: number | null;
  created_at: string;
}

export interface ScheduleEntry {
  id?: number;
  weekday: number;
  start_time: string; // HH:MM
  end_time: string;
  is_working: boolean;
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

export interface MessageRow {
  id: number;
  direction: MessageDirection;
  text: string | null;
  llm_meta: Record<string, unknown> | null;
  is_proactive: boolean;
  created_at: string;
}

export interface ConversationDetail {
  id: number;
  client_id: number;
  client_name: string | null;
  state: ConversationState;
  takeover_until: string | null;
  last_message_at: string | null;
  messages: MessageRow[];
}

export interface ClientStats {
  visits_total: number;
  visits_done: number;
  avg_check: string | null;
  last_visit_at: string | null;
  tags: string[];
  segments: string[];
}

export interface ClientDetail {
  id: number;
  telegram_id: number;
  name: string | null;
  phone: string | null;
  notes: string | null;
  stats: ClientStats;
}

export interface ScheduleBreak {
  id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  skip_dates: string[];
}

export interface TimeOff {
  id: number;
  date_from: string;
  date_to: string;
  reason: string | null;
}

export interface ReturnCampaignsBlock {
  sent: number;
  booked: number;
  expired: number;
  revenue: string;
}

export interface OverviewData {
  period_from: string;
  period_to: string;
  bookings_total: number;
  bookings_done: number;
  bookings_cancelled: number;
  revenue: string;
  new_clients: number;
  active_conversations: number;
  return_campaigns: ReturnCampaignsBlock;
}

export interface SlotItem {
  starts_at: string;
  ends_at: string;
}

export interface SlotsResponse {
  service_id: number;
  duration_minutes: number;
  slots: SlotItem[];
  next_available_day: string | null;
}

export interface PlanInfo {
  plan: Plan;
  trial_ends_at: string | null;
  subscription_active_until: string | null;
  is_active: boolean;
  pro_price_monthly: number;
  pro_plus_price_monthly: number;
  annual_discount_percent: number;
}

export interface PaymentRow {
  id: number;
  amount: string;
  currency: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

export interface RoiData {
  period_days: number;
  revenue: string;
  cost: string;
  roi_x: string | null;
}

export interface PortfolioPhoto {
  id: number;
  filename: string;
  public_url: string;
  created_at: string;
}

export interface CheckoutResponse {
  payment_id: number;
  yookassa_id: string;
  confirmation_url: string | null;
  amount: string;
}
