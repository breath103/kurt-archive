import type { Context } from "hono";

import { routeFactory, routesFactory } from "./route.js";

export type AppEnv = {
  Variables: Record<string, never>;
};

export type AppContext = Context<AppEnv>;

export const route = routeFactory<AppContext>();
export const routes = routesFactory<AppContext>();
