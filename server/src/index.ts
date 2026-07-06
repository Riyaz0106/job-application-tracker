import { createApp } from './app';
import { env } from './config/env';

// Entry point: build the app and start listening. Kept tiny on purpose —
// all configuration lives in app.ts / config so this file rarely changes.
const app = createApp();

app.listen(env.port, () => {
  console.log(
    `[server] listening on http://localhost:${env.port} (${env.nodeEnv})`,
  );
});
