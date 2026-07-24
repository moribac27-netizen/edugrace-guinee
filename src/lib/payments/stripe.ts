import type { PaymentProvider, PaymentIntentResult } from "./index";

/**
 * Stub Stripe — prêt à activer.
 *
 * Pour l'activer :
 *  1. Créer un serveur function `createStripeCheckoutSession` utilisant
 *     STRIPE_SECRET_KEY (à ajouter via add_secret).
 *  2. Implémenter `createIntent()` pour appeler ce server function et
 *     retourner `{ status: "requires_action", redirectUrl }` avec l'URL
 *     de la session Stripe Checkout.
 *  3. Ajouter un webhook `/api/public/webhooks/stripe` qui met à jour
 *     `payments.validation_status = 'validé'` après confirmation.
 */
export const stripeProvider: PaymentProvider = {
  id: "stripe",
  label: "Stripe (carte bancaire)",
  supportedMethods: ["carte"],
  isConfigured: () => false, // active dès que STRIPE_SECRET_KEY est présent
  async createIntent(): Promise<PaymentIntentResult> {
    return {
      status: "error",
      error: "Stripe n'est pas encore configuré. Contactez l'administrateur.",
    };
  },
};
