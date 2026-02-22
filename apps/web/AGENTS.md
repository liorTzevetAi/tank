# WEB — Next.js 15 Registry

## OVERVIEW

Next.js 15 App Router application serving as the Tank skill registry — web UI, REST API for CLI, and Python security scanning stubs. Two auth modes: web sessions (better-auth cookies) and CLI (Bearer `tank_*` API keys).

## STRUCTURE

```
web/
├── app/
│   ├── layout.tsx                # Root layout, loads fonts
│   ├── page.tsx                  # Homepage (public)
│   ├── cli-login/                # CLI OAuth redirect handler
│   ├── (auth)/                   # Auth route group
│   │   └── login/                # Web login page
│   ├── (dashboard)/              # Protected — layout auth guard
│   │   ├── layout.tsx            # Auth guard: checks session
│   │   ├── dashboard/            # Overview page
│   │   ├── tokens/               # API key management
│   │   │   ├── page.tsx          # List/create API keys
│   │   │   └── actions.ts        # Server actions for tokens
│   │   ├── orgs/                 # Organization management
│   │   │   ├── page.tsx          # List orgs
│   │   │   └── actions.ts        # Server actions for orgs
│   │   └── admin/                # Admin-only routes
│   │       ├── packages/         # Skill moderation
│   │       ├── users/            # User management
│   │       └── audit-logs/       # Action logging
│   ├── (registry)/               # Public skill browsing
│   │   └── skills/[...name]/     # Skill detail page
│   │       ├── page.tsx          # 534 lines — main skill view
│   │       ├── tabs.tsx          # Tab navigation
│   │       ├── explorer.tsx      # File browser
│   │       └── components/       # Skill page components
│   ├── docs/                     # Documentation pages
│   │   └── user-flow/            # 802 lines — user guide
│   └── api/                      # REST API
│       ├── health/               # Health check endpoint
│       ├── auth/[...all]/        # better-auth handlers
│       ├── v1/                   # Public API (CLI uses this)
│       │   ├── cli-auth/         # OAuth flow (start→authorize→exchange)
│       │   ├── skills/           # Publish, metadata, download
│       │   │   ├── route.ts      # POST (publish), GET (search)
│       │   │   ├── [name]/       # Skill operations
│       │   │   │   ├── route.ts  # GET metadata
│       │   │   │   ├── versions/ # List versions
│       │   │   │   ├── star/     # Star/unstar
│       │   │   │   └── [version]/
│       │   │   │       ├── route.ts        # GET version metadata
│       │   │   │       └── files/[...path]/# File content
│       │   │   └── confirm/      # Finalize publish
│       │   └── search/           # Full-text search
│       └── admin/                # Admin API
│           ├── packages/         # Skill CRUD, moderation
│           ├── users/            # User CRUD, status
│           ├── orgs/             # Organization CRUD
│           ├── audit-logs/       # Query audit logs
│           ├── rescan-skills/    # Bulk security rescan
│           └── service-accounts/ # CI/CD API keys
├── api-python/                   # Vercel Python stubs — mirrors python-api/
│   └── analyze/                  # Security scan endpoints
│       ├── scan/                 # 6-stage pipeline
│       ├── rescan/               # Re-run analysis
│       ├── security/             # Security-only
│       ├── permissions/          # Permission validation
│       └── tests/                # Python tests
├── lib/
│   ├── db.ts                     # globalThis singleton (hot-reload safe)
│   ├── db/
│   │   ├── schema.ts             # Domain: skills, versions, downloads, audit, scans
│   │   └── auth-schema.ts        # better-auth auto-generated tables
│   ├── auth.ts                   # better-auth config (GitHub + OIDC SSO + apiKey + org)
│   ├── auth-client.ts            # Client-side auth helpers
│   ├── auth-helpers.ts           # verifyCliAuth() — Bearer token validation
│   ├── admin-middleware.ts       # Role-based access control
│   ├── cli-auth-store.ts         # In-memory store, 5-min TTL for OAuth polling
│   ├── supabase.ts               # Storage client (tarballs only)
│   ├── storage/
│   │   └── provider.ts           # Abstract storage (Supabase or on-prem)
│   ├── redis.ts                  # Optional Redis for caching
│   ├── email/
│   │   ├── service.ts            # Resend email service
│   │   └── rate-limiter.ts       # Rate limiting for emails
│   ├── audit-score.ts            # 0–10 score, 8 weighted checks
│   ├── logger.ts                 # pino → Loki structured logging
│   ├── config-validation.ts      # Environment validation
│   ├── utils.ts                  # Shared utilities
│   └── data/
│       └── skills.ts             # Data access layer for skills
├── components/
│   ├── ui/                       # shadcn/ui components (9 base)
│   └── security/                 # Security scan visualization (6 files)
├── scripts/                      # Performance testing
│   ├── perf-seed.ts              # 504 lines — seed test data
│   ├── perf-analyze-runs.ts      # Analyze results
│   └── perf-report.ts            # Generate reports
├── perf/results/                 # Performance test artifacts
├── drizzle/                      # Migrations
│   └── meta/                     # Migration metadata
└── public/                       # Static assets
```

## ALL API ENDPOINTS

