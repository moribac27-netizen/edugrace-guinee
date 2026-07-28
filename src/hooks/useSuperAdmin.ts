import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useSuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (authLoading) { setLoading(true); return; }
    if (!user) { setIsSuperAdmin(false); setLoading(false); return; }
    setLoading(true);
    supabase.from("super_admins").select("user_id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setIsSuperAdmin(!!data);
      setLoading(false);
    });
  }, [user?.id, authLoading]);
  return { isSuperAdmin, loading };
}
