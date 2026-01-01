import * as THREE from "three";

import type { ReactiveNodeContext } from "../utils/reactive-node";
import { ReactiveNode } from "../utils/reactive-node";

export interface TextureSetData {
  ao: THREE.Texture;
  color: THREE.Texture;
  displacement: THREE.Texture;
  normal: THREE.Texture;
  roughness: THREE.Texture;
}

type TextureSetNodeInputs = { name: string };

export class TextureSetNode extends ReactiveNode<TextureSetNodeInputs, TextureSetData> {
  protected async process(context: ReactiveNodeContext, { name }: TextureSetNodeInputs): Promise<TextureSetData> {
    const loader = new THREE.TextureLoader();
    const basePath = `/textures/${name}`;

    const load = (texName: string) => new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(`${basePath}/${texName}.jpg`, resolve, undefined, reject);
    });

    const [ao, color, displacement, normal, roughness] = await Promise.all([
      load("ao"),
      load("color"),
      load("displacement"),
      load("normal"),
      load("roughness"),
    ]);

    return { ao, color, displacement, normal, roughness };
  }

  dispose(): void {}
}
