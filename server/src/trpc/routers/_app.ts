import { router } from '../trpc';
import { applicationsRouter } from './applications';
import { interviewsRouter } from './interviews';

// The root router — everything the API exposes hangs off this.
export const appRouter = router({
  applications: applicationsRouter,
  interviews: interviewsRouter,
});

// The TYPE the client imports (type-only) for end-to-end inference. Exporting
// the type — never the value — means no server code is bundled into the browser.
export type AppRouter = typeof appRouter;
