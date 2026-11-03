// Exercise the production discovery flow using a fake credential and fake server.
import { fileURLToPath } from 'node:url';
import { discoverAccount } from '../../integrations/splitwise-mcp/discover-account.mjs';

await discoverAccount({
  apiKey: 'synthetic-not-a-credential',
  serverPath: fileURLToPath(new URL('./splitwise-mcp-server.mjs', import.meta.url)),
});
