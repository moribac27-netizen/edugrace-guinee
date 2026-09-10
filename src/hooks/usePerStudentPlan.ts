import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PerStudentPlanInfo {
  schoolId: string | null;
  isPerStudent: boolean;
  planName: string | null;
  unitPrice: number;
  schoolShare: number;
  threshold: number;
  academicYear: string;
  paidCount: number;
  unlocked: boolean;
  schoolRevenue: number;
}

const EMPTY: PerStudentPlanInfo = {
  schoolId: null,
  isPerStudent: false,
  planName: null,
  unitPrice: 100000,
  schoolShare: 15000,
  threshold: 20,
  academicYear: "",
  paidCount: 0,
  unlocked: true,
  schoolRevenue: 0,
};

/**
 * Informations du plan "par élève" pour l'école de l'utilisateur courant :
 * tarif par élève, part reversée à l'école, seuil d'accès global et
 * nombre d'élèves ayant déjà réglé leur cotisation annuelle.
 * Les écoles Basic / Standard renvoient isPerStudent = false (aucun impact).
 */
export function usePerStudentPlan() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["per-student-plan"],
    staleTime: 30_000,
    queryFn: async (): Promise<PerStudentPlanInfo> => {
      const { data: sid } = await supabase.rpc("current_school_id");
      if (!sid) return EMPTY;
      const schoolId = sid as unknown as string;

      const [subRes, schoolRes, countRes] = await Promise.all([
        (supabase as any)
          .from("school_subscriptions")
          .select("plan:subscription_plans(name, billing_model, price_per_student, school_share_per_student, access_threshold_students)")
          .eq("school_id", schoolId)
          .maybeSingle(),
        supabase.from("schools").select("academic_year").eq("id", schoolId as any).maybeSingle(),
        (supabase as any).rpc("school_paid_students_count", { _school_id: schoolId }),
      ]);

      const plan = subRes.data?.plan ?? null;
      const isPerStudent = plan?.billing_model === "per_student";
      const paidCount = Number(countRes.data ?? 0);
      const threshold = Number(plan?.access_threshold_students ?? 20);
      const schoolShare = Number(plan?.school_share_per_student ?? 15000);

      return {
        schoolId,
        isPerStudent,
        planName: plan?.name ?? null,
        unitPrice: Number(plan?.price_per_student ?? 100000),
        schoolShare,
        threshold,
        academicYear: (schoolRes.data as any)?.academic_year ?? new Date().getFullYear().toString(),
        paidCount,
        unlocked: !isPerStudent || paidCount >= threshold,
        schoolRevenue: paidCount * schoolShare,
      };
    },
  });

  return { info: data ?? EMPTY, loading: isLoading, refetch };
}

/** Identifiants des élèves ayant réglé leur cotisation pour l'année en cours. */
export function usePaidStudentIds(schoolId: string | null, academicYear: string, enabled = true) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["paid-student-ids", schoolId, academicYear],
    enabled: !!schoolId && !!academicYear && enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<Set<string>> => {
      const { data } = await (supabase as any)
        .from("student_plan_payments")
        .select("student_id")
        .eq("school_id", schoolId)
        .eq("academic_year", academicYear)
        .eq("status", "paye");
      return new Set(((data ?? []) as Array<{ student_id: string }>).map((r) => r.student_id));
    },
  });
  return { paidIds: data ?? new Set<string>(), loading: isLoading, refetch };
}
