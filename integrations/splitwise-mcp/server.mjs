// Read-only MCP bridge. Financial planning belongs in Unfold's Python core.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const upstream = fileURLToPath(new URL('../../.cache/splitwise-mcp/upstream/', import.meta.url));
const entries = Object.freeze({
  '@chrischall/mcp-utils': '@chrischall/mcp-utils/dist/index.js',
  '@modelcontextprotocol/client': '@modelcontextprotocol/client/dist/index.mjs',
  '@modelcontextprotocol/client/stdio': '@modelcontextprotocol/client/dist/stdio.mjs',
});
export const loadDependency = (name) => {
  if (!Object.hasOwn(entries, name)) throw new Error('Unknown Splitwise MCP dependency.');
  return import(pathToFileURL(resolve(upstream, 'node_modules', entries[name])).href);
};

const lockHash = '6a07584db338460d128f574e52984a64e2a5fa212f9a493907aee6443481528c';
if (createHash('sha256').update(readFileSync(resolve(upstream, 'package-lock.json'))).digest('hex') !== lockHash) {
  throw new Error('Splitwise MCP lock changed; review before rebuilding or launching.');
}
const { createApiClient, runMcp } = await loadDependency('@chrischall/mcp-utils');

export const allowedTools = Object.freeze([
  'sw_healthcheck', 'sw_get_current_user', 'sw_list_friends', 'sw_list_groups',
  'sw_get_group', 'sw_list_expenses', 'sw_get_expense',
  'sw_get_categories', 'sw_get_currencies',
]);
const base = 'https://secure.splitwise.com/api/v3.0';
const collection = /^\/(get_current_user|get_friends|get_groups|get_expenses|get_categories|get_currencies|get_comments)$/;
const record = /^\/(get_group|get_expense)\/(0|[1-9][0-9]*)$/;

function approvedPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.includes('#')) return false;
  const pathname = path.split('?')[0];
  return collection.test(pathname) || record.test(pathname);
}

export function createReadonlyClient({ apiKey, fetchImpl = globalThis.fetch } = {}) {
  const key = apiKey?.trim();
  const present = Boolean(key && !['undefined', 'null'].includes(key) && !/^\$\{[^}]*\}$/.test(key));
  const api = createApiClient({
    baseUrl: base,
    serviceName: 'Splitwise',
    timeout: 30_000,
    maxResponseBytes: 16 * 1024 * 1024,
    retry: { count: 1, delayMs: 2000, honorRetryAfter: true, maxRetryAfterMs: 30_000 },
    getToken: () => {
      if (!present) throw new Error('SPLITWISE_API_KEY is required; provision it privately.');
      return key;
    },
    // Never follow a redirect, even to another GET endpoint.
    redirect: 'error',
    fetchImpl: (url, init) => {
      if (typeof url !== 'string' || !url.startsWith(base + '/') ||
          !approvedPath(url.slice(base.length)) || init?.method !== 'GET' || init.body !== undefined) {
        throw new Error('Read-only connector blocked an unapproved HTTP request.');
      }
      return fetchImpl(url, { ...init, redirect: 'error' });
    },
  });
  return Object.freeze({
    describeCredential: () => ({ source: present ? 'env' : null }),
    async request(method, path, body) {
      if (method !== 'GET' || body !== undefined || !approvedPath(path)) {
        throw new Error('Read-only connector permits only approved Splitwise GET endpoints without a body.');
      }
      try {
        return await api.fetchJson('GET', path);
      } catch (error) {
        // Do not let an echoed credential in an upstream error reach stdout/stderr.
        const message = String(error?.message ?? 'Splitwise read failed');
        throw new Error(present ? message.split(key).join('[redacted]') : message);
      }
    },
  });
}

const modules = [
  ['user', 'registerUserTools'], ['healthcheck', 'registerHealthcheckTools'],
  ['friends', 'registerFriendTools'], ['groups', 'registerGroupTools'],
  ['expenses', 'registerExpenseTools'], ['utilities', 'registerUtilityTools'],
];

export async function registerReadonlyTools(server, client) {
  const seen = new Set();
  // Upstream registrars declare reads and writes together. Only approved read
  // handlers reach the real server; batch and confirm registrars never run.
  const filtered = {
    registerTool(name, config, handler) {
      if (!allowedTools.includes(name)) return;
      if (config.annotations?.readOnlyHint !== true || seen.has(name)) {
        throw new Error('Splitwise MCP tool contract changed; review the pinned build.');
      }
      seen.add(name);
      server.registerTool(name, config, handler);
    },
  };
  for (const [file, registrar] of modules) {
    const mod = await import(pathToFileURL(resolve(upstream, `dist/tools/${file}.js`)).href);
    mod[registrar](filtered, client);
  }
  if (seen.size !== allowedTools.length) throw new Error('Splitwise MCP read-only tool catalog is incomplete.');
}

export function startReadonlyServer(client = createReadonlyClient({ apiKey: process.env.SPLITWISE_API_KEY })) {
  // Defense in depth. Safety does not depend on the upstream confirmation gate.
  process.env.MCP_CONFIRM_MODE = 'refuse';
  process.env.MCP_CONFIRM_ELICITATION = 'off';
  process.env.MCP_BATCH_MAX_OPS = '0';
  return runMcp({
    name: 'unfold-splitwise-readonly', version: '0.1.0', deps: client,
    tools: [registerReadonlyTools],
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startReadonlyServer();
