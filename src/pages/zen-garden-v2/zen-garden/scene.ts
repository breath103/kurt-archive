import { BehaviorSubject, map } from "rxjs";
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
  readonly $objects = new BehaviorSubject<(ZenGardenRock | ZenGardenMoss | ZenGardenRakeStroke)[]>([]);
  private raycaster = new THREE.Raycaster();

  constructor(encoded: ZenGardenSceneEncoded, renderer: THREE.WebGLRenderer) {
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

    // Plain - $rakes is derived from $objects
    const $rakes = this.$objects.pipe(
      map(objects => objects.filter((o): o is ZenGardenRakeStroke => o instanceof ZenGardenRakeStroke))
    );
    this.plain = new ZenGardenPlain(encoded.plain, $rakes, renderer);
    this.scene.add(this.plain.object);

    // Objects
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
    this.$objects.next([...this.$objects.value, obj]);
  }

  deleteObject(id: string): void {
    const obj = this.$objects.value.find(o => o.id === id);
    if (obj) {
      obj.dispose();
      this.$objects.next(this.$objects.value.filter(o => o.id !== id));
    }
  }

  handleResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  hitTest(screenX: number, screenY: number): ZenGardenObject | null {
    const mouse = new THREE.Vector2(screenX, screenY);
    this.raycaster.setFromCamera(mouse, this.camera);

    for (const obj of this.$objects.value) {
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
      objects: this.$objects.value.map(obj => obj.serialize()),
    };
  }
}

export interface ZenGardenSceneEncoded {
  plain: ZenGardenPlainEncoded;
  objects: Array<ZenGardenRockEncoded | ZenGardenMossEncoded | ZenGardenRakeStrokeEncoded>;
}
