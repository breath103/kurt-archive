import type { Subscription } from "rxjs";
import { BehaviorSubject, pairwise, startWith } from "rxjs";
import * as THREE from "three";

import type { SelectableObject } from "./object";
import type { ZenGardenSceneEncoded } from "./scene";
import { ZenGardenScene } from "./scene";

export class ZenGardenEditor {
  private renderer: THREE.WebGLRenderer;
  private scene: ZenGardenScene;
  private canvas: HTMLCanvasElement;
  private $selectedObject = new BehaviorSubject<SelectableObject | null>(null);
  private subscriptions: Subscription[] = [];
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, encoded: ZenGardenSceneEncoded) {
    this.canvas = canvas;
    this.renderer = (() => {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      return renderer;
    })();

    this.scene = new ZenGardenScene(encoded);

    // Selection highlight logic
    this.subscriptions.push(
      this.$selectedObject.pipe(
        startWith(null),
        pairwise()
      ).subscribe(([prev, curr]) => {
        prev?.setHighlight(false);
        curr?.setHighlight(true);
      })
    );

    canvas.addEventListener("click", this.handleClick);
    window.addEventListener("resize", this.handleResize);

    this.animate();
  }

  private handleClick = (event: MouseEvent): void => {
    const screenX = (event.clientX / window.innerWidth) * 2 - 1;
    const screenY = -(event.clientY / window.innerHeight) * 2 + 1;
    this.$selectedObject.next(this.scene.hitTest(screenX, screenY));
  };

  private handleResize = (): void => {
    this.scene.handleResize(window.innerWidth, window.innerHeight);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private animate = (): void => {
    if (this.disposed) return;
    requestAnimationFrame(this.animate);
    this.renderer.render(this.scene.threeScene, this.scene.threeCamera);
  };

  dispose(): void {
    this.disposed = true;
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.canvas.removeEventListener("click", this.handleClick);
    window.removeEventListener("resize", this.handleResize);
    this.renderer.dispose();
  }
}
