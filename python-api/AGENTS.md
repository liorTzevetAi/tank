# PYTHON-API — Security Scanner

## OVERVIEW

6-stage security analysis pipeline for skill packages. FastAPI + Pydantic 2. Deployed standalone (Vercel) and mirrored in `apps/web/api-python/`. This is the core security engine that prevents malicious skills from entering the registry.

## STRUCTURE

```
python-api/
├── api/analyze/                  # FastAPI endpoints
│   ├── index.py                  # Health / root endpoint
│   ├── scan.py                   # POST /analyze/scan — full 6-stage pipeline
│   ├── rescan.py                 # POST /analyze/rescan — re-run on existing skill
│   ├── security.py               # POST /analyze/security — security-only analysis
│   ├── permissions.py            # POST /analyze/permissions — permission extraction
│   ├── _lib.py                   # Shared endpoint utilities
│   └── tests/                    # Endpoint tests
├── lib/scan/                     # Pipeline stages (13 files)
│   ├── __init__.py               # Package init
│   ├── stage0_ingest.py          # Download + extract tarball, compute hashes
│   ├── stage1_structure.py       # Validate file structure, detect anomalies
│   ├── stage2_static.py          # Static code analysis (AST, pattern matching)
│   ├── stage3_injection.py       # Prompt injection detection
│   ├── stage4_secrets.py         # Secret/credential scanning
│   ├── stage5_supply.py          # Supply chain risk analysis
│   ├── models.py                 # ScanVerdict, Finding, StageResult, ScanRequest/Response
│   ├── verdict.py                # Verdict computation rules
│   ├── permission_extractor.py   # Extract declared permissions from code
│   ├── sarif.py                  # SARIF output format generation
│   ├── dedup.py                  # Deduplicate findings
│   └── cisco_scanner.py          # Cisco security integration
├── lib/patterns/                 # Detection patterns (extensible)
├── lib/rules/                    # Analysis rules (extensible)
├── tests/                        # pytest tests (16 tests)
│   ├── test_skills/
│   │   ├── benign/               # Safe skill fixtures
│   │   └── malicious/            # Malicious skill fixtures for testing
│   └── test_*.py                 # Test modules
├── requirements.txt              # Python dependencies
├── pyproject.toml                # Project config
└── vercel.json                   # Standalone Vercel deployment
```

## PIPELINE STAGES

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   stage0    │───▶│   stage1    │───▶│   stage2    │───▶│   stage3    │───▶│   stage4    │───▶│   stage5    │
│   INGEST    │    │  STRUCTURE  │    │   STATIC    │    │  INJECTION  │    │   SECRETS   │    │   SUPPLY    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Stage 0: Ingest
**File**: `stage0_ingest.py` (~200 lines)

**Purpose**: Download and extract tarball, compute hashes

**Checks**:
- Download tarball from URL
- Extract to temp directory
- Compute SHA-256 hash for each file
- Validate tarball structure
- Reject encrypted archives
- Reject archives with suspicious paths

**Output**: `StageResult` with extracted files and hashes

### Stage 1: Structure
**File**: `stage1_structure.py` (~300 lines)

**Purpose**: Validate file structure, detect anomalies

**Checks**:
- Required files present (skills.json)
- File count within limits (<1000)
- Total size within limits (<50MB)
- No binary executables
- No compiled Python (.pyc, .pyo)
- No hidden files in unexpected places
- File extension validation

**Output**: `StageResult` with structure findings

### Stage 2: Static Analysis
**File**: `stage2_static.py` (~550 lines) — LARGEST STAGE

**Purpose**: Static code analysis via AST and pattern matching

**Checks**:
- Python AST analysis
- JavaScript pattern matching
- Dangerous function calls (`eval`, `exec`, `compile`)
- File system operations (suspicious paths)
- Network operations (exfiltration patterns)
- Subprocess spawning
- Dynamic code generation
- Obfuscation detection
- Base64-encoded payloads
- Suspicious imports

**Output**: `StageResult` with code analysis findings

### Stage 3: Injection Detection
**File**: `stage3_injection.py` (~350 lines)

**Purpose**: Detect prompt injection and manipulation attempts

**Checks**:
- Prompt injection patterns
- System prompt extraction attempts
- Role confusion attacks
- Instruction override attempts
- Multi-turn attack patterns
- Unicode homoglyphs
- Hidden instructions
- Chain-of-thought manipulation

**Output**: `StageResult` with injection findings

### Stage 4: Secrets Scanning
**File**: `stage4_secrets.py` (~250 lines)

**Purpose**: Detect hardcoded secrets and credentials

**Checks**:
- API keys (various formats)
- AWS credentials
- GitHub tokens
- Private keys (RSA, SSH)
- Database connection strings
- Password patterns
- Generic secret patterns

**Output**: `StageResult` with secret findings

### Stage 5: Supply Chain
**File**: `stage5_supply.py` (~544 lines)

