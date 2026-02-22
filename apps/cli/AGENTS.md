# CLI — `tank` Command

## OVERVIEW

Commander.js CLI with 16 commands for publishing, installing, and managing AI agent skills with security-first design. Entry point: `bin/tank.ts` registers all commands from `src/commands/`.

## STRUCTURE

```
cli/
├── bin/tank.ts                   # Entry point — registers all 16 commands
├── src/
│   ├── commands/                 # 1-file-per-command (16 files)
│   │   ├── install.ts            # 661 lines — fetch→verify→extract, largest
│   │   ├── publish.ts            # Pack→POST→PUT→confirm
│   │   ├── update.ts             # 534 lines — semver resolution
│   │   ├── search.ts             # Query registry, display results
│   │   ├── init.ts               # Create skills.json interactively
│   │   ├── info.ts               # Show skill metadata
│   │   ├── whoami.ts             # Display current user
│   │   ├── verify.ts             # Verify lockfile integrity
│   │   ├── permissions.ts        # Display resolved permissions
│   │   ├── audit.ts              # Show security analysis
│   │   ├── remove.ts             # Remove skill from lockfile
│   │   ├── login.ts              # Browser OAuth → API key
│   │   ├── logout.ts             # Clear ~/.tank/config.json
│   │   ├── link.ts               # Link skill to agent workspace
│   │   ├── unlink.ts             # Remove skill symlink
│   │   └── doctor.ts             # Diagnose setup issues
│   ├── lib/                      # Shared utilities (10 files)
│   │   ├── api-client.ts         # HTTP client for registry API
│   │   ├── config.ts             # ~/.tank/config.json management
│   │   ├── lockfile.ts           # Deterministic lockfile (sorted keys)
│   │   ├── packer.ts             # Tarball creation with security filters
│   │   ├── linker.ts             # Agent linking infrastructure
│   │   ├── frontmatter.ts        # Skills.json frontmatter parsing
│   │   ├── links.ts              # Symlink management
│   │   ├── logger.ts             # chalk (user) + pino (debug)
│   │   ├── debug-logger.ts       # TANK_DEBUG=1 → pino → Loki
│   │   └── validator.ts          # Skills.json validation
│   └── __tests__/                # 25 test files, colocated with source
│       ├── install.test.ts       # 1340 lines — most comprehensive
│       ├── update.test.ts        # 534 lines
│       ├── publish.test.ts
│       └── ...                   # All commands have corresponding tests
└── dist/                         # Build output (NodeNext)
```

## ALL 16 COMMANDS

| Command | File | Purpose |
|---------|------|---------|
| `tank login` | `login.ts` | Browser OAuth → API key stored in `~/.tank/config.json` |
| `tank logout` | `logout.ts` | Clear credentials from config |
| `tank whoami` | `whoami.ts` | Display current user/org info |
| `tank init` | `init.ts` | Create `skills.json` interactively |
| `tank publish` | `publish.ts` | Pack tarball → POST manifest → PUT tarball → POST confirm |
| `tank install [skill]` | `install.ts` | Resolve version → fetch tarball → SHA-512 verify → extract → lockfile |
| `tank update [skill]` | `update.ts` | Update within semver range |
| `tank remove [skill]` | `remove.ts` | Remove from lockfile, delete files |
| `tank search "query"` | `search.ts` | FTS query registry |
| `tank info @org/skill` | `info.ts` | Show skill metadata |
| `tank verify` | `verify.ts` | Verify lockfile integrity (SHA-512) |
| `tank permissions` | `permissions.ts` | Display resolved permission summary |
| `tank audit [skill]` | `audit.ts` | Show security scan results |
| `tank link` | `link.ts` | Symlink skill into agent workspace |
| `tank unlink` | `unlink.ts` | Remove skill symlink |
| `tank doctor` | `doctor.ts` | Diagnose config, auth, network issues |

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new command | `src/commands/new-cmd.ts` | Export async fn, register in `bin/tank.ts` |
| Modify API calls | `src/lib/api-client.ts` | All registry HTTP communication |
| Modify tarball packing | `src/lib/packer.ts` | Security: rejects symlinks, path traversal, >50MB |
| Modify lockfile format | `src/lib/lockfile.ts` | LOCKFILE_VERSION from @tank/shared |
| Add agent linking logic | `src/lib/linker.ts` | Multi-agent skill installation |
| Add test | `src/__tests__/cmd-name.test.ts` | Pass `configDir` for isolation |
| Modify validation | `src/lib/validator.ts` | skills.json schema validation |

## KEY FLOWS

### Install Flow
1. Resolve version using semver range from `@tank/shared` resolver
2. Fetch tarball URL from registry
3. Download tarball to temp directory
4. **Verify SHA-512 hash** against registry signature
5. Extract with security filters:
   - Reject symlinks and hardlinks
   - Reject path traversal (`../`)
   - Reject absolute paths
   - Reject files >50MB total
   - Reject >1000 files
6. Write to `~/.tank/skills/@org/skill@version/`
7. Update `skills.lock` (deterministic, sorted keys)

### Publish Flow
1. Validate `skills.json` against Zod schema
2. Pack tarball with `ALWAYS_IGNORED` filter (`.git`, `node_modules`, `.env*`)
3. POST manifest to `/v1/skills`
4. PUT tarball to signed URL
5. POST `/v1/skills/confirm` to finalize

### Login Flow
1. POST `/v1/cli-auth/start` → get poll token
2. Open browser to GitHub OAuth
3. Poll `/v1/cli-auth/exchange` every 2s
4. Store API key (prefix `tank_`) in `~/.tank/config.json`

### Agent Linking Flow
1. Parse frontmatter from `skills.json`
2. Resolve skill dependencies
3. Create symlink: `agent-workspace/.skills/@org/skill` → `~/.tank/skills/@org/skill@version`
4. Update agent's `skills.lock`

## CONVENTIONS

- **Commands export a single async function**, registered in `bin/tank.ts`
- **`configDir` injection** for test isolation — never touch real `~/.tank/`
- **`chalk` for user-facing output**, `pino` for structured debug logs
- **`.js` extensions on all imports** (ESM with NodeNext resolution)
- **Deterministic lockfile** — sorted keys, stable output
- **ALWAYS_IGNORED in packer**: `.git`, `node_modules`, `.env*`, `.DS_Store`, `*.log`, `dist/`, `build/`

## ANTI-PATTERNS

- **Never hardcode registry URL** — use `REGISTRY_URL` from `@tank/shared`
- **Never skip SHA-512 verification** during install
- **Never extract without security filters** — reject symlinks, hardlinks, path traversal, absolute paths
- **Never use logger for debug output** — use `debug-logger` with `TANK_DEBUG=1`
- **Never exceed** 1000 files or 50MB per tarball (enforced in packer)
- **Never use `parse()` from Zod** — always `safeParse()` to avoid throwing
- **Never import from `apps/web`** — use `@tank/shared` for shared types
- **Never mutate config directly** — use `config.ts` utilities

## TESTING

```bash
# Run all CLI tests
pnpm test --filter=cli

# Run specific test
pnpm test --filter=cli -- install.test.ts

# With debug logging
TANK_DEBUG=1 pnpm test --filter=cli
```

- Tests use `mock-fs` for filesystem isolation
- `configDir` passed to commands for isolation
- Each command has corresponding `__tests__/*.test.ts`
- Integration tests spawn real CLI binary (see `e2e/`)
