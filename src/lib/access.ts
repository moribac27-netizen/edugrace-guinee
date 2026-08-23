import type { AppRole } from "@/hooks/useAuth";

/** Rôles de direction pédagogique ajoutés (rattachés à une école). */
export const PEDAGOGIC_DIRECTION: AppRole[] = ["directeur_etudes", "proviseur"];

// Route -> roles allowed to access it. Longer prefixes win.
// "*" means all authenticated users. Super admin bypasses all rules.
export const ROUTE_ACCESS: Array<{ prefix: string; roles: AppRole[] | "*" }> = [
  { prefix: "/super-admin", roles: [] }, // super admin only
  { prefix: "/plans", roles: ["admin"] },
  { prefix: "/sauvegarde", roles: ["admin", "directeur"] },
  { prefix: "/journal", roles: ["admin", "directeur"] },
  { prefix: "/parametres", roles: ["admin", "directeur"] },
  { prefix: "/personnalisation-recu", roles: ["admin", "directeur", "comptable"] },
  { prefix: "/souscription", roles: ["admin", "directeur"] },
  { prefix: "/comptabilite", roles: ["admin", "directeur", "comptable"] },
  { prefix: "/salaires", roles: ["admin", "directeur", "comptable"] },
  { prefix: "/paiements", roles: ["admin", "directeur", "comptable"] },
  { prefix: "/rapports", roles: ["admin", "directeur", "directeur_etudes", "proviseur", "comptable"] },
  { prefix: "/direction-etudes", roles: ["admin", "directeur", "directeur_etudes", "proviseur"] },
  { prefix: "/eleves", roles: ["admin", "directeur", "directeur_etudes", "proviseur", "enseignant", "surveillant"] },
  { prefix: "/enseignants", roles: ["admin", "directeur", "directeur_etudes", "proviseur"] },
  { prefix: "/matieres", roles: ["admin", "directeur", "directeur_etudes", "proviseur"] },
  { prefix: "/cartes", roles: ["admin", "directeur", "directeur_etudes", "proviseur", "surveillant"] },
  { prefix: "/classes", roles: ["admin", "directeur", "directeur_etudes", "proviseur"] },
  { prefix: "/affectations", roles: ["admin", "directeur", "directeur_etudes", "proviseur"] },
  { prefix: "/emploi-du-temps", roles: ["admin", "directeur", "directeur_etudes", "proviseur", "enseignant", "surveillant"] },
  { prefix: "/presences", roles: ["admin", "directeur", "directeur_etudes", "proviseur", "enseignant", "surveillant"] },
  { prefix: "/notes", roles: ["admin", "directeur", "directeur_etudes", "proviseur", "enseignant"] },
  { prefix: "/examens", roles: ["admin", "directeur", "directeur_etudes", "proviseur", "enseignant"] },
  { prefix: "/bulletins", roles: ["admin", "directeur", "directeur_etudes", "proviseur", "enseignant"] },
  { prefix: "/bibliotheque", roles: ["admin", "directeur", "directeur_etudes", "proviseur", "enseignant"] },
  { prefix: "/infirmerie", roles: ["admin", "directeur", "enseignant"] },
  { prefix: "/transport", roles: ["admin", "directeur", "comptable"] },
  { prefix: "/cantine", roles: ["admin", "directeur", "comptable"] },

  { prefix: "/annonces", roles: ["admin", "directeur", "directeur_etudes", "proviseur", "enseignant", "surveillant"] },
  { prefix: "/dashboard", roles: ["admin", "directeur", "directeur_etudes", "proviseur", "enseignant", "comptable", "surveillant"] },
  { prefix: "/parent", roles: ["parent"] },
  { prefix: "/eleve", roles: ["eleve"] },
  { prefix: "/evenements", roles: "*" },
  { prefix: "/calendrier", roles: "*" },
  { prefix: "/messagerie", roles: "*" },
];

function matchRule(pathname: string) {
  const sorted = [...ROUTE_ACCESS].sort((a, b) => b.prefix.length - a.prefix.length);
  return sorted.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
}

export function canAccess(pathname: string, roles: AppRole[], isSuperAdmin: boolean): boolean {
  if (isSuperAdmin) return true;
  const rule = matchRule(pathname);
  if (!rule) return true; // unknown route -> let router handle 404
  if (rule.roles === "*") return roles.length > 0;
  if (rule.roles.length === 0) return false;
  return roles.some((r) => (rule.roles as AppRole[]).includes(r));
}

export function homeForRoles(roles: AppRole[], isSuperAdmin: boolean): string {
  if (isSuperAdmin) return "/super-admin";
  if (roles.includes("admin") || roles.includes("directeur")) return "/dashboard";
  if (roles.includes("directeur_etudes") || roles.includes("proviseur")) return "/direction-etudes";
  if (roles.includes("comptable")) return "/paiements";
  if (roles.includes("enseignant") || roles.includes("surveillant")) return "/dashboard";
  if (roles.includes("parent")) return "/parent";
  if (roles.includes("eleve")) return "/eleve";
  return "/dashboard";
}

/** Peut publier des événements inter-écoles pour son établissement. */
export function canPublishEvents(roles: AppRole[], isSuperAdmin: boolean): boolean {
  return isSuperAdmin || roles.some((r) => ["admin", "directeur", "directeur_etudes", "proviseur"].includes(r));
}
