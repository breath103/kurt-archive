import * as THREE from "three";

import type { Codable } from "./codable";
import type { Vector2Encoded } from "./vector2";
import { Vector2 } from "./vector2";

export type ZenGardenPlainEncoded = {
  size: Vector2Encoded;
};

const PLAIN_Z = 0;

export class ZenGardenPlain implements Codable<ZenGardenPlainEncoded> {
  private mesh: THREE.Mesh;

  constructor(encoded: ZenGardenPlainEncoded, scene: THREE.Scene) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0xd4c4a8,
      roughness: 1,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.z = PLAIN_Z;
    this.mesh.receiveShadow = true;
    this.size = new Vector2(encoded.size);

    scene.add(this.mesh);
  }

  get size(): Vector2 {
    return new Vector2({ x: this.mesh.scale.x, y: this.mesh.scale.y });
  }

  set size(value: Vector2) {
    this.mesh.scale.set(value.x, value.y, 1);
  }

  serialize(): ZenGardenPlainEncoded {
    return {
      size: this.size.serialize(),
    };
  }
}
