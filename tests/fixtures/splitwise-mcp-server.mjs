// Test subprocess: fetch is replaced BEFORE importing any upstream code.
// No real credential or network is used. stderr carries synthetic HTTP events.
globalThis.fetch = async (url, init) => {
  if (init?.method !== 'GET') throw new Error('Synthetic transport observed a write.');
  process.stderr.write(`SYNTHETIC_HTTP ${JSON.stringify({ method: init.method, path: new URL(url).pathname })}\n`);
  const path = new URL(url).pathname;
  let data;
  if (path.endsWith('/get_current_user')) data = { user: { id: 101, first_name: 'Synthetic', last_name: 'Payer' } };
  else if (path.endsWith('/get_friends')) data = { friends: [{ id: 202, first_name: 'Synthetic', last_name: 'Friend' }] };
  else if (path.endsWith('/get_groups')) data = { groups: [{ id: 303, name: 'Synthetic group', members: [{ id: 101 }, { id: 202 }] }] };
  else if (path.endsWith('/get_group/303')) data = { group: { id: 303, name: 'Synthetic group', members: [{ id: 101 }, { id: 202 }] } };
  else if (path.endsWith('/get_expenses')) data = { expenses: [] };
  else if (path.endsWith('/get_expense/404')) data = { expense: { id: 404, cost: '3.00', currency_code: 'INR', date: '2026-11-03', users: [{ user: { id: 101 }, paid_share: '3.00', owed_share: '1.00' }, { user: { id: 202 }, paid_share: '0.00', owed_share: '2.00' }] } };
  else if (path.endsWith('/get_categories')) data = { categories: [] };
  else if (path.endsWith('/get_currencies')) data = { currencies: [{ currency_code: 'INR' }] };
  else throw new Error('Unexpected synthetic endpoint.');
  return Response.json(data);
};
const { startReadonlyServer, createReadonlyClient } = await import('../../integrations/splitwise-mcp/server.mjs');
startReadonlyServer(createReadonlyClient({ apiKey: 'synthetic-not-a-credential' }));
