# Architecture decisions

Status: proposed unless explicitly identified as a user requirement. Audit date: 2026-11-03 (Asia/Kolkata).

Current baseline: D013–D015 govern the shared household pilot. Earlier personal
SQLite, manual-Splitwise and optional-Docker proposals are historical where
superseded. Django/PostgreSQL with Docker Compose is the required development path.

## D001 — Phase boundaries

User requirement: stop after the Phase 1 audit and architecture proposal for review. This change contains documentation and ignore rules only. No application, MCP installation, credentials, schedules or financial records have been created.

Subsequent authorization, 2026-11-03: the user requested starting F01 in the build
chat. The pinned dependency build, read-only launcher and synthetic audit checks
are authorized within Phase 1. Original statements above describe the initial
audit snapshot. Phase 2 and live financial writes remain unauthorized.

## D002 — Local deterministic core

Propose Python 3.11+, Pydantic, pytest and SQLite, with functions/modules rather than a service framework. Codex converts receipt/instruction content into structured candidates; Python validates and computes the plan. The LLM never supplies authoritative money totals. Store INR amounts as integer paise; format decimal strings at API boundaries. Fold's tool schema uses JSON numbers: exact serialization and round-trip paise validation need contract tests before writes.

## D003 — Separate interactive and scheduled capabilities

The connected Fold tools work in this chat. No documented standalone Fold endpoint/authentication route has been established. Do not extract/reuse Codex or browser session credentials. Until a supported route is verified, perform Fold reads interactively and hand a minimized, validated snapshot to the local CLI. Task Scheduler may process stored snapshots and report freshness, but cannot claim fresh Fold discovery or external reconciliation. A scheduler must fail clearly when a required connector is unavailable. This is a reduced-capability fallback, not completion of unattended ingestion.

Splitwise's documented API key can support an independent local client/server, subject to credentials being securely available to the scheduled Windows account. Authentication, filesystem paths and permissions must be tested under that account.

## D004 — Fold representation

User-confirmed 2026-11-03: when the user paid the full bill and their own share is zero, categorize the existing unsplit payment as Lent; create no child. This approves the rule, not a live write.

For a positive own share and positive total owed by others, propose one combined Lent child and a parent remainder equal to the own share. For no reimbursement, no Lent child. Existing children, another payer, mismatches, refunds and reversals enter review rather than being forced into this model. Zero-share plans against an already split transaction need separate review; do not silently merge.

## D005 — Plan approval and recovery

Propose approval bound to a canonical plan hash/version, stable participant IDs, all write payloads and expected external fingerprints. Acquire a transaction lock and re-read both services before committing. Journal each operation separately; unknown outcomes and partial success stop automatic writes. A durable journal cannot make two external services atomic, and a crash can occur after an external success but before storing its ID. Search and verify external candidates before considering another attempt; ambiguity requires manual recovery.

Tentative write order for later review: create and verify Splitwise expense, persist link, then split/reclassify Fold and regenerate notes. This makes the expense ID available for Fold notes, but can leave a Splitwise expense without the Fold change. No automatic compensating delete/merge. Final ordering and failure protocol belong to Phase 6.

## D006 — Third-party MCP selection

Candidate: chrischall/splitwise-mcp 3.5.1 at commit 046eb5745c1031fbdc47444bfd4cfa87f65da303. Source supports stdio and API-key access to official Splitwise endpoints. Codex transport compatibility is plausible from documentation/source, not live-tested. Do not use upstream's unpinned npx recommendation. Review the lockfile and critical @chrischall/mcp-utils implementation before running a pinned build. The audited lockfile resolves that dependency to 3.4.0. Start with a read-only tool allowlist plus refusal of writes.

F01 update: the pinned build and synthetic MCP checks passed. The locked helper
retries a 429 once even for POST, so future financial writes must not use that
default unchanged. Use `integrations/splitwise-mcp/server.mjs`, which registers only nine read
tools and enforces approved GET paths/no bodies/no redirects separately. No key,
Codex config or real Splitwise account connection has been provisioned. See
`docs/FEATURES.md#f01-connection-audit` for exact evidence and pending checks.

