# Features and development record

Updated 2026-11-03 (Asia/Kolkata). This is the single source for the roadmap, feature scope, acceptance checks, implementation results and review status. Feature IDs are planning references; code is organized by responsibility. Current product direction: a shared expense app in v1, with friend accounts, plus a private Fold integration for the project owner alone. We are revising the architecture before implementation. Historical F01 authenticated checks remain pending. This planning update does not authorize live financial mutations or deployment.

## Current direction and proposed milestones

### Current scope — three-person `1bhk` pilot, Fold private to the owner

User's latest direction, 2026-11-03: v1 must be shareable with friends who can log
in and manage shared expenses. Build our own ledger independent of Splitwise's
paid API. The Fold workflow remains part of the project, but only the owner uses
it; friends neither need Fold accounts nor get access to the owner's integration.
This supersedes the earlier personal-first/shared-later plan. Historical F01
evidence and the original integration roadmap remain for reference; their
unimplemented features are not automatically the active build order. Prepare the
architecture and build feature by feature, with review before each major phase.
No actual records, credentials or hosting were changed by this planning update.

Pilot clarification: initially there are exactly three users—the owner and two
friends—and one shared group named `1bhk`. Deliver working shared expense entry,
splits, balances, recorded settlements and sign-in for these users first. Use
invite-only access; public registration, discovery of other users and large-scale
infrastructure are outside the pilot. Real names and identities will be supplied
privately when accounts are created; use synthetic participants in tests.

Create `1bhk` through setup/data, not hard-coded business logic. Membership and
allocation must support any selected subset of the three; never assume every
expense is split three ways. Keep stable group/member IDs and ordinary relational
boundaries so additional people/groups can be added later without rewriting the
money engine. Do not build general onboarding before the household flow works.

Start on the development computer. Phone-friendly means the same app can be used
in a mobile browser; a native Android/iOS app is not needed for this pilot. Once
configured for authenticated local-network access, phones on the same network
can reach the running computer. Outside-network or always-available access needs
a separately chosen reachable host/network setup. A local app or Docker container
alone does not provide that access; the computer must be running. Server hosting,
broader sharing and optional installable/offline mobile behavior remain later
milestones. Do not promise offline synchronization or phone-only operation.

#### Reviewed changes and constraints

- The implementation chat consolidated scope/results here, organized integration
  code under integrations/, setup commands under scripts/, and synthetic tests
  under tests/. Keep that structure and one feature document.
- The read-only third-party MCP bridge has 11 recorded passing synthetic tests.
  They test that bridge, not an expense-sharing application. Authenticated
  Splitwise/Codex checks remain deferred due to the account's Pro API gate.
- The upstream HTTP helper retries POST on 429. That matters if the optional
  Splitwise integration is resumed; the independent ledger need not use that
  third-party client or its dependencies.
- Fold's standalone authentication is still unverified. Building our own ledger,
  API or Docker container does not unlock unattended Fold access.
- Existing .venv and code organization remain useful. There is no Python business
  logic or application database to migrate yet. Git initialization/push remains
  user-owned. Retain the optional Splitwise bridge without making it a runtime
  dependency of the new application.

#### Proposed architecture for review

Propose one Django application with a responsive browser interface, ORM/migrations
and built-in authentication, backed by PostgreSQL. Python domain functions own
integer-paise allocation and balances; application services enforce permissions.
Use PostgreSQL in integration tests as well as deployment so database behavior
matches. Pure calculation tests can run in .venv without a database. Versions
must be selected/pinned when implementation begins. SQLite is capable of small
web applications; PostgreSQL is a proposed consistency/operations choice, not a
claim that any shared app requires it.

Give users, participants, groups, memberships and expenses stable internal IDs.
For the pilot, provision only the three intended accounts and group memberships;
there is no need for public registration or an email-delivery service initially.
Invitations, if used, must securely link the intended participant to the accepting account;
a name/email match alone must not claim historical debts or group membership.
Authorize every group operation server-side. Proposed v1 permissions: members
view group expenses and create expenses; creators edit/void their own expenses
with history; group admins manage membership. Final role rules require review.
Start with INR; do not net balances across currencies. Settlements record a
payment reported by the user; the app does not transfer money. Explicit Save /
Confirm on a validated preview authorizes that user's exact ledger write; friends
do not need the project owner's approval for their permitted group operations.

Private owner integration boundary:

