## Objectif

Ajouter les nouveaux modules demandés sans toucher aux modules existants (élèves, notes, paiements, comptabilité, bulletins, cartes, matières, présences, salaires, souscription, super-admin), puis finaliser pour la production.

Le périmètre est trop large pour une seule étape : je propose 6 lots livrés dans l'ordre. Chaque lot = migration base de données + pages + entrées de menu + permissions par rôle.

---

## Lot 1 — Infirmerie

Nouvelles tables (isolées par école, avec règles d'accès) :
- `medical_records` : dossier médical de l'élève (groupe sanguin, allergies, maladies chroniques, contact d'urgence)
- `medical_visits` : visites à l'infirmerie (date, motif, diagnostic, suite donnée)
- `treatments` : traitements prescrits (posologie, durée, statut)
- `medicines` : stock de médicaments (quantité, seuil d'alerte, péremption)
- `accidents` : accidents (lieu, gravité, témoins, mesures prises)

Page `/infirmerie` avec onglets Dossiers / Visites / Traitements / Médicaments / Accidents.
Accès : admin, directeur, + rôle infirmier si souhaité (sinon admin/directeur seulement).
Le parent et l'élève voient en lecture seule leurs propres visites depuis leur espace.

## Lot 2 — Transport scolaire

Tables : `buses`, `drivers`, `routes` (circuits + arrêts), `transport_subscriptions` (élève ↔ circuit, tarif, période), `transport_attendance` (montée/descente par jour).
Page `/transport` avec onglets. Accès : admin, directeur, comptable (abonnements/facturation).

## Lot 3 — Cantine

Tables : `canteen_menus` (menu par jour/semaine), `canteen_subscriptions`, `canteen_payments`, `canteen_consumption` (repas consommés par élève et par jour).
Page `/cantine` avec onglets + statistiques de consommation. Accès : admin, directeur, comptable.

## Lot 4 — Communication

Extension du module messagerie existant, sans le refaire :
- onglet **Circulaires** : table `circulars` (titre, contenu, pièce jointe, cibles par rôle/classe, accusé de lecture)
- onglet **Emails** : envoi d'emails groupés via une fonction serveur (nécessite la configuration d'un domaine d'envoi — voir Questions)
- Messages internes : déjà existants, on conserve.

## Lot 5 — Rapports unifiés

Refonte de la page `/rapports` existante en un centre de rapports avec 8 rapports : Élèves, Enseignants, Classes, Paiements, Comptabilité, Bulletins, Présences, Salaires.
Chaque rapport : filtres (période, classe, statut), aperçu tableau, export **PDF** et **Excel (.xlsx)**.
Mise en place d'un générateur commun (une seule couche d'export réutilisée partout).

## Lot 6 — Dashboard, Audit, Sauvegarde, Finition

**Dashboard** (sans changer la structure) : ajout des indicateurs Parents, Classes, Paiements du jour, Paiements du mois, Dépenses du mois, Solde actuel, et des blocs Dernières activités / Dernières inscriptions / Derniers paiements / Dernières notes, plus les notifications. Variantes par rôle : Admin/Directeur (complet), Comptable (financier), Enseignant (classes, notes, présences), Parent/Élève (déjà spécifiques).

**Audit** : journalisation automatique des connexions, déconnexions, créations, modifications, suppressions, paiements, saisies de notes et impressions de bulletins, via un point d'entrée unique appelé dans chaque module. Affichage : utilisateur, action, module, date, heure, IP. Accès Super Admin + Admin école.

**Sauvegarde** : le module existant est conservé ; ajout de la restauration, de la planification automatique et de l'export de données.

**Finition** : validation de tous les formulaires (schémas Zod), vérification des règles d'accès, responsive téléphone/tablette, animations légères, optimisation des requêtes, correction des erreurs TypeScript, documentation technique (`DOCUMENTATION.md`).

---

## Détails techniques

- Chaque table du schéma public reçoit ses `GRANT` puis ses politiques d'accès basées sur `same_school()` / `has_role()` / `is_finance()` déjà en place — aucune modification des politiques existantes.
- Les exports PDF réutilisent l'impression navigateur déjà utilisée pour les bulletins ; les exports Excel utilisent une bibliothèque xlsx côté navigateur.
- L'audit passe par le helper `logActivity` existant, étendu, plus des déclencheurs base de données pour paiements et notes.
- Les envois d'emails nécessitent une clé de service d'envoi (Resend) et un domaine vérifié.

---

## Questions avant de démarrer

1. Faut-il créer un rôle **infirmier** dédié, ou l'infirmerie reste-t-elle réservée à admin/directeur ?
2. Pour les emails groupés : disposez-vous d'un nom de domaine pour l'expéditeur, ou reporte-t-on cette partie ?
3. Je démarre par le Lot 1 (Infirmerie) et j'enchaîne lot par lot, en validant avec vous à chaque étape — cela vous convient ?
