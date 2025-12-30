import type { NextPage } from "next";
import { useEffect, useState } from "react";

import type {
  EditorMode,
  GroundTextureName,
  RockWaveSettings,
  ZenGardenObject,
  ZenGardenRock,
} from "@/zen-garden";
import { DEFAULT_ROCK_WAVE_SETTINGS, ZenGardenEditor } from "@/zen-garden";

function useZenGardenEditor(canvas: HTMLCanvasElement | null) {
  const [editor, setEditor] = useState<ZenGardenEditor | null>(null);
  const [state, setState] = useState({
    selectedObjectId: null as string | null,
    textureName: "gravel" as GroundTextureName,
    ambientIntensity: 0.4,
    sunIntensity: 0.8,
    objects: [] as ZenGardenObject[],
    mode: "normal" as EditorMode,
  });

  useEffect(() => {
    if (!canvas) return;
    const ed = new ZenGardenEditor(canvas);
    setEditor(ed);
    return () => ed.dispose();
  }, [canvas]);

  useEffect(() => {
    if (!editor) return;

    const subs = [
      editor.$selectedObjectId.subscribe((v) =>
        setState((s) => ({ ...s, selectedObjectId: v }))
      ),
      editor.$groundTextureName.subscribe((v) =>
        setState((s) => ({ ...s, textureName: v }))
      ),
      editor.$ambientIntensity.subscribe((v) =>
        setState((s) => ({ ...s, ambientIntensity: v }))
      ),
      editor.$sunIntensity.subscribe((v) =>
        setState((s) => ({ ...s, sunIntensity: v }))
      ),
      editor.$objects.subscribe((v) => setState((s) => ({ ...s, objects: v }))),
      editor.$mode.subscribe((v) => setState((s) => ({ ...s, mode: v }))),
    ];

    return () => subs.forEach((s) => s.unsubscribe());
  }, [editor]);

  if (!editor) return null;

  return {
    editor,
    ...state,
    selectedObject: state.selectedObjectId
      ? editor.getObject(state.selectedObjectId)
      : null,
  };
}

interface RockEditorProps {
  rock: ZenGardenRock;
  onUpdate: (settings: RockWaveSettings) => void;
  onDelete: () => void;
  onClose: () => void;
}

function RockEditor({ rock, onUpdate, onDelete, onClose }: RockEditorProps) {
  const settings = rock.waveSettings ?? DEFAULT_ROCK_WAVE_SETTINGS;

  return (
    <div className="absolute right-4 top-4 w-64 rounded-lg bg-white/90 p-4 shadow-lg backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Rock Settings</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600">
            Radius: {settings.radius.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={settings.radius}
            onChange={(e) =>
              onUpdate({ ...settings, radius: parseFloat(e.target.value) })
            }
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">
            Wave Count: {settings.waveCount}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={settings.waveCount}
            onChange={(e) =>
              onUpdate({ ...settings, waveCount: parseInt(e.target.value) })
            }
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">
            Wave Spacing: {settings.waveSpacing.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.1"
            max="0.8"
            step="0.01"
            value={settings.waveSpacing}
            onChange={(e) =>
              onUpdate({ ...settings, waveSpacing: parseFloat(e.target.value) })
            }
            className="w-full"
          />
        </div>

        <button
          onClick={onDelete}
          className="w-full rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
        >
          Delete Rock
        </button>
      </div>
    </div>
  );
}

interface SettingsPanelProps {
  textureName: GroundTextureName;
  ambientIntensity: number;
  sunIntensity: number;
  mode: EditorMode;
  onTextureChange: (name: GroundTextureName) => void;
  onAmbientChange: (value: number) => void;
  onSunChange: (value: number) => void;
  onCreateMoss: () => void;
}

function SettingsPanel({
  textureName,
  ambientIntensity,
  sunIntensity,
  mode,
  onTextureChange,
  onAmbientChange,
  onSunChange,
  onCreateMoss,
}: SettingsPanelProps) {
  return (
    <div className="absolute left-4 top-4 w-56 rounded-lg bg-white/90 p-3 shadow-lg backdrop-blur">
      <h3 className="mb-3 font-semibold text-gray-800">Settings</h3>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-gray-600">
            Ground Texture
          </label>
          <select
            value={textureName}
            onChange={(e) => onTextureChange(e.target.value as GroundTextureName)}
            className="block w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-black shadow-sm"
          >
            <option value="gravel">Gravel</option>
            <option value="grass">Grass</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600">
            Ambient: {ambientIntensity.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={ambientIntensity}
            onChange={(e) => onAmbientChange(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600">
            Sun: {sunIntensity.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={sunIntensity}
            onChange={(e) => onSunChange(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <button
          onClick={onCreateMoss}
          className={`w-full rounded px-3 py-2 text-sm font-medium ${
            mode === "createMoss"
              ? "bg-green-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {mode === "createMoss" ? "Click garden to place moss" : "Create Moss"}
        </button>
      </div>
    </div>
  );
}

const ZenGardenPage: NextPage = () => {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const ctx = useZenGardenEditor(canvas);

  return (
    <div className="relative h-screen w-screen">
      <canvas ref={setCanvas} className="w-full h-full" />

      {ctx && (
        <>
          <SettingsPanel
            textureName={ctx.textureName}
            ambientIntensity={ctx.ambientIntensity}
            sunIntensity={ctx.sunIntensity}
            mode={ctx.mode}
            onTextureChange={(name) => ctx.editor.setGroundTexture(name)}
            onAmbientChange={(value) => ctx.editor.setAmbientIntensity(value)}
            onSunChange={(value) => ctx.editor.setSunIntensity(value)}
            onCreateMoss={() => ctx.editor.setMode("createMoss")}
          />

          {ctx.selectedObject?.type === "rock" && (
            <RockEditor
              rock={ctx.selectedObject}
              onUpdate={(settings) =>
                ctx.editor.updateRockSettings(ctx.selectedObject!.id, settings)
              }
              onDelete={() => ctx.editor.deleteRock(ctx.selectedObject!.id)}
              onClose={() => ctx.editor.$selectedObjectId.next(null)}
            />
          )}

          {ctx.selectedObject?.type === "moss" && (
            <div className="absolute right-4 top-4 w-64 rounded-lg bg-white/90 p-4 shadow-lg backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Moss Settings</h3>
                <button
                  onClick={() => ctx.editor.$selectedObjectId.next(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Drag points to reshape the moss.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ZenGardenPage;