- Store Fold credentials, bank transaction IDs/details, original private receipts,
  matching candidates, sync notes and operation journal outside group-visible
  records. Owning a group or being a site staff user must not implicitly grant
  access to bank data through normal product APIs/admin screens.
- A shared expense may contain the merchant, date, bill amount, participant shares
  and deliberately shared item notes. Never copy raw Fold notes/narration or a
  private receipt to a group response. Receipt sharing must be explicit and use
  separately authorized attachment access; knowing a URL/ID is insufficient.
- Fold-linked plans belong to the owner alone. Shared members cannot connect,
  browse, invoke or approve the owner's Fold integration. Integrations use a
  separate owner-scoped service boundary, not group administrator permissions.
- Friends adding/editing expenses or recording settlements never trigger a Fold
  mutation. An edit to a linked expense marks the owner's reconciliation for
  private review; only a fresh approved owner plan can change Fold.
- Our own MCP adapter authenticates as the owner and starts read-only. Tool access
  does not replace financial approval. Fold's zero-own-share whole-payment Lent
  rule stays in force. Bank links remain private even when the expense is shared.
- Existing interactive Fold access can support the owner's workflow. Unattended
  access remains unsupported until an official endpoint/auth route is verified;
  friends' app access and core expense management must work independently of it.

Use Django/PostgreSQL with Docker Compose as the required developer setup. The
user will share this repository with another developer, so runtime consistency
is an explicit requirement even for the three-user pilot. Keep two services:
app and db. Do not add Redis, queues, Kubernetes or multiple app servers.
Docker supports reproducible development rather than providing end-user sharing;
friends use a browser URL and do not install Docker. CLI is present; engine health
was not checked. Use durable storage/backups. An authenticated reachable host,
HTTPS, account recovery, upload access rules and permission tests are release
requirements. No hosting provider/cost, public listener or deployment is selected
or authorized yet. The owner's private integration may run locally rather than
placing bank access on the shared host; choose its execution/auth boundary before
implementation. Containers do not solve Fold authentication.

#### P02 repository preparation (2026-11-03)

User requested directory alignment before implementing Docker themselves.
Added src/unfold/__init__.py as the application package root, .dockerignore with
an explicit build-input allowlist and private-data exclusions, and Git exclusions
for Django uploads/static output and database backups. Updated README to describe
the current structure and next P02 steps; clarified decision precedence and the
credential rule for PostgreSQL. Existing optional MCP code and its audit remain
independent of the Django app. No empty per-feature folders or placeholder
Docker/configuration files were added. The single feature record remains here.

Status: repository preparation complete; P02 implementation and its acceptance
checks are still pending. No dependency versions were selected, images built,
containers started or application records created. This structural change needs
no application test run; Docker build-context behavior will be checked with the
actual Docker implementation. The user owns the next Docker implementation step.

#### Proposed new milestone order

| ID | Small implementation milestone | Acceptance | Build / independent test |
| --- | --- | --- | --- |
| P01 | Domain contract and sample-data money/allocation engine | Typed inputs, deterministic odd-paise allocation, paid/owed totals conserved, zero own share and mixed-item cases; no live account writes; implement after P02 provides the shared runtime | Sol High / Sol High |
| P02 | Dockerized Django/PostgreSQL developer foundation | FIRST build milestone: Dockerfile, Compose, locked dependencies, .dockerignore, documented environment template, readiness/migrations, per-developer persistent database, synthetic seed and containerized test commands; clean checkout works on another developer's machine | Sol Medium / Sol High |
| P03 | Three private accounts and `1bhk` membership | Owner and two friends can sign in; no public registration; safe account provisioning/recovery; unauthorized access rejected; no hard-coded member count | Sol High / Sol High |
| P04 | Shared ledger: expenses, shares, edits and recorded settlements | Transactional create, duplicate prevention, zero-sum balances, creator permissions, audit history, conflicting edit tests | Sol High / Sol High |
| P05 | Responsive group/expense interface and authorized API | Friends can review/save expenses and see balances from mobile/desktop browsers; receipt access and role tests | Sol Medium / Sol High |
| P06 | Private owner integration and our own MCP | Read tools first; no friend/staff/group-admin bank-data access; private links, approved owner-only writes; private-data response tests | Sol High / Sol High |
| P07 | Owner receipt interpretation and Fold reconciliation | Clarification for uncertainty; zero-share Lent rule; shared edits flag review without bank writes; synthetic failure recovery then separately approved live test | Terra Medium extraction, Sol High integration / Sol High |
| P08 | Backup/restore, operations and release checks | Restore demonstrated; auth/permission/privacy/concurrency tests pass; private logs, bounded retries and explicit Fold scheduling limits | Sol Medium / Sol High |
| P09 | `1bhk` pilot access and friend acceptance test | Approved local access setup; owner and two friends exercise permissions, allocations and balances from browsers; no Fold exposure; off-network use only with an explicitly chosen reachable host | Sol Medium / Sol High |

