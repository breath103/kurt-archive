import type { NextPage } from "next";
import { useEffect, useRef } from "react";

import { ZenGardenEditor } from "@/zen-garden-v2/editor";

const ZenGardenV2Page: NextPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const editor = new ZenGardenEditor(canvas, {
      objects: [
        { id: "rock1", type: "rock", position: { x: -1, y: 0 } },
        { id: "rock2", type: "rock", position: { x: 1, y: 1 } },
        { id: "moss1", type: "moss", position: { x: 0, y: 0 }, polygonPath: [
          { x: -2, y: -2 },
          { x: -1, y: -2 },
          { x: -1, y: -1 },
          { x: -2, y: -1 },
        ]},
      ],
    });

    return () => editor.dispose();
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

export default ZenGardenV2Page;
