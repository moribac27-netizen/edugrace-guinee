import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { usePerStudentPlan } from "@/hooks/usePerStudentPlan";

/** Routes encore accessibles quand l'abonnement est expiré. */
const ALLOWED = ["/abonnement", "/souscription", "/plans", "/cotisations", "/parent", "/eleve"];

/**
 * Redirige automatiquement vers /abonnement lorsque l'abonnement de l'école
 * est expiré. Les statuts trial / active / past_due ne sont pas impactés,
 * et le super admin conserve un accès complet.
 */
export function SubscriptionGuard() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isExpired, loading } = useSubscriptionStatus();
  const { isSuperAdmin, loading: saLoading } = useSuperAdmin();
  const { info, loading: planLoading } = usePerStudentPlan();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || saLoading || planLoading || isSuperAdmin) return;
    const blocked = isExpired || (info.isPerStudent && !info.unlocked);
    if (!blocked) return;
    if (ALLOWED.some((p) => pathname === p || pathname.startsWith(p + "/"))) return;
    navigate({ to: "/abonnement", replace: true });
  }, [pathname, isExpired, loading, saLoading, planLoading, info.isPerStudent, info.unlocked, isSuperAdmin, navigate]);

  return null;
}
