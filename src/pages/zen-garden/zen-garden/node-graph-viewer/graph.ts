import type { ReactiveNode } from "../nodes/node";
import { isReactiveNode } from "../nodes/node";

export type NodeInfo = {
  id: string;
  name: string;
  node: ReactiveNode<Record<string, unknown>, unknown>;
  inputs: Map<string, NodeInfo | null>; // null means non-ReactiveNode input
  depth: number;
};

export function buildGraph(
  sinkNodes: ReactiveNode<Record<string, unknown>, unknown>[],
): Map<string, NodeInfo> {
  const visited = new Map<ReactiveNode<Record<string, unknown>, unknown>, NodeInfo>();
  let idCounter = 0;

  // First pass: build graph structure
  function traverse(node: ReactiveNode<Record<string, unknown>, unknown>): NodeInfo {
    if (visited.has(node)) {
      return visited.get(node)!;
    }

    const info: NodeInfo = {
      id: `node-${idCounter++}`,
      name: node.constructor.name,
      node,
      inputs: new Map(),
      depth: 0,
    };
    visited.set(node, info);

    Array.from(node.debugInputs.entries()).forEach(([inputName, inputObs]) => {
      if (isReactiveNode(inputObs)) {
        info.inputs.set(inputName, traverse(inputObs));
      } else {
        info.inputs.set(inputName, null);
      }
    });

    return info;
  }

  for (const sink of sinkNodes) {
    traverse(sink);
  }

  // Second pass: compute depths (max distance to any sink)
  function computeDepth(info: NodeInfo, depth: number): void {
    if (depth > info.depth) {
      info.depth = depth;
    }
    info.inputs.forEach(inputInfo => {
      if (inputInfo) computeDepth(inputInfo, info.depth + 1);
    });
  }

  for (const sink of sinkNodes) {
    const info = visited.get(sink);
    if (info) computeDepth(info, 0);
  }

  return new Map(Array.from(visited.values()).map(n => [n.id, n]));
}
