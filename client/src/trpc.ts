import { createTRPCReact } from '@trpc/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
// Type-only import of the server's root router. Because it's `import type`, the
// bundler erases it — no server code reaches the browser — but TypeScript uses
// it to infer the input and output types of every procedure. This single line
// is what makes the client<->server contract end-to-end type-safe.
import type { AppRouter } from '../../server/src/trpc/routers/_app';

export const trpc = createTRPCReact<AppRouter>();

// Inferred end-to-end types — components derive their data shapes from these,
// never hand-written. e.g. RouterOutputs['applications']['list'][number].
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;

export type Application = RouterOutputs['applications']['list'][number];
export type ApplicationDetail = RouterOutputs['applications']['byId'];
export type Interview =
  RouterOutputs['interviews']['listByApplication'][number];
