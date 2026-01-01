import * as THREE from "three";

import type { ReactiveNodeContext } from "./node";
import { ReactiveNode } from "./node";

export class TextureSetData {
  constructor(
    readonly ao: THREE.Texture,
    readonly color: THREE.Texture,
    readonly displacement: THREE.Texture,
    readonly normal: THREE.Texture,
    readonly roughness: THREE.Texture,
  ) {}
}

type TextureSetNodeInputs = { name: string };

export class TextureSetNode extends ReactiveNode<TextureSetNodeInputs, TextureSetData> {
  protected async process(_context: ReactiveNodeContext, { name }: TextureSetNodeInputs): Promise<TextureSetData> {
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

    return new TextureSetData(ao, color, displacement, normal, roughness);
  }

  dispose(): void {}
}
