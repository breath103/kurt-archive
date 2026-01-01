import * as THREE from "three";

import type { ReactiveNodeContext, ReactiveNodeInputs } from "../utils/reactive-node";
import { ReactiveNode } from "../utils/reactive-node";
import type { Vector2 } from "../vector2";

type AdaptivePlaneGeometryNodeInputs = {
  cameraPosition: THREE.Vector3;
  size: Vector2;
  maxProjectedSegmentSize: number; // subdivide if nodeSize/distance > this
};

type Bounds = { x: number; y: number; width: number; height: number };

class QuadTreeNode {
  children: QuadTreeNode[] | null = null;

  constructor(readonly bounds: Bounds) {}

  isLeaf(): boolean {
    return this.children === null;
  }

  subdivide(): void {
    const { x, y, width, height } = this.bounds;

    if (width > height * 1.5) {
      // Split horizontally (along X) into 2
      const halfW = width / 2;
      this.children = [
        new QuadTreeNode({ x, y, width: halfW, height }),
        new QuadTreeNode({ x: x + halfW, y, width: halfW, height }),
      ];
    } else if (height > width * 1.5) {
      // Split vertically (along Y) into 2
      const halfH = height / 2;
      this.children = [
        new QuadTreeNode({ x, y, width, height: halfH }),
        new QuadTreeNode({ x, y: y + halfH, width, height: halfH }),
      ];
    } else {
      // Roughly square - split into 4
      const halfW = width / 2;
      const halfH = height / 2;
      this.children = [
        new QuadTreeNode({ x, y, width: halfW, height: halfH }),
        new QuadTreeNode({ x: x + halfW, y, width: halfW, height: halfH }),
        new QuadTreeNode({ x, y: y + halfH, width: halfW, height: halfH }),
        new QuadTreeNode({ x: x + halfW, y: y + halfH, width: halfW, height: halfH }),
      ];
    }
  }

  update(cameraPos: THREE.Vector3, maxProjectedSize: number): void {
    const { x, y, width, height } = this.bounds;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // 3D distance from camera to quad center (quad is at z=0)
    const dist = Math.sqrt(
      (cameraPos.x - centerX) ** 2 +
      (cameraPos.y - centerY) ** 2 +
      cameraPos.z ** 2
    );

    // Projected size (angular size approximation)
    const nodeSize = Math.max(width, height);
    const projectedSize = nodeSize / Math.max(dist, 0.001);

    // Subdivide if projected too large
    const shouldSubdivide = projectedSize > maxProjectedSize;

    if (shouldSubdivide) {
      if (this.isLeaf()) {
        this.subdivide();
      }
      for (const child of this.children!) {
        child.update(cameraPos, maxProjectedSize);
      }
    } else {
      // Merge back to leaf
      this.children = null;
    }
  }

  collectLeaves(leaves: Bounds[]): void {
    if (this.isLeaf()) {
      leaves.push(this.bounds);
    } else {
      for (const child of this.children!) {
        child.collectLeaves(leaves);
      }
    }
  }
}

export class AdaptivePlaneGeometryNode extends ReactiveNode<AdaptivePlaneGeometryNodeInputs, THREE.BufferGeometry> {
  private geometry: THREE.BufferGeometry | null = null;
  private root: QuadTreeNode | null = null;

  constructor(
    context: ReactiveNodeContext,
    inputs: ReactiveNodeInputs<AdaptivePlaneGeometryNodeInputs>,
  ) {
    super(context, inputs);
  }

  protected process(
    _context: ReactiveNodeContext,
    { cameraPosition, size, maxProjectedSegmentSize }: AdaptivePlaneGeometryNodeInputs
  ): THREE.BufferGeometry {
    // Rebuild tree if size changed
    if (!this.root ||
        this.root.bounds.width !== size.x ||
        this.root.bounds.height !== size.y) {
      this.root = new QuadTreeNode({
        x: -size.x / 2,
        y: -size.y / 2,
        width: size.x,
        height: size.y,
      });
    }

    // Update tree based on camera
    this.root.update(cameraPosition, maxProjectedSegmentSize);

    // Collect leaf quads
    const leaves: Bounds[] = [];
    this.root.collectLeaves(leaves);

    // Dispose old geometry and create new one (required for wireframe cache invalidation)
    this.geometry?.dispose();
    this.geometry = this.buildGeometry(leaves, size);

    return this.geometry;
  }

  private buildGeometry(leaves: Bounds[], size: Vector2): THREE.BufferGeometry {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    let vertexIndex = 0;

    for (const quad of leaves) {
      const { x, y, width, height } = quad;

      // 4 corners of the quad
      const x0 = x, x1 = x + width;
      const y0 = y, y1 = y + height;

      // Positions (z = 0)
      positions.push(x0, y0, 0, x1, y0, 0, x0, y1, 0, x1, y1, 0);

      // UVs (map world coords to 0-1)
      const u0 = (x0 + size.x / 2) / size.x;
      const u1 = (x1 + size.x / 2) / size.x;
      const v0 = (y0 + size.y / 2) / size.y;
      const v1 = (y1 + size.y / 2) / size.y;
      uvs.push(u0, v0, u1, v0, u0, v1, u1, v1);

      // Two triangles (CCW winding)
      const base = vertexIndex;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      vertexIndex += 4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  dispose(): void {
    this.geometry?.dispose();
  }
}
