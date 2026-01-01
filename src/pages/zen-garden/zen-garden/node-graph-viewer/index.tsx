import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type * as THREE from "three";

import type { ReactiveNode } from "../nodes/node";
import type { NodeInfo } from "./graph";
import { buildGraph } from "./graph";
import type { Position } from "./layout";
import { computeLayout, computeLines } from "./layout";
import { NodeCard } from "./node-card";

export type NodeGraphViewerProps = {
  sinkNodes: ReactiveNode<Record<string, unknown>, unknown>[];
  renderer: THREE.WebGLRenderer;
  onClose: () => void;
};

type Line = { from: Position; to: Position };

function loadCachedPositions(): Map<string, Position> {
  try {
    const json = localStorage.getItem("node-graph-positions");
    if (!json) return new Map();
    const obj = JSON.parse(json) as Record<string, Position>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

function savePositions(graph: Map<string, NodeInfo>, positions: Map<string, Position>) {
  const byName: Record<string, Position> = {};
  graph.forEach((info, id) => {
    const pos = positions.get(id);
    if (pos) byName[info.name] = pos;
  });
  localStorage.setItem("node-graph-positions", JSON.stringify(byName));
}

export function NodeGraphViewer({ sinkNodes, renderer, onClose }: NodeGraphViewerProps) {
  const [graph, setGraph] = useState<Map<string, NodeInfo>>(new Map());
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());
  const [dragging, setDragging] = useState<{ id: string; offset: Position } | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const g = buildGraph(sinkNodes);
    setGraph(g);

    const generated = computeLayout(g);
    const cached = loadCachedPositions();

    // Use cached positions, fall back to generated for new nodes
    const merged = new Map<string, Position>();
    g.forEach((info, id) => {
      const cachedPos = cached.get(info.name);
      merged.set(id, cachedPos ?? generated.get(id)!);
    });

    setPositions(merged);
  }, [sinkNodes]);

  useLayoutEffect(() => {
    setLines(computeLines(graph, positions, nodeRefs.current));
  }, [graph, positions]);

  const contentSize = useMemo(() => {
    let maxX = 0, maxY = 0;
    positions.forEach(pos => {
      maxX = Math.max(maxX, pos.x + 200);
      maxY = Math.max(maxY, pos.y + 300);
    });
    return { width: maxX + 50, height: maxY + 50 };
  }, [positions]);

  const handleMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    const pos = positions.get(id);
    if (!pos) return;
    setDragging({ id, offset: { x: e.clientX - pos.x, y: e.clientY - pos.y } });
  }, [positions]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPositions(prev => {
      const next = new Map(prev);
      next.set(dragging.id, { x: e.clientX - dragging.offset.x, y: e.clientY - dragging.offset.y });
      return next;
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    if (dragging) savePositions(graph, positions);
    setDragging(null);
  }, [dragging, graph, positions]);

  const setNodeRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      nodeRefs.current.set(id, el);
    } else {
      nodeRefs.current.delete(id);
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 bg-gray-900">
        <h2 className="text-xl font-bold text-white">Node Graph</h2>
        <button onClick={onClose} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white">
          Close
        </button>
      </div>
      <div
        className="flex-1 overflow-auto bg-gray-950"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="relative" style={{ width: contentSize.width, height: contentSize.height }}>
          <svg
            className="absolute inset-0 pointer-events-none"
            width={contentSize.width}
            height={contentSize.height}
          >
            <style>{`
              @keyframes dash-flow {
                to { stroke-dashoffset: -20; }
              }
              .flow-line {
                animation: dash-flow 0.5s linear infinite;
              }
            `}</style>
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#4B5563" />
              </marker>
            </defs>
            {lines.map((line, i) => (
              <path
                key={i}
                className="flow-line"
                d={`M ${line.from.x} ${line.from.y} C ${line.from.x + 60} ${line.from.y}, ${line.to.x - 60} ${line.to.y}, ${line.to.x} ${line.to.y}`}
                stroke="#4B5563"
                strokeWidth={2}
                strokeDasharray="10 10"
                fill="none"
                markerEnd="url(#arrowhead)"
              />
            ))}
          </svg>
          {Array.from(graph.values()).map(info => {
            const pos = positions.get(info.id);
            if (!pos) return null;
            return (
              <div
                key={info.id}
                ref={el => setNodeRef(info.id, el)}
                className="absolute cursor-move"
                style={{ left: pos.x, top: pos.y }}
                onMouseDown={e => handleMouseDown(e, info.id)}
              >
                <NodeCard info={info} renderer={renderer} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