## D007 — Discovery and reconciliation

Propose configurable seven-day lookback with complete pagination and stable sorting. Hash normalized financially relevant fields because the exposed Fold transaction rows have no modified-at watermark. Periodically re-read every linked older transaction: a seven-day scan alone misses old edits. Absence is not deletion. Record job completion separately from data freshness; without a provider refresh timestamp, a successful read does not prove today's bank sync completed.

Morning times remain proposed: 07:30 discovery, 08:00 retry, 08:05 reconciliation, Asia/Kolkata. No tasks have been registered. Reconciliation compares amounts, currency, payer/owed shares, linkage, deletion and edit state; it flags changes without mutating.

## D008 — Minimal storage and notes

Propose local SQLite mappings/journal and separate private receipt files. Keep external account details/narrations only when necessary; do not persist the live records read during this audit. Preserve original receipt descriptions and hashes. Fold notes are at most 1,000 characters: regenerate the user's common/individual format, keep shares and linkage, and preview any shortening. Keep full breakdown in the private plan and Splitwise details; never silently discard financial information. Windows ACLs, not POSIX mode claims alone, must protect files.

## D009 — Feature chats and model allocation

User preference: build features in focused chats, test in separate chats, and use models/reasoning appropriate to each workload to conserve usage/context. Feature sequence, scope, implementation results and reusable prompts live in the single docs/FEATURES.md document. Do not create separate per-feature specs or handoff files. Run builder/tester sequentially in one checkout; use isolated Git worktrees for actual parallel edits after Git setup. No chats or subagents are created automatically. Independent testing does not remove the builder's obligation to run relevant verification.

Propose delaying coordinated live financial writes until minimum journal, approval and unknown-outcome handling passes, even though Fold/Splitwise adapters are developed in earlier phases. This ordering adjustment remains for review.

## D010 — Repository organization and environment

User requirement, 2026-11-03: organize code by responsibility and maintain one
feature tracking document. The MCP bridge lives in integrations/splitwise-mcp/;
setup/manual launchers in scripts/; integration tests and synthetic subprocesses
in tests/. Downloaded source and builds use ignored .cache/splitwise-mcp/. Remove
superseded documents and unused downloads after preserving the audit evidence.
Feature IDs remain roadmap references, not module or directory names.

A local .venv was created with Python 3.13.11 and pip 25.3. Interpreter isolation
was verified. No application dependency lock or Python business logic is claimed
yet. Use a venv for the local Windows workflow; Docker has no demonstrated need.
The user will create the Git repository and perform the initial push; the README
contains steps. No repository, remote or commit was created by the agent.

## D011 — Splitwise API subscription gate and proposed manual mode

Constraint established 2026-11-03: the user's app-registration screenshot requires
an active Splitwise Pro subscription for third-party API access and states that
access lapses with that subscription. The public API terms permit this condition:
https://dev.splitwise.com/#section/Terms-of-Use . The current account-specific gate
is evidenced by the supplied screenshot; public registration was not independently
inspected while authenticated. No subscription price or exception was verified.

The MCP server uses the same API, so it does not remove this requirement. Original
live F01 acceptance checks remain unmet; the synthetic audit still stands.
Propose a local allocation/review workflow with manually entered Splitwise expenses
and deferred API synchronization. This is a proposal for user review, not an
accepted replacement of the original end-to-end scope. No paid subscription,
credential workaround or financial action has been authorized.

## D012 — Independent personal ledger first, collaboration later

User direction, 2026-11-03: build our own expense-sharing app with a personal
ledger and integration access first; friends' logins/shared management come
later. This supersedes manual entry in Splitwise as the proposed main direction.
Keep the optional Splitwise bridge and F01 evidence, but do not require it or
its third-party dependencies to run the independent application. No API access
workaround is needed for our own data.

