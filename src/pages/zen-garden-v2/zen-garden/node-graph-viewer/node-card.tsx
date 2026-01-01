import { useEffect, useState } from "react";
import type * as THREE from "three";

import type { NodeInfo } from "./graph";
import { OutputPreview } from "./output-preview";

export type NodeCardProps = {
  info: NodeInfo;
  renderer: THREE.WebGLRenderer;
};

export function NodeCard({ info, renderer }: NodeCardProps) {
  const [output, setOutput] = useState<unknown>(null);

  useEffect(() => {
    const sub = info.node.subscribe(setOutput);
    return () => sub.unsubscribe();
  }, [info.node]);

  const inputNodes = Array.from(info.inputs.entries()).filter(([, v]) => v !== null) as [string, NodeInfo][];

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 min-w-[140px]">
      <div className="font-bold text-sm mb-2 text-blue-300">{info.name}</div>
      <div className="mb-2">
        <OutputPreview value={output} renderer={renderer} />
      </div>
      {inputNodes.length > 0 && (
        <div className="text-xs text-gray-400">
          ← {inputNodes.map(([name]) => name).join(", ")}
        </div>
      )}
    </div>
  );
}
