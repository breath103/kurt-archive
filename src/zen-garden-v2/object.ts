import * as THREE from "three";

import type { Codable } from "./codable";

interface ZenGardenObject {
  id: string;
}

export interface SelectableObject {
  setHighlight(highlighted: boolean): void;
  testRaycast(raycaster: THREE.Raycaster): boolean;
}

export type ZenGardenRockEncoded = {
  id: string;
  type: "rock";
  position: { x: number; y: number };
};

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
    this.setPosition(encoded.position.x, encoded.position.y);

    scene.add(this.mesh);
  }

  setPosition(x: number, y: number): void {
    this.mesh.position.set(x, 0.15, y);
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

export type ZenGardenMossEncoded = {
  id: string;
  type: "moss";
  polygonPath: Array<{ x: number; y: number }>;
};

export class ZenGardenMoss implements ZenGardenObject, Codable<ZenGardenMossEncoded> {
  readonly id: string;
  private mesh: THREE.Mesh;
  private points: Array<{ x: number; y: number }>;

  constructor(encoded: ZenGardenMossEncoded, scene: THREE.Scene) {
    this.id = encoded.id;
    this.points = [...encoded.polygonPath];

    const shape = new THREE.Shape();
    if (this.points.length > 0) {
      shape.moveTo(this.points[0].x, -this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
        shape.lineTo(this.points[i].x, -this.points[i].y);
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
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.01;

    scene.add(this.mesh);
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

  serialize(): ZenGardenMossEncoded {
    return {
      id: this.id,
      type: "moss",
      polygonPath: this.points,
    };
  }
}
