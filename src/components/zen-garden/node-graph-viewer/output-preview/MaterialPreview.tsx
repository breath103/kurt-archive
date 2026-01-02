import type * as THREE from "three";

export function MaterialPreview({ value }: { value: THREE.Material }) {
  return (
    <div className="text-xs bg-gray-700 p-1 rounded">
      {value.type}
    </div>
  );
}
