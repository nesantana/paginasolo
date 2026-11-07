export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AnalyticsEventType =
  | "pageview"
  | "click_whatsapp"
  | "click_call"
  | "click_maps";

export type TenantServiceItem = {
  title: string;
  description: string;
  price_optional?: string;
  [key: string]: Json | undefined;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone_number: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone_number?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone_number?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tenants: {
        Row: {
          id: string;
          owner_id: string | null;
          slug: string;
          custom_domain: string | null;
          business_name: string;
          category: string;
          city: string;
          whatsapp_number: string;
          address: string | null;
          opening_hours: string | null;
          headline: string | null;
          description: string | null;
          primary_color: string;
          services: TenantServiceItem[];
          images: string[];
          logo_url: string | null;
          is_active: boolean;
          subscription_status: string;
          edit_token_hash: string | null;
          payer_email: string | null;
          mp_preapproval_id: string | null;
          meta_pixel_id: string | null;
          google_tag_id: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          slug: string;
          custom_domain?: string | null;
          business_name: string;
          category: string;
          city?: string;
          whatsapp_number: string;
          address?: string | null;
          opening_hours?: string | null;
          headline?: string | null;
          description?: string | null;
          primary_color?: string;
          services?: TenantServiceItem[];
          images?: string[];
          logo_url?: string | null;
          is_active?: boolean;
          subscription_status?: string;
          edit_token_hash?: string | null;
          payer_email?: string | null;
          mp_preapproval_id?: string | null;
          meta_pixel_id?: string | null;
          google_tag_id?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          slug?: string;
          custom_domain?: string | null;
          business_name?: string;
          category?: string;
          city?: string;
          whatsapp_number?: string;
          address?: string | null;
          opening_hours?: string | null;
          headline?: string | null;
          description?: string | null;
          primary_color?: string;
          services?: TenantServiceItem[];
          images?: string[];
          logo_url?: string | null;
          is_active?: boolean;
          subscription_status?: string;
          edit_token_hash?: string | null;
          payer_email?: string | null;
          mp_preapproval_id?: string | null;
          meta_pixel_id?: string | null;
          google_tag_id?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: {
          id: string;
          tenant_id: string;
          event_type: AnalyticsEventType;
          referrer: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          event_type: AnalyticsEventType;
          referrer?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          event_type?: AnalyticsEventType;
          referrer?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type TenantRow = Database["public"]["Tables"]["tenants"]["Row"];
export type AnalyticsEventRow =
  Database["public"]["Tables"]["analytics_events"]["Row"];
