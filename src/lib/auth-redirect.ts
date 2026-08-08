import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/useAuth";
import { homeForRoles } from "@/lib/access";

export type UserContext = {
  userId: string;
  roles: AppRole[];
  isSuperAdmin: boolean;
  schoolId: string | null;
  home: string;
};

/**
 * Point central d'identification : lit en une fois les rôles, le statut
 * super admin et l'établissement rattaché à l'utilisateur connecté.
 * Réutilise les tables existantes (user_roles, super_admins, profiles).
 */
export async function loadUserContext(): Promise<UserContext | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const [rolesRes, saRes, profileRes] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("super_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("school_id").eq("id", user.id).maybeSingle(),
  ]);

  const roles = ((rolesRes.data ?? []) as Array<{ role: AppRole }>).map((r) => r.role);
  const isSuperAdmin = !!saRes.data;

  return {
    userId: user.id,
    roles,
    isSuperAdmin,
    schoolId: (profileRes.data?.school_id as string | undefined) ?? null,
    home: homeForRoles(roles, isSuperAdmin),
  };
}

/** Espace d'accueil de l'utilisateur connecté (par défaut /auth si non connecté). */
export async function resolveUserHome(): Promise<string> {
  const ctx = await loadUserContext();
  return ctx ? ctx.home : "/auth";
}
