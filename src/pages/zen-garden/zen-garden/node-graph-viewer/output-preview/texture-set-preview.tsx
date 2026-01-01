import type * as THREE from "three";

import type { TextureSetData } from "../../nodes/texture-set-node";
import { TexturePreview } from "./texture-preview";

type Props = {
  value: TextureSetData;
  renderer: THREE.WebGLRenderer;
};

const KEYS = ["ao", "color", "displacement", "normal", "roughness"] as const;

export function TextureSetPreview({ value, renderer }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {KEYS.slice(0, 1).map(key => (
        <div key={key} className="flex flex-col gap-2">
          <span className="text-xs text-gray-400">{key}</span>
          <TexturePreview value={value[key]} renderer={renderer} />
        </div>
      ))}
    </div>
  );
}
