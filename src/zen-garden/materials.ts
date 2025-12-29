import * as THREE from 'three';

export interface GravelTextureSet {
  colorMap: THREE.Texture;
  normalMap: THREE.Texture;
  displacementMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  aoMap: THREE.Texture;
}

export interface GroundMaterialOptions {
  tileSize: number;
  displacementScale: number;
  gardenSize: { x: number; y: number };
}

const DEFAULT_OPTIONS: GroundMaterialOptions = {
  tileSize: 2.0,
  displacementScale: 0.1,
  gardenSize: { x: 10, y: 10 },
};

// Ground vertex shader with combined displacement (from generated texture)
const groundVertexShader = `
  uniform sampler2D combinedMap;
  uniform vec2 gardenSize;
  uniform float displacementScale;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);

    // UV based on world position within garden bounds
    vec2 uv = (worldPos.xz / gardenSize) + 0.5;

    // Sample displacement from alpha channel
    float displacement = texture2D(combinedMap, uv).a;
    vec3 displacedPosition = position + normal * displacement * displacementScale;

    worldPos = modelMatrix * vec4(displacedPosition, 1.0);
    vWorldPos = worldPos.xyz;
    vUv = uv;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// Ground fragment shader using combined normal+displacement texture
const groundFragmentShader = `
  uniform sampler2D combinedMap;
  uniform sampler2D colorMap;
  uniform sampler2D roughnessMap;
  uniform sampler2D aoMap;
  uniform vec3 lightDir;
  uniform vec3 cameraPos;
  uniform float tileSize;
  uniform vec2 gardenSize;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    // Sample combined normal from RGB
    vec3 normalTex = texture2D(combinedMap, vUv).rgb * 2.0 - 1.0;

    // Sample color, roughness, and AO using tiled world-space UVs
    vec2 tiledUv = vWorldPos.xz / tileSize;
    vec3 color = texture2D(colorMap, tiledUv).rgb;
    float roughness = texture2D(roughnessMap, tiledUv).r;
    float ao = texture2D(aoMap, tiledUv).r;

    // Convert normal from texture space to world space
    vec3 normal = normalize(vec3(normalTex.x, normalTex.z, normalTex.y));
    vec3 lightDirection = normalize(lightDir);
    vec3 viewDir = normalize(cameraPos - vWorldPos);

    float diffuse = max(dot(normal, lightDirection), 0.0);

    vec3 halfDir = normalize(lightDirection + viewDir);
    float shininess = mix(128.0, 4.0, roughness);
    float specular = pow(max(dot(normal, halfDir), 0.0), shininess);
    specular *= (1.0 - roughness) * 0.3;

    float ambient = 0.4;
    vec3 finalColor = color * (ambient + diffuse * 0.6) * ao + vec3(specular);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Loads a complete gravel texture set from a folder.
 * Expects: color.jpg, normal.jpg, displacement.jpg, roughness.jpg
 * Returns a Promise that resolves when all textures are loaded.
 */
export async function loadGravelTextures(
  loader: THREE.TextureLoader,
  folderPath: string
): Promise<GravelTextureSet> {
  const loadTexture = (name: string): Promise<THREE.Texture> => {
    return new Promise((resolve, reject) => {
      loader.load(
        `${folderPath}/${name}.jpg`,
        (texture) => {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  };

  const [colorMap, normalMap, displacementMap, roughnessMap, aoMap] =
    await Promise.all([
      loadTexture('color'),
      loadTexture('normal'),
      loadTexture('displacement'),
      loadTexture('roughness'),
      loadTexture('ao'),
    ]);

  return { colorMap, normalMap, displacementMap, roughnessMap, aoMap };
}

/**
 * Disposes all textures in a gravel texture set.
 */
export function disposeGravelTextures(textures: GravelTextureSet): void {
  textures.colorMap.dispose();
  textures.normalMap.dispose();
  textures.displacementMap.dispose();
  textures.roughnessMap.dispose();
  textures.aoMap.dispose();
}

export interface GroundMaterialUniforms {
  lightDir: { value: THREE.Vector3 };
  cameraPos: { value: THREE.Vector3 };
  tileSize: { value: number };
  displacementScale: { value: number };
  gardenSize: { value: THREE.Vector2 };
  combinedMap: { value: THREE.Texture | null };
}

export interface GroundMaterial {
  material: THREE.ShaderMaterial;
  uniforms: GroundMaterialUniforms;
}

/**
 * Creates a ground shader material that uses a combined normal+displacement texture.
 * The combined texture should have: RGB = normal, A = displacement
 */
export function createGroundMaterial(
  gravelTextures: GravelTextureSet,
  combinedTexture: THREE.Texture,
  options: Partial<GroundMaterialOptions> = {}
): GroundMaterial {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const uniforms: GroundMaterialUniforms = {
    lightDir: { value: new THREE.Vector3(5, 10, 5).normalize() },
    cameraPos: { value: new THREE.Vector3() },
    tileSize: { value: opts.tileSize },
    displacementScale: { value: opts.displacementScale },
    gardenSize: {
      value: new THREE.Vector2(opts.gardenSize.x, opts.gardenSize.y),
    },
    combinedMap: { value: combinedTexture },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: groundVertexShader,
    fragmentShader: groundFragmentShader,
    uniforms: {
      combinedMap: uniforms.combinedMap,
      colorMap: { value: gravelTextures.colorMap },
      roughnessMap: { value: gravelTextures.roughnessMap },
      aoMap: { value: gravelTextures.aoMap },
      lightDir: uniforms.lightDir,
      cameraPos: uniforms.cameraPos,
      tileSize: uniforms.tileSize,
      gardenSize: uniforms.gardenSize,
      displacementScale: uniforms.displacementScale,
    },
  });

  return { material, uniforms };
}
