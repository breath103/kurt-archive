import * as THREE from "three";

import { TextureSetData } from "../../nodes/texture-set-node";
import { DefaultPreview } from "./default-preview";
import { GeometryPreview } from "./geometry-preview";
import { MaterialPreview } from "./material-preview";
import { TexturePreview } from "./texture-preview";
import { TextureSetPreview } from "./texture-set-preview";

export type OutputPreviewProps = {
  value: unknown;
  renderer: THREE.WebGLRenderer;
};

export function OutputPreview({ value, renderer }: OutputPreviewProps) {
  if (value instanceof TextureSetData) {
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
