import type * as THREE from "three";

export function GeometryPreview({ value }: { value: THREE.BufferGeometry }) {
  const posAttr = value.getAttribute("position");
  const vertCount = posAttr ? posAttr.count : 0; // eslint-disable-line @typescript-eslint/no-unnecessary-condition

  return (
    <div className="rounded-sm bg-gray-700 p-1 text-xs">
      {vertCount} vertices
    </div>
  );
}
