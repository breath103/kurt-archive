import type { Observable, Subscription } from "rxjs";
import { map, merge, switchMap } from "rxjs";
import * as THREE from "three";

import type { Codable } from "./codable";
import type { ZenGardenObject } from "./object";
import type { ZenGardenRakeStroke } from "./rake-stroke";
import type { Vector2Encoded } from "./vector2";
import { Vector2 } from "./vector2";

export type ZenGardenPlainEncoded = {
  size: Vector2Encoded;
};

const PLAIN_Z = 0;

export class ZenGardenPlain implements Codable<ZenGardenPlainEncoded> {
  readonly object: THREE.Mesh;
  private subscription: Subscription | null = null;

  constructor(encoded: ZenGardenPlainEncoded) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0xd4c4a8,
      roughness: 1,
    });

    this.object = new THREE.Mesh(geometry, material);
    this.object.position.z = PLAIN_Z;
    this.object.receiveShadow = true;
    this.size = new Vector2(encoded.size);
  }

  subscribeToRakeStrokes($objects: Observable<ZenGardenObject[]>): void {
    this.subscription?.unsubscribe();

    this.subscription = $objects.pipe(
      map(objects => objects.filter((o): o is ZenGardenRakeStroke => "$changed" in o)),
      switchMap(strokes => {
        if (strokes.length === 0) return [];
        return merge(...strokes.map(s => s.$changed.pipe(map(() => strokes))));
      }),
    ).subscribe(strokes => {
      this.updateTexture(strokes);
    });
  }

  private updateTexture(rakeStrokes: ZenGardenRakeStroke[]): void {
    // TODO: Actual texture rendering
    console.log("updateTexture called with", rakeStrokes.length, "rake strokes");
  }

  dispose(): void {
    this.subscription?.unsubscribe();
  }

  get size(): Vector2 {
    return new Vector2({ x: this.object.scale.x, y: this.object.scale.y });
  }

  set size(value: Vector2) {
    this.object.scale.set(value.x, value.y, 1);
  }

  serialize(): ZenGardenPlainEncoded {
    return {
      size: this.size.serialize(),
    };
  }
}
