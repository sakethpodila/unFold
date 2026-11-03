import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { allowedTools, createReadonlyClient, loadDependency } from '../../integrations/splitwise-mcp/server.mjs';

// Exercise the real HTTP helper through the same guarded client used at launch.
await test('method/body/endpoint denial happens before HTTP', async () => {
  let calls = 0;
  const client = createReadonlyClient({ apiKey: 'synthetic', fetchImpl: async () => { calls++; return Response.json({}); } });
  for (const [method, path, body] of [
    ['POST', '/get_current_user'], ['DELETE', '/delete_expense/1'],
    ['GET', '/create_expense'], ['GET', '//evil.invalid/get_current_user'],
    ['GET', '/get_expense/1/../delete_expense/1'], ['GET', '/get_expense/%31'],
    ['GET', '/get_expense/-1'], ['GET', '/get_expense/1.5'],
    ['GET', '/get_current_user#fragment'], ['GET', '/get_current_user', {}],
  ]) await assert.rejects(client.request(method, path, body), /Read-only connector permits/);
  assert.equal(calls, 0);
});
await test('no key fails before HTTP', async () => {
  let calls = 0;
  const client = createReadonlyClient({ fetchImpl: async () => { calls++; return Response.json({}); } });
  await assert.rejects(client.request('GET', '/get_current_user'), /required/);
  assert.equal(calls, 0);
});
await test('GET success, redirect policy and credential error redaction', async () => {
  const client = createReadonlyClient({ apiKey: 'synthetic-secret', fetchImpl: async (url, init) => {
    assert.equal(url, 'https://secure.splitwise.com/api/v3.0/get_current_user');
    assert.equal(init.method, 'GET');
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers.Authorization, 'Bearer synthetic-secret');
    return Response.json({ user: { id: 101 } });
  } });
  assert.equal((await client.request('GET', '/get_current_user')).user.id, 101);
  const failure = createReadonlyClient({ apiKey: 'synthetic-secret', fetchImpl: async () => { throw new Error('synthetic-secret'); } });
  await assert.rejects(failure.request('GET', '/get_current_user'), (error) => !error.message.includes('synthetic-secret'));
});
await test('302, 401, 403, 500, network error and malformed JSON do not retry', async () => {
  for (const mode of [302, 401, 403, 500, 'network', 'json']) {
    let calls = 0;
    const client = createReadonlyClient({ apiKey: 'synthetic', fetchImpl: async () => {
      calls++;
      if (mode === 'network') throw new TypeError('Synthetic network failure');
      if (mode === 'json') return new Response('{invalid', { headers: { 'Content-Type': 'application/json' } });
      return Response.json({ errors: ['Synthetic rejection'] }, { status: mode });
    } });
    await assert.rejects(client.request('GET', '/get_current_user'));
    assert.equal(calls, 1);
  }
});
await test('429 GET retries once and stops (Retry-After: 0)', async () => {
  let calls = 0;
  const client = createReadonlyClient({ apiKey: 'synthetic', fetchImpl: async () => {
    calls++;
    return Response.json({}, { status: 429, headers: { 'Retry-After': '0' } });
  } });
  await assert.rejects(client.request('GET', '/get_current_user'));
  assert.equal(calls, 2);
});
await test('locked helper POST-on-429 finding reproduced using a fake fetch', async () => {
  const { createApiClient } = await loadDependency('@chrischall/mcp-utils');
  let calls = 0;
  const api = createApiClient({
    baseUrl: 'https://synthetic.invalid', retry: { count: 1, delayMs: 0 },
    fetchImpl: async (_url, init) => {
      assert.equal(init.method, 'POST');
      calls++;
      return Response.json({}, { status: 429 });
    },
  });
  await assert.rejects(api.fetchJson('POST', '/synthetic-create', { body: {} }));
  assert.equal(calls, 2);
});
await test('locked refusal plus elicitation-off never authorizes a write', async () => {
  const { confirmationFromEnv, requireConfirmationWithFallback } = await loadDependency('@chrischall/mcp-utils');
  for (const confirmToken of [undefined, 'invented']) {
    const options = confirmationFromEnv({
      action: 'synthetic.write', message: 'Synthetic only', tool: 'synthetic_write',
      args: { id: 1 }, confirmToken, subject: () => { throw new Error('Must not mint or inspect a token'); },
      env: { MCP_CONFIRM_MODE: 'refuse', MCP_CONFIRM_ELICITATION: 'off' },
    });
    const result = await requireConfirmationWithFallback({ mcpReq: { inputResponses: {} } }, options);
    assert.ok(result);
    const text = JSON.stringify(result);
    assert.match(text, /"dispatched\\":false|dispatched.{0,5}false/);
    assert.ok(!text.includes('confirmation-required'));
  }
});

