import * as THREE from 'three';

import type { RockWaveSettings, ZenGarden } from './types';
import { DEFAULT_ROCK_WAVE_SETTINGS } from './types';

const TEXTURE_RESOLUTION = 512; // pixels for wave disc

interface GenerateOptions {
  microNoiseScale?: number;
  microNoiseStrength?: number;
}

/**
 * Generates a normal map texture for the ground (micro noise only, no waves).
 */
export function generateGroundNormalMapTexture(
  garden: ZenGarden,
  options: GenerateOptions = {}
): THREE.CanvasTexture {
  const { microNoiseScale = 50, microNoiseStrength = 0.3 } = options;

  const { size } = garden.plain;
  const width = Math.floor((size.x / 10) * 1024);
  const height = Math.floor((size.y / 10) * 1024);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  const { data } = imageData;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const worldX = (px / width) * size.x - size.x / 2;
      const worldY = (py / height) * size.y - size.y / 2;

      let nx = 0;
      let ny = 1;
      let nz = 0;

      // Micro noise only
      const noiseVal = noise2D(
        worldX * microNoiseScale,
        worldY * microNoiseScale
      );
      const noiseValX = noise2D(
        (worldX + 0.01) * microNoiseScale,
        worldY * microNoiseScale
      );
      const noiseValY = noise2D(
        worldX * microNoiseScale,
        (worldY + 0.01) * microNoiseScale
      );

      nx += (noiseVal - noiseValX) * microNoiseStrength;
      nz += (noiseVal - noiseValY) * microNoiseStrength;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const i = (py * width + px) * 4;
      data[i] = Math.floor((nx * 0.5 + 0.5) * 255);
      data[i + 1] = Math.floor((nz * 0.5 + 0.5) * 255);
      data[i + 2] = Math.floor((ny * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return texture;
}

/**
 * Generates a circular wave normal map texture for a single rock.
 * Returns texture and the size (diameter) it should cover in world units.
 */
export function generateRockWaveTexture(waveSettings?: RockWaveSettings): {
  texture: THREE.CanvasTexture;
  diameter: number;
} {
  const settings = waveSettings ?? DEFAULT_ROCK_WAVE_SETTINGS;
  const diameter =
    (settings.radius + settings.waveCount * settings.waveSpacing) * 2;

  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_RESOLUTION;
  canvas.height = TEXTURE_RESOLUTION;

  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(TEXTURE_RESOLUTION, TEXTURE_RESOLUTION);
  const { data } = imageData;

  const center = TEXTURE_RESOLUTION / 2;
  const scale = TEXTURE_RESOLUTION / diameter; // pixels per world unit

  for (let py = 0; py < TEXTURE_RESOLUTION; py++) {
    for (let px = 0; px < TEXTURE_RESOLUTION; px++) {
      // Convert to local coordinates (centered at 0,0)
      const localX = (px - center) / scale;
      const localY = (py - center) / scale;
      const dist = Math.sqrt(localX * localX + localY * localY);

      let nx = 0;
      let ny = 1;
      let nz = 0;
      let alpha = 0;

      const maxWaveRadius =
        settings.radius + settings.waveCount * settings.waveSpacing;

      if (dist > settings.radius && dist < maxWaveRadius) {
        const adjustedDist = dist - settings.radius;
        const phase = (adjustedDist / settings.waveSpacing) * Math.PI * 2;

        const derivative =
          Math.cos(phase) * ((2 * Math.PI) / settings.waveSpacing) * 0.15;

        const radialX = localX / dist;
        const radialY = localY / dist;

        nx = -radialX * derivative;
        nz = -radialY * derivative;

        // Normalize
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= len;
        ny /= len;
        nz /= len;

        alpha = 255;
      }

      const i = (py * TEXTURE_RESOLUTION + px) * 4;
      data[i] = Math.floor((nx * 0.5 + 0.5) * 255);
      data[i + 1] = Math.floor((nz * 0.5 + 0.5) * 255);
      data[i + 2] = Math.floor((ny * 0.5 + 0.5) * 255);
      data[i + 3] = alpha;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return { texture, diameter };
}

// Simple hash-based noise function
function hash(x: number, y: number): number {
  return (((Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1) + 1) % 1;
}

function noise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);

  return (
    a * (1 - ux) * (1 - uy) +
    b * ux * (1 - uy) +
    c * (1 - ux) * uy +
    d * ux * uy
  );
}

// Keep old function for backwards compatibility during transition
export function generateGardenPlainNormalMapTexture(
  garden: ZenGarden,
  options: GenerateOptions = {}
): THREE.CanvasTexture {
  return generateGroundNormalMapTexture(garden, options);
}
