import * as THREE from "three";

import type { ReactiveNodeContext, ReactiveNodeInputs } from "./node";
import { ReactiveNode } from "./node";
import type { TextureSetData } from "./texture-set-node";

type PlainMaterialNodeInputs = {
  textureData: TextureSetData;
  displacement: THREE.Texture;
  normal: THREE.Texture;
};

export class PlainMaterialNode extends ReactiveNode<PlainMaterialNodeInputs, THREE.MeshStandardMaterial> {
  private material = new THREE.MeshStandardMaterial({
    displacementScale: 0.10,
    // displacementBias: -0.1,
  });

  constructor(
    context: ReactiveNodeContext,
    inputs: ReactiveNodeInputs<PlainMaterialNodeInputs>,
  ) {
    super(context, inputs);
  }

  protected process(_context: ReactiveNodeContext, { textureData, displacement, normal }: PlainMaterialNodeInputs): THREE.MeshStandardMaterial {
    this.material.map = textureData.color;
    this.material.normalMap = normal;
    this.material.aoMap = textureData.ao;
    this.material.roughnessMap = textureData.roughness;
    this.material.displacementMap = displacement;

    // Debug feature
    // this.material.wireframe = true;
    // this.material.wireframeLinecap = true

    return this.material;
  }

  dispose(): void {
    this.material.dispose();
  }
}
