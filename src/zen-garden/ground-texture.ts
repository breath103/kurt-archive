import * as THREE from "three";

import type { GravelTextureSet } from "./materials";
import type { ZenGardenGround, ZenGardenObject } from "./types";
import { DEFAULT_ROCK_WAVE_SETTINGS } from "./types";

const MAX_ROCKS = 32;

// Vertex shader for fullscreen quad
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Fragment shader that combines gravel textures with wave patterns
const fragmentShader = `
  precision highp float;

  uniform sampler2D gravelNormalMap;
  uniform sampler2D gravelDisplacementMap;
  uniform vec2 gardenSize;
  uniform float tileSize;

  // Rock data: vec4(x, z, waveRadius, waveMaxRadius) for each rock
  uniform vec4 rockData[${MAX_ROCKS}];
  uniform float rockWaveSpacing[${MAX_ROCKS}];
  uniform int rockCount;

  varying vec2 vUv;

  // Compute wave normal and height at a point
  void computeWave(vec2 worldPos, vec4 rock, float waveSpacing, out vec3 waveNormal, out float waveHeight) {
    vec2 toRock = worldPos - rock.xy;
    float dist = length(toRock);

    float innerRadius = rock.z;  // where waves start
    float outerRadius = rock.w;  // where waves end

    waveNormal = vec3(0.0, 0.0, 1.0);
    waveHeight = 0.0;

    if (dist > innerRadius && dist < outerRadius) {
      vec2 radialDir = normalize(toRock);
      float wavePos = dist - innerRadius;
      float phase = (wavePos / waveSpacing) * 6.28318;

      // Wave height (sine wave)
      waveHeight = sin(phase) * 0.5 + 0.5;

      // Wave normal (derivative of sine)
      float derivative = cos(phase) * (6.28318 / waveSpacing);

      // Fade at edges
      float fadeIn = smoothstep(innerRadius, innerRadius + 0.1, dist);
      float fadeOut = smoothstep(outerRadius, outerRadius - 0.2, dist);
      float fade = fadeIn * fadeOut;

      waveHeight *= fade * 0.85;  // Scale wave height
      derivative *= fade * 0.03;   // Scale normal strength

      // Normal points perpendicular to wave direction
      waveNormal = normalize(vec3(-radialDir * derivative, 1.0));
    }
  }

  // UDN normal blending
  vec3 blendNormals(vec3 base, vec3 detail) {
    return normalize(vec3(base.xy + detail.xy, base.z * detail.z));
  }

  void main() {
    // World position from UV
    vec2 worldPos = (vUv - 0.5) * gardenSize;

    // Sample gravel textures using tiled UVs
    vec2 tiledUv = worldPos / tileSize;
    vec3 gravelNormal = texture2D(gravelNormalMap, tiledUv).xyz * 2.0 - 1.0;
    float gravelDisp = texture2D(gravelDisplacementMap, tiledUv).r;

    // Accumulate wave contributions from all rocks
    vec3 combinedNormal = vec3(0.0, 0.0, 1.0);
    float combinedHeight = 0.0;
    float totalWaveInfluence = 0.0;

    for (int i = 0; i < ${MAX_ROCKS}; i++) {
      if (i >= rockCount) break;

      vec3 waveNormal;
      float waveHeight;
      computeWave(worldPos, rockData[i], rockWaveSpacing[i], waveNormal, waveHeight);

      if (waveHeight > 0.001) {
        combinedNormal = blendNormals(combinedNormal, waveNormal);
        combinedHeight = max(combinedHeight, waveHeight);
        totalWaveInfluence = max(totalWaveInfluence, waveHeight / 0.15);
      }
    }

    // Blend wave normal with gravel normal
    vec3 finalNormal = blendNormals(gravelNormal, combinedNormal);

    // Add wave height to gravel displacement
    float finalDisp = gravelDisp + combinedHeight;

    // Output: RGB = normal (packed), A = displacement
    gl_FragColor = vec4(finalNormal * 0.5 + 0.5, finalDisp);
  }
`;

export interface GroundTextureGenerator {
  normalDispTexture: THREE.WebGLRenderTarget;
  update: (rocks: ZenGardenObject[]) => void;
  dispose: () => void;
}

/**
 * Creates a GPU-based texture generator that combines gravel textures with wave patterns.
 * Call update() whenever rocks change to regenerate the combined texture.
 */
export function createGroundTextureGenerator(
  renderer: THREE.WebGLRenderer,
  gravelTextures: GravelTextureSet,
  ground: ZenGardenGround
): GroundTextureGenerator {
  // Create render target for combined normal + displacement
  const renderTarget = new THREE.WebGLRenderTarget(
    ground.resolution,
    ground.resolution,
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    }
  );

  // Create fullscreen quad for rendering
  const geometry = new THREE.PlaneGeometry(2, 2);

  // Initialize rock data arrays
  const rockDataArray = new Float32Array(MAX_ROCKS * 4);
  const rockWaveSpacingArray = new Float32Array(MAX_ROCKS);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      gravelNormalMap: { value: gravelTextures.normalMap },
      gravelDisplacementMap: { value: gravelTextures.displacementMap },
      gardenSize: {
        value: new THREE.Vector2(ground.size.x, ground.size.y),
      },
      tileSize: { value: ground.tileSize },
      rockData: { value: rockDataArray },
      rockWaveSpacing: { value: rockWaveSpacingArray },
      rockCount: { value: 0 },
    },
  });

  const quad = new THREE.Mesh(geometry, material);
  const scene = new THREE.Scene();
  scene.add(quad);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function update(rocks: ZenGardenObject[]) {
    // Update rock uniforms
    const count = Math.min(rocks.length, MAX_ROCKS);

    for (let i = 0; i < count; i++) {
      const rock = rocks[i];
      const settings = rock.waveSettings ?? DEFAULT_ROCK_WAVE_SETTINGS;
      const maxRadius =
        settings.radius + settings.waveCount * settings.waveSpacing;

      rockDataArray[i * 4 + 0] = rock.position.x;
      rockDataArray[i * 4 + 1] = rock.position.y; // This is z in world space
      rockDataArray[i * 4 + 2] = settings.radius;
      rockDataArray[i * 4 + 3] = maxRadius;

      rockWaveSpacingArray[i] = settings.waveSpacing;
    }

    material.uniforms.rockData.value = rockDataArray;
    material.uniforms.rockWaveSpacing.value = rockWaveSpacingArray;
    material.uniforms.rockCount.value = count;

    // Render to texture
    const currentRenderTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(currentRenderTarget);
  }

  function dispose() {
    renderTarget.dispose();
    geometry.dispose();
    material.dispose();
  }

  return {
    normalDispTexture: renderTarget,
    update,
    dispose,
  };
}
