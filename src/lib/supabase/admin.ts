import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/** Cliente com service_role: só no servidor, ignora RLS. Nunca importar em componente client. */
export function isAdminConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    url && key && !url.includes("seu-projeto") && !key.includes("sua-chave")
  );
}

let cached: SupabaseClient<Database> | null = null;

export function getAdminClient(): SupabaseClient<Database> {
  if (!cached) {
    cached = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    ) as unknown as SupabaseClient<Database>;
  }
  return cached;
}
