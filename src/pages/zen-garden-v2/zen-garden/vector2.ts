import * as THREE from "three";

import type { Codable } from "./codable";

export type Vector2Encoded = { x: number; y: number };

export class Vector2 extends THREE.Vector2 implements Codable<Vector2Encoded> {
  constructor(encoded: Vector2Encoded) {
    super(encoded.x, encoded.y);
  }

  toVector3(z = 0): THREE.Vector3 {
    return new THREE.Vector3(this.x, this.y, z);
  }

  override clone(): this {
    return new Vector2({ x: this.x, y: this.y }) as this;
  }

  serialize(): Vector2Encoded {
    return { x: this.x, y: this.y };
  }
}