### Public API (`/api/v1/`)

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/cli-auth/start` | POST | Begin OAuth flow, returns poll token |
| `/cli-auth/authorize` | GET | User grants access |
| `/cli-auth/exchange` | POST | Exchange poll token for API key |
| `/skills` | GET, POST | Search skills, publish new skill |
| `/skills/confirm` | POST | Finalize publish after upload |
| `/skills/[name]` | GET | Get skill metadata |
| `/skills/[name]/versions` | GET | List all versions |
| `/skills/[name]/star` | POST, DELETE | Star/unstar skill |
| `/skills/[name]/[version]` | GET | Get version metadata |
| `/skills/[name]/[version]/files/[...path]` | GET | Get file content |
| `/search` | GET | Full-text search with GIN index |

### Admin API (`/api/admin/`)

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/packages` | GET | List all packages for moderation |
| `/packages/[...segments]` | GET, PUT, DELETE | Package CRUD |
| `/users` | GET | List all users |
| `/users/[userId]` | GET, PUT | User CRUD |
| `/users/[userId]/status` | PUT | Enable/disable user |
| `/orgs` | GET | List organizations |
| `/orgs/[orgId]` | GET, PUT, DELETE | Organization CRUD |
| `/orgs/[orgId]/members/[memberId]` | PUT, DELETE | Member management |
| `/audit-logs` | GET | Query audit logs |
| `/rescan-skills` | POST | Bulk security rescan |
| `/service-accounts` | GET, POST | Service account CRUD |
| `/service-accounts/[id]` | GET, PUT, DELETE | Service account management |
| `/service-accounts/[id]/keys` | GET, POST | API key management |
| `/service-accounts/[id]/keys/[keyId]` | DELETE | Revoke API key |

### Health Check
| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/health` | GET | Health check for load balancers |

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add API endpoint | `app/api/v1/new/route.ts` or `api/admin/` | Export `GET`/`POST`/etc. |
| Add protected page | `app/(dashboard)/new/page.tsx` | Layout guard handles auth |
| Add public page | `app/(registry)/new/page.tsx` | No auth needed |
| Add server action | `app/(dashboard)/feature/actions.ts` | `'use server'` directive |
| Modify DB schema | `lib/db/schema.ts` | Run `drizzle-kit generate` after |
| Add UI component | `components/ui/` | `npx shadcn add <component>` |
| Auth configuration | `lib/auth.ts` | better-auth plugins |
| Modify security scanning | `api-python/analyze/` | Must sync with `python-api/` at root |
| Performance testing | `scripts/perf-*.ts` | Needs real Postgres + Supabase |
| Email service | `lib/email/service.ts` | Resend integration |
| Storage backend | `lib/storage/provider.ts` | Supabase or on-prem |
| OIDC SSO config | `lib/auth.ts` | `oidc` plugin configuration |
| Admin RBAC | `lib/admin-middleware.ts` | Role checking |

## KEY PATTERNS

### Authentication
- **Two modes**: Web sessions (better-auth cookies) and CLI (Bearer `tank_*` API keys)
- **Web flow**: GitHub OAuth → session cookie → layout guard checks
- **CLI flow**: POST `/cli-auth/start` → browser OAuth → poll `/cli-auth/exchange`
- **OIDC SSO**: Enterprise single sign-on via OpenID Connect providers

### Database
- **DB singleton**: `globalThis.__db` in `lib/db.ts` — prevents hot-reload connection leaks
- **Dual schema**: `schema.ts` (domain) + `auth-schema.ts` (better-auth generated)
- **Migrations**: Drizzle Kit, stored in `drizzle/`

### Audit Score (0-10)
Always 8 weighted entries:
1. README present (1.5 pts)
2. LICENSE present (1.0 pts)
3. Permissions declared (1.5 pts)
4. Tests present (1.0 pts)
5. TypeScript types (1.0 pts)
6. Examples present (1.0 pts)
7. Size under limit (1.0 pts)
8. Documentation (1.0 pts)

### Full-Text Search
- `searchVector` column on skills table
- GIN index for fast searching
- Trigram similarity for fuzzy matching

## CONVENTIONS

- **Server Components by default** — `'use client'` only when interactive
- **Auth checks at layout level**, never in individual pages
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **`@/*` import alias** (tsconfig paths)
- **All data access** through `lib/data/skills.ts` or direct Drizzle queries
- **Server actions** in `actions.ts` files with `'use server'` directive

## ANTI-PATTERNS

- **Never create DB connections outside `lib/db.ts`** — use the globalThis singleton
- **Never use Supabase for DB queries** — Supabase client is for file storage only
- **Never expose `supabaseAdmin` to browser** — service-role key is server-only
- **Never put auth checks in page components** — layout guards only
- **Never import from `apps/cli`** — use `@tank/shared` for shared types
- **Never modify `auth-schema.ts` manually** — auto-generated by better-auth
- **Never skip audit logging** for admin actions — log to audit_logs table
- **Never hardcode API responses** — use Zod validation on all inputs

## TESTING

```bash
# Run web tests
pnpm test --filter=web

# Run specific test
pnpm test --filter=web -- publish.test.ts

# Run performance tests (needs real DB)
pnpm test:perf

# Seed performance data
pnpm --filter=web scripts/perf-seed.ts
```

- API tests in `__tests__/` subdirectories
- Database tests use test fixtures
- Performance tests measure latency under load

## ENVIRONMENT VARIABLES

Required in `.env.local`:
- `DATABASE_URL` — PostgreSQL connection string
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Public key
- `SUPABASE_SERVICE_ROLE_KEY` — Server-only key
- `BETTER_AUTH_SECRET` — Session encryption key
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — OAuth
- `RESEND_API_KEY` — Email service (optional)
- `OIDC_*` — Enterprise SSO (optional)
- `REDIS_URL` — Caching (optional)
