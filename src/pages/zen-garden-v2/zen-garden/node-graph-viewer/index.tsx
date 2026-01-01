import { useCallback, useEffect, useRef, useState } from "react";
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

export function NodeGraphViewer({ sinkNodes, renderer, onClose }: NodeGraphViewerProps) {
  const [graph, setGraph] = useState<Map<string, NodeInfo>>(new Map());
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());
  const [dragging, setDragging] = useState<{ id: string; offset: Position } | null>(null);
  const [, forceUpdate] = useState(0);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const g = buildGraph(sinkNodes);
    setGraph(g);
    setPositions(computeLayout(g));
  }, [sinkNodes]);

  useEffect(() => {
    if (graph.size > 0) {
      requestAnimationFrame(() => forceUpdate(n => n + 1));
    }
  }, [graph]);

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

  const handleMouseUp = useCallback(() => setDragging(null), []);

  const setNodeRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      nodeRefs.current.set(id, el);
    } else {
      nodeRefs.current.delete(id);
    }
  }, []);

  const lines = computeLines(graph, positions, nodeRefs.current);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 bg-gray-900">
        <h2 className="text-xl font-bold text-white">Node Graph</h2>
        <button onClick={onClose} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-white">
          Close
        </button>
      </div>
      <div
        className="flex-1 relative overflow-hidden bg-gray-950"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
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
  );
}
