import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { api } from "./api.js";
import type { AppEnv } from "./lib/app-context.js";
import { registerToHono } from "./lib/hono-adapter.js";

const app = new Hono<AppEnv>();

app.onError((err, c) => {
  console.error("Request error:", err);

  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  return c.json({ error: "Internal server error" }, 500);
});

registerToHono(app, api);

export { app };
