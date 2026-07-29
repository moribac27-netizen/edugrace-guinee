import { supabase } from "@/integrations/supabase/client";

let cached: string | null = null;

/** Retourne l'identifiant de l'établissement de l'utilisateur courant (mis en cache). */
export async function getSchoolId(): Promise<string | null> {
  if (cached) return cached;
  const { data } = await supabase.rpc("current_school_id");
  cached = (data as unknown as string) ?? null;
  return cached;
}

export function resetSchoolIdCache() {
  cached = null;
}
