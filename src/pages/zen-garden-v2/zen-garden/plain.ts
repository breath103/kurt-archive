import * as THREE from "three";

import type { Codable } from "./codable";
import type { ZenGardenRakeStroke } from "./rake-stroke";
import type { Vector2Encoded } from "./vector2";
import { Vector2 } from "./vector2";
import type { Observable } from "rxjs";
import { BehaviorSubject, combineLatest, map, merge, of, shareReplay, startWith, switchMap } from "rxjs";
import { Subscriptions } from "./utils/subscriptions";
import type { ReactiveNodeContext } from "./nodes/node";
import { TextureSetNode } from "./nodes/texture-set-node";
import { MapTextureSetNode } from "./nodes/map-texture-set-node";
import { PlainDisplacementNode } from "./nodes/plain-displacement-node";
import { PlainNormalNode } from "./nodes/plain-normal-node";
import { PlainMaterialNode } from "./nodes/plain-material-node";
import { StaticPlainGeometryNode } from "./nodes/static-plain-geometry-node";
import { PipeNode } from "./nodes/pipe-node";
// TODO: Fix stitching for AdaptivePlaneGeometryNode then switch back
// import { AdaptivePlaneGeometryNode } from "./nodes/adaptive-plane-geometry-node";

export type ZenGardenPlainEncoded = {
  size: Vector2Encoded;
  textureName: "gravel";
};

export class ZenGardenPlain implements Codable<ZenGardenPlainEncoded>, Disposable {
  readonly object: THREE.Mesh;
  readonly $size: BehaviorSubject<Vector2>;
  readonly $textureName: BehaviorSubject<ZenGardenPlainEncoded["textureName"]>;

  private subscriptions = new Subscriptions();
  // Exposed for debugging
  readonly materialNode: PlainMaterialNode;
  readonly geometryNode: StaticPlainGeometryNode;

  constructor(
    encoded: ZenGardenPlainEncoded,
    $rakes: Observable<ZenGardenRakeStroke[]>,
    renderer: THREE.WebGLRenderer,
  ) {
    const context: ReactiveNodeContext = { textureRenderer: renderer };

    this.$size = new BehaviorSubject(new Vector2(encoded.size));
    this.$textureName = new BehaviorSubject(encoded.textureName);
    const $tileSize = new BehaviorSubject(3);

    // Calculate texture repeat
    const $textureRepeat = combineLatest([this.$size, $tileSize]).pipe(
      map(([plainSize, tileSize]) => plainSize.clone().divideScalar(tileSize)),
      shareReplay(1),
    );

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

    const mappedTextureNode = new MapTextureSetNode(context, {
      textureData: textureSetNode,
      repeat: $textureRepeat,
      wrapS: of(THREE.RepeatWrapping),
      wrapT: of(THREE.RepeatWrapping),
    });

    const baseDisplacementNode = new PipeNode(context, textureSetNode, t => t.displacement);

    const displacementNode = new PlainDisplacementNode(context, {
      baseMap: baseDisplacementNode,
      textureRepeat: $textureRepeat,
      plainSize: this.$size,
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
      size: this.$size,
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
      size: this.$size.value.serialize(),
      textureName: this.$textureName.value,
    };
  }
}
