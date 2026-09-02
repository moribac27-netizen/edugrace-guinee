import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionStatus {
  status: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  planId: string | null;
  billingCycle: string | null;
}

/** Statut d'abonnement de l'école de l'utilisateur courant. */
export function useSubscriptionStatus() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["school-subscription-status"],
    staleTime: 60_000,
    queryFn: async (): Promise<SubscriptionStatus | null> => {
      const { data: sid } = await supabase.rpc("current_school_id");
      if (!sid) return null;
      const { data: row } = await (supabase as any)
        .from("school_subscriptions")
        .select("status, trial_ends_at, current_period_end, plan_id, billing_cycle")
        .eq("school_id", sid as any)
        .maybeSingle();
      if (!row) return null;
      return {
        status: row.status ?? null,
        trialEndsAt: row.trial_ends_at ?? null,
        currentPeriodEnd: row.current_period_end ?? null,
        planId: row.plan_id ?? null,
        billingCycle: row.billing_cycle ?? null,
      };
    },
  });
  return {
    subscription: data ?? null,
    isExpired: data?.status === "expired",
    loading: isLoading,
    refetch,
  };
}
