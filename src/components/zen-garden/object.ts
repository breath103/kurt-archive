import type * as THREE from "three";

import type { Vector2 } from "./vector2";

export interface ZenGardenObject {
  id: string;
  object: THREE.Object3D;
  setHighlight(highlighted: boolean): void;
  testRaycast(raycaster: THREE.Raycaster): boolean;
  move(delta: Vector2): void;
  dispose(): void;
}