// Launch a genuine child process and speak MCP over stdio through the locked SDK.
const { Client } = await loadDependency('@modelcontextprotocol/client');
const { StdioClientTransport } = await loadDependency('@modelcontextprotocol/client/stdio');
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [fileURLToPath(new URL('../fixtures/splitwise-mcp-server.mjs', import.meta.url))],
  env: { SystemRoot: process.env.SystemRoot ?? 'C:\\Windows' },
  stderr: 'pipe',
});
const events = [];
let stderr = '';
transport.stderr.on('data', (chunk) => {
  stderr += chunk;
  let newline;
  while ((newline = stderr.indexOf('\n')) >= 0) {
    const line = stderr.slice(0, newline); stderr = stderr.slice(newline + 1);
    if (line.startsWith('SYNTHETIC_HTTP ')) events.push(JSON.parse(line.slice('SYNTHETIC_HTTP '.length)));
  }
});
const client = new Client({ name: 'unfold-splitwise-test', version: '1' });
try {
  await test('MCP initialize and exact nine-tool catalog', async () => {
    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), [...allowedTools].sort());
    assert.ok(tools.every((tool) => tool.annotations.readOnlyHint === true));
    assert.equal(events.length, 0);
  });
  await test('all nine read tools call only synthetic GETs', async () => {
    for (const [name, args] of [
      ['sw_healthcheck', {}], ['sw_get_current_user', { view: 'full' }],
      ['sw_list_friends', {}], ['sw_list_groups', {}], ['sw_get_group', { id: 303 }],
      ['sw_list_expenses', { limit: 1, view: 'full' }], ['sw_get_expense', { id: 404, view: 'full' }],
      ['sw_get_categories', {}], ['sw_get_currencies', {}],
    ]) {
      const result = await client.callTool({ name, arguments: args });
      assert.ok(!result.isError, `${name}: ${JSON.stringify(result)}`);
      if (name === 'sw_get_expense') {
        assert.match(JSON.stringify(result), /3\.00/);
        assert.match(JSON.stringify(result), /2\.00/);
      }
    }
    assert.equal(events.length, 9);
    assert.ok(events.every((event) => event.method === 'GET'));
  });
  await test('direct mutation, batch, confirm and unknown tools reject without HTTP', async () => {
    const before = events.length;
    for (const name of ['sw_create_expense', 'sw_update_expense', 'sw_delete_expense', 'sw_undelete_expense', 'sw_update_user', 'sw_create_friend', 'sw_create_group', 'sw_create_comment', 'sw_get_receipt', 'sw_batch', 'sw_confirm', 'unknown']) {
      await assert.rejects(client.callTool({ name, arguments: { id: 404, confirmToken: 'invented' } }));
    }
    assert.equal(events.length, before);
  });
} finally {
  await client.close();
  await transport.close();
}
await test('private discovery command completes with synthetic identity responses', async () => {
  const { stdout } = await promisify(execFile)(process.execPath,
    [fileURLToPath(new URL('../fixtures/discover-splitwise-account.mjs', import.meta.url))],
    { env: { SystemRoot: process.env.SystemRoot ?? 'C:\\Windows' }, timeout: 20_000 });
  assert.match(stdout, /Authenticated healthcheck passed/);
  assert.match(stdout, /"id":101/);
  assert.match(stdout, /"id":202/);
  assert.match(stdout, /"id":303/);
  assert.match(stdout, /Read-only discovery complete/);
});
