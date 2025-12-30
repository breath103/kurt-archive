import type * as THREE from "three";

export interface ZenGardenObject {
  id: string;
  object: THREE.Object3D;
  setHighlight(highlighted: boolean): void;
  testRaycast(raycaster: THREE.Raycaster): boolean;
  dispose(): void;
}
