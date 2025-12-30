import type { ZenGarden } from "./types";

const STORAGE_KEY = "zen-garden-2";

export function loadGarden(): ZenGarden {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return createDefaultGarden();
  }
  try {
    return JSON.parse(stored) as ZenGarden;
  } catch {
    return createDefaultGarden();
  }
}

export function saveGarden(garden: ZenGarden): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(garden));
}

export function createDefaultGarden(): ZenGarden {
  return {
    objects: [],
    ground: {
      textureName: "gravel",
      size: { x: 10, y: 7 },
      tileSize: 2.0,
      resolution: 2048,
      displacementScale: 0.05,
    },
  };
}
