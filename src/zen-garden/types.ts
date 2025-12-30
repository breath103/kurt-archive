export interface ZenGarden {
  objects: Array<ZenGardenObject>;
  ground: ZenGardenGround;
}

// Ground
export type GroundTextureName = "gravel" | "grass";
export interface ZenGardenGround {
  textureName: GroundTextureName;
  size: { x: number; y: number };
  tileSize: number;
  resolution: number;
  displacementScale: number;
}

// Objects (over the ground)
export interface ZenGardenObject {
  id: string;
  type: "rock";
  position: { x: number; y: number };
  waveSettings?: RockWaveSettings;
}

export interface RockWaveSettings {
  radius: number;
  waveCount: number;
  waveSpacing: number;
}

export const DEFAULT_ROCK_WAVE_SETTINGS: RockWaveSettings = {
  radius: 0.25,
  waveCount: 4,
  waveSpacing: 0.2,
};
