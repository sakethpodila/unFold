# Phase 1 — Architecture and MCP audit

Audit date: 2026-11-03, Asia/Kolkata. Scope: source/documentation inspection and minimal live Fold reads. No installation, credential changes, scheduled tasks or financial writes.

This is the original audit snapshot. The user's subsequent F01 request authorized
the pinned no-secret build and synthetic read-only connection work. Read
[the current feature record](../FEATURES.md#f01-connection-audit) for updated helper/SDK findings and actual test
results; authenticated Splitwise and actual Codex-host checks remain pending.

## 1. What was verified

| Check | Result | Evidence level |
| --- | --- | --- |
| Connected Fold category discovery | Passed; outgoing Lent category exists | Live read |
| Fold transaction listing | Passed; one row requested in 2026-10-28 inclusive to 2026-11-04 exclusive, pagination returned | Live read, not complete ingestion |
| Fold get_transaction | Passed for the returned ID | Live readback |
| Fold split/update semantics | Tool contracts inspected, never invoked | Contract only |
| Splitwise repository | README, package/lock manifests, entry point, client and relevant tool source inspected at pinned commit | Static audit, not exhaustive security certification |
| Codex stdio support | Official MCP documentation fetched; installed CLI supports command-launched MCP servers | Documentation and local CLI help |
| Local runtimes | Python 3.11.9, Node v24.18.0, npm 11.16.0 | Version checks |
| Splitwise connection | Not established; no Splitwise tools exposed here and no SPLITWISE_API_KEY in this process | Pending private credential setup |
| Unattended Fold authentication | No supported endpoint/auth route established | Unverified; not assumed available |

No live transaction details were saved to this repository. Category discovery found Lent category ID `a4303fd3-a231-44fe-aae3-47561855689e`, accepting OUTGOING; nested Lent icon ID `ea9a2ac4-ed9c-4d60-beb1-71d2a8a3ddac`. Discover again at implementation time rather than treating this as permanent configuration.

The general web search service returned 503. Public source and official documentation were fetched directly through HTTPS instead. No upstream code or installation scripts were executed. Upstream test files exist, but their tests were not run because dependencies/server were not installed.

## 2. Fold capabilities and limits

These findings come from the **connected Fold tool descriptions and schemas**, rather than assumptions about a public Fold API.

| Capability | Finding and implication |
| --- | --- |
| Discovery | list_transactions supports dates, source/account/category filters, stable date/amount sorting and cursor pagination, maximum 100 rows per page. Date bounds are inclusive start / exclusive end. Read every page with unchanged sorting. |
| Spending totals | Parent amount remains the original bill. effective_amount uses remaining_refund_amount, then remaining_amount, then amount. Summing original parent amount plus children double-counts spend. |
| Existing children | List returns parents and children as separate rows, linked by parent_transaction_id. get_transaction returns one row, not an embedded child collection. No parent-ID filter is exposed: complete relevant listings and verify the child set; widen the scan when completeness is uncertain. |
| Splitting | split_transaction creates one child per call. Minimum INR 0.01; amount must be strictly below the parent's current remaining amount. Parent must retain a positive balance. Maximum 20 children. Not idempotent. |
| Inheritance | Child inherits merchant, account, date, cash-flow flag, receipts and groups; category inherits only when omitted. Notes are never inherited. Supply discovered Lent category ID and then update the child's notes separately. |
| Retagging | update_transaction can change notes/category/merchant and other tags. Omitted fields remain unchanged; empty strings clear supported fields. Notes limit 1,000 characters. Whole listed batch fails for an unauthorized ID; this does not make a sequence of API calls atomic. |
| Indirect effects | Category changes can affect cash-flow flags and self-transfer merchant tags. Always inspect/read back resulting fields rather than assuming a patch has only the requested effects. |
| Amount edits | update_transaction does not expose amount changes. Editing an existing split is not a simple amount patch. |
| Split restrictions | Manual entries, split children, credit-card bill payments/linked transactions, hidden rows, refund-group transactions and recurring-cycle-linked transactions cannot be split. Not every eligibility detail is exposed by get_transaction; never probe eligibility by a live write in Phase 1. |
| Unclear split result | A child ID can be returned even if parent/child views are null. Persist the ID and read it back. A timeout without an ID needs parent/child inspection, never a blind retry. |
| Merge | merge_split deletes the child's notes, receipts and tags; later splitting cannot restore them. Not an automatic recovery tool. |
| Receipt retrieval/webhooks | No receipt retrieval, receipt detection or webhook tool is exposed in the current catalog. Receipt inheritance on split is not a receipt ingestion interface. |
| Freshness | No bank refresh trigger/status or transaction updated-at field is exposed in these transaction tools. Cannot prove the approximately 07:00 bank refresh completed merely from successful listing. |

User-approved representation rule:

| Payment you made | Proposed Fold representation |
| --- | --- |
| INR 300, own share 100, others owe 200 | Parent remaining 100; one Lent child 200; item/share/link notes on appropriate rows |
| INR 300, own share 0, others owe 300 | Categorize existing unsplit payment as Lent; no child; participant shares and Splitwise link in notes |
| INR 300, own share 300 | No reimbursement child; review whether any external expense is needed |

The zero-share rule does not authorize a particular financial update. Existing split children need a separately reviewed plan. Another person's payment must not be represented by modifying an unrelated bank debit. Refunds, repayments, mismatch and reversals require their own reviewed behavior.

## 3. Splitwise MCP source audit

Audited candidate: [chrischall/splitwise-mcp at commit 046eb5745c1031fbdc47444bfd4cfa87f65da303](https://github.com/chrischall/splitwise-mcp/tree/046eb5745c1031fbdc47444bfd4cfa87f65da303), package version 3.5.1. The upstream README explicitly describes it as AI-developed and not human-audited; our inspection is targeted, not a complete dependency audit.

| Requested check | Finding |
| --- | --- |
| Codex compatibility | src/index.ts delegates stdio server startup to runMcp. Official Codex docs support stdio. Likely transport-compatible; initialize, tools/list, tool schemas and actual calls remain untested in Codex. Claude-specific JSON/marketplace instructions are not Codex config. |
| Node requirement | README and manifest require Node >=22. The installed v24.18.0 meets that requirement. package.json itself has no engines field. |
| Setup/pinning | README recommends unpinned npx or npm install/build. Prefer a reviewed exact source commit with lockfile, npm ci after dependency/script review, then an absolute node + dist/index.js command. Do not execute mutable latest on each launch. |
| Authentication | src/client.ts uses SPLITWISE_API_KEY and official https://secure.splitwise.com/api/v3.0 endpoints. No interactive OAuth login flow is implemented in this local entry point. README prose mentions consumer key/secret, but the actual local client requires the API key. Official API supports API-key and OAuth authentication. |
| Storage | Inject key from a private environment or Windows-backed secret loader. Do not put it in checked-in TOML, command-line --env arguments, chat, SQLite or logs. A .env alongside the server may be loaded; prefer deliberate environment injection and review that path. |
| Identities | sw_get_current_user, sw_list_friends, sw_list_groups and sw_get_group expose stable IDs/members. Persist IDs after user confirms mapping; names/emails can be ambiguous or change. |
| Custom shares | sw_create_expense accepts users[{user_id, paid_share, owed_share}], cost/details/date/currency/group. Amounts are decimal strings. For our integration always provide the full Python-calculated shares, explicit INR/date/category rather than category inference or server equal-split helpers. |
| Retrieval | sw_get_expense and sw_list_expenses support verification and duplicate inspection; use full view for comparison. Compact summaries can omit financially relevant detail. |
| Updates | sw_update_expense supports full users replacement and optional receipt. Always send all participants when changing custom shares; the API replaces the split. |
| Receipts | create/update/attach support multipart PNG, JPEG, GIF or PDF, up to 10 MiB (server policy, not a verified Splitwise limit). Local receipt.path requires SPLITWISE_INPUT_DIR; alternatively base64. Hosted upload URLs require extra host configuration and are unavailable by default locally. Replaces an existing attachment. Windows path behavior/ACLs still need testing. |
| Read-only receipts | sw_get_receipt downloads/extracts a linked expense receipt and can return inline without writing a file. This does not retrieve Fold receipts or extract item allocations automatically. |
| Confirmation | Expense writes use defineWrite/registerWrite from @chrischall/mcp-utils; several other writes use _confirm.ts. README describes prompt elicitation or a preview plus request-bound token. Configure refusal plus tool allowlist initially. Never expose sw_confirm or sw_batch in the read-only connection. Actual token/elicitation behavior remains to be tested against the locked dependency and Codex. |
| API errors | Client checks errors/success:false in non-GET responses, including HTTP 200. Useful, but not sufficient: verify expense ID, expected payload and independent readback. Plain create's response is not uniformly validated for required IDs by the client; createdExpenseId is a batch output extractor. |
| Readback gap | withPostState lifts fields from the write response. It is not a separate GET after create/update. Receipt presence check also examines that response. Our adapter must independently get and compare the expense. |
| Fail-closed gap | assertNotDeleted catches read failures and can continue to a write. Our precommit state read must succeed before writing. |
| Retry/rate limits | Client config requests retry count 1, delay 2 seconds, timeout 30 seconds through createApiClient. Its method-specific retry behavior is delegated to mcp-utils and was not verified here. Hold financial writes until POST/timeout retry safety is proven. No reliable numeric quota or Retry-After handling was established. Implement bounded GET backoff; never retry ambiguous creates automatically. |
| Duplicate checks | Create checks similar same-cost expenses near the date for group_id >0. This is advisory, heuristic and absent on the no-group path. It does not replace durable links/journal or prevent duplicates. |

Critical trust boundary: [src/client.ts](https://github.com/chrischall/splitwise-mcp/blob/046eb5745c1031fbdc47444bfd4cfa87f65da303/src/client.ts) and [expense tools](https://github.com/chrischall/splitwise-mcp/blob/046eb5745c1031fbdc47444bfd4cfa87f65da303/src/tools/expenses.ts) delegate HTTP retries, registration and confirmation to @chrischall/mcp-utils. The lock resolves 3.4.0 despite the manifest's ^3.3.0 range. Inspect that resolved package and relevant locked SDK code before installing/running. Source presence of a gate is not proof of runtime safety.

### Proposed Codex configuration shape — not installed

Official [Codex MCP documentation](https://developers.openai.com/codex/mcp) supports TOML stdio configuration and enabled_tools. After auditing/building the exact pinned source, use an absolute executable and entry point. Replace the sample path with the reviewed build location. No key belongs in this file:

```toml
[mcp_servers.splitwise_readonly]
command = 'C:\Program Files\nodejs\node.exe'
args = ['C:\REPLACE_WITH_REVIEWED_BUILD\dist\index.js']
env_vars = ['SPLITWISE_API_KEY']
enabled_tools = [
  'sw_healthcheck', 'sw_get_current_user',
  'sw_list_friends', 'sw_list_groups', 'sw_get_group',
  'sw_list_expenses', 'sw_get_expense',
  'sw_get_categories', 'sw_get_currencies'
]

[mcp_servers.splitwise_readonly.env]
MCP_CONFIRM_MODE = 'refuse'
MCP_CONFIRM_ELICITATION = 'off'
```

README says refusal applies to fallback clients; turning elicitation off ensures writes do not take the prompt path. Verify these settings in the resolved helper before relying on them. An allowlist hides mutating tools from this client, not from the underlying broad API credential. A dedicated scheduled adapter must enforce its own GET-only boundary. Reopen/restart Codex with the securely supplied environment as needed; do not paste the key into chat.

Register a personal app and obtain its key privately through [Splitwise app registration](https://secure.splitwise.com/apps/register), following the [official API documentation](https://dev.splitwise.com/). Splitwise authentication and group discovery cannot be completed here until that private setup is available. No need to share the key in conversation.

## 4. Interactive MCP versus unattended Python

MCP is a protocol for exposing tools; the service's API is what the server calls. A connection working in Codex proves Codex can invoke it in the current authenticated context. It does not give arbitrary Python scripts an endpoint or credentials.

For local stdio, a client launches a server process and exchanges protocol messages over stdin/stdout; a future Python MCP client can launch the same reviewed server using its own environment. For hosted connectors, access may be mediated by the app and account session. No Fold standalone MCP URL, client registration, token lifecycle or supported credential provisioning was established from the available tools. We cannot conclude external access is impossible, but cannot design a functioning Task Scheduler Fold job around it yet.

Feasible initial mode: interactive Fold reads through Codex, followed by explicit transfer of a minimal validated snapshot to the local review workflow. A scheduled Python command can inspect imported data, report stale snapshots and, once independently authenticated, read Splitwise. It cannot fetch new Fold data or verify Fold state from stale files. Keep Fold refresh/reconciliation manual until Fold supplies documented standalone access. Do not scrape the app or export Codex session tokens. A future official Fold export could be another input only after format/access are verified.

To unlock unattended ingestion: verify official endpoint/transport, authentication provisioning, refresh/expiry, same-user permissions, permitted unattended usage and rate limits; then prove a GET works in a fresh process under the exact Task Scheduler account, with Codex closed and no interactive prompt. If that fails, keep the reduced mode explicit.

## 5. Minimal architecture and learning model

```text
Receipt / natural-language instruction
                 |
        Codex: interpret and clarify
                 |
    Python: validate -> allocate -> review plan
                 |                   |
     private receipt files     SQLite plan/version/approval
                                     |
                       explicit approved apply (later)
                                     |
                    journal -> service adapters -> readback
                                  /             \
                               Fold          Splitwise

Read-only discover/reconcile -> SQLite queue + freshness/findings
```

Python owns arithmetic and validation. Adapters translate plans to provider payloads without deciding shares. SQLite owns local history/mappings, not external financial truth. Readbacks detect divergence. No shared transaction spans Fold and Splitwise: this is a sequence of durable steps with recovery, not an atomic commit. Idempotency means repeating a logical request does not create a second financial effect; neither create nor split guarantees that, so local unique constraints alone are insufficient.

Proposed eventual tree (only documentation/ignore rules exist now):

```text
unfold/
  AGENTS.md
  DECISIONS.md
  README.md
  pyproject.toml               # added after design review
  docs/audits/architecture-and-mcp.md
  src/unfold/
    cli.py                    # bounded, noninteractive scheduled commands
    models.py                 # receipt/rules/plan boundary validation
    money.py                  # paise conversion and stable rounding
    allocation.py             # deterministic item/fee/discount allocations
    review.py                 # plan presentation and approval binding
    notes.py                  # regenerated common/individual format
    storage.py                # SQLite migrations, locks, links, journal
    workflow.py               # explicit states and recovery
    adapters/fold.py           # supported transport still unresolved
    adapters/splitwise.py      # explicit shares, error parsing, GET verification
  tests/fixtures/              # synthetic data only
  tests/                      # allocation, adapter, workflow failure tests
  scripts/                    # Task Scheduler registration in Phase 7
  private/                    # ignored; receipts, SQLite, logs; user-only ACL
```

Keep these as modules until complexity justifies more layers. Proposed SQLite tables follow the brief: fold_transactions, receipts/receipt_items, participants/participant_mappings, split_plans/split_allocations, expense_links, job_runs, operation_log and reconciliation_results. Do not create all tables now. Later enforce uniqueness of logical links/operation keys, immutable plan versions and a durable transaction-level lock (including interrupted-job recovery).

For partial receipt reimbursement, retain an explicit full-bill scope: the reimbursement subtotal is not the whole transaction. Never silently assign the unallocated remainder to the payer. Require its allocation before the bill-level invariants can pass.

## 6. Safe verification and first implementation milestone

Current checks are read-only smoke checks/source inspection, not unit tests. No application tests exist yet.

Recommended next small milestone, still finishing Phase 1: **a pinned, read-only Splitwise connection**.

1. Review resolved mcp-utils retry/confirmation code and the lockfile; verify no hidden POST retries. Pin the reviewed source/dependencies and inspect install scripts before installation.
2. Build locally without financial credentials first. Test MCP initialization, tools/list and the exact read-only allowlist. Use a fake API to prove no write request can escape the read-only adapter; tool annotations alone are not enforcement.
3. Privately provision the user's API key, then run only sw_healthcheck, sw_get_current_user, sw_list_groups and sw_list_friends. User confirms their own ID and intended participants/group. Do not create a test expense.
4. Retrieve one user-selected existing expense with sw_get_expense full view and compare cost, date/currency, paid/owed shares. Save no unnecessary profile fields.
5. Record whether the standalone process works independently of Codex. For Fold, collect official standalone connection guidance or retain the interactive snapshot fallback. No morning tasks yet.

User-verifiable outcome: healthcheck passes, expected identity/groups appear, only the allowlisted tools are available, account financial records remain unchanged. When secrets are unavailable, stop at a clearly reported authentication setup requirement rather than fabricating a passing check.

After the user's review authorizes Phase 2, implement only the deterministic sample-data allocation core. Test equal/unequal shares, mixed items, fees/discounts, odd paise, stable remainder ordering, zero own share and total mismatches. No live integrations needed for these tests.

Later adapter/workflow tests must cover existing Fold children, duplicate expense candidates, timeout after successful create/split, partial attachment failure, interruptions between API success and ID persistence, concurrent jobs, late arrivals, old external edits, 401/403, 429/backoff and stale sync. First real write uses one separately approved low-value transaction and independently verifies both services.

## 7. Review checkpoint

Review the two execution modes (interactive Fold initially; unattended only after supported auth is proven), module boundaries, zero-share Lent rule and next read-only connection milestone. Phase 2 and all financial writes remain unstarted. Splitwise live access, helper dependency behavior and unattended Fold access remain open verification items; the Phase 1 connection work is therefore not fully complete.
