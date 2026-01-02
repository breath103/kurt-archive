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

const ROCK_Z = 0.15;

export class ZenGardenRock implements ZenGardenObject, Codable<ZenGardenRockEncoded> {
  readonly id: string;
  readonly object: ZenGardenRockObject;

  constructor(encoded: ZenGardenRockEncoded) {
    this.id = encoded.id;
    this.object = new ZenGardenRockObject(encoded.position);
  }

  setHighlight(highlighted: boolean): void {
    this.object.setHighlight(highlighted);
  }

  testRaycast(raycaster: THREE.Raycaster): boolean {
    return this.object.testRaycast(raycaster);
  }

  move(delta: Vector2): void {
    this.object.position.add(delta.toVector3());
  }

  dispose(): void {
    this.object.removeFromParent();
    this.object.dispose();
  }

  serialize(): ZenGardenRockEncoded {
    return {
      id: this.id,
      type: "rock",
      position: { x: this.object.position.x, y: this.object.position.y },
    };
  }
}

class ZenGardenRockObject extends THREE.Object3D {
  private mesh: THREE.Mesh;
  private material: THREE.MeshStandardMaterial;

  constructor(position: Vector2Encoded) {
    super();

    const geometry = new THREE.SphereGeometry(0.3, 8, 6);
    geometry.scale(1, 1, 0.6);
    this.material = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.9,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.castShadow = true;
    this.add(this.mesh);

    this.position.copy(new Vector2(position).toVector3(ROCK_Z));
  }

  setHighlight(highlighted: boolean): void {
    if (highlighted) {
      this.material.emissive.setHex(0xffaa00);
      this.material.emissiveIntensity = 0.4;
    } else {
      this.material.emissive.setHex(0x000000);
      this.material.emissiveIntensity = 0;
    }
  }

  testRaycast(raycaster: THREE.Raycaster): boolean {
    return raycaster.intersectObject(this.mesh).length > 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
