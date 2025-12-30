import * as THREE from "three";

import type { Codable } from "./codable";
import type { ZenGardenObject } from "./object";
import type { ZenGardenMossEncoded } from "./moss";
import { ZenGardenMoss } from "./moss";
import type { ZenGardenPlainEncoded } from "./plain";
import { ZenGardenPlain } from "./plain";
import type { ZenGardenRakeStrokeEncoded } from "./rake-stroke";
import { ZenGardenRakeStroke } from "./rake-stroke";
import type { ZenGardenRockEncoded } from "./rock";
import { ZenGardenRock } from "./rock";
import { Sun } from "./sun";
import { Vector2 } from "./vector2";

export class ZenGardenScene implements Codable<ZenGardenSceneEncoded> {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sun: Sun;
  readonly plain: ZenGardenPlain;
  private objects: Map<string, ZenGardenRock | ZenGardenMoss | ZenGardenRakeStroke>;
  private raycaster = new THREE.Raycaster();

  constructor(encoded: ZenGardenSceneEncoded) {
    // Z-up coordinate system
    THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 10);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    
    this.sun = new Sun();
    this.scene.add(this.sun);

    // Plain
    this.plain = new ZenGardenPlain(encoded.plain, this.scene);

    // Objects
    this.objects = new Map();
    for (const e of encoded.objects) {
      this.addObject(e);
    }
  }

  private deserialize(encoded: ZenGardenRockEncoded | ZenGardenMossEncoded | ZenGardenRakeStrokeEncoded): ZenGardenRock | ZenGardenMoss | ZenGardenRakeStroke {
    switch (encoded.type) {
    case "rock": return new ZenGardenRock(encoded);
    case "moss": return new ZenGardenMoss(encoded);
    case "rakeStroke": return new ZenGardenRakeStroke(encoded);
    }
  }

  get threeScene(): THREE.Scene {
    return this.scene;
  }

  get threeCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  update(): void {
    this.sun.update();
  }

  addObject(encoded: ZenGardenRockEncoded | ZenGardenMossEncoded | ZenGardenRakeStrokeEncoded): void {
    const obj = this.deserialize(encoded);
    this.scene.add(obj.object);
    this.objects.set(obj.id, obj);
  }

  deleteObject(id: string): void {
    const obj = this.objects.get(id);
    if (obj) {
      obj.dispose();
      this.objects.delete(id);
    }
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

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersection = new THREE.Vector3();

    if (this.raycaster.ray.intersectPlane(plane, intersection)) {
      return new Vector2({ x: intersection.x, y: intersection.y });
    }
    return null;
  }

  serialize(): ZenGardenSceneEncoded {
    return {
      plain: this.plain.serialize(),
      objects: Array.from(this.objects.values()).map((object) => object.serialize()),
    };
  }
}

export interface ZenGardenSceneEncoded {
  plain: ZenGardenPlainEncoded;
  objects: Array<ZenGardenRockEncoded | ZenGardenMossEncoded | ZenGardenRakeStrokeEncoded>;
}
