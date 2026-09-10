import { supabase as defaultSupabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { newCotisationReceiptNumber } from "./cotisation-print";

export type RegisterPaymentResult =
  | { status: "already_paid"; row: any }
  | { status: "created"; row: any }
  | { status: "updated"; row: any }
  | { status: "error"; error: string };

export async function registerStudentPayment(opts: {
  studentId: string;
  schoolId: string;
  academicYear: string;
  amount: number;
  schoolShare: number;
  reference?: string | null;
  paidBy?: string | null;
  supabase?: SupabaseClient;
}): Promise<RegisterPaymentResult> {
  const supabase = opts.supabase ?? (defaultSupabase as unknown as SupabaseClient);
  try {
    const { data: existing } = await (supabase as any)
      .from("student_plan_payments")
      .select("*")
      .eq("student_id", opts.studentId)
      .eq("academic_year", opts.academicYear)
      .maybeSingle();

    const payload = {
      school_id: opts.schoolId,
      student_id: opts.studentId,
      academic_year: opts.academicYear,
      amount: opts.amount,
      school_share: opts.schoolShare,
      status: "paye",
      payment_mode: "individuel",
      payment_method: "orange_money",
      reference: opts.reference ?? null,
      receipt_number: newCotisationReceiptNumber(opts.academicYear),
      paid_by: opts.paidBy ?? null,
      paid_at: new Date().toISOString(),
    } as any;

    if (existing) {
      if (existing.status === "paye") {
        return { status: "already_paid", row: existing };
      }
      const { data: updated, error: uErr } = await (supabase as any)
        .from("student_plan_payments")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .maybeSingle();
      if (uErr) return { status: "error", error: uErr.message };
      return { status: "updated", row: updated };
    }

    const { data: created, error } = await (supabase as any)
      .from("student_plan_payments")
      .insert(payload)
      .select()
      .maybeSingle();
    if (error) return { status: "error", error: error.message };
    return { status: "created", row: created };
  } catch (err: any) {
    return { status: "error", error: err?.message ?? String(err) };
  }
}

export default registerStudentPayment;
