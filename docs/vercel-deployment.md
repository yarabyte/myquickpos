# Déploiement MyQuickPOS sur Vercel

Guide pour héberger l'application Next.js sur Vercel avec Supabase (PostgreSQL).

## Prérequis

- Compte [Vercel](https://vercel.com)
- Projet Supabase avec données importées ([supabase-migration.md](./supabase-migration.md))
- Dépôt Git (GitHub, GitLab ou Bitbucket)

## 1. Pousser le code sur Git

```bash
git add .
git commit -m "Prepare Vercel deployment"
git push origin main
```

## 2. Importer le projet sur Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
2. Sélectionner le dépôt `myquickpos`
3. Vercel détecte **Next.js** et **pnpm** automatiquement

### Paramètres de build (vérification)

| Paramètre | Valeur |
|-----------|--------|
| Framework | Next.js |
| Install Command | `pnpm install` |
| Build Command | `pnpm run build` |
| Output Directory | `.next` (défaut) |
| Node.js | 20.x |

Le fichier `vercel.json` à la racine fixe la région **Paris (cdg1)** — modifiable si besoin.

## 3. Variables d'environnement

Dans **Settings → Environment Variables**, ajouter pour **Production**, **Preview** et **Development** :

Voir la liste complète dans [vercel-env.example](./vercel-env.example).

Minimum :

```
DATABASE_URL=postgresql://...@...pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
DIRECT_URL=postgresql://...@...pooler.supabase.com:5432/postgres?sslmode=require
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://votre-projet.vercel.app
```

> **Ne commitez jamais** `.env` — les secrets restent uniquement dans Vercel.

## 4. Déployer

Cliquer **Deploy**. Le build exécute :

1. `pnpm install` → `postinstall` → `prisma generate`
2. `prisma generate && next build`

## 5. Domaine personnalisé (optionnel)

**Settings → Domains** → ajouter `pos.votredomaine.com`

Mettre à jour `AUTH_URL` avec le domaine final.

## Architecture

```
Navigateur → Vercel (Next.js) → Supabase Pooler :6543 → PostgreSQL
                ↓
           NextAuth (JWT)
           Prisma ORM
```

## Dépannage

| Problème | Cause probable | Solution |
|----------|----------------|----------|
| Build échoue « Prisma Client not generated » | `prisma generate` absent | Vérifier `postinstall` dans package.json |
| `Can't reach database` | Mauvais `DATABASE_URL` | Port 6543 + `pgbouncer=true` |
| Login échoue en prod | `AUTH_SECRET` manquant | Ajouter dans Vercel env vars |
| `UntrustedHost` | Proxy | `trustHost: true` déjà dans `auth.ts` |
| Trop de connexions DB | Pooler non utilisé | `DATABASE_URL` doit utiliser le pooler 6543 |

## Commandes utiles

```bash
# Déployer depuis le CLI
pnpm dlx vercel

# Déployer en production
pnpm dlx vercel --prod

# Voir les logs
pnpm dlx vercel logs
```

## Fichiers ajoutés pour Vercel

- `vercel.json` — région et commandes de build
- `docs/vercel-env.example` — liste des variables
- `package.json` — `postinstall`, `build` avec Prisma, `engines.node`
