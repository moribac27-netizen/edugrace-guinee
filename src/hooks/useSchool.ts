import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl } from "@/hooks/useSignedUrl";

export interface SchoolInfo {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  director_name: string | null;
  academic_year: string | null;
  theme_primary: string | null;
  theme_secondary: string | null;
  receipt_legal_notice?: string | null;
  [k: string]: any;
}

/** Infos de l'établissement de l'utilisateur courant (multi-tenant). */
export function useSchool() {
  const { data, isLoading } = useQuery({
    queryKey: ["current-school-info"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SchoolInfo | null> => {
      const { data: sid } = await supabase.rpc("current_school_id");
      if (!sid) return null;
      const { data: row } = await supabase.from("schools").select("*").eq("id", sid as any).maybeSingle();
      return (row as unknown as SchoolInfo) ?? null;
    },
  });
  const logoUrl = useSignedUrl(data?.logo_url ?? null);
  return { school: data ?? null, logoUrl, loading: isLoading };
}
