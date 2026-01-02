import type { NodeInfo } from "./Graph";

export type Position = { x: number; y: number };

const NODE_SPACING_X = 400;
const NODE_SPACING_Y = 500;
const PADDING = 50;

export function computeLayout(graph: Map<string, NodeInfo>): Map<string, Position> {
  const outputs = buildOutputMap(graph);
  const nodesByDepth = groupByDepth(graph);
  const maxDepth = Math.max(0, ...Array.from(nodesByDepth.keys()));

  const positions = new Map<string, Position>();

  for (let depth = 0; depth <= maxDepth; depth++) {
    const nodes = nodesByDepth.get(depth) ?? [];
    const withIdealY = nodes.map((node, i) => ({
      node,
      y: computeIdealY(node.id, i, outputs, positions),
    }));

    withIdealY.sort((a, b) => a.y - b.y);

    withIdealY.forEach((item, i) => {
      const prevY = i === 0 ? PADDING : positions.get(withIdealY[i - 1].node.id)!.y + NODE_SPACING_Y;
      positions.set(item.node.id, {
        x: (maxDepth - depth) * NODE_SPACING_X + PADDING,
        y: Math.max(item.y, prevY),
      });
    });
  }

  return positions;
}

function buildOutputMap(graph: Map<string, NodeInfo>): Map<string, string[]> {
  const outputs = new Map<string, string[]>();
  graph.forEach(info => {
    info.inputs.forEach(inputInfo => {
      if (!inputInfo) return;
      const list = outputs.get(inputInfo.id) ?? [];
      list.push(info.id);
      outputs.set(inputInfo.id, list);
    });
  });
  return outputs;
}

function groupByDepth(graph: Map<string, NodeInfo>): Map<number, NodeInfo[]> {
  const byDepth = new Map<number, NodeInfo[]>();
  graph.forEach(node => {
    const list = byDepth.get(node.depth) ?? [];
    list.push(node);
    byDepth.set(node.depth, list);
  });
  return byDepth;
}

function computeIdealY(
  nodeId: string,
  index: number,
  outputs: Map<string, string[]>,
  positions: Map<string, Position>,
): number {
  const outputIds = outputs.get(nodeId) ?? [];
  if (outputIds.length === 0) {
    return index * NODE_SPACING_Y + PADDING;
  }
  return outputIds.reduce((sum, id) => sum + (positions.get(id)?.y ?? 0), 0) / outputIds.length;
}

export function computeLines(
  graph: Map<string, NodeInfo>,
  positions: Map<string, Position>,
  nodeRefs: Map<string, HTMLDivElement>,
): { from: Position; to: Position }[] {
  const lines: { from: Position; to: Position }[] = [];

  graph.forEach(info => {
    const toPos = positions.get(info.id);
    const toEl = nodeRefs.get(info.id);
    if (!toPos || !toEl) return;

    info.inputs.forEach(inputInfo => {
      if (!inputInfo) return;
      const fromPos = positions.get(inputInfo.id);
      const fromEl = nodeRefs.get(inputInfo.id);
      if (!fromPos || !fromEl) return;

      lines.push({
        from: { x: fromPos.x + fromEl.offsetWidth, y: fromPos.y + 25 },
        to: { x: toPos.x, y: toPos.y + 38 },
      });
    });
  });

  return lines;
}
