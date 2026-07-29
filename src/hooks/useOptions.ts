import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Option { value: string; label: string }

export function useStudentOptions() {
  const { data } = useQuery({
    queryKey: ["opt-students"],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id, full_name, matricule, classes(name)")
        .order("full_name");
      return (data ?? []) as any[];
    },
    staleTime: 5 * 60_000,
  });
  const options: Option[] = (data ?? []).map((s: any) => ({
    value: s.id,
    label: `${s.full_name}${s.classes?.name ? ` — ${s.classes.name}` : ""}`,
  }));
  const byId = new Map((data ?? []).map((s: any) => [s.id, s]));
  return { options, byId, students: data ?? [] };
}

export function useClassOptions() {
  const { data } = useQuery({
    queryKey: ["opt-classes"],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, name").order("name");
      return (data ?? []) as any[];
    },
    staleTime: 5 * 60_000,
  });
  const options: Option[] = (data ?? []).map((c: any) => ({ value: c.id, label: c.name }));
  return { options, classes: data ?? [] };
}

export function useTableOptions(table: string, labelKey = "name", order = labelKey) {
  const { data } = useQuery({
    queryKey: ["opt", table, labelKey],
    queryFn: async () => {
      const { data } = await supabase.from(table as any).select(`id, ${labelKey}`).order(order);
      return (data ?? []) as any[];
    },
    staleTime: 60_000,
  });
  const options: Option[] = (data ?? []).map((r: any) => ({ value: r.id, label: r[labelKey] }));
  return { options, rows: data ?? [] };
}
