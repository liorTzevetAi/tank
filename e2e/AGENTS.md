# E2E — Integration Tests

## OVERVIEW

Real CLI-to-registry integration tests. Spawns the actual `tank` binary against a live registry with real database. Zero mocks. Tests run sequentially — producer tests (publish) must complete before consumer tests (install).

## STRUCTURE

```
e2e/
├── producer.e2e.test.ts          # Publish flow (runs first)
│                                  # - Tests: login, init, publish, info
├── consumer.e2e.test.ts          # Install flow (runs second)
│                                  # - Tests: install, update, verify, remove
├── integration.e2e.test.ts       # Cross-cutting scenarios
│                                  # - Tests: search, permissions, audit
├── admin.e2e.test.ts             # Admin operations (730 lines)
│                                  # - Tests: user management, org management, moderation
├── helpers/
│   ├── cli.ts                    # runTank() — spawns real CLI binary
│   ├── fixtures.ts               # createSkillFixture(), createConsumerFixture()
│   └── setup.ts                  # setupE2E() — creates user + API key + org
└── vitest.config.ts              # Sequential execution, extended timeouts
```

## TEST FILES

| File | Lines | Tests | Purpose |
|------|-------|-------|---------|
| `producer.e2e.test.ts` | ~400 | 8 | Publish skills, verify in registry |
| `consumer.e2e.test.ts` | ~500 | 10 | Install, update, verify, remove skills |
| `integration.e2e.test.ts` | ~300 | 6 | Search, permissions, audit |
| `admin.e2e.test.ts` | 730 | 12 | Admin operations, moderation |

## KEY PATTERNS

### runTank() Helper

```typescript
// From helpers/cli.ts
export async function runTank(
  args: string[],
  options: {
    cwd?: string;
    env?: Record<string, string>;
    configDir?: string;  // Isolation: separate config per test
  } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }>
```

Spawns `node dist/bin/tank.js` as a subprocess with real network calls.

### Fixture Creation

```typescript
// From helpers/fixtures.ts
export async function createSkillFixture(options: {
  name: string;
  version: string;
  permissions?: Permissions;
  files?: Record<string, string>;
}): Promise<{ dir: string; cleanup: () => Promise<void> }>

export async function createConsumerFixture(): Promise<{
  dir: string;
  configDir: string;
  cleanup: () => Promise<void> }>
```

Creates temporary directories in `os.tmpdir()` with proper cleanup.

### E2E Setup

```typescript
// From helpers/setup.ts
export async function setupE2E(): Promise<{
  runId: string;          // Unique ID for this test run
  user: { id: string; email: string };
  apiKey: string;         // tank_* API key
  org: { id: string; name: string };
  cleanup: () => Promise<void>;
}>
```

Creates test user, API key, and organization for the test run.

## TEST ISOLATION

### Per-Test Isolation
- **Unique `runId`**: Generated per test run (UUID)
- **Separate `configDir`**: Each test gets its own `~/.tank/` equivalent
- **Temp fixtures**: Created in `os.tmpdir()`, cleaned in `afterEach`
- **Unique skill names**: Prefixed with `runId` to avoid collisions

### Environment Variables
```bash
# Required in .env.local
DATABASE_URL=postgres://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
BETTER_AUTH_SECRET=...
```

### Sequential Execution
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    fileParallelism: false,    // CRITICAL: run sequentially
    testTimeout: 60000,        // 60s per test
    hookTimeout: 120000,       // 120s for setup/teardown
  },
})
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add producer test | `producer.e2e.test.ts` | Tests that create skills |
| Add consumer test | `consumer.e2e.test.ts` | Tests that install skills |
| Add integration test | `integration.e2e.test.ts` | Cross-cutting scenarios |
| Add admin test | `admin.e2e.test.ts` | Admin-only operations |
| Modify CLI helper | `helpers/cli.ts` | runTank() implementation |
| Add fixture helper | `helpers/fixtures.ts` | Test data creation |
| Modify setup | `helpers/setup.ts` | E2E environment setup |

## CONVENTIONS

- **Sequential execution** — `fileParallelism: false`, producer before consumer
- **Real CLI spawning** — `node dist/bin/tank.js` (requires `pnpm build` first)
- **Zero mocks** — real HTTP, real DB, real Supabase storage
- **Unique `runId`** per test run — prevents collision between runs
- **Temp fixtures** — created in `os.tmpdir()`, cleaned in `afterEach`
- **File pattern** — `*.e2e.test.ts` (not `.test.ts`)
- **NO_COLOR=1** — disables chalk for parseable output
- **Env from root `.env.local`** — needs real credentials
- **Timeout**: 60s per test, 120s for hooks

## ANTI-PATTERNS

- **Never run in parallel** — tests have ordering dependencies
- **Never mock HTTP or DB** — defeats the purpose
- **Never add to Turbo `test` task** — E2E runs via `pnpm test:e2e` separately
- **Never skip cleanup** — fixtures accumulate and pollute runs
- **Never use `.test.ts`** — use `.e2e.test.ts` to distinguish from unit tests
- **Never hardcode credentials** — use environment variables
- **Never share `runId` between test files** — each file gets its own

## RUNNING E2E TESTS

```bash
# Prerequisites
pnpm build                  # Build CLI first
cp .env.example .env.local  # Configure real credentials

# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm vitest run e2e/producer.e2e.test.ts

# Run with debug output
TANK_DEBUG=1 pnpm test:e2e

# Run single test
pnpm vitest run e2e/producer.e2e.test.ts -t "should publish skill"
```

## TEST ORDER

```
1. producer.e2e.test.ts
   └── login, init, publish, info

2. consumer.e2e.test.ts
   └── install, update, verify, permissions, remove

3. integration.e2e.test.ts
   └── search, audit, full lifecycle

4. admin.e2e.test.ts
   └── user CRUD, org management, package moderation
```

## DEBUGGING FAILED TESTS

```bash
# Check CLI output
TANK_DEBUG=1 pnpm test:e2e 2>&1 | tee e2e-debug.log

# Run single test with verbose output
pnpm vitest run e2e/producer.e2e.test.ts --reporter=verbose

# Check database state
psql $DATABASE_URL -c "SELECT * FROM skills WHERE name LIKE 'test-%';"

# Check storage
# Use Supabase dashboard to inspect uploaded tarballs
```

## CI INTEGRATION

E2E tests run in CI after unit tests pass:

```yaml
# .github/workflows/test.yml
- name: Run E2E tests
  run: pnpm test:e2e
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
    # ... other secrets
```

Note: E2E requires real credentials, not fake ones like unit tests.
