import { School } from "lucide-react";
import type { SchoolInfo } from "@/hooks/useSchool";

interface Props {
  school: SchoolInfo | null;
  logoUrl?: string | null;
  /** Titre du document (ex : « Bulletin de notes ») */
  title?: string;
  /** Ligne secondaire (période, mois, référence…) */
  subtitle?: string | null;
  compact?: boolean;
}

/**
 * En-tête officiel réutilisé par tous les documents imprimables.
 * Toutes les informations proviennent du profil de l'école connectée.
 */
export function SchoolLetterhead({ school, logoUrl, title, subtitle, compact = false }: Props) {
  const contact = [school?.phone, school?.email].filter(Boolean).join(" · ");
  const place = [school?.address, school?.city].filter(Boolean).join(", ");
  return (
    <div className={`flex items-center gap-4 border-b-2 border-black ${compact ? "pb-2 mb-3" : "pb-4 mb-4"}`}>
      <div className={compact ? "size-12 shrink-0" : "size-16 shrink-0"}>
        {logoUrl ? (
          <img src={logoUrl} alt={school?.name ?? "Logo de l'école"} className="size-full object-contain" />
        ) : (
          <div className="size-full rounded-full bg-black text-white flex items-center justify-center">
            <School className="size-6" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`font-bold uppercase leading-tight ${compact ? "text-sm" : "text-base"}`}>
          {school?.name ?? "Établissement scolaire"}
        </div>
        {place && <div className="text-[10px] leading-tight">{place}</div>}
        {contact && <div className="text-[10px] leading-tight">{contact}</div>}
        {school?.website && <div className="text-[10px] leading-tight">{school.website}</div>}
      </div>
      <div className="text-right text-[10px] shrink-0">
        <div className="font-bold">RÉPUBLIQUE DE GUINÉE</div>
        <div>Travail — Justice — Solidarité</div>
        {school?.academic_year && <div className="mt-1">Année scolaire : {school.academic_year}</div>}
        {title && <div className={`mt-1 font-bold uppercase ${compact ? "text-xs" : "text-sm"}`}>{title}</div>}
        {subtitle && <div>{subtitle}</div>}
      </div>
    </div>
  );
}

export function SchoolPrintFooter({ school }: { school: SchoolInfo | null }) {
  return (
    <div className="text-[9px] text-center mt-6 text-gray-600">
      {school?.name ?? "Établissement"}
      {school?.phone ? ` — ${school.phone}` : ""}
      {school?.receipt_legal_notice ? ` — ${school.receipt_legal_notice}` : ""}
      {" · Document généré par MBGEduGuinée le "}
      {new Date().toLocaleDateString("fr-FR")}
    </div>
  );
}
