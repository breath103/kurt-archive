import type { Subscription } from "rxjs";
import { BehaviorSubject, type Observable, pairwise, startWith } from "rxjs";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { ZenGardenObject } from "./Object";
import type { ZenGardenSceneEncoded } from "./Scene";
import { ZenGardenScene } from "./Scene";
import type { Vector2 } from "./Vector2";

export type EditorMode = null | "addRock" | "addMoss";

export class ZenGardenEditor {
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  readonly scene: ZenGardenScene;
  private canvas: HTMLCanvasElement;
  private _$selectedObject = new BehaviorSubject<ZenGardenObject | null>(null);
  private _$mode = new BehaviorSubject<EditorMode>(null);
  private subscriptions: Subscription[] = [];
  private disposed = false;
  private dragging: { object: ZenGardenObject; lastPos: Vector2 } | null = null;

  constructor(canvas: HTMLCanvasElement, encoded: ZenGardenSceneEncoded) {
    this.canvas = canvas;
    this.renderer = (() => {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      return renderer;
    })();

    this.scene = new ZenGardenScene(encoded, this.renderer);

    this.controls = new OrbitControls(this.scene.threeCamera, canvas);
    this.controls.enableDamping = true;
    this.controls.mouseButtons = {
      LEFT: null as unknown as THREE.MOUSE,  // Left click for object interaction
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };

    // Selection highlight logic
    this.subscriptions.push(
      this._$selectedObject.pipe(
        startWith(null),
        pairwise()
      ).subscribe(([prev, curr]) => {
        prev?.setHighlight(false);
        curr?.setHighlight(true);
      })
    );

    canvas.addEventListener("mousedown", this.handleMouseDown);
    canvas.addEventListener("mousemove", this.handleMouseMove);
    canvas.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener("resize", this.handleResize);

    this.animate();
  }

  private screenCoords(event: MouseEvent): { x: number; y: number } {
    return {
      x: (event.clientX / window.innerWidth) * 2 - 1,
      y: -(event.clientY / window.innerHeight) * 2 + 1,
    };
  }

  private handleMouseDown = (event: MouseEvent): void => {
    const screen = this.screenCoords(event);
    const pos = this.scene.screenToPlaneCoordinate(screen.x, screen.y);

    const mode = this._$mode.value;
    if (pos) {
      const id = crypto.randomUUID();
      switch (mode) {
      case null:
        break;
      case "addRock":
        this.scene.addObject({ id, type: "rock", position: pos.serialize() });
        this._$mode.next(null);
        return;
      case "addMoss":
        this.scene.addObject({
          id,
          type: "moss",
          position: pos.serialize(),
          polygonPath: [
            { x: -0.5, y: -0.5 },
            { x: 0.5, y: -0.5 },
            { x: 0.5, y: 0.5 },
            { x: -0.5, y: 0.5 },
          ],
        });
        this._$mode.next(null);
        return;
      }
    }

    const hit = this.scene.hitTest(screen.x, screen.y);
    if (hit && pos) {
      this.dragging = { object: hit, lastPos: pos };
      this._$selectedObject.next(hit);
    }
  };

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.dragging) return;

    const screen = this.screenCoords(event);
    const pos = this.scene.screenToPlaneCoordinate(screen.x, screen.y);

    if (pos) {
      const delta = pos.clone().sub(this.dragging.lastPos);
      this.dragging.object.move(delta);
      this.dragging.lastPos = pos;
    }
  };

  private handleMouseUp = (): void => {
    this.dragging = null;
  };

  private handleResize = (): void => {
    this.scene.handleResize(window.innerWidth, window.innerHeight);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private animate = (): void => {
    if (this.disposed) return;
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.scene.update();
    this.renderer.render(this.scene.threeScene, this.scene.threeCamera);
  };

  get $selectedObject(): Observable<ZenGardenObject | null> {
    return this._$selectedObject;
  }

  get $mode(): Observable<EditorMode> {
    return this._$mode;
  }

  get threeRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  setMode(mode: EditorMode): void {
    this._$mode.next(mode);
  }

  deleteObject(id: string): void {
    if (this._$selectedObject.value?.id === id) {
      this._$selectedObject.next(null);
    }
    this.scene.deleteObject(id);
  }

  dispose(): void {
    this.disposed = true;
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.controls.dispose();
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("resize", this.handleResize);
    this.renderer.dispose();
  }
}