Propose a local Python/SQLite application with stable participant/group IDs,
owner-scoped records and a tested service/API boundary. Participants can later
link to authenticated users. Use the same deterministic core for UI and our own
future MCP tools; financial approval and idempotency remain mandatory. Django is
the proposed application framework when implementing the UI/API, subject to the
first design review. A personal application becoming shared still needs explicit
authorization, invitation, concurrency and deployment work.

Docker remains optional: start with .venv/SQLite; consider Compose with an app and
PostgreSQL when shared deployment warrants it. This changes product scope, not
Fold's external authentication capabilities. No containers, public listener or
application database were created during this planning update. Proposed new
milestones P01–P09 are maintained in docs/FEATURES.md.

## D013 — Shared v1, with owner-only Fold integration

Latest user requirement, 2026-11-03, supersedes D012's personal-first release:
friends must be able to log in and use v1. Fold remains exclusively for the
project owner. Shared expenses/balances and bank data are separate access domains.
Friends' writes cannot trigger Fold changes; edits to linked expenses prompt
private owner reconciliation and invalidate any affected prior approval.

Propose Django/PostgreSQL with local Docker Compose and a responsive browser
interface. Docker is packaging, not hosting or authorization. Hosting/costs and
public deployment remain undecided. The private Fold component need not run on
the shared host; its execution boundary must be reviewed before implementation.
Unattended Fold authentication is still unverified.

Bank credentials, transaction IDs/narration, Fold notes, matching candidates and
private receipts must not appear in group APIs, ordinary admin views or shared
logs. Only deliberately shared expense fields/attachments are group-visible.
Group admins have no implicit integration access. Test direct object access and
response privacy with multiple users, including group-admin and staff roles.
Each user can confirm their own permitted ledger actions; this does not grant
automated approval for external financial mutations.

The revised P01–P09 sequence in docs/FEATURES.md includes shared accounts,
authorization, conflict handling, backups and deployment in v1. No executable
application code or Docker configuration was added by this scope update.

## D014 — Household pilot: three accounts and `1bhk`

User clarification, 2026-11-03: initial use is the owner plus two friends sharing
one group named `1bhk`. Broader sharing, server hosting and further mobile use
come later. Narrow D013's shared-v1 scope to this invite-only household pilot.
Keep separate accounts and group authorization; do not hard-code the group name,
member IDs or a three-way split in domain logic. Any expense may involve a subset
of members. Seed the group during reviewed setup; no real accounts were created.

Start with one locally running application and a responsive browser interface.
Local-network phone access requires explicit network configuration and a running
host; off-network/always-on access requires a reachable host chosen later. A native
phone application, offline sync, public signup and email service are not pilot
requirements. Docker/Compose remains an optional foundation choice, not something
required by having three users. Retain the proposed Django/database design without
adding distributed services. Fold remains strictly owner-private.

## D015 — Dockerized developer setup is required

User decision, 2026-11-03: use Docker because the repository will be shared with
another developer who will implement features too. This supersedes the optional
Docker wording in D014. Adopt a small app + PostgreSQL Compose environment with
pinned dependencies, a development source mount, local persistent database volume,
synthetic seeds and containerized tests. Do not require real Fold access for core
development. Each developer has separate local credentials/data; Git shares source
and migrations, not bank data or database volumes.

Make P02 (containerized foundation) the first implementation milestone, then P01
(allocation core). Preserve existing IDs. Docker does not replace Git collaboration,
financial authorization, user login or reachable hosting. Public/server deployment
remains later. No images were built or containers started by this documentation
change; actual Docker implementation belongs to the next reviewed build milestone.

Repository preparation, 2026-11-03: at the user's request, added the
src/unfold package root, a restricted Docker build context and Django/private-data
Git exclusions. The user will implement Docker next. No Django settings,
dependencies, containers, databases or accounts were created by this preparation.
