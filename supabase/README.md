# Supabase — Teranga Align

## Appliquer les migrations

### Via Supabase CLI (recommandé)
```bash
# Initialiser le lien avec le projet Supabase
supabase link --project-ref <votre-project-ref>

# Appliquer toutes les migrations
supabase db push
```

### Via le dashboard Supabase (SQL Editor)
Exécuter dans l'ordre :
1. `migrations/001_initial_schema.sql`
2. `migrations/002_rls_policies.sql`
3. `migrations/003_indexes.sql`
4. `seed.sql` (développement uniquement)

## Variables d'environnement requises

```env
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# WorkOS
WORKOS_API_KEY=<api-key>
WORKOS_CLIENT_ID=<client-id>
NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3000/callback

# Claude API
ANTHROPIC_API_KEY=<api-key>
```

## Architecture multi-tenant

Chaque requête Supabase **doit** appeler `setOrgContext(supabase, organizationId)` avant toute query.
Cela exécute `set_app_org(org_id)` qui stocke l'ID en session PostgreSQL.
Toutes les tables ont RLS activé avec la policy `org_isolation` basée sur `current_org_id()`.

Le `createAdminClient()` (service_role) bypass le RLS — à utiliser uniquement pour les webhooks et l'admin.
