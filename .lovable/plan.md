# Nouvelles fonctionnalités MBGEduGuinée

Cinq chantiers ajoutés sans toucher aux modules existants (écoles, abonnements, cloisonnement par école, super admin).

## 1. Espace public des événements inter-écoles

Nouveau module « Événements » où chaque école publie ses événements (titre, description, date de début/fin, lieu, image optionnelle, école organisatrice) et consulte ceux des autres établissements.

- Nouvelle table dédiée aux événements partagés, avec l'école organisatrice, un indicateur « publié » et une image.
- Règles d'accès : lecture pour tout utilisateur connecté de n'importe quelle école (uniquement les événements publiés) ; création, modification et suppression réservées à la direction de l'école organisatrice.
- Page `/evenements` : fil des événements de toute la plateforme avec filtre « Mon école / Toutes les écoles », badge de l'école organisatrice, et formulaire de publication visible uniquement pour les rôles habilités.
- Images stockées dans le bucket privé existant, sous le dossier de l'école.

## 2. Espace Directeur des études / Proviseur

Deux nouveaux rôles rattachés à une école : `directeur_etudes` et `proviseur`.

- Ajout des rôles à la liste des rôles applicatifs, à la carte des droits d'accès et au menu.
- Tableau de bord pédagogique `/direction-etudes` : effectifs par classe, moyennes et taux de réussite par classe et par matière, alertes (classes sans emploi du temps, absences du jour, notes non saisies), accès direct aux emplois du temps, notes, bulletins, présences et à la messagerie enseignants.
- Droits : lecture/écriture sur le pédagogique (classes, matières, emplois du temps, notes, examens, bulletins, présences, affectations, annonces), aucun accès aux finances ni aux paramètres d'abonnement.
- Cloisonnement identique aux autres rôles (données limitées à l'école du profil).

## 3. Impression carte élève au format PVC

La carte scolaire actuelle reste inchangée. On ajoute une option d'impression supplémentaire sur la même page.

- Sélecteur de format d'impression : « A4 (10 par page) » (actuel, par défaut) ou « PVC CR80 ».
- Format PVC : une carte par page, 85,6 × 54 mm exact, avec fonds perdus 2 mm et repères de coupe, recto (photo, identité, école) et verso (règlement court, contact école, code de vérification).
- Aucun nouvel onglet ni nouveau module.

## 4. Application installable (PWA)

- Manifest d'application, icônes générées à partir du logo MBGEduGuinée (192, 512, maskable, apple-touch-icon), thème aux couleurs du design.
- Service worker minimal pour rendre l'installation possible et gérer le mode hors-ligne basique de la coquille.
- Bouton « Installer l'application » discret quand le navigateur le propose.
- Prise en charge Android, desktop et iOS (ajout à l'écran d'accueil).

## 5. En-tête école sur tous les documents imprimables

Un composant d'en-tête unique réutilisé par tous les documents : logo de l'école, nom, adresse, téléphone, e-mail, site, année scolaire ; pied de page avec la mention légale de l'école.

- Appliqué aux bulletins, cartes (A4 et PVC), reçus de paiement, fiches et exports PDF de la comptabilité et des rapports.
- Toutes les valeurs sont lues dynamiquement depuis le profil de l'école connectée.

## Détails techniques

- Migration unique : table `school_events` (avec GRANT + RLS : lecture `authenticated` sur les événements publiés, écriture restreinte à `same_school` + rôles de direction) et ajout des valeurs `directeur_etudes` / `proviseur` à l'enum `app_role`.
- `src/hooks/useAuth.ts`, `src/lib/access.ts`, `src/components/AppShell.tsx` : intégration des deux nouveaux rôles (aucune règle existante supprimée).
- Nouvelles routes : `src/routes/_authenticated/evenements.tsx`, `src/routes/_authenticated/direction-etudes.tsx`.
- Nouveau composant `src/components/print/SchoolLetterhead.tsx` + hook de chargement des infos école, branché dans `BulletinDocument.tsx`, `cartes.tsx`, `src/lib/reports.ts` (métadonnées PDF) et les reçus.
- PWA : `public/manifest.webmanifest`, icônes générées, `<link>` dans `src/routes/__root.tsx`, enregistrement du service worker côté client uniquement.

## Ordre de livraison

1. Migration base de données (rôles + table événements) — validation requise.
2. Rôles et espace Direction des études.
3. Module Événements inter-écoles.
4. En-tête école unifié sur les documents.
5. Impression PVC.
6. PWA et icônes.
