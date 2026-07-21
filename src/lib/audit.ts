import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "login" | "logout"
  | "create" | "update" | "delete"
  | "export" | "print" | "view"
  | "upload" | "download"
  | "send" | "publish";

export interface AuditInput {
  action: AuditAction | string;
  entity_type: string;
  entity_id?: string | null;
  entity_label?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Enregistre une entrée dans le journal d'activité.
 * Silencieux en cas d'erreur (ne casse jamais l'UX).
 */
export async function logActivity(input: AuditInput): Promise<void> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return;

    let actor_name: string | null = null;
    let actor_role: string | null = null;
    try {
      const { data: p } = await supabase
        .from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      actor_name = p?.full_name ?? user.email ?? null;
      const { data: r } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).limit(1).maybeSingle();
      actor_role = (r as any)?.role ?? null;
    } catch {}

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      actor_name,
      actor_role,
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      entity_label: input.entity_label ?? null,
      metadata: input.metadata ?? {},
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    } as any);
  } catch {
    // silencieux
  }
}
