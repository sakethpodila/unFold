# Unfold

A shared household expense app for the owner and two friends in the `1bhk`
pilot. The planned stack is Django, PostgreSQL and Docker Compose, with pytest
and deterministic integer-paise calculations. Fold integration is private to the
owner; group membership and staff access do not grant access to bank records.

## Current status

P02, the Dockerized developer foundation, is next; P01 allocation follows it.
The user is implementing Docker. The repository has a Python package root and
build-context exclusions, but Dockerfile, compose.yaml, dependency locks and
Django configuration have not been implemented. The package contains no business
logic yet. No application database, real accounts or deployment exists.

The local .venv remains available for optional host tooling. The historical
Splitwise bridge is optional and independent of the new app; its recorded
synthetic checks passed, while real API access is gated by Splitwise Pro.

## Repository layout

```text
src/unfold/                  Python application package; Django setup comes next
integrations/splitwise-mcp/   Optional historical Node MCP bridge
tests/integration/           Existing connector tests; application tests added later
tests/fixtures/              Synthetic data/subprocesses only
scripts/                     Existing setup and manual audit helpers
docs/FEATURES.md              Single roadmap, scope, results and review record
docs/integrations/            Optional integration setup guides
docs/audits/                  Historical audit evidence
DECISIONS.md                  Architecture decisions and superseded proposals
.dockerignore                Restricted application build context
.cache/                      Ignored downloaded dependencies and builds
.venv/                       Ignored host Python environment
```

Create modules and Django apps as their responsibilities are implemented. Keep
feature IDs in [FEATURES.md](docs/FEATURES.md); create no per-feature source or
handoff folders. Read [AGENTS.md](AGENTS.md) and [DECISIONS.md](DECISIONS.md).

## Next: implement P02

Create Dockerfile, compose.yaml, pyproject.toml, a dependency lock and .env.example
at the repository root. Keep Django configuration inside src/unfold/. Choose
supported versions and pin them during implementation. There are no placeholder
Docker files or guessed dependency versions in this preparation.

Use just app and db services. Mount development source, wait for database health,
keep PostgreSQL inside the Compose network, bind the app to localhost by default,
and use a per-developer named database volume. Each developer creates a private,
ignored .env; the shared template must contain no credentials. Do not mount the
entire workspace into the app: it includes host caches and optional private data.

The Docker build context currently allows src/, tests/, Dockerfile, README.md, pyproject.toml
and common dependency lock/requirements files. If another build input becomes
necessary, add it explicitly to .dockerignore. Private-data exclusions also apply
inside allowed directories. The optional Node bridge is excluded from this context.

Document runnable startup, explicit migrations, synthetic seeds and containerized
test commands when those commands exist. Normal shutdown must preserve database
volumes. The foundation is incomplete until a clean build/start and the P02
acceptance checks in FEATURES.md have been demonstrated. Docker provides a local
developer runtime; phone/network access and deployment require later setup.

## Optional historical tooling

The [Splitwise MCP guide](docs/integrations/splitwise-mcp.md) documents the existing
Node audit tooling. Neither Node nor a Splitwise key is required for the planned
Django app. Preserve the recorded audit without making it a core runtime dependency.

## First Git commit and push

Git initialization and the first push remain user-owned. Create an empty private
remote repository without generated README/license/ignore files, then run from
this directory:

```powershell
git init -b main
git add .editorconfig .gitignore .dockerignore AGENTS.md DECISIONS.md README.md docs integrations scripts tests src
git status --short
git diff --cached --stat
git commit -m "Prepare shared expense app structure"
git remote add origin 'YOUR_REPOSITORY_URL'
git push -u origin main
```

Replace the remote URL before running it. Review staged files; local environments,
caches, credentials, receipts and database records must remain excluded. Add the
Docker/configuration files to the next commit once implemented. Use your Git
provider's credential manager or browser sign-in; do not embed tokens in URLs.
