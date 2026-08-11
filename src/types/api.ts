export interface SearchLead {
  name: string;
  phone: string;
  address: string;
  rating: string;
  has_website: string;  // 'true' | 'false' (string from n8n)
  website: string;
  place_id?: string;
  google_place_id?: string;
  email?: string | null;
  linkedin_url?: string | null;
}

export interface SearchResponse {
  success: boolean;
  count: number;
  leads: SearchLead[];
}

export interface SendResponse {
  success: boolean;
  message: string;
}

export interface SendEmailResponse {
  success: boolean;
  message: string;
}

export interface StatsResponse {
  success: boolean;
  sent_this_month: number;
  total_logged: number;
}

/** AI classification response */
export interface AIClassification {
  intent: 'pricing' | 'info' | 'interested' | 'not_interested' | 'complaint' | 'greeting' | 'other';
  sentiment: 'positive' | 'neutral' | 'negative';
  priority: 'high' | 'medium' | 'low';
  summary: string;
  next_action: 'send_pricing' | 'schedule_call' | 'follow_up' | 'close_lead' | 'escalate' | 'none';
}

/** Dashboard stat card */
export interface DashboardStat {
  label: string;
  value: number | string;
  change?: number;
  icon?: string;
}
