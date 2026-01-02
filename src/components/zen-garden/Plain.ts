import type { Observable } from "rxjs";
import { BehaviorSubject, map, merge, of, startWith, switchMap } from "rxjs";
import * as THREE from "three";
import z from "zod";

import type { Codable } from "./utils/Codable";
import type { ReactiveNodeContext } from "./nodes/Node";
import { MapNode, PipeNode } from "./nodes/PipeNode";
import { PlainDisplacementNode } from "./nodes/PlainDisplacementNode";
import { PlainMaterialNode } from "./nodes/PlainMaterialNode";
import { PlainNormalNode } from "./nodes/PlainNormalNode";
import { StaticPlainGeometryNode } from "./nodes/StaticPlainGeometryNode";
import { TextureSetNode } from "./nodes/TextureSetNode";
import { ValueNode } from "./nodes/ValueNode";
import type { ZenGardenRakeStroke } from "./RakeStroke";
import { Subscriptions } from "./utils/Subscriptions";
import type { Vector2Encoded } from "./Vector2";
import { Vector2 } from "./Vector2";
// TODO: Fix stitching for AdaptivePlaneGeometryNode then switch back
// import { AdaptivePlaneGeometryNode } from "./nodes/AdaptivePlaneGeometryNode";

export type ZenGardenPlainEncoded = {
  size: Vector2Encoded;
  textureName: "gravel";
};

export class ZenGardenPlain implements Codable<ZenGardenPlainEncoded>, Disposable {
  readonly object: THREE.Mesh;
  readonly $textureName: BehaviorSubject<ZenGardenPlainEncoded["textureName"]>;
  
  private subscriptions = new Subscriptions();
  // Exposed for debugging
  readonly materialNode: PlainMaterialNode;
  readonly geometryNode: StaticPlainGeometryNode;

  readonly $size: ValueNode<{ x: number, y: number }>;

  constructor(
    encoded: ZenGardenPlainEncoded,
    $rakes: Observable<ZenGardenRakeStroke[]>,
    renderer: THREE.WebGLRenderer,
  ) {
    const context: ReactiveNodeContext = { textureRenderer: renderer };

    this.$textureName = new BehaviorSubject(encoded.textureName);

    const $sizeRaw = new ValueNode("plainSize", z.object({ x: z.int(), y: z.int() }), encoded.size);
    const $size = new MapNode(context, { sizeRaw: $sizeRaw }, "plainSizeVector", ({ sizeRaw }) => new Vector2(sizeRaw));
    const $tileSize = new ValueNode("tileSize", z.int().min(1).max(10), 1);

    this.$size = $sizeRaw;

    // Calculate texture repeat
    const $textureRepeat = new MapNode(context, {
      size: $size,
      tileSize: $tileSize,
    }, "textureRepeat", ({ size, tileSize }) => {
      return size.clone().divideScalar(tileSize);
    });

    // Rakes that emits whenever any rake changes
    const $rakesChanged = $rakes.pipe(
      switchMap(rakes =>
        rakes.length === 0
          ? of(rakes)
          : merge(...rakes.map(r => r.$changed)).pipe(
            startWith(null),
            map(() => rakes),
          )
      ),
    );

    // Node graph
    const textureSetNode = new TextureSetNode(context, { name: this.$textureName });

    const mappedTextureNode = new MapNode(context, {
      textureSet: textureSetNode,
      repeat: $textureRepeat
    }, "TiledTextureSetNode", ({ textureSet, repeat }) => {
      for (const texture of textureSet) {
        texture.repeat.set(repeat.x, repeat.y);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
      }
      return textureSet;
    });

    const baseDisplacementNode = new PipeNode(context, textureSetNode, t => t.displacement);

    const displacementNode = new PlainDisplacementNode(context, {
      baseMap: baseDisplacementNode,
      textureRepeat: $textureRepeat,
      plainSize: $size,
      rakes: $rakesChanged,
    });

    const normalNode = new PlainNormalNode(context, {
      displacement: displacementNode,
      strength: of(1.0),
    });

    this.materialNode = new PlainMaterialNode(context, {
      textureData: mappedTextureNode,
      displacement: displacementNode,
      normal: normalNode,
    });

    this.geometryNode = new StaticPlainGeometryNode(context, {
      size: $size,
      segmentsPerUnit: of(64),
    });

    // Create mesh
    this.object = new THREE.Mesh();
    this.object.position.set(0, 0, 0);
    this.object.receiveShadow = true;

    // Geometry updates
    this.subscriptions.add(this.geometryNode.subscribe(geo => {
      this.object.geometry = geo;
    }));

    // Material updates
    this.subscriptions.add(this.materialNode.subscribe(mat => {
      this.object.material = mat;
    }));
  }

  [Symbol.dispose] = () => {
    this.subscriptions[Symbol.dispose]();
    this.materialNode.dispose();
    this.geometryNode.dispose();
  }

  serialize(): ZenGardenPlainEncoded {
    return {
      size: this.$size.value,
      textureName: this.$textureName.value,
    };
  }
}
