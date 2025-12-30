import * as THREE from "three";

export class Sun extends THREE.DirectionalLight {
  private angle = 0;

  constructor() {
    super(0xffffff, 1);
    this.castShadow = true;
  }

  update(): void {
    this.angle += 0.01;
    const radius = 7;
    this.position.set(
      Math.cos(this.angle) * radius,
      Math.sin(this.angle) * radius,
      10
    );
  }
}
