/**
 * Architecture modulaire des paiements.
 *
 * Chaque prestataire implémente l'interface PaymentProvider et s'enregistre
 * via registerProvider(). L'UI et la logique métier n'importent QUE ce module
 * pour rester agnostique du prestataire.
 *
 * Prestataires actuels :
 *  - manual  : validation manuelle (espèces, virement, Orange Money, MTN…)
 *
 * Prestataires prêts à brancher :
 *  - stripe  : cartes internationales (stub, à activer via clés secrètes)
 *  - paypal  : portefeuille PayPal (stub, à activer via clés secrètes)
 */

export type PaymentMethod =
  | "especes"
  | "virement"
  | "orange_money"
  | "mtn_momo"
  | "carte"
  | "paypal";

export type PaymentIntentInput = {
  schoolId: string;
  studentId?: string | null;
  amount: number; // GNF (entier)
  currency?: string; // "GNF" par défaut
  paymentType: string; // scolarité, inscription, cantine…
  period?: string | null;
  method: PaymentMethod;
  reference?: string | null;
  metadata?: Record<string, unknown>;
};

export type PaymentIntentResult =
  | { status: "requires_action"; redirectUrl: string; providerRef: string }
  | { status: "pending"; providerRef: string; message?: string }
  | { status: "succeeded"; providerRef: string; paymentId?: string }
  | { status: "error"; error: string };

export interface PaymentProvider {
  readonly id: string; // ex: "manual", "stripe", "paypal"
  readonly label: string;
  readonly supportedMethods: PaymentMethod[];
  /** Retourne false quand les clés / config manquent. */
  isConfigured(): boolean;
  createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
}

const registry = new Map<string, PaymentProvider>();

export function registerProvider(p: PaymentProvider) {
  registry.set(p.id, p);
}

export function getProvider(id: string): PaymentProvider | undefined {
  return registry.get(id);
}

export function listProviders(): PaymentProvider[] {
  return Array.from(registry.values());
}

export function providerForMethod(method: PaymentMethod): PaymentProvider | undefined {
  return listProviders().find((p) => p.isConfigured() && p.supportedMethods.includes(method));
}

// Enregistrement des providers de base.
import { manualProvider } from "./manual";
import { stripeProvider } from "./stripe";
import { paypalProvider } from "./paypal";

registerProvider(manualProvider);
registerProvider(stripeProvider);
registerProvider(paypalProvider);
