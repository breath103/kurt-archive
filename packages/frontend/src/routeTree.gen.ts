import { rootRoute } from "./routes/__root";
import { indexRoute } from "./routes/index";
import { zenGardenRoute } from "./routes/zen-garden";

export const routeTree = rootRoute.addChildren([indexRoute, zenGardenRoute]);
