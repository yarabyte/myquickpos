# Migration MyQuickPOS vers Supabase

Ce guide importe le dump `myqucikpos.sql` (export TablePlus) dans un projet Supabase et connecte l'application Next.js.

## 1. Créer le projet Supabase

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Région proche de vos utilisateurs (ex. `eu-central-1`)
3. Mot de passe base de données : notez-le

## 2. Récupérer les URLs de connexion

**Project Settings → Database → Connection string**

| Usage | Mode | Port |
|-------|------|------|
| App Next.js (Prisma) | **Transaction pooler** | `6543` |
| Import SQL / migrations | **Direct connection** | `5432` |

Ajoutez `?sslmode=require` à la fin des URLs.

## 3. Configurer `.env`

```env
# Pooler — runtime application (Prisma)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"

# Direct — import dump et prisma migrate
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"

AUTH_SECRET="votre-secret"
AUTH_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"
```

En local sans pooler, `DATABASE_URL` et `DIRECT_URL` peuvent être identiques.

## 4. Importer le dump SQL

```bash
chmod +x scripts/import-sql-dump.sh

DIRECT_URL="postgresql://..." ./scripts/import-sql-dump.sh /Users/shakemill/Desktop/myqucikpos.sql
```

Ou via npm :

```bash
DIRECT_URL="postgresql://..." pnpm run db:import-dump
```

**Alternative** : Supabase Dashboard → **SQL Editor** → coller le fichier (attention : ~2,3 Mo, peut être lent).

## 5. Générer le client Prisma

```bash
pnpm run db:generate
```

## 6. Vérifier

```bash
pnpm run db:studio
```

Contrôlez : tenants (`emilemicheline`), utilisateurs, produits, commandes.

## 7. Lancer l'application

```bash
pnpm run dev
```

Connexion test : `xtvalizo@gmail.com` / tenant `emilemicheline`.

## Notes

- **RLS** : l'app utilise Prisma avec le rôle `postgres` (bypass RLS). Pas de changement requis pour l'instant.
- **Auth** : NextAuth reste géré par l'app (table `User`), pas Supabase Auth.
- **Production** : `AUTH_URL` / `NEXTAUTH_URL` = `https://myquickpos.app`
- **Sauvegardes** : activez les backups automatiques dans Supabase (Settings → Database).

## Dépannage

| Erreur | Solution |
|--------|----------|
| `psql: command not found` | `brew install libpq` puis `brew link --force libpq` |
| Timeout à l'import | Utilisez `DIRECT_URL` (port 5432), pas le pooler |
| `prepared statement already exists` | Ajoutez `?pgbouncer=true` à `DATABASE_URL` |
| Connexion refusée | Vérifiez mot de passe, `sslmode=require`, IP autorisée |
