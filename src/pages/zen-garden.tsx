import type { NextPage } from "next";
import { useEffect, useState } from "react";
import type { Observable } from "rxjs";

import { ZenGardenEditor } from "@/components/zen-garden/Editor";
import { ZenGardenMoss } from "@/components/zen-garden/Moss";
import { NodeGraphViewer } from "@/components/zen-garden/node-graph-viewer";
import { ZenGardenRakeStroke } from "@/components/zen-garden/RakeStroke";
import { ZenGardenRock } from "@/components/zen-garden/Rock";

const ZenGardenV2Page: NextPage = () => {
  const [editor, setEditor] = useState<ZenGardenEditor | null>(null);
  const [showNodeGraph, setShowNodeGraph] = useState(false);

  useEffect(() => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const ed = new ZenGardenEditor(canvas, {
      plain: { 
        size: { x: 10, y: 5 },
        textureName: "gravel",
      },
      objects: [
        { id: "rock1", type: "rock", position: { x: -1, y: 0 } },
        { id: "rock2", type: "rock", position: { x: 1, y: 1 } },
        { id: "moss1", type: "moss", position: { x: 0, y: 0 }, polygonPath: [
          { x: -2, y: -2 },
          { x: -1, y: -2 },
          { x: -1, y: -1 },
          { x: -2, y: -1 },
        ]},
        { id: "rake1", type: "rakeStroke", path: { type: "circle", center: { x: 2, y: 0 }, radius: 1 }, width: 0.5, numberOfForks: 3, forkDepth: 0.1 },
        { id: "rake2", type: "rakeStroke", path: { type: "points", points: [{ x: -3, y: -1 }, { x: -2, y: 0 }, { x: -3, y: 1 }], closed: false }, width: 0.5, numberOfForks: 3, forkDepth: 0.1 },
      ],
    });
    setEditor(ed);

    return () => ed.dispose();
  }, []);

  return (
    <>
      <canvas id="canvas" className="w-full h-full" />
      {editor && (
        <>
          {/* <PlainSizePanel editor={editor} /> */}
          <ObjectPanel editor={editor} />
          <AddPanel editor={editor} />
          <button
            onClick={() => setShowNodeGraph(true)}
            className="fixed left-4 bottom-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Node Graph
          </button>
          {showNodeGraph && (
            <NodeGraphViewer
              sinkNodes={[
                editor.scene.plain.materialNode,
                editor.scene.plain.geometryNode,
              ]}
              renderer={editor.threeRenderer}
              onClose={() => setShowNodeGraph(false)}
            />
          )}
        </>
      )}
    </>
  );
};

export default ZenGardenV2Page;

function ObjectPanel({ editor }: { editor: ZenGardenEditor }) {
  const selected = useObservable(editor.$selectedObject);

  if (!selected) return null;

  const onDelete = () => editor.deleteObject(selected.id);

  return (
    <div className="fixed right-4 top-4 bg-white text-black p-4 rounded-lg space-y-2">
      {(() => {
        if (selected instanceof ZenGardenRock) {
          return <RockPanel rock={selected} />;
        } else if (selected instanceof ZenGardenMoss) {
          return <MossPanel moss={selected} />;
        } else if (selected instanceof ZenGardenRakeStroke) {
          return <RakeStrokePanel rakeStroke={selected} />;
        } else {
          throw new Error("not implemented yet")
        }
      })()}
      <button
        onClick={onDelete}
        className="w-full px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Delete
      </button>
    </div>
  );
}

function RockPanel({ rock }: { rock: ZenGardenRock }) {
  return (
    <>
      <h3 className="font-bold">Rock</h3>
      <p>ID: {rock.id}</p>
    </>
  );
}

function MossPanel({ moss }: { moss: ZenGardenMoss }) {
  return (
    <>
      <h3 className="font-bold">Moss</h3>
      <p>ID: {moss.id}</p>
    </>
  );
}

function RakeStrokePanel({ rakeStroke }: { rakeStroke: ZenGardenRakeStroke }) {
  return (
    <>
      <h3 className="font-bold">Rake Stroke</h3>
      <p>ID: {rakeStroke.id}</p>
      <label className="block">
        Width:
        <input
          type="number"
          step="0.1"
          defaultValue={rakeStroke.width}
          onChange={(e) => { rakeStroke.width = Number(e.target.value); }}
          className="ml-2 w-20 px-2 py-1 bg-white/20 rounded"
        />
      </label>
    </>
  );
}

function AddPanel({ editor }: { editor: ZenGardenEditor }) {
  const mode = useObservable(editor.$mode);

  if (mode) {
    return (
      <div className="fixed right-4 bottom-4 bg-white text-black p-4 rounded-lg">
        <button
          onClick={() => editor.setMode(null)}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="fixed right-4 bottom-4 bg-white text-black p-4 rounded-lg space-x-2">
      <button
        onClick={() => editor.setMode("addRock")}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Add Rock
      </button>
      <button
        onClick={() => editor.setMode("addMoss")}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Add Moss
      </button>
    </div>
  );
}

function useObservable<T>(observable: Observable<T>): T | null {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    const sub = observable.subscribe(setValue);
    return () => sub.unsubscribe();
  }, [observable]);
  return value;
}
