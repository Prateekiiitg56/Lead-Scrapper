/** A lead from the n8n search webhook, normalized by searchService.searchLeads. */
export interface SearchLead {
  name: string;
  phone: string;
  address: string;
  rating: number | null;
  has_website: boolean;
  website: string;
  place_id: string | null;
  email: string | null;
  linkedin_url: string | null;
  /** City the user searched in (first part of the location input), used as the CRM city. */
  city: string | null;
}

export interface StatsResponse {
  success: boolean;
  sent_this_month: number;
  total_logged: number;
}
