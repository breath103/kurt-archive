import type { NextPage } from "next";
import { useEffect, useRef, useState } from "react";

import type {
  RockWaveSettings,
  TextureName,
  ZenGardenObject,
} from "@/zen-garden";
import { DEFAULT_ROCK_WAVE_SETTINGS, ZenGardenEditor } from "@/zen-garden";

function useObservable<T>(
  observable: {
    subscribe: (fn: (v: T) => void) => { unsubscribe: () => void };
  } | null,
  initial: T
): T {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (!observable) return;
    const sub = observable.subscribe(setValue);
    return () => sub.unsubscribe();
  }, [observable]);
  return value;
}

interface RockEditorProps {
  rock: ZenGardenObject;
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
  textureName: TextureName;
  ambientIntensity: number;
  sunIntensity: number;
  onTextureChange: (name: TextureName) => void;
  onAmbientChange: (value: number) => void;
  onSunChange: (value: number) => void;
}

function SettingsPanel({
  textureName,
  ambientIntensity,
  sunIntensity,
  onTextureChange,
  onAmbientChange,
  onSunChange,
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
            onChange={(e) => onTextureChange(e.target.value as TextureName)}
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
      </div>
    </div>
  );
}

const ZenGardenPage: NextPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [editor, setEditor] = useState<ZenGardenEditor | null>(null);

  // Initialize editor once canvas is ready
  useEffect(() => {
    if (!canvasRef.current) return;
    const ed = new ZenGardenEditor(canvasRef.current);
    setEditor(ed);
    return () => ed.dispose();
  }, []);

  // Subscribe to observables
  const selectedRockId = useObservable(editor?.$selectedRockId ?? null, null);
  const textureName = useObservable(
    editor?.$textureName ?? null,
    "gravel" as TextureName
  );
  const ambientIntensity = useObservable(
    editor?.$ambientIntensity ?? null,
    0.4
  );
  const sunIntensity = useObservable(editor?.$sunIntensity ?? null, 0.8);

  // Force re-render when rocks change (for getting updated rock data)
  useObservable(editor?.$rocks ?? null, []);

  const selectedRock = selectedRockId ? editor?.getRock(selectedRockId) : null;

  return (
    <div className="relative h-screen w-screen">
      <canvas ref={canvasRef} className="block" />

      {editor && (
        <SettingsPanel
          textureName={textureName}
          ambientIntensity={ambientIntensity}
          sunIntensity={sunIntensity}
          onTextureChange={(name) => editor.setTexture(name)}
          onAmbientChange={(value) => editor.setAmbientIntensity(value)}
          onSunChange={(value) => editor.setSunIntensity(value)}
        />
      )}

      {selectedRock && editor && (
        <RockEditor
          rock={selectedRock}
          onUpdate={(settings) =>
            editor.updateRockSettings(selectedRock.id, settings)
          }
          onDelete={() => editor.deleteRock(selectedRock.id)}
          onClose={() => editor.$selectedRockId.next(null)}
        />
      )}
    </div>
  );
};

export default ZenGardenPage;