P02 is now the first implementation milestone to establish the shared Docker
environment; P01 follows it. IDs stay stable to avoid confusing earlier references.
Three-user access
belongs to v1; general public sharing and server hosting come later. Work one reviewed
milestone at a time; do not build the full application in this planning chat.
Record all new scope, results and reviews here, not in feature/handoff folders.

Developer collaboration requirements for P02:

- Share source, schema migrations, dependency locks, container definitions and
  synthetic fixtures. Each developer has their own ignored .env and local database
  volume; cloning the repo does not synchronize databases or real user records.
- Pin reviewed base images/dependencies and document supported Docker/Compose
  versions. Use a source bind mount for development edits; rebuilding is needed
  when installed dependencies or image instructions change.
- Keep .dockerignore aligned with sensitive-file exclusions: no secrets, private
  receipts/logs/database files, .venv, .cache or .git in the image build context.
  Core development must not require the owner's Fold credentials or Node bridge.
- Supply safe development-only settings, app/db readiness and explicit migration
  and test commands. Expose the app only on localhost by default; database access
  stays within Compose unless a separate development override is justified.
- Verify clean build/start, persistent data across normal restarts, isolated test
  data, and onboarding from a fresh checkout using synthetic `1bhk` fixtures.
  Never make volume deletion the ordinary shutdown command.
- Developers collaborate through Git branches and reviewed changes. Docker does
  not merge code or resolve conflicting migrations. Agree module/service contracts
  before independent features, and integrate one migration sequence deliberately.
- Current status: planning/documentation only; no Dockerfile or compose.yaml exists
  yet. Document runnable commands after the foundation is implemented and tested.

After the pilot works: additional groups/users and self-service invitations,
reviewed server deployment for remote availability, then optional installable
mobile enhancements. Core money correctness and owner-only Fold privacy remain
unchanged at every scale.

