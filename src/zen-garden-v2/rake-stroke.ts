import { Subject } from "rxjs";
import * as THREE from "three";

import type { Codable } from "./codable";
import type { ZenGardenObject } from "./object";
import type { Vector2Encoded } from "./vector2";

export type RakePath =
  | { type: "points"; points: Array<Vector2Encoded>; closed: boolean }
  | { type: "circle"; center: Vector2Encoded; radius: number };

export type ZenGardenRakeStrokeEncoded = {
  id: string;
  type: "rakeStroke";
  path: RakePath;
  width: number;
  numberOfForks: number;
  forkDepth: number;
};

const RAKE_Z = 0.02;

export class ZenGardenRakeStroke implements ZenGardenObject, Codable<ZenGardenRakeStrokeEncoded> {
  readonly id: string;
  readonly object: ZenGardenRakeStrokeObject;
  readonly $changed = new Subject<void>();
  private path: RakePath;
  private _width: number;
  private numberOfForks: number;
  private forkDepth: number;

  constructor(encoded: ZenGardenRakeStrokeEncoded) {
    this.id = encoded.id;
    this.path = encoded.path;
    this._width = encoded.width;
    this.numberOfForks = encoded.numberOfForks;
    this.forkDepth = encoded.forkDepth;

    this.object = new ZenGardenRakeStrokeObject(this.path, this._width);
  }

  get width(): number {
    return this._width;
  }

  set width(value: number) {
    this._width = value;
    this.object.updateGeometry({ path: this.path, width: value });
    this.$changed.next();
  }

  setHighlight(highlighted: boolean): void {
    this.object.setHighlight(highlighted);
  }

  testRaycast(raycaster: THREE.Raycaster): boolean {
    return this.object.testRaycast(raycaster);
  }

  dispose(): void {
    this.$changed.complete();
    this.object.removeFromParent();
    this.object.dispose();
  }

  serialize(): ZenGardenRakeStrokeEncoded {
    return {
      id: this.id,
      type: "rakeStroke",
      path: this.path,
      width: this._width,
      numberOfForks: this.numberOfForks,
      forkDepth: this.forkDepth,
    };
  }
}

class ZenGardenRakeStrokeObject extends THREE.Object3D {
  private mesh: THREE.Mesh;
  private material: THREE.MeshStandardMaterial;
  private debugPoints: THREE.Points | null = null;

  constructor(path: RakePath, width: number) {
    super();

    this.material = new THREE.MeshStandardMaterial({
      color: 0xc2b280,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material);
    this.mesh.position.z = RAKE_Z;
    this.add(this.mesh);

    this.updateGeometry({ path, width });
  }

  updateGeometry({ path, width }: { path: RakePath; width: number }): void {
    this.mesh.geometry.dispose();
    this.mesh.geometry = this.createGeometry(path, width);

    if (this.debugPoints) {
      this.debugPoints.geometry.dispose();
      (this.debugPoints.material as THREE.PointsMaterial).dispose();
      this.remove(this.debugPoints);
      this.debugPoints = null;
    }

    if (path.type === "points") {
      this.debugPoints = this.createDebugPoints(path);
      this.add(this.debugPoints);
    }
  }

  private createGeometry(path: RakePath, width: number): THREE.BufferGeometry {
    switch (path.type) {
    case "circle":
      return this.createCircleGeometry(path, width);
    case "points":
      return this.createPointsGeometry(path, width);
    }
  }

  private createCircleGeometry(path: Extract<RakePath, { type: "circle" }>, width: number): THREE.BufferGeometry {
    const innerRadius = Math.max(0, path.radius - width / 2);
    const outerRadius = path.radius + width / 2;
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    geometry.translate(path.center.x, path.center.y, 0);
    return geometry;
  }

  private createPointsGeometry(path: Extract<RakePath, { type: "points" }>, width: number): THREE.BufferGeometry {
    if (path.points.length < 2) {
      return new THREE.BufferGeometry();
    }

    const curvePoints = path.points.map(p => new THREE.Vector3(p.x, p.y, 0));
    const curve = new THREE.CatmullRomCurve3(curvePoints, path.closed);
    const sampledPoints = curve.getPoints(50);

    const shape = new THREE.Shape();
    const halfWidth = width / 2;

    const leftPoints: THREE.Vector2[] = [];
    const rightPoints: THREE.Vector2[] = [];

    for (let i = 0; i < sampledPoints.length; i++) {
      const curr = sampledPoints[i];
      const prev = i > 0 ? sampledPoints[i - 1] : null;
      const next = i < sampledPoints.length - 1 ? sampledPoints[i + 1] : null;

      let perpX = 0, perpY = 0;
      if (prev && next) {
        const dirX = next.x - prev.x;
        const dirY = next.y - prev.y;
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        perpX = -dirY / len;
        perpY = dirX / len;
      } else if (next) {
        const dirX = next.x - curr.x;
        const dirY = next.y - curr.y;
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        perpX = -dirY / len;
        perpY = dirX / len;
      } else if (prev) {
        const dirX = curr.x - prev.x;
        const dirY = curr.y - prev.y;
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        perpX = -dirY / len;
        perpY = dirX / len;
      }

      leftPoints.push(new THREE.Vector2(curr.x + perpX * halfWidth, curr.y + perpY * halfWidth));
      rightPoints.push(new THREE.Vector2(curr.x - perpX * halfWidth, curr.y - perpY * halfWidth));
    }

    shape.moveTo(leftPoints[0].x, leftPoints[0].y);
    for (let i = 1; i < leftPoints.length; i++) {
      shape.lineTo(leftPoints[i].x, leftPoints[i].y);
    }
    for (let i = rightPoints.length - 1; i >= 0; i--) {
      shape.lineTo(rightPoints[i].x, rightPoints[i].y);
    }
    if (path.closed) {
      shape.closePath();
    }

    return new THREE.ShapeGeometry(shape);
  }

  private createDebugPoints(path: Extract<RakePath, { type: "points" }>): THREE.Points {
    const curvePoints = path.points.map(p => new THREE.Vector3(p.x, p.y, 0));
    const curve = new THREE.CatmullRomCurve3(curvePoints, path.closed);
    const sampledPoints = curve.getPoints(50);

    const positions = new Float32Array(sampledPoints.length * 3);
    for (let i = 0; i < sampledPoints.length; i++) {
      positions[i * 3] = sampledPoints[i].x;
      positions[i * 3 + 1] = sampledPoints[i].y;
      positions[i * 3 + 2] = RAKE_Z + 0.1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xff0000,
      size: 0.1,
      sizeAttenuation: true,
    });

    return new THREE.Points(geometry, material);
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

    if (this.debugPoints) {
      this.debugPoints.geometry.dispose();
      (this.debugPoints.material as THREE.PointsMaterial).dispose();
    }
  }
}
