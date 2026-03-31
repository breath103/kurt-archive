import type { Observable } from "rxjs";
import * as THREE from "three";

import { TextureSetData } from "../../nodes/TextureSetNode";
import { ValueNode } from "../../nodes/ValueNode";
import { DefaultPreview } from "./DefaultPreview";
import { GeometryPreview } from "./GeometryPreview";
import { MaterialPreview } from "./MaterialPreview";
import { TexturePreview } from "./TexturePreview";
import { TextureSetPreview } from "./TextureSetPreview";
import { ValueNodePreview } from "./ValueNodePreview";

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
