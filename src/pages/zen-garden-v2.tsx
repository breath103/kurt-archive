import type { NextPage } from "next";
import { useEffect, useState } from "react";
import type { Observable } from "rxjs";

import { ZenGardenEditor } from "@/zen-garden-v2/editor";
import { ZenGardenMoss } from "@/zen-garden-v2/moss";
import { ZenGardenRock } from "@/zen-garden-v2/rock";
import { Vector2 } from "@/zen-garden-v2/vector2";

const ZenGardenV2Page: NextPage = () => {
  const [editor, setEditor] = useState<ZenGardenEditor | null>(null);

  useEffect(() => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const ed = new ZenGardenEditor(canvas, {
      plain: { size: { x: 10, y: 5 } },
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
    setEditor(ed);

    return () => ed.dispose();
  }, []);

  return (
    <>
      <canvas id="canvas" className="w-full h-full" />
      {editor && (
        <>
          <PlainSizePanel editor={editor} />
          <ObjectPanel editor={editor} />
          <AddPanel editor={editor} />
        </>
      )}
    </>
  );
};

export default ZenGardenV2Page;

function PlainSizePanel({ editor }: { editor: ZenGardenEditor }) {
  const updateSize = (axis: "x" | "y", value: number) => {
    const current = editor.scene.plain.size;
    editor.scene.plain.size = new Vector2({
      x: axis === "x" ? value : current.x,
      y: axis === "y" ? value : current.y,
    });
  };

  const size = editor.scene.plain.size;

  return (
    <div className="fixed left-4 top-4 bg-white text-black p-4 rounded-lg space-y-2">
      <h3 className="font-bold">Plain Size</h3>
      <label className="block">
        Width:
        <input
          type="number"
          defaultValue={size.x}
          onChange={(e) => updateSize("x", Number(e.target.value))}
          className="ml-2 w-20 px-2 py-1 bg-white/20 rounded"
        />
      </label>
      <label className="block">
        Height:
        <input
          type="number"
          defaultValue={size.y}
          onChange={(e) => updateSize("y", Number(e.target.value))}
          className="ml-2 w-20 px-2 py-1 bg-white/20 rounded"
        />
      </label>
    </div>
  );
}

function ObjectPanel({ editor }: { editor: ZenGardenEditor }) {
  const selected = useObservable(editor.$selectedObject);

  if (!selected) return null;

  const onDelete = () => editor.deleteObject(selected.id);

  return (
    <div className="fixed right-4 top-4 bg-white text-black p-4 rounded-lg space-y-2">
      {selected instanceof ZenGardenRock && <RockPanel rock={selected} />}
      {selected instanceof ZenGardenMoss && <MossPanel moss={selected} />}
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
