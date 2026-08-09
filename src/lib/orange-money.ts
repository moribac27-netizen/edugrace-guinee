/**
 * Coordonnées Orange Money du bénéficiaire des abonnements MBGEduGuinée.
 * Toutes les souscriptions des écoles sont payées sur ce numéro, puis
 * validées manuellement par le Super Admin.
 */
export const ORANGE_MONEY = {
  number: "00224628499812",
  local: "628 49 98 12",
  holder: "CONDE Moriba",
  ussd: "#144#",
  label: "Orange Money Guinée",
} as const;

/** Lien tel: pour lancer le menu Orange Money depuis un mobile. */
export function orangeMoneyUssdLink() {
  return `tel:${encodeURIComponent(ORANGE_MONEY.ussd)}`;
}

export function formatGNF(v: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " GNF";
}
