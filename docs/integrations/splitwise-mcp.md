# Splitwise MCP setup and operation

Status, 2026-11-03 (Asia/Kolkata): no-secret build and synthetic checks passed.
The user's registration screen requires Splitwise Pro, so authenticated Splitwise
reads and Codex-host verification are deferred unless API access becomes available. No
financial writes were made. Phase 2 has not started.

## API access prerequisite

On 2026-11-03 the user supplied a screenshot of Splitwise's app-registration
screen. It requires an active Pro subscription for third-party API access and
says access is lost when the subscription lapses. The public
[API terms](https://dev.splitwise.com/#section/Terms-of-Use) also reserve the right
to condition API access on maintaining Pro. Public registration could not be
independently inspected while signed in; the current account gate is evidenced
by the user's screenshot. No price, trial or exception has been verified.

The MCP bridge calls that same API and does not change eligibility. If staying
on a free account, skip the real-key and Codex connection setup below. Synthetic
tests still work without Pro. Local Python allocation/review work does not
require this optional bridge. Manual Splitwise entry is the proposed fallback;
it has not been implemented or accepted as the revised project scope yet.

## The design, step by step

1. **Pin what runs.** `scripts/setup_splitwise_mcp.py` downloads a specific source commit,
   checks its archive and lock hashes, then runs `npm ci --ignore-scripts` with
   empty npm configuration and a credential-free environment. `tsc` produces the
   upstream JavaScript. This small Node audit harness exercises the third-party
   Node server; the future Unfold application is still planned in Python.
2. **Limit registration.** `integrations/splitwise-mcp/server.mjs` reuses the upstream read
   handlers but registers only nine tools. Mutation handlers never enter the real
   MCP server. Receipt-download, upload, confirmation and batch tools are absent.
3. **Limit HTTP separately.** `createReadonlyClient` accepts only `GET`, no body,
   and specific Splitwise read paths. It checks again immediately before fetch,
   fixes the official API origin and refuses redirects. It does not import the
   upstream client singleton, so it does not load its `.env` file. A credential
   remains powerful outside this launcher; these limits belong to our process.
4. **Test the boundary.** `tests/integration/splitwise-mcp.test.mjs` tests errors/retries directly, then starts a
   separate synthetic MCP subprocess over stdin/stdout. A replaced fetch reports
   only synthetic method/path events. We check the catalog, all nine reads and
   direct attempts to invoke unavailable tools. No test contacts an account.
5. **Authenticate privately.** The manual PowerShell launcher prompts for a key
   with input hidden, starts a short-lived read-only process with that key in its
   environment, and prints only health status and names/IDs. It saves no key or
   responses. Key material necessarily exists transiently in process memory;
   this is environment injection, not a persistent OS credential-store setup.

The nine tools are `sw_healthcheck`, `sw_get_current_user`, `sw_list_friends`,
`sw_list_groups`, `sw_get_group`, `sw_list_expenses`, `sw_get_expense`,
`sw_get_categories` and `sw_get_currencies`. Expense listing may internally read
comments when requested; `/get_comments` is an approved supporting GET endpoint.
This audit wrapper is not the future deterministic financial adapter: do not use
upstream numeric filters/projections as authoritative money calculations.

## Reproduce the no-secret checks

From PowerShell in `C:\Users\pods\Desktop\hash\projects\unfold`:

```powershell
# Needed for a clean/rebuilt checkout; requires access to GitHub and public npm.
& '.\.venv\Scripts\python.exe' .\scripts\setup_splitwise_mcp.py

& 'C:\Program Files\nodejs\node.exe' --test .\tests\integration\splitwise-mcp.test.mjs
& 'C:\Program Files\PowerShell\7\pwsh.exe' -NoProfile -File .\scripts\check_splitwise_account.ps1 -Synthetic
```

The first check command should report **11 tests passed**. The PowerShell
check should show synthetic user 101, friend 202 and group 303. These are fixtures,
not your account. Python 3.13.11, Node v24.18.0 and npm 11.16.0 were used here.
The Python script uses only the standard library and supports Python 3.11+.
If your Python executable differs, replace only that executable path.

## Create and supply the key privately

Only follow these steps if you choose to obtain supported API access. No
subscription purchase or paid account change is authorized by this guide.

1. In your own browser, open [Splitwise app registration](https://secure.splitwise.com/apps/register).
   Check the account's Pro/API eligibility first. Sign in yourself and follow the
   personal app registration form using accurate information. Obtain the app's
   API key privately. If no API-key option appears, stop and report that fact;
   do not substitute account passwords, consumer secrets or session cookies.
2. Keep the key in your password manager. Do not put it in chat, `.env`, source,
   screenshots, command arguments or a PowerShell assignment typed into history.
3. Run this in your own PowerShell 7 terminal, from the project directory:

   ```powershell
   & 'C:\Program Files\PowerShell\7\pwsh.exe' -NoProfile -File .\scripts\check_splitwise_account.ps1
   ```

4. Paste the key only at the hidden prompt. This performs health/current-user,
   group-list and friend-list GETs through the read-only MCP subprocess. It prints
   minimal identity rows for your inspection and suppresses arbitrary API errors.
   If it fails, stop for diagnosis; do not paste the key or full account output.
5. Confirm privately that the current-user ID is yours. Tell the build chat only
   whether it passed and which intended stable group/participant IDs you choose
   to share. No mapping is accepted automatically. Choose an existing expense
   separately before its full-view read; this command does not fetch expenses.

[Official Splitwise API documentation](https://dev.splitwise.com/) describes
API-key/OAuth authentication and the GET endpoints. No read-only credential scope
has been established here; our launcher enforces the read-only restriction.

## Codex connection configuration — prepared, not installed

The private terminal check proves an independent MCP client can launch the server;
it does not prove that this Codex chat has loaded it. After private setup, configure
the following using [Codex's MCP configuration](https://developers.openai.com/codex/mcp/).
No Codex config was changed during this pass. Do not put an actual key in TOML.

```toml
[mcp_servers.splitwise_readonly]
command = 'C:\Program Files\nodejs\node.exe'
args = ['C:\Users\pods\Desktop\hash\projects\unfold\integrations\splitwise-mcp\server.mjs']
cwd = 'C:\Users\pods\Desktop\hash\projects\unfold'
env_vars = ['SPLITWISE_API_KEY']
enabled_tools = [
  'sw_healthcheck', 'sw_get_current_user', 'sw_list_friends', 'sw_list_groups',
  'sw_get_group', 'sw_list_expenses', 'sw_get_expense',
  'sw_get_categories', 'sw_get_currencies'
]

[mcp_servers.splitwise_readonly.env]
MCP_CONFIRM_MODE = 'refuse'
MCP_CONFIRM_ELICITATION = 'off'
MCP_BATCH_MAX_OPS = '0'
```

`env_vars` forwards a variable already present in Codex's environment; the private
terminal check does not provision that environment or make its key persist.
Codex environment provisioning and its actual initialize/tools/list/account GETs
need a follow-up setup step. Do not claim the snippet alone establishes a working
connection, and do not broaden app-wide financial permissions to make it work.

## Fold and next review

The existing hosted Fold tools are separate from this server. No documented
standalone Fold endpoint and credential provisioning route has been established.
Keep the interactive, minimized-snapshot fallback from D003; there is no scheduled
Fold ingestion. No session-token extraction, scraping or scheduler was added.

Finish pending F01 checks and review their results before moving to Phase 2.
See [the feature record](../FEATURES.md#f01-connection-audit) for evidence and remaining checks.
