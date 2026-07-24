import type { PaymentProvider, PaymentIntentResult } from "./index";

/**
 * Stub PayPal — prêt à activer.
 *
 * Pour l'activer :
 *  1. Ajouter les secrets PAYPAL_CLIENT_ID et PAYPAL_CLIENT_SECRET.
 *  2. Créer un serveur function qui appelle l'API PayPal Orders pour
 *     obtenir une approve_url et retourner `{ status: "requires_action", redirectUrl }`.
 *  3. Webhook `/api/public/webhooks/paypal` pour la confirmation.
 */
export const paypalProvider: PaymentProvider = {
  id: "paypal",
  label: "PayPal",
  supportedMethods: ["paypal"],
  isConfigured: () => false,
  async createIntent(): Promise<PaymentIntentResult> {
    return {
      status: "error",
      error: "PayPal n'est pas encore configuré. Contactez l'administrateur.",
    };
  },
};
