import { useEffect, useRef } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { useRoles } from "@/hooks/useAuth";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { canAccess, homeForRoles } from "@/lib/access";

export function RoleGuard() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { roles, loading: rolesLoading } = useRoles();
  const { isSuperAdmin, loading: saLoading } = useSuperAdmin();
  const navigate = useNavigate();
  const lastDeniedRef = useRef<string | null>(null);

  useEffect(() => {
    if (rolesLoading || saLoading) return;
    if (canAccess(pathname, roles, isSuperAdmin)) {
      lastDeniedRef.current = null;
      return;
    }
    if (lastDeniedRef.current === pathname) return;
    lastDeniedRef.current = pathname;
    const home = homeForRoles(roles, isSuperAdmin);
    toast.error("Accès refusé", {
      description: "Vous n'êtes pas autorisé à consulter cette page.",
    });
    navigate({ to: home, replace: true });
  }, [pathname, roles, isSuperAdmin, rolesLoading, saLoading, navigate]);

  return null;
}
