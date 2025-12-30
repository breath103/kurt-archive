import type * as THREE from "three";

import type { Vector2 } from "./vector2";

export interface ZenGardenObject {
  id: string;
  setHighlight(highlighted: boolean): void;
  testRaycast(raycaster: THREE.Raycaster): boolean;
  moveOnPlane(delta: Vector2): void;
}
