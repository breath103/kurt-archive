import * as THREE from "three";

import type { Codable } from "./codable";
import type { ZenGardenObject } from "./object";
import type { ZenGardenMossEncoded } from "./moss";
import { ZenGardenMoss } from "./moss";
import type { ZenGardenRockEncoded } from "./rock";
import { ZenGardenRock } from "./rock";
import { Vector2 } from "./vector2";

export class ZenGardenScene implements Codable<ZenGardenSceneEncoded> {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private objects: Map<string, ZenGardenRock | ZenGardenMoss>;
  private raycaster = new THREE.Raycaster();

  constructor(encoded: ZenGardenSceneEncoded) {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 10, 0);
    this.camera.lookAt(0, 0, 0);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 10, 5);
    this.scene.add(sun);

    // Objects
    this.objects = new Map(
      encoded.objects
        .map((e) => {
          switch (e.type) {
          case "rock": return new ZenGardenRock(e, this.scene);
          case "moss": return new ZenGardenMoss(e, this.scene);
          }
        })
        .map((o) => [o.id, o])
    );
  }

  get threeScene(): THREE.Scene {
    return this.scene;
  }

  get threeCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  handleResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  hitTest(screenX: number, screenY: number): ZenGardenObject | null {
    const mouse = new THREE.Vector2(screenX, screenY);
    this.raycaster.setFromCamera(mouse, this.camera);

    const objects = Array.from(this.objects.values());
    for (const obj of objects) {
      if (obj.testRaycast(this.raycaster)) {
        return obj;
      }
    }
    return null;
  }

  screenToPlaneCoordinate(screenX: number, screenY: number): Vector2 | null {
    const mouse = new THREE.Vector2(screenX, screenY);
    this.raycaster.setFromCamera(mouse, this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();

    if (this.raycaster.ray.intersectPlane(plane, intersection)) {
      return new Vector2({ x: intersection.x, y: intersection.z });
    }
    return null;
  }

  serialize(): ZenGardenSceneEncoded {
    return {
      objects: Array.from(this.objects.values()).map((object) => object.serialize()),
    };
  }
}

export interface ZenGardenSceneEncoded {
  objects: Array<ZenGardenRockEncoded | ZenGardenMossEncoded>;
}
