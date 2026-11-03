// Manual read-only account discovery. No writes or file output.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { allowedTools, loadDependency } from './server.mjs';

export async function discoverAccount({
  apiKey,
  serverPath = fileURLToPath(new URL('./server.mjs', import.meta.url)),
} = {}) {
  if (!apiKey) throw new Error('Run scripts/check_splitwise_account.ps1 to supply the key privately.');
  const { Client } = await loadDependency('@modelcontextprotocol/client');
  const { StdioClientTransport } = await loadDependency('@modelcontextprotocol/client/stdio');
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: { SystemRoot: process.env.SystemRoot ?? 'C:\\Windows', SPLITWISE_API_KEY: apiKey },
    stderr: 'pipe',
  });
  // Do not echo third-party boot messages or arbitrary account responses.
  transport.stderr.on('data', () => {});
  const client = new Client({ name: 'unfold-splitwise-account-discovery', version: '1' });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), [...allowedTools].sort());
    for (const name of ['sw_healthcheck', 'sw_get_current_user', 'sw_list_groups', 'sw_list_friends']) {
      const result = await client.callTool({ name, arguments: {} });
      if (result.isError) throw new Error('Account read rejected. Check the key privately and retry the read.');
      const blocks = result.content.filter((part) => part.type === 'text');
      const data = JSON.parse(blocks[0]?.text ?? '{}');
      if (name === 'sw_healthcheck') {
        // A no-credential health response may not use isError.
        if (data.ok !== true || data.credential?.resolved !== true) {
          throw new Error('Healthcheck did not report a healthy credential. No mappings confirmed.');
        }
        console.log('Authenticated healthcheck passed.');
      } else {
        const rows = name === 'sw_get_current_user' ? [data.user] : name === 'sw_list_groups' ? data.groups : data.friends;
        if (!Array.isArray(rows) || rows.some((row) => !row || !Number.isSafeInteger(row.id))) {
          throw new Error('Account response shape differs from the reviewed contract. Stop for inspection.');
        }
        const text = JSON.stringify(rows.map((row) => ({ id: row.id, name: row.name })));
        console.log(name, text.split(apiKey).join('[redacted]'));
      }
    }
    console.log('Read-only discovery complete. Confirm identity/group/participant IDs before using mappings.');
  } finally {
    await client.close();
    await transport.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await discoverAccount({ apiKey: process.env.SPLITWISE_API_KEY });
  } catch {
    console.error('Splitwise account discovery failed. No financial write was attempted; no key or API error body was printed.');
    process.exitCode = 1;
  } finally {
    delete process.env.SPLITWISE_API_KEY;
  }
}
