/** Supabase Database Types — matches the schema in migrations/001_initial_schema.sql */

export interface LeadRow {
  id: string;
  business_name: string;
  phone: string | null;
  phone_clean: string | null;
  email: string | null;
  linkedin_url: string | null;
  website: string | null;
  has_website: boolean;
  category: string | null;
  city: string | null;
  address: string | null;
  rating: number | null;
  google_place_id: string | null;
  status: 'NEW' | 'CONTACTED' | 'REPLIED' | 'INTERESTED' | 'FOLLOW_UP' | 'MEETING_BOOKED' | 'CLIENT' | 'LOST';
  last_contact_at: string | null;
  last_reply_at: string | null;
  ai_summary: string | null;
  ai_intent: string | null;
  ai_sentiment: string | null;
  interest_score: number;
  followup_date: string | null;
  assigned_user_id: string | null;
  notes: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConversationRow {
  id: string;
  lead_id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  message: string | null;
  media_url: string | null;
  media_type: string | null;
  message_type: 'text' | 'template' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'reaction' | 'email' | 'linkedin';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  wamid: string | null;
  template_name: string | null;
  ai_classification: {
    intent?: string;
    sentiment?: string;
    priority?: string;
    summary?: string;
    next_action?: string;
  } | null;
  timestamp: string;
  created_at: string;
}

export interface FollowupRow {
  id: string;
  lead_id: string;
  scheduled_at: string;
  template_name: string | null;
  message: string | null;
  status: 'scheduled' | 'sent' | 'cancelled' | 'completed';
  executed_at: string | null;
  created_at: string;
}

export interface TemplateRow {
  id: string;
  name: string;
  display_name: string | null;
  category: string | null;
  language: string;
  body_text: string | null;
  variables: string[];
  is_active: boolean;
  meta_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsRow {
  id: string;
  date: string;
  messages_sent: number;
  messages_delivered: number;
  messages_read: number;
  messages_failed: number;
  replies_received: number;
  new_leads: number;
  leads_contacted: number;
  meetings_booked: number;
  clients_converted: number;
  created_at: string;
}

export interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'agent' | 'viewer';
  created_at: string;
  updated_at: string;
}

// Database type for Supabase client generic
export interface Database {
  public: {
    Tables: {
      leads: {
        Row: LeadRow;
        Insert: Partial<LeadRow> & { business_name: string };
        Update: Partial<LeadRow>;
      };
      conversations: {
        Row: ConversationRow;
        Insert: Partial<ConversationRow> & { lead_id: string; direction: 'INBOUND' | 'OUTBOUND' };
        Update: Partial<ConversationRow>;
      };
      followups: {
        Row: FollowupRow;
        Insert: Partial<FollowupRow> & { lead_id: string; scheduled_at: string };
        Update: Partial<FollowupRow>;
      };
      templates: {
        Row: TemplateRow;
        Insert: Partial<TemplateRow> & { name: string };
        Update: Partial<TemplateRow>;
      };
      analytics: {
        Row: AnalyticsRow;
        Insert: Partial<AnalyticsRow> & { date: string };
        Update: Partial<AnalyticsRow>;
      };
      users: {
        Row: UserRow;
        Insert: Partial<UserRow> & { email: string };
        Update: Partial<UserRow>;
      };
    };
  };
}

// Convenience aliases
export type Lead = LeadRow;
export type Conversation = ConversationRow;
export type Followup = FollowupRow;
export type Template = TemplateRow;
export type Analytics = AnalyticsRow;
export type User = UserRow;
