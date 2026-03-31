import type * as THREE from "three";

export function MaterialPreview({ value }: { value: THREE.Material }) {
  return (
    <div className="rounded-sm bg-gray-700 p-1 text-xs">
      {value.type}
    </div>
  );
}
