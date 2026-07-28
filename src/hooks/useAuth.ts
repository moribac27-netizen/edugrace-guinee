import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "directeur" | "comptable" | "enseignant" | "parent" | "eleve";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading };
}

export function useRoles() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (authLoading) { setLoading(true); return; }
    if (!user) { setRoles([]); setLoading(false); return; }
    setLoading(true);
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      setRoles((data ?? []).map((r: any) => r.role));
      setLoading(false);
    });
  }, [user?.id, authLoading]);
  return { roles, loading };
}

const STAFF_ROLES: AppRole[] = ["admin", "directeur", "comptable", "enseignant"];

export function primaryRole(roles: AppRole[]): AppRole | null {
  if (roles.length === 0) return null;
  for (const r of ["admin", "directeur", "comptable", "enseignant", "parent", "eleve"] as AppRole[]) {
    if (roles.includes(r)) return r;
  }
  return roles[0];
}

export function homeForRole(role: AppRole | null): string {
  if (role === "parent") return "/parent";
  if (role === "eleve") return "/eleve";
  return "/dashboard";
}

export function isStaff(roles: AppRole[]): boolean {
  return roles.some((r) => STAFF_ROLES.includes(r));
}
