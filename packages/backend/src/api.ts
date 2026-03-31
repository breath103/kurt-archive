import { routes } from "./lib/app-context.js";
import type { ExtractRoutes } from "./lib/route.js";
import { route as healthRoute } from "./routes/health.js";

export const api = routes(
  healthRoute,
);

export type ApiRoutes = ExtractRoutes<typeof api.routes>;
