import type { ZenGarden } from "./types";

const STORAGE_KEY = "zen-garden";

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
    plain: {
      size: { x: 10, y: 10 },
    },
  };
}
