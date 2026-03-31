import { route as createRoute } from "../lib/app-context.js";

export const route = createRoute("/api/health", "GET", {
  handler: () => {
    return {
      status: "ok" as const,
      timestamp: Date.now(),
    };
  },
});
