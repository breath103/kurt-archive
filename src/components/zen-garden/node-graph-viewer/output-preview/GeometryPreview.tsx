import type * as THREE from "three";

export function GeometryPreview({ value }: { value: THREE.BufferGeometry }) {
  const posAttr = value.getAttribute("position");
  const vertCount = posAttr ? posAttr.count : 0;

  return (
    <div className="text-xs bg-gray-700 p-1 rounded">
      {vertCount} vertices
    </div>
  );
}
