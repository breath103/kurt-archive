import type * as THREE from "three";

export function GeometryPreview({ value }: { value: THREE.BufferGeometry }) {
  const vertCount = value.getAttribute("position").count;

  return (
    <div className="rounded-sm bg-gray-700 p-1 text-xs">
      {vertCount} vertices
    </div>
  );
}
