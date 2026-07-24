import { supabase } from "@/integrations/supabase/client";
import type { PaymentProvider, PaymentIntentResult, PaymentIntentInput } from "./index";

/**
 * Prestataire "manuel" : enregistre le paiement dans la table `payments`
 * en attente de validation par un comptable. Utilisé pour espèces,
 * virement bancaire, Orange Money et MTN MoMo (justificatifs uploadés
 * ailleurs).
 */
export const manualProvider: PaymentProvider = {
  id: "manual",
  label: "Validation manuelle",
  supportedMethods: ["especes", "virement", "orange_money", "mtn_momo"],
  isConfigured: () => true,
  async createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const { data, error } = await supabase
      .from("payments")
      .insert({
        school_id: input.schoolId,
        student_id: input.studentId ?? null,
        amount: input.amount,
        currency: input.currency ?? "GNF",
        payment_type: input.paymentType,
        period: input.period ?? null,
        payment_method: input.method,
        reference: input.reference ?? null,
        validation_status: "en_attente",
      } as any)
      .select("id")
      .single();

    if (error) return { status: "error", error: error.message };
    return {
      status: "pending",
      providerRef: data.id,
      paymentId: data.id,
      message: "Paiement enregistré, en attente de validation par le comptable.",
    } as PaymentIntentResult;
  },
};
