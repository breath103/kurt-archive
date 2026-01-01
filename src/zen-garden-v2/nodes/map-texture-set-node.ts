import type * as THREE from "three";

import type { ReactiveNodeContext, ReactiveNodeInputs } from "../utils/reactive-node";
import { ReactiveNode } from "../utils/reactive-node";
import type { Vector2 } from "../vector2";
import type { TextureSetData } from "./texture-set-node";

type MapTextureSetNodeInputs = {
  textureData: TextureSetData;
  repeat?: Vector2;
  wrapS?: THREE.Wrapping;
  wrapT?: THREE.Wrapping;
};

export class MapTextureSetNode extends ReactiveNode<MapTextureSetNodeInputs, TextureSetData> {
  constructor(
    context: ReactiveNodeContext,
    inputs: ReactiveNodeInputs<MapTextureSetNodeInputs>,
  ) {
    super(context, inputs);
  }

  protected process(_context: ReactiveNodeContext, { textureData, repeat, wrapS, wrapT }: MapTextureSetNodeInputs): TextureSetData {
    Object.values(textureData).forEach((texture) => {
      if (repeat) texture.repeat.set(repeat.x, repeat.y);
      if (wrapS !== undefined) texture.wrapS = wrapS;
      if (wrapT !== undefined) texture.wrapT = wrapT;
    });
    return textureData;
  }

  dispose(): void {}
}
