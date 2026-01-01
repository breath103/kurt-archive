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
  readonly object: ZenGardenMossObject;
  private points: Array<Vector2Encoded>;

  constructor(encoded: ZenGardenMossEncoded) {
    this.id = encoded.id;
    this.points = [...encoded.polygonPath];
    this.object = new ZenGardenMossObject(encoded.position, this.points);
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

  serialize(): ZenGardenMossEncoded {
    return {
      id: this.id,
      type: "moss",
      position: { x: this.object.position.x, y: this.object.position.y },
      polygonPath: this.points,
    };
  }
}

class ZenGardenMossObject extends THREE.Object3D {
  private mesh: THREE.Mesh;
  private material: THREE.MeshStandardMaterial;

  constructor(position: Vector2Encoded, points: Array<Vector2Encoded>) {
    super();

    const shape = new THREE.Shape();
    if (points.length > 0) {
      shape.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        shape.lineTo(points[i].x, points[i].y);
      }
      shape.closePath();
    }

    const geometry = new THREE.ShapeGeometry(shape);
    this.material = new THREE.MeshStandardMaterial({
      color: 0x4a7c23,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.add(this.mesh);

    this.position.copy(new Vector2(position).toVector3(MOSS_Z));
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
