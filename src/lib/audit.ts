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

let _ip: string | null | undefined;

/** Récupère (une seule fois par session) l'adresse IP publique. Best-effort. */
async function publicIp(): Promise<string | null> {
  if (_ip !== undefined) return _ip;
  _ip = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch("https://api.ipify.org?format=json", { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const j = (await res.json()) as { ip?: string };
      _ip = j?.ip ?? null;
    }
  } catch {
    _ip = null;
  }
  return _ip;
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
    let school_id: string | null = null;
    try {
      const { data: p } = await supabase
        .from("profiles").select("full_name, school_id").eq("id", user.id).maybeSingle();
      actor_name = p?.full_name ?? user.email ?? null;
      school_id = (p as any)?.school_id ?? null;
      const { data: r } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).limit(1).maybeSingle();
      actor_role = (r as any)?.role ?? null;
    } catch {}

    const ip = await publicIp();

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      school_id,
      actor_name,
      actor_role,
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      entity_label: input.entity_label ?? null,
      metadata: input.metadata ?? {},
      ip_address: ip,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    } as any);
  } catch {
    // silencieux
  }
}

/** Raccourcis pour les évènements d'authentification. */
export const logLogin = (email?: string | null) =>
  logActivity({ action: "login", entity_type: "auth", entity_label: email ?? null });

export const logLogout = () =>
  logActivity({ action: "logout", entity_type: "auth" });
