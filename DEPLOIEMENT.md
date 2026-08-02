# Déployer MBGEduGuinée sur Vercel

Tout est déjà prêt dans le dépôt : `vercel.json`, la bascule automatique du build vers Vercel
(`vite.config.ts` détecte la variable `VERCEL`), et `.env.example` avec la liste exacte des variables.
Vous n'avez **rien à modifier dans le code**.

---

## Étape 1 — Récupérer le code

Dans Lovable : bouton **GitHub** (en haut à droite) → *Connect to GitHub* → *Create repository*.
Tout le projet est poussé et resynchronisé à chaque modification.

Contenu :

```text
src/                      frontend + server functions (backend applicatif)
supabase/migrations/      schéma complet : tables, RLS, GRANT, fonctions, triggers
vercel.json               configuration de déploiement Vercel
.env.example              variables d'environnement à renseigner
```

---

## Étape 2 — Créer votre base de données

1. Créez un compte sur supabase.com, puis un projet (région Europe conseillée pour la Guinée).
2. Appliquez le schéma :
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <VOTRE_REF_PROJET>
   supabase db push
   ```
3. Storage → créez deux buckets **privés** : `school-assets` et `school-backups`.
4. Authentication → Providers : activez **Email** (et Google si souhaité).

Récupérez ensuite dans Project Settings → API :
l'URL du projet, la clé *publishable/anon*, et la clé *service_role* (secrète).

---

## Étape 3 — Importer le projet sur Vercel

1. vercel.com → **Add New** → **Project** → importez le dépôt GitHub.
2. Framework Preset : **Other** (`vercel.json` s'occupe du reste).
3. Ne touchez ni au Build Command ni au Output Directory.

---

## Étape 4 — Variables d'environnement

Vercel → Settings → Environment Variables. À définir pour **Production** et **Preview** :

| Variable | Valeur |
| --- | --- |
| `VITE_SUPABASE_URL` | URL de votre projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | clé publishable / anon |
| `VITE_SUPABASE_PROJECT_ID` | ref du projet |
| `SUPABASE_URL` | même URL |
| `SUPABASE_PUBLISHABLE_KEY` | même clé publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service_role (**secrète**) |

⚠️ La clé `service_role` ne doit **jamais** être préfixée par `VITE_`.

Puis **Deployments → Redeploy** pour que les variables soient prises en compte.

---

## Étape 5 — Domaine

1. Vercel → Settings → Domains → ajoutez `mbgeduguinee.com` (ou autre) et suivez les DNS.
2. Supabase → Authentication → URL Configuration : mettez votre domaine final
   dans *Site URL* et dans *Redirect URLs* (sinon la connexion et la confirmation d'e-mail échouent).

---

## Étape 6 — Vérifications

- [ ] Inscription d'une école + connexion
- [ ] Redirections par rôle (admin, directeur, comptable, enseignant, parent, élève, super admin)
- [ ] Upload d'un logo et d'une photo d'élève
- [ ] Impressions : bulletin A4, reçu A5 avec QR, carte scolaire, fiche de paie
- [ ] Le QR d'un reçu ouvre `/verifier-recu/<numéro>` sur le domaine public
- [ ] Sauvegarde manuelle exécutée puis restaurée
- [ ] Isolation multi-école : deux écoles ne voient pas les données de l'autre

---

## Reprendre vos données actuelles (facultatif)

Le module **/sauvegarde** (Super Admin) exporte les données en JSON depuis l'environnement actuel ;
réimportez-les ensuite dans le nouveau projet. Pour un gros volume, demandez-moi un script d'import.

---

## Alternative plus rapide

Le bouton **Publish** de Lovable met l'application en ligne immédiatement (URL `.lovable.app`,
domaine personnalisé possible), avec la base, l'authentification et les sauvegardes déjà gérées.
Vercel n'a d'intérêt que si vous voulez maîtriser vous-même l'hébergement et la base.
