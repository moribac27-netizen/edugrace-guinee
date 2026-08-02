# Déploiement de MBGEduGuinée sur Vercel

Ce guide explique comment récupérer 100 % du code (frontend + backend) et l'héberger vous-même.

---

## 1. Récupérer le code

Deux façons :

1. **GitHub (recommandé)** — dans Lovable : bouton **GitHub** en haut à droite → *Connect to GitHub* → *Create repository*. Tout le projet est poussé, et chaque modification future est synchronisée automatiquement.
2. **Téléchargement ZIP** — menu du projet → *Download / Export*.

Ce que contient le dépôt :

```text
src/                      tout le frontend + les server functions (backend applicatif)
supabase/migrations/      28 fichiers SQL = schéma complet, RLS, fonctions, triggers
supabase/config.toml      configuration du projet backend
package.json              dépendances
vite.config.ts            build
```

Il n'y a **pas de code caché** : les server functions (`src/lib/*.functions.ts`) sont le backend applicatif, et la base de données est entièrement décrite par les migrations SQL.

---

## 2. Recréer le backend (base de données)

Le backend tourne sur Postgres/Supabase. Pour être indépendant de Lovable Cloud, créez votre propre projet Supabase :

1. Créez un compte sur supabase.com et un nouveau projet (région Europe conseillée pour la Guinée).
2. Installez la CLI :
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <VOTRE_REF_PROJET>
   ```
3. Appliquez tout le schéma :
   ```bash
   supabase db push
   ```
   Cela rejoue les 28 migrations : tables, RLS, GRANT, fonctions `has_role()`, `current_school_id()`, triggers de notification.
4. Créez les buckets de stockage (privés) dans Storage :
   - `school-assets` (logos, signatures, cachets, photos élèves)
   - `school-backups` (sauvegardes)
5. Dans Authentication → Providers : activez Email, et Google si souhaité. Ajoutez votre domaine Vercel dans *Site URL* et *Redirect URLs*.

### Migrer les données existantes (facultatif)

Si vous voulez récupérer les données déjà saisies dans Lovable Cloud, utilisez le module **/sauvegarde** (Super Admin) pour exporter les JSON, puis réimportez-les dans le nouveau projet. Pour un volume important, dites-le-moi et je vous prépare un script d'import.

---

## 3. Déployer sur Vercel

### 3.1 Adapter la cible de build

Le projet est bâti sur TanStack Start et compile par défaut pour Cloudflare. Pour Vercel, ajoutez le preset dans `vite.config.ts` :

```ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: { server: { entry: "server" } },
  nitro: { preset: "vercel" },
});
```

> Attention : cette modification est utile **uniquement** pour votre déploiement Vercel. Si vous la poussez dans Lovable, la prévisualisation Lovable peut ne plus se construire. Gardez-la sur une branche `vercel` si vous voulez conserver les deux.

### 3.2 Importer le projet

1. vercel.com → *Add New* → *Project* → importez le dépôt GitHub.
2. Framework preset : **Other** (le build est piloté par Vite).
3. Build command : `npm run build` — Output directory : laissez la détection Nitro.

### 3.3 Variables d'environnement

À définir dans Vercel (Settings → Environment Variables), pour *Production* **et** *Preview* :

| Variable | Valeur | Portée |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | URL de votre projet Supabase | client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | clé publishable / anon | client |
| `VITE_SUPABASE_PROJECT_ID` | ref du projet | client |
| `SUPABASE_URL` | même URL | serveur (SSR) |
| `SUPABASE_PUBLISHABLE_KEY` | même clé publishable | serveur |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service_role | serveur uniquement |

La clé `service_role` est **secrète** : elle ne doit jamais être préfixée par `VITE_` ni apparaître dans le code client. Elle est utilisée par les server functions privilégiées (inscription d'école, super admin, sauvegardes).

### 3.4 Domaine

Vercel → Settings → Domains : ajoutez votre domaine (ex. `mbgeduguinee.com`) et suivez les enregistrements DNS. Reportez ensuite l'URL finale dans Supabase → Authentication → URL Configuration.

---

## 4. Vérifications après déploiement

- [ ] Connexion / inscription d'une école fonctionne
- [ ] Redirections par rôle correctes (admin, comptable, enseignant, parent, élève, super admin)
- [ ] Upload d'un logo et d'une photo d'élève (buckets + URLs signées)
- [ ] Impression : bulletin A4, reçu A5 avec QR, carte scolaire, fiche de paie
- [ ] Le QR d'un reçu ouvre bien `/verifier-recu/<numéro>` sur le domaine public
- [ ] Sauvegarde manuelle exécutée puis restaurée
- [ ] Isolation multi-école : deux écoles ne voient pas les données de l'autre

---

## 5. Alternative : publier depuis Lovable

Si l'objectif est simplement de rendre le logiciel accessible aux écoles rapidement, le bouton **Publish** de Lovable met l'application en ligne (URL `.lovable.app`, domaine personnalisé possible) sans aucune de ces étapes : le backend reste géré, les sauvegardes et l'authentification aussi. Vercel n'a d'intérêt que si vous voulez maîtriser vous-même l'hébergement et la base.
