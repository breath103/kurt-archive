import posthog from "posthog-js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { createRouter, RouterProvider } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

import "./global.css";

if (process.env.POSTHOG_KEY) {
  posthog.init(process.env.POSTHOG_KEY, {
    api_host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    defaults: "2025-11-30",
  });
}

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
