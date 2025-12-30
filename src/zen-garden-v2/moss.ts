import * as THREE from "three";

import type { Codable } from "./codable";
import type { ZenGardenObject } from "./object";
import type { Vector2Encoded } from "./vector2";
import { Vector2 } from "./vector2";

export type ZenGardenMossEncoded = {
  id: string;
  type: "moss";
  position: Vector2Encoded;
  polygonPath: Array<Vector2Encoded>;
};

const MOSS_Z = 0.01;

export class ZenGardenMoss implements ZenGardenObject, Codable<ZenGardenMossEncoded> {
  readonly id: string;
  private mesh: THREE.Mesh;
  private points: Array<Vector2Encoded>;

  constructor(encoded: ZenGardenMossEncoded, scene: THREE.Scene) {
    this.id = encoded.id;
    this.points = [...encoded.polygonPath];

    const shape = new THREE.Shape();
    if (this.points.length > 0) {
      shape.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
        shape.lineTo(this.points[i].x, this.points[i].y);
      }
      shape.closePath();
    }

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a7c23,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(new Vector2(encoded.position).toVector3(MOSS_Z));

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

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.MeshStandardMaterial).dispose();
  }

  serialize(): ZenGardenMossEncoded {
    return {
      id: this.id,
      type: "moss",
      position: { x: this.mesh.position.x, y: this.mesh.position.y },
      polygonPath: this.points,
    };
  }
}