Architecture references consulted: [Django overview](https://docs.djangoproject.com/en/6.1/intro/overview/),
[SQLite deployment guidance](https://www.sqlite.org/whentouse.html), and
[Docker Compose uses](https://docs.docker.com/compose/intro/features-uses/).

## Original model selection guidance

These are starting recommendations, not measured benchmarks for this repository. [Official Codex model guidance](https://developers.openai.com/codex/models) describes Luna as efficient for focused coding/extraction, Terra for writing and visual understanding, Sol for complex repeated work, and Astra for the hardest workflows. Higher reasoning effort uses more time/tokens. Model availability and displayed effort names depend on the client/account.

| Model | Use here | Starting reasoning |
| --- | --- | --- |
| GPT-6 Luna | Narrow scaffolding, CLI formatting, deterministic notes rendering, focused test execution/fixes | Low for mechanical edits; Medium for small implementation; High for bounded edge-case analysis |
| GPT-6.1 Terra | Receipt images, extraction candidates, learning notes and documentation | Medium; High for difficult visual interpretation, followed by clarification |
| GPT-6.1 Sol | Money invariants, API adapters, database state, security boundaries, integration review | Medium for a specified module; High for interacting constraints/failures |
| GPT-6 Astra | Optional one-off review of distributed failure/recovery design or unresolved high-risk defect | High; not the default builder |

Do not begin with Extra High/Ultra for ordinary features. Raise effort/model after a concrete failure, unclear invariant or unresolved design conflict, not because a chat is long. A smaller model with a clear contract may be sufficient; lower per-call cost does not guarantee lower total usage if it needs repeated repairs. Assess correctness, number of attempts, wall time and actual usage after the first few features. No exact token/cost savings are promised.

## Working procedure for each feature

1. **Scope:** choose the next feature below, its dependencies and acceptance checks. In the planning chat, record and review the short scope in this document before implementation. Explain the concepts and tradeoffs relevant to that feature, not the whole system again.
2. **Build chat:** read AGENTS.md, the relevant entry in this document, decisions and directly related code. Explain the small proposed change, implement it, run relevant checks and explain key functions. The builder still verifies its work; separating testing does not excuse untested code.
3. **Record results:** update this feature entry with changed files, contract/invariants, exact test commands/results, known gaps and commit IDs when Git exists. Avoid transcript dumps and personal financial records.
4. **Independent test chat:** start from the spec and current files, derive edge cases independently, inspect the implementation and run checks. Do not change financial records. Report reproducible failures and acceptance coverage. It may add focused tests; avoid concurrent edits with the builder.
5. **Fix:** return reproducible failures to the existing build chat. Fix only that feature, then rerun affected checks. The test chat rechecks changes when a failure/new concern justifies it.
6. **User review:** demonstrate behavior using synthetic inputs and provide a command the user can run. Record acceptance and update decisions if needed. Cross a major phase only after review. Live writes always need separate approval tied to a specific plan.

Use one implementation chat and one test/review chat per substantial feature. Combine tiny related scaffolding/docs changes when no independent risk warrants a second chat. A test chat can execute an already-defined suite on Luna; choosing adversarial money/recovery cases deserves Sol. The same model can review in a fresh chat—the benefit is a fresh assessment, not an automatic independence guarantee.

Keep this chat as the project planning/review hub if desired. It does not need to receive every tool log. Send a concise milestone result and unresolved decisions. No automatic chat creation or delegation is needed.

## Ordered feature list

Build/Test entries give model and effort. “Test” includes independent review and scenario design, not just running pytest. Phase numbers follow the original brief; some dependencies are explicitly gated rather than assuming transport access.

| ID / phase | Feature and procedure | Acceptance / dependency | Build | Test/review |
| --- | --- | --- | --- | --- |
| F01 / 1 | Finish connection audit: inspect locked MCP helper/SDK retry and confirmation behavior; build pinned server without secrets; enable read-only tools; privately supply key and discover identities | Codex initialize/tools/list and authenticated GETs pass; writes unavailable; independent Fold access documented or clearly unavailable | Sol High | Sol Medium |
| F02 / 2 | Local project foundation: propose package/config, isolated Python environment, exact dependency lock, pytest entry point, synthetic fixtures; initialize Git if desired | Reproducible install and smoke test; no credentials or private files tracked; F01 status recorded (pure core need not wait on Fold auth) | Luna Medium | Luna Medium |
| F03 / 2 | Money and typed models: parse decimal input into paise, receipt/item/participant models, reject invalid precision and unsupported zero/negative inputs | Exact conversions, stable IDs, quantity/price rules, mismatched totals and invalid inputs tested; F02 | Sol Medium | Sol High |
| F04 / 2 | Item allocation engine: equal, participant-specific, percentage and explicit shares; documented stable remainder order | Per-item and bill allocations conserve paise; odd-paise, ambiguous rule and duplicate participant cases pass; F03 | Sol High | Sol High |
| F05 / 2 | Fees, taxes, discounts and reimbursement scope: explicit sharing bases, quantities and full-bill reconciliation | Mixed items/fees/discounts, zero own share and partial reimbursement leave no unexplained remainder; F04 | Sol High | Sol High |
| F06 / 3 | Receipt intake: file/hash/original preservation, supported local image/PDF inputs and manually entered instructions | Synthetic input hashes stable; unsupported/corrupt files fail clearly; local paths restricted; F03 | Luna Medium | Sol Medium |
| F07 / 3 | Receipt interpretation: extract candidates with source text and uncertainty; convert instructions into explicit participant/rule references | Unreadable prices and unresolved identities prompt clarification; model output must pass F03–F05, never silently guessed; F06 | Terra Medium | Sol Medium + manual visual check |
| F08 / 3 | Review preview and notes: merchant/items/shares, Fold effects, Splitwise payload, duplicates and warnings; regenerate common/individual notes | Review contains all required fields, zero-share whole-payment Lent case, 1,000-character handling without stale notes; F05/F07 | Luna High | Sol Medium |
| F09 / 4 | Fold read adapter and snapshot fallback: pagination, normalization, explicit-ID lookup, account coverage, sanitized fixture contracts | Parent/child linkage and original/effective amounts correct; missing never treated as deleted; real transport only if F01 verified it | Sol High | Sol High |
| F10 / 4 | Receipt matching and Fold change planner: candidates, totals/date/currency checks, split eligibility, existing child detection | No writes; preview one combined Lent child for partial own share, whole-payment Lent for zero own share; uncertainty stops; F08/F09 | Sol High | Sol High |
| F11 / 5 | Splitwise read adapter and participant mappings: authenticated account, groups, members, full expense records | Stable IDs confirmed; wrong account/401/403/deleted/missing expense behavior tested; F01/F03 | Sol Medium | Sol Medium |
| F12 / 5 | Splitwise payload planner and duplicate detection: explicit cost/paid/owed/date/currency/details/group; attachment preparation | Custom shares preserve exact bill; duplicates checked including no-group cases; no live creation; F05/F08/F11 | Sol High | Sol High |
| F13 / 6 | SQLite persistence: migrations, immutable plan versions, links, receipt hashes, jobs, operation journal | Unique mappings/operation keys; restart/durability tests; no secrets or unnecessary PII; F10/F12 | Sol High | Sol High |
| F14 / 6 | Approval/state machine and locks: bind approval to complete plan and expected state; invalidate on changes; define explicit transitions | Changed plans cannot apply; concurrency/stale lock/interruption cases pass; zero writes during discovery; F13 | Sol High | Sol High |
| F15 / 6 | Coordinated write/recovery adapters: journal intent, one operation per step, immediate ID persistence, independent readback, unknown-outcome inspection | Fault injection before/after each external side effect; no automatic duplicate/rollback; full mocks only until safety gates pass; F14 | Sol High | Astra High for design audit, then Sol High tests |
| F16 / 4–6 | First approved live integration: demonstrate one low-value positive-own-share plan and verify both services | User approves exact target and payloads after F15 mock tests; persist/verify IDs and shares; no unapproved extra write cases | Sol High | Sol High + user inspection |
| F17 / 6 | Existing split/expense editing and reconciliation: diff stored plan against current external state, handle supported updates and flag refunds/settlements | Old external edits/deletions/duplicates/partial success detected; no automatic merge; changed plans require new approval; F15 | Sol High | Sol High |
| F18 / 7 | Discovery queue and CLI: seven-day scan, backfill, changed-state fingerprints, pending/status/review commands and job freshness | Late arrivals, complete pagination, old linked-record rechecks, interrupted job and unsupported connector exit codes pass; F09/F13/F17 | Luna High for CLI; Sol High for discovery logic | Sol High |
| F19 / 7 | Windows scheduling: absolute interpreter/workdir, private account secrets, overlap protection, timeouts and missed-run settings | 07:30/08:00/08:05 IST configurable; no prompts/writes; prove same-account access with Codex closed; reduced mode labeled if Fold auth unavailable; F18 | Luna Medium | Sol Medium |
| F20 / 7 | Operating guide: bounded read retries, safe logs, restore/recovery drill, manual usage commands and troubleshooting | Reproduce clean setup with synthetic data; secrets excluded; read-only reconciliation and stale-feed warnings documented; F19 | Terra Medium | Luna Medium; Sol for recovery drill |
| F21 / 8 optional | Narrow trusted rules: explicit eligibility, limits, opt-in, revocation and audit | Only after sustained successful operation and separate explicit user authorization; no blanket permissions | Sol High | Astra High for policy review |

The original phase sequence lists approved integration writes in Phases 4/5 before the full recovery system in Phase 6. For safety, implement previews and mocked write adapters in Phases 4/5; defer the first coordinated live write until minimal journal/approval/unknown-outcome handling passes. This is a proposed ordering adjustment for user review.

## Maintaining this document

For each active feature, keep one entry here containing scope, dependencies,
contract/invariants, acceptance checks, changed modules, exact verification
commands/results, uncertainties and review status. Update that entry when fixing
or testing it. Do not create separate per-feature specs or handoff documents.
Keep transcripts, secrets and personal financial records out of this file.

Setup and operating instructions belong in integration guides. Architectural
choices belong in DECISIONS.md. Tests and fixtures belong in tests/, and product
code belongs in modules named for their responsibility. Add directories only
when there is code to put in them; do not create an empty module tree for the
whole roadmap.

If chats share this checkout, run build and test sequentially. Concurrent work
requires isolated branches/worktrees after Git setup. No automatic chat creation
or delegation is needed.

## Reusable chat prompts

### Implementation chat

> Implement only FXX from docs/FEATURES.md. Read AGENTS.md, the reviewed feature entry and relevant decisions/code. Explain the proposed small change and the concepts I need to understand before editing. Use synthetic data. Stay within this feature; no financial writes, secret setup or later phases. Run relevant checks, explain the important code, give me a command to test it myself, and update the feature entry with actual results. Stop for my review.

### Independent testing chat

> Independently assess FXX against its reviewed entry in docs/FEATURES.md. Read AGENTS.md and derive acceptance/edge cases before relying on the builder's recorded results. Inspect the current implementation and run relevant tests. Use synthetic/mocked data and perform no financial writes. Add focused tests where they exercise meaningful behavior; avoid implementation-mirroring tests. Report failures with reproduction steps and expected/actual behavior. Keep production fixes for the implementation chat unless I ask otherwise. State remaining untested risks.

### Return to implementation for fixes

> Fix only the reproduced FXX failures in the test report. Preserve the approved contract; explain if a requirement change is needed. Run affected checks and update the feature entry with exact outcomes. Do not advance the phase or touch live accounts.

### Phase review

> Review the completed features for this phase using their entries and recorded test results. Explain what works, what is still unverified, and the next small milestone. Ask for my review before starting the next major phase. Do not rerun broad tests without a change or unresolved concern that justifies it.

## First action

Review F01 and the proposed ordering adjustment. Finish read-only authentication/transport verification next; do not start the allocation engine in this chat automatically. A private Splitwise key and supported Fold standalone access remain unresolved inputs, not assumed capabilities.


## F01 connection audit

Current constraint, 2026-11-03: the user's Splitwise app-registration screen
requires active Pro for API access. The no-secret audit passed, but the original
live-authentication acceptance checks are unmet and deferred; F01 is not recorded
as fully complete. Public [API terms](https://dev.splitwise.com/#section/Terms-of-Use)
also permit a Pro requirement. The screenshot establishes the current account's
gate; public registration could not be inspected while authenticated.

Proposed revised scope, awaiting user review: build local receipt allocation and
review first, generate participant paid/owed shares and notes for manual entry
into Splitwise, and defer automated Splitwise reads/writes. Recording a manually
created expense's ID/link and any snapshot-based reconciliation need their own
reviewed contracts; neither constitutes live API verification. Do not ask for a
key or assume API access in the free workflow. The existing bridge remains optional
and synthetic-only. No subscription, scraping or alternate credential route was
introduced. Fold's independent authentication uncertainty remains separate.

### Scope and acceptance

Started 2026-11-03 (Asia/Kolkata) at the user's request. Remains in Phase 1.

#### Design and scope

Inspect the exact Splitwise source commit and integrity-pinned dependency lock
before execution. Audit HTTP retries, MCP dispatch/confirmation, environment
loading and startup side effects. Build without credentials and suppress dependency
install scripts. Test stdio initialization, tool discovery and denied writes with
synthetic responses before any authenticated account read.

Use a server-side read-only boundary in addition to a Codex tool allowlist if the
upstream server still registers writes. A refusal token gate alone is insufficient
unless every write path is covered. Do not enable confirmation, batch or mutation
tools. No application core, database, scheduler or financial write belongs here.

#### Inputs and outputs

- Source: chrischall/splitwise-mcp commit
  `046eb5745c1031fbdc47444bfd4cfa87f65da303`, version 3.5.1.
- Dependency versions and integrity digests from that commit's package-lock.json.
- Local Node runtime; private API key only for later authenticated GET checks.
- Output: recorded source evidence, reproducible no-secret checks, safe connection
  configuration and an implementation record distinguishing passed and pending checks.

#### Acceptance

1. Document locked helper/SDK retry and confirmation behavior and material gaps.
2. Build the pinned server without secrets; report exact commands and versions.
3. Initialize and list tools over stdio; prove write requests cannot reach HTTP in
   the read-only launch mode using synthetic transport observations.
4. Test allowed GETs, including non-success responses, without real account data.
5. Once privately provisioned, authenticate and discover the user's stable identity,
   groups and friends. User confirms intended mappings. Read an existing expense
   only after the user selects it; do not save private responses in this repository.
6. Verify the configured connection in Codex, or label that client check pending.
7. Establish supported independent Fold access or explicitly retain the interactive
   snapshot fallback. Hosted chat access does not prove scheduled-process access.

#### Review boundary

Stop for user review after F01. Missing credentials or unsupported Fold transport
are reported as pending/unavailable, never counted as successful checks. Phase 2
and live financial writes require separate authorization. The user's start request
authorizes this F01 work; it does not approve a particular financial transaction.

### Implementation and audit record

2026-11-03, Asia/Kolkata. User requested F01 in this build chat and confirmed no
Splitwise key exists yet. F01 remains incomplete. No financial account writes,
Codex configuration, stored credentials, database or scheduler were created.
Git has not been initialized. The user will create the remote and perform the first commit/push; no commit IDs exist yet.

#### Source and dependency evidence

- Reviewed candidate: [Splitwise source commit](https://github.com/chrischall/splitwise-mcp/tree/046eb5745c1031fbdc47444bfd4cfa87f65da303), package 3.5.1.
- Source ZIP SHA-256: `6f24c204259374bb7a1ff0330a052b3540aea652779c794cef8ae6ad6d82de90`.
- Upstream lock SHA-256: `6a07584db338460d128f574e52984a64e2a5fa212f9a493907aee6443481528c`.
- Lock resolves `@chrischall/mcp-utils` 3.4.0, MCP server/client/core 2.4.0,
  dotenv 18.0.9. Those audit tarballs were checked against lock SHA-512 integrity
  before inspection. The lock has 140 entries; all resolved archives use public
  HTTPS npm URLs with SHA-512 integrity. npm ci installed 70 platform-applicable
  packages. The only lock entries flagged with install scripts were esbuild and
  optional Darwin fsevents; scripts were disabled for every package.
- Targeted code-path audit, not exhaustive third-party security certification or
  a vulnerability scan. Downloaded source/dependencies/docs are ignored under
  `.cache/`; runtime dependencies are reproducible from the reviewed source lock.

#### Findings that supersede the earlier audit's open questions

| Boundary | Locked-source evidence | Result |
| --- | --- | --- |
| HTTP retry | mcp-utils `dist/http/index.js:926–943`; upstream `src/client.ts` passes count 1/delay 2000 | 429 is retried once for **any method**; no GET-only guard. Synthetic fake-fetch POST reproduced two calls. Do not use the upstream client unchanged for future financial writes. |
| Retry-After | Same helper loop only honors it when `honorRetryAfter` is true | Upstream Splitwise client does not enable it. Our GET-only wrapper honors it with a 30-second cap and at most one retry. No numeric provider quota was verified. |
| Unknown writes | helper `guardWrite`, lines 1008–1027 | Sent transport/timeouts and qualifying 5xx become unknown-outcome errors. This is useful signaling, not journaling or independent verification. No automatic generic network/5xx retry in the inspected default path. |
| Confirmation | `confirm-env.js`, `confirm-token.js`, `confirmation.js`, `write-batch.js` | Refuse mode removes token fallback; elicitation-off refuses before accepting input. Both settings matter. A write's planning callback can run before its gate. Refusal was tested with a missing/invented token; full interactive/token lifecycle was not tested or enabled. |
| SDK tool dispatch | server `dist/mcp-oHn3ureC.mjs:1585–1617` | Only enabled registered tools are listed; calls to absent tools reject before handler execution. Read-only annotations alone do not enforce HTTP safety. |
| SDK client replay | client `dist/public-CvV4ZHkX.mjs:3866–3915` | `callTool` can refresh catalog and resend on the modern protocol's header-mismatch error. Thus the SDK is not universally replay-free. No header-mismatch behavior or timeout replay was claimed to be safe for writes. |
| Stdio startup | helper `runMcp`, SDK stdio source | stdio supports negotiation/legacy serving and child teardown. SDK may use probe siblings during negotiation; startup must have no account side effects. The read-only entry has no network calls during registration. |
| Environment | upstream client imports dotenv at startup | Our launcher imports tool registrars with type-only client imports erased by tsc, avoids the client singleton and supplies its own guarded request client. No dotenv loading is performed by this launch path. |

The original upstream entry point is compiled but **never used as the live
launcher**: it registers mutations, confirmation, batch and uploads. The reviewed
entry is `integrations/splitwise-mcp/server.mjs`. It registers exactly nine read tools and fixes
HTTP to approved official GET paths, no bodies or redirects. Receipt download is
not exposed. Local mutable build files still need ordinary filesystem protection;
the runtime lock check is not a signature over every compiled/dependency file.

#### Files and commands

- `docs/FEATURES.md`: this scope, acceptance and implementation record.
- `scripts/setup_splitwise_mcp.py`: pinned download/install/build, no secrets.
- `integrations/splitwise-mcp/server.mjs`: read-only registration and HTTP boundary.
- `tests/integration/splitwise-mcp.test.mjs`, `tests/fixtures/splitwise-mcp-server.mjs`: synthetic audit checks.
- `integrations/splitwise-mcp/discover-account.mjs`, `scripts/check_splitwise_account.ps1`: private manual
  account discovery, minimal console output, no persisted responses.
- `docs/integrations/splitwise-mcp.md`: walkthrough, private key steps and uninstalled
  Codex configuration snippet. README, decisions and original audit link forward.

Actually run, from project root:

```powershell
& '.\.venv\Scripts\python.exe' .\scripts\setup_splitwise_mcp.py
& 'C:\Program Files\nodejs\node.exe' --test .\tests\integration\splitwise-mcp.test.mjs
& 'C:\Program Files\PowerShell\7\pwsh.exe' -NoProfile -File .\scripts\check_splitwise_account.ps1 -Synthetic
```

Results: pinned install/build passed; **11 checks passed**; private launcher printed
synthetic user 101/friend 202/group 303 and exited 0. Python and PowerShell syntax
checks also passed. Used Python 3.13.11, Node v24.18.0, npm 11.16.0. The earlier
audit recorded a different Python executable; the original audit used the system interpreter. A project-local .venv was subsequently created and verified with Python 3.13.11 and pip 25.3; application dependencies have not been installed yet. Upstream's entire test suite was not run.

Coverage: HTTP denial before fetch; no-key failure; successful GET/auth header;
redirect policy and a returned 302 rejected without following; key redaction;
401/403/500/network/malformed-JSON single-attempt failures; bounded 429 retries;
the helper's unsafe-for-future-writes POST retry; refusal/off gate; real stdio
MCP initialization; exact tool list; all nine reads against synthetic data;
direct absent mutation/batch/confirm tool rejection without HTTP; private discovery
command and PowerShell launch path with synthetic input. Actual socket redirects,
long real-network timeouts, interactive confirmation, real credentials, Windows
secret-store integration and private-storage ACLs were not exercised.

#### Pending acceptance and next permitted step

1. Review the documented Pro gate and proposed manual-entry scope first. If the
   user later chooses supported API access, privately obtain the API key and run
   the private account check; never ask for a key in chat. Confirm identity and
   intended stable group/participant IDs. No mapping is persisted automatically.
2. User selects one existing expense for full-view read verification of its ID,
   cost/date/currency and paid/owed shares. No expense has been selected/read here.
3. Securely provision Codex's environment, install the reviewed configuration,
   verify initialize/tools/list and authenticated reads in the actual Codex host.
   The locked SDK subprocess smoke test is not a Codex-host compatibility test.
4. Independent Fold access remains unverified: no supported endpoint/auth route
   established. Preserve D003's interactive snapshot fallback; scheduled Fold
   access is not available merely because this chat has hosted tools.
5. User reviews F01 results before Phase 2. No live write permission was granted.

### Repository structure review

On 2026-11-03 the user requested conventional organization and one feature
tracking document. Build/setup commands are in scripts/, the Node MCP bridge is
in integrations/splitwise-mcp/, integration tests are in tests/integration/,
and fake subprocesses are in tests/fixtures/. The tests use Node's built-in test
runner; production account discovery takes an injected server path and does not
import tests. Python application modules will use src/unfold/ when implemented.
No allocation, persistence or scheduled job was added during this refactor.

The obsolete per-feature scripts/spec/handoff files were consolidated or moved,
then removed. Downloaded source/dependency packages required to run the reviewed
bridge remain in ignored .cache/splitwise-mcp/. Unneeded duplicate source trees,
fetched documentation and temporary setup directories were removed after checks.
The local .venv is ignored. Docker was not added: a Windows venv meets the current
isolation need and keeps native credential/scheduling integration straightforward.

Verification after reorganization: the Node test runner passed all 11 tests;
the PowerShell synthetic launcher passed; the relocated dependency setup/build
passed; .venv interpreter isolation and pip were verified. Git creation and the
first push are user-owned; see README.md for commands. Private authentication,
Codex-host checks and the selected existing-expense read remain pending.
