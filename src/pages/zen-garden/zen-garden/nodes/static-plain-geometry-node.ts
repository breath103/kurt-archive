import * as THREE from "three";

import type { ReactiveNodeContext, ReactiveNodeInputs } from "./node";
import { ReactiveNode } from "./node";
import type { Vector2 } from "../vector2";

type StaticPlainGeometryNodeInputs = {
  size: Vector2;
  segmentsPerUnit: number;
};

export class StaticPlainGeometryNode extends ReactiveNode<StaticPlainGeometryNodeInputs, THREE.PlaneGeometry> {
  private geometry: THREE.PlaneGeometry | null = null;

  constructor(
    context: ReactiveNodeContext,
    inputs: ReactiveNodeInputs<StaticPlainGeometryNodeInputs>,
  ) {
    super(context, inputs);
  }

  protected process(
    _context: ReactiveNodeContext,
    { size, segmentsPerUnit }: StaticPlainGeometryNodeInputs
  ): THREE.PlaneGeometry {
    // Dispose old geometry if exists
    this.geometry?.dispose();

    const segmentsX = Math.round(size.x * segmentsPerUnit);
    const segmentsY = Math.round(size.y * segmentsPerUnit);

    this.geometry = new THREE.PlaneGeometry(size.x, size.y, segmentsX, segmentsY);
    return this.geometry;
  }

  dispose(): void {
    this.geometry?.dispose();
  }
}
