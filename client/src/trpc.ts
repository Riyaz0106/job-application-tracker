import { createTRPCReact } from '@trpc/react-query';
// Type-only import of the server's root router. Because it's `import type`, the
// bundler erases it — no server code reaches the browser — but TypeScript uses
// it to infer the input and output types of every procedure. This single line
// is what makes the client<->server contract end-to-end type-safe.
import type { AppRouter } from '../../server/src/trpc/routers/_app';

export const trpc = createTRPCReact<AppRouter>();
