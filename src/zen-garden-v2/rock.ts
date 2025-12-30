import * as THREE from "three";

import type { Codable } from "./codable";
import type { ZenGardenObject } from "./object";
import type { Vector2Encoded } from "./vector2";
import { Vector2 } from "./vector2";

export type ZenGardenRockEncoded = {
  id: string;
  type: "rock";
  position: Vector2Encoded;
};

const ROCK_Y = 0.15;

export class ZenGardenRock implements ZenGardenObject, Codable<ZenGardenRockEncoded> {
  readonly id: string;
  private mesh: THREE.Mesh;

  constructor(encoded: ZenGardenRockEncoded, scene: THREE.Scene) {
    this.id = encoded.id;

    const geometry = new THREE.SphereGeometry(0.3, 8, 6);
    geometry.scale(1, 0.6, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.9,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(new Vector2(encoded.position).toVector3(ROCK_Y));

    scene.add(this.mesh);
  }

  moveOnPlane(delta: Vector2): void {
    this.mesh.position.add(delta.toVector3());
  }

  setHighlight(highlighted: boolean): void {
    const material = this.mesh.material as THREE.MeshStandardMaterial;
    if (highlighted) {
      material.emissive.setHex(0xffaa00);
      material.emissiveIntensity = 0.4;
    } else {
      material.emissive.setHex(0x000000);
      material.emissiveIntensity = 0;
    }
  }

  testRaycast(raycaster: THREE.Raycaster): boolean {
    return raycaster.intersectObject(this.mesh).length > 0;
  }

  serialize(): ZenGardenRockEncoded {
    return {
      id: this.id,
      type: "rock",
      position: { x: this.mesh.position.x, y: this.mesh.position.z },
    };
  }
}