**Purpose**: Analyze supply chain risks

**Checks**:
- Dependency analysis
- Known vulnerable packages
- Package typosquatting detection
- Dependency confusion attacks
- Malicious package detection
- Unpinned dependencies
- Deprecated packages

**Output**: `StageResult` with supply chain findings

## VERDICT RULES

```python
# From verdict.py
def compute_verdict(findings: list[Finding]) -> ScanVerdict:
    critical_count = sum(1 for f in findings if f.severity == "critical")
    high_count = sum(1 for f in findings if f.severity == "high")
    
    if critical_count >= 1:
        return ScanVerdict.FAIL
    if high_count >= 4:
        return ScanVerdict.FAIL
    if high_count >= 1:
        return ScanVerdict.FLAGGED
    if len(findings) > 0:
        return ScanVerdict.PASS_WITH_NOTES
    return ScanVerdict.PASS
```

| Condition | Verdict | Meaning |
|-----------|---------|---------|
| 1+ critical findings | `FAIL` | Cannot publish |
| 4+ high findings | `FAIL` | Cannot publish |
| 1–3 high findings | `FLAGGED` | Requires manual review |
| Any medium/low only | `PASS_WITH_NOTES` | Publishes with warnings |
| No findings | `PASS` | Clean |

## DATA MODELS

```python
# From models.py

class FindingSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class StageStatus(str, Enum):
    PASSED = "passed"
    FAILED = "failed"
    ERRORED = "errored"
    SKIPPED = "skipped"

class ScanVerdict(str, Enum):
    PASS = "pass"
    PASS_WITH_NOTES = "pass_with_notes"
    FLAGGED = "flagged"
    FAIL = "fail"

class Finding(BaseModel):
    id: str                    # Unique identifier
    stage: int                 # Stage number (0-5)
    severity: FindingSeverity
    confidence: float          # 0.0 to 1.0
    message: str               # Human-readable description
    file: str | None           # File path if applicable
    line: int | None           # Line number if applicable
    code_snippet: str | None   # Relevant code snippet
    cwe: str | None            # CWE identifier

class StageResult(BaseModel):
    stage: int
    status: StageStatus
    findings: list[Finding]
    duration_ms: int
    error: str | None

class ScanRequest(BaseModel):
    tarball_url: str
    skill_name: str
    skill_version: str

class ScanResponse(BaseModel):
    verdict: ScanVerdict
    findings: list[Finding]
    stages: list[StageResult]
    file_hashes: dict[str, str]  # path -> SHA-256
    duration_ms: int
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add security check | `lib/scan/stage{N}*.py` | Pick appropriate stage |
| Add new stage | `lib/scan/stage{N}_name.py` | Wire into `scan.py` pipeline |
| Add detection pattern | `lib/patterns/` | Extensible pattern library |
| Add analysis rule | `lib/rules/` | Extensible rule library |
| Modify verdict logic | `lib/scan/verdict.py` | Threshold-based rules |
| Add/modify data models | `lib/scan/models.py` | Pydantic 2 models |
| Add API endpoint | `api/analyze/new.py` | FastAPI route handler |
| Add test fixture | `tests/test_skills/` | benign/ or malicious/ |

## CONVENTIONS

- **Pydantic 2** for all models — strict validation
- **pytest** for testing — `test_*.py` pattern
- **Each stage is independent** — can error without blocking others
- **Findings carry confidence** — 0.0 to 1.0 float
- **SHA-256 file hashes** computed in stage0, returned in response
- **SARIF output** supported for CI integration
- **Finding deduplication** in `dedup.py`

## ANTI-PATTERNS

- **Never modify without syncing to `apps/web/api-python/`** — both locations must match
- **Never skip stage0 (ingest)** — all other stages depend on its output
- **Never swallow stage errors silently** — use `errored` status, not empty results
- **Never hardcode detection patterns** — use `lib/patterns/` and `lib/rules/`
- **Never skip confidence scoring** — all findings must have confidence value
- **Never add runtime dependencies** without updating requirements.txt

## TESTING

```bash
# Run all Python tests
cd python-api && pytest

# Run specific test
pytest tests/test_stage2.py

# Run with coverage
pytest --cov=lib/scan

# Test specific fixture
pytest tests/ -k "malicious"
```

## API ENDPOINTS

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Health check |
| `/analyze/scan` | POST | Full 6-stage pipeline |
| `/analyze/rescan` | POST | Re-run on existing skill |
| `/analyze/security` | POST | Security-only (stages 2-4) |
| `/analyze/permissions` | POST | Extract permissions |

## SYNC WITH WEB APP

**CRITICAL**: Any changes to `python-api/` must be mirrored to `apps/web/api-python/`:

```bash
# After modifying python-api/
cp -r python-api/lib/scan/* apps/web/api-python/analyze/scan/
cp -r python-api/api/analyze/* apps/web/api-python/analyze/
```

This ensures Vercel serverless functions have the same code as the standalone deployment.
