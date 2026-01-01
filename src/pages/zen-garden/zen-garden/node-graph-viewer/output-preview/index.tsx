import type { Observable } from "rxjs";
import * as THREE from "three";

import { TextureSetData } from "../../nodes/texture-set-node";
import { ValueNode } from "../../nodes/value-node";
import { DefaultPreview } from "./default-preview";
import { GeometryPreview } from "./geometry-preview";
import { MaterialPreview } from "./material-preview";
import { TexturePreview } from "./texture-preview";
import { TextureSetPreview } from "./texture-set-preview";
import { ValueNodePreview } from "./value-node-preview";

export type OutputPreviewProps = {
  value: unknown;
  node: Observable<unknown>;
  renderer: THREE.WebGLRenderer;
};

export function OutputPreview({ value, node, renderer }: OutputPreviewProps) {
  if (node instanceof ValueNode) {
    return <ValueNodePreview node={node} />;
  } else if (value instanceof TextureSetData) {
    return <TextureSetPreview value={value} renderer={renderer} />;
  } else if (value instanceof THREE.Texture) {
    return <TexturePreview value={value} renderer={renderer} />;
  } else if (value instanceof THREE.Material) {
    return <MaterialPreview value={value} />;
  } else if (value instanceof THREE.BufferGeometry) {
    return <GeometryPreview value={value} />;
  } else {
    return <DefaultPreview value={value} />;
  }
}
