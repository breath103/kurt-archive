export interface ZenGarden {
  objects: Array<ZenGardenObject>;
  plain: {
    size: { x: number; y: number };
  };
}

export interface ZenGardenObject {
  id: string;
  type: 'rock';
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
