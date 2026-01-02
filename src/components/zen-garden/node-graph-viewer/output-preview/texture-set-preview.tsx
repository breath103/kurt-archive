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
    <div className="grid" style={{
      gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(KEYS.length))}, minmax(0, 1fr))`
    }}>
      {KEYS.map(key => (
        // <div key={key} className="flex flex-col gap-2">
        //   <span className="text-xs text-gray-400">{key}</span>
        // </div>
        <TexturePreview value={value[key]} renderer={renderer} />       
      ))}
    </div>
  );
}