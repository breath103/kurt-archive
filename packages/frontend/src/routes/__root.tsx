import { createRootRoute, Outlet } from "@tanstack/react-router";

function RootComponent() {
  return <Outlet />;
}

export const rootRoute = createRootRoute({
  component: RootComponent,
});
