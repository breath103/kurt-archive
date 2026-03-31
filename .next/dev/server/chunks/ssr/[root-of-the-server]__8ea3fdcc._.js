module.exports = [
"[project]/src/zen-garden/types.ts [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_ROCK_WAVE_SETTINGS",
    ()=>DEFAULT_ROCK_WAVE_SETTINGS
]);
const DEFAULT_ROCK_WAVE_SETTINGS = {
    radius: 0.25,
    waveCount: 4,
    waveSpacing: 0.2
};
}),
"[project]/src/zen-garden/ground-texture.ts [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "createGroundTextureGenerator",
    ()=>createGroundTextureGenerator
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__ = __turbopack_context__.i("[externals]/three [external] (three, esm_import, [project]/node_modules/three)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$types$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden/types.ts [ssr] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
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
function createGroundTextureGenerator(renderer, gravelTextures, ground) {
    // Create render target for combined normal + displacement
    const renderTarget = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["WebGLRenderTarget"](ground.resolution, ground.resolution, {
        minFilter: __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["LinearFilter"],
        magFilter: __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["LinearFilter"],
        format: __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["RGBAFormat"],
        type: __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["FloatType"]
    });
    // Create fullscreen quad for rendering
    const geometry = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["PlaneGeometry"](2, 2);
    // Initialize rock data arrays
    const rockDataArray = new Float32Array(MAX_ROCKS * 4);
    const rockWaveSpacingArray = new Float32Array(MAX_ROCKS);
    const material = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["ShaderMaterial"]({
        vertexShader,
        fragmentShader,
        uniforms: {
            gravelNormalMap: {
                value: gravelTextures.normalMap
            },
            gravelDisplacementMap: {
                value: gravelTextures.displacementMap
            },
            gardenSize: {
                value: new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Vector2"](ground.size.x, ground.size.y)
            },
            tileSize: {
                value: ground.tileSize
            },
            rockData: {
                value: rockDataArray
            },
            rockWaveSpacing: {
                value: rockWaveSpacingArray
            },
            rockCount: {
                value: 0
            }
        }
    });
    const quad = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Mesh"](geometry, material);
    const scene = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Scene"]();
    scene.add(quad);
    const camera = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["OrthographicCamera"](-1, 1, 1, -1, 0, 1);
    function update(rocks) {
        // Update rock uniforms
        const count = Math.min(rocks.length, MAX_ROCKS);
        for(let i = 0; i < count; i++){
            const rock = rocks[i];
            const settings = rock.waveSettings ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$types$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["DEFAULT_ROCK_WAVE_SETTINGS"];
            const maxRadius = settings.radius + settings.waveCount * settings.waveSpacing;
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
        dispose
    };
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/zen-garden/materials.ts [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "createGroundMaterial",
    ()=>createGroundMaterial,
    "disposeGravelTextures",
    ()=>disposeGravelTextures,
    "loadGravelTextures",
    ()=>loadGravelTextures
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__ = __turbopack_context__.i("[externals]/three [external] (three, esm_import, [project]/node_modules/three)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
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
  uniform float ambientIntensity;
  uniform float sunIntensity;
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
    specular *= (1.0 - roughness) * 0.3 * sunIntensity;

    vec3 finalColor = color * (ambientIntensity + diffuse * sunIntensity) * ao + vec3(specular);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
async function loadGravelTextures(loader, folderPath) {
    const loadTexture = (name)=>{
        return new Promise((resolve, reject)=>{
            loader.load(`${folderPath}/${name}.jpg`, (texture)=>{
                texture.wrapS = texture.wrapT = __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["RepeatWrapping"];
                resolve(texture);
            }, undefined, reject);
        });
    };
    const [colorMap, normalMap, displacementMap, roughnessMap, aoMap] = await Promise.all([
        loadTexture("color"),
        loadTexture("normal"),
        loadTexture("displacement"),
        loadTexture("roughness"),
        loadTexture("ao")
    ]);
    return {
        colorMap,
        normalMap,
        displacementMap,
        roughnessMap,
        aoMap
    };
}
function disposeGravelTextures(textures) {
    textures.colorMap.dispose();
    textures.normalMap.dispose();
    textures.displacementMap.dispose();
    textures.roughnessMap.dispose();
    textures.aoMap.dispose();
}
function createGroundMaterial(gravelTextures, combinedTexture, ground) {
    const uniforms = {
        lightDir: {
            value: new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Vector3"](5, 10, 5).normalize()
        },
        cameraPos: {
            value: new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Vector3"]()
        },
        tileSize: {
            value: ground.tileSize
        },
        displacementScale: {
            value: ground.displacementScale
        },
        gardenSize: {
            value: new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Vector2"](ground.size.x, ground.size.y)
        },
        combinedMap: {
            value: combinedTexture
        },
        ambientIntensity: {
            value: 0.4
        },
        sunIntensity: {
            value: 0.8
        }
    };
    const material = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["ShaderMaterial"]({
        vertexShader: groundVertexShader,
        fragmentShader: groundFragmentShader,
        uniforms: {
            combinedMap: uniforms.combinedMap,
            colorMap: {
                value: gravelTextures.colorMap
            },
            roughnessMap: {
                value: gravelTextures.roughnessMap
            },
            aoMap: {
                value: gravelTextures.aoMap
            },
            lightDir: uniforms.lightDir,
            cameraPos: uniforms.cameraPos,
            tileSize: uniforms.tileSize,
            gardenSize: uniforms.gardenSize,
            displacementScale: uniforms.displacementScale,
            ambientIntensity: uniforms.ambientIntensity,
            sunIntensity: uniforms.sunIntensity
        }
    });
    return {
        material,
        uniforms
    };
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/zen-garden/storage.ts [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createDefaultGarden",
    ()=>createDefaultGarden,
    "loadGarden",
    ()=>loadGarden,
    "saveGarden",
    ()=>saveGarden
]);
const STORAGE_KEY = "zen-garden-2";
function loadGarden() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        return createDefaultGarden();
    }
    try {
        return JSON.parse(stored);
    } catch  {
        return createDefaultGarden();
    }
}
function saveGarden(garden) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(garden));
}
function createDefaultGarden() {
    return {
        objects: [],
        ground: {
            textureName: "gravel",
            size: {
                x: 10,
                y: 7
            },
            tileSize: 2.0,
            resolution: 2048,
            displacementScale: 0.05
        }
    };
}
}),
"[project]/src/zen-garden/editor.ts [ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "ZenGardenEditor",
    ()=>ZenGardenEditor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/rxjs/dist/cjs/index.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__ = __turbopack_context__.i("[externals]/three [external] (three, esm_import, [project]/node_modules/three)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$three$2f$examples$2f$jsm$2f$controls$2f$OrbitControls$2e$js__$5b$external$5d$__$28$three$2f$examples$2f$jsm$2f$controls$2f$OrbitControls$2e$js$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__ = __turbopack_context__.i("[externals]/three/examples/jsm/controls/OrbitControls.js [external] (three/examples/jsm/controls/OrbitControls.js, esm_import, [project]/node_modules/three)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$ground$2d$texture$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden/ground-texture.ts [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$materials$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden/materials.ts [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden/storage.ts [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$types$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden/types.ts [ssr] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__,
    __TURBOPACK__imported__module__$5b$externals$5d2f$three$2f$examples$2f$jsm$2f$controls$2f$OrbitControls$2e$js__$5b$external$5d$__$28$three$2f$examples$2f$jsm$2f$controls$2f$OrbitControls$2e$js$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$ground$2d$texture$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$materials$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__, __TURBOPACK__imported__module__$5b$externals$5d2f$three$2f$examples$2f$jsm$2f$controls$2f$OrbitControls$2e$js__$5b$external$5d$__$28$three$2f$examples$2f$jsm$2f$controls$2f$OrbitControls$2e$js$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$ground$2d$texture$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$materials$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
;
;
const TEXTURE_PATHS = {
    gravel: "/textures/gravel",
    grass: "/textures/grass"
};
class ZenGardenEditor {
    canvas;
    // RxJS Subjects
    $ground;
    $groundTextureName;
    $selectedObjectId;
    $regenerateTexture;
    $objects;
    $ambientIntensity;
    $sunIntensity;
    $mode;
    // Three.js objects
    scene;
    camera;
    renderer;
    controls;
    groundMesh;
    rockMeshes;
    mossMeshes;
    mossPointMeshes;
    ambientLight;
    directionalLight;
    arrowHelper;
    // Texture/material objects
    gravelTextures;
    groundTextureGen;
    groundMat;
    textureLoader;
    // Garden data
    garden;
    // State
    lightAngle;
    lightHeight;
    lightRadius;
    disposed;
    // Dragging state
    draggedRockId;
    draggedMossPoint;
    isDragging;
    mouseDownPos;
    // Raycaster
    raycaster;
    mouse;
    constructor(canvas){
        this.canvas = canvas;
        this.$selectedObjectId = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["BehaviorSubject"](null);
        this.$regenerateTexture = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["Subject"]();
        this.$objects = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["BehaviorSubject"]([]);
        this.$ambientIntensity = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["BehaviorSubject"](0.4);
        this.$sunIntensity = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["BehaviorSubject"](0.8);
        this.$mode = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["BehaviorSubject"]("normal");
        this.groundMesh = null;
        this.rockMeshes = new Map();
        this.mossMeshes = new Map();
        this.mossPointMeshes = new Map();
        this.gravelTextures = null;
        this.groundTextureGen = null;
        this.groundMat = null;
        this.textureLoader = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["TextureLoader"]();
        this.lightAngle = Math.PI / 4;
        this.lightHeight = 10;
        this.lightRadius = 5;
        this.disposed = false;
        this.draggedRockId = null;
        this.draggedMossPoint = null;
        this.isDragging = false;
        this.mouseDownPos = {
            x: 0,
            y: 0
        };
        this.raycaster = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Raycaster"]();
        this.mouse = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Vector2"]();
        this.handleMouseDown = (event)=>{
            this.mouseDownPos = {
                x: event.clientX,
                y: event.clientY
            };
            this.isDragging = false;
            this.updateMousePosition(event);
            this.raycaster.setFromCamera(this.mouse, this.camera);
            // Check for moss point click first
            const allPointMeshes = Array.from(this.mossPointMeshes.values()).flat();
            const pointIntersects = this.raycaster.intersectObjects(allPointMeshes);
            if (pointIntersects.length > 0) {
                const pointMesh = pointIntersects[0].object;
                this.draggedMossPoint = {
                    mossId: pointMesh.userData.mossId,
                    pointIndex: pointMesh.userData.pointIndex
                };
                this.controls.enabled = false;
                return;
            }
            // Check for rock click
            const rockMeshArray = Array.from(this.rockMeshes.values());
            const intersects = this.raycaster.intersectObjects(rockMeshArray);
            if (intersects.length > 0) {
                this.draggedRockId = intersects[0].object.userData.id;
                this.controls.enabled = false;
            }
        };
        this.handleMouseMove = (event)=>{
            const dx = event.clientX - this.mouseDownPos.x;
            const dy = event.clientY - this.mouseDownPos.y;
            if (Math.sqrt(dx * dx + dy * dy) > 5) {
                this.isDragging = true;
            }
            if (!this.groundMesh) return;
            this.updateMousePosition(event);
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const groundIntersects = this.raycaster.intersectObject(this.groundMesh);
            if (groundIntersects.length === 0) return;
            const { point } = groundIntersects[0];
            // Handle moss point dragging
            if (this.draggedMossPoint && this.isDragging) {
                const { mossId, pointIndex } = this.draggedMossPoint;
                const moss = this.garden.objects.find((o)=>o.id === mossId);
                if (moss && moss.type === "moss") {
                    // Update the point in the polygon path
                    moss.polygonPath[pointIndex] = {
                        x: point.x,
                        y: point.z
                    };
                    // Update the mesh geometry
                    this.updateMossGeometry(mossId);
                }
                return;
            }
            // Handle rock dragging
            if (this.draggedRockId && this.isDragging) {
                const mesh = this.rockMeshes.get(this.draggedRockId);
                const obj = this.garden.objects.find((o)=>o.id === this.draggedRockId);
                if (mesh && obj && obj.type === "rock") {
                    mesh.position.set(point.x, 0.15, point.z);
                    obj.position.x = point.x;
                    obj.position.y = point.z;
                }
            }
        };
        this.handleMouseUp = ()=>{
            if (this.draggedRockId && this.isDragging) {
                this.saveAndRegenerate();
            }
            if (this.draggedMossPoint && this.isDragging) {
                this.saveAndRegenerate();
            }
            this.draggedRockId = null;
            this.draggedMossPoint = null;
            this.controls.enabled = true;
        };
        this.handleClick = (event)=>{
            if (this.isDragging) return;
            this.updateMousePosition(event);
            this.raycaster.setFromCamera(this.mouse, this.camera);
            // Check all object meshes for selection
            const allMeshes = [
                ...Array.from(this.rockMeshes.values()),
                ...Array.from(this.mossMeshes.values())
            ];
            const objectIntersects = this.raycaster.intersectObjects(allMeshes);
            if (objectIntersects.length > 0) {
                const clickedId = objectIntersects[0].object.userData.id;
                // Toggle selection: deselect if clicking already selected object
                if (this.$selectedObjectId.value === clickedId) {
                    this.$selectedObjectId.next(null);
                } else {
                    this.$selectedObjectId.next(clickedId);
                }
                return;
            }
            this.$selectedObjectId.next(null);
            if (!this.groundMesh) return;
            const groundIntersects = this.raycaster.intersectObject(this.groundMesh);
            if (groundIntersects.length > 0) {
                const { point } = groundIntersects[0];
                const mode = this.$mode.value;
                if (mode === "createMoss") {
                    this.addMoss(point.x, point.z);
                    this.$mode.next("normal");
                } else {
                    this.addRock(point.x, point.z);
                }
            }
        };
        this.handleResize = ()=>{
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        };
        this.handleKeyDown = (event)=>{
            const rotateSpeed = 0.1;
            if (event.key === "ArrowLeft" || event.key === "a") {
                this.lightAngle -= rotateSpeed;
                this.updateLightPosition();
            } else if (event.key === "ArrowRight" || event.key === "d") {
                this.lightAngle += rotateSpeed;
                this.updateLightPosition();
            }
        };
        this.animate = ()=>{
            if (this.disposed) return;
            requestAnimationFrame(this.animate);
            this.controls.update();
            if (this.groundMat) {
                this.groundMat.uniforms.cameraPos.value.copy(this.camera.position);
            }
            this.renderer.render(this.scene, this.camera);
        };
        // Load garden data
        this.garden = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["loadGarden"])();
        this.$ground = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["BehaviorSubject"](this.garden.ground);
        this.$groundTextureName = this.$ground.pipe((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["map"])((g)=>g.textureName), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["distinctUntilChanged"])());
        this.$objects.next(this.garden.objects);
        // Setup Three.js
        this.scene = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Scene"]();
        this.scene.background = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Color"](0x87ceeb);
        this.camera = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["PerspectiveCamera"](60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 8);
        this.camera.lookAt(0, 0, 0);
        this.renderer = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["WebGLRenderer"]({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.controls = new __TURBOPACK__imported__module__$5b$externals$5d2f$three$2f$examples$2f$jsm$2f$controls$2f$OrbitControls$2e$js__$5b$external$5d$__$28$three$2f$examples$2f$jsm$2f$controls$2f$OrbitControls$2e$js$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["OrbitControls"](this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.1;
        // Lighting
        this.arrowHelper = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["ArrowHelper"](new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Vector3"](0, -1, 0), new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Vector3"](0, 3, 0), 1.5, 0xffaa00, 0.4, 0.2);
        this.scene.add(this.arrowHelper);
        this.ambientLight = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["AmbientLight"](0xffffff, this.$ambientIntensity.value);
        this.scene.add(this.ambientLight);
        this.directionalLight = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["DirectionalLight"](0xffffff, this.$sunIntensity.value);
        this.scene.add(this.directionalLight);
        this.updateLightPosition();
        // Create border around garden
        this.createGardenBorder();
        // Create object meshes
        this.garden.objects.forEach((obj)=>{
            if (obj.type === "rock") {
                const mesh = this.createRockMesh(obj);
                this.scene.add(mesh);
                this.rockMeshes.set(obj.id, mesh);
            } else if (obj.type === "moss") {
                const mesh = this.createMossMesh(obj);
                this.scene.add(mesh);
                this.mossMeshes.set(obj.id, mesh);
            }
        });
        // Setup RxJS subscriptions
        this.setupSubscriptions();
        // Setup event listeners
        this.setupEventListeners();
        // Start animation loop
        this.animate();
    }
    setupSubscriptions() {
        // When texture name changes, load new textures
        this.$groundTextureName.pipe((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["switchMap"])((name)=>{
            const path = TEXTURE_PATHS[name];
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["from"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$materials$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["loadGravelTextures"])(this.textureLoader, path));
        }), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["tap"])((textures)=>{
            if (this.disposed) return;
            const ground = this.$ground.value;
            // Dispose old textures
            if (this.gravelTextures) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$materials$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["disposeGravelTextures"])(this.gravelTextures);
            }
            if (this.groundTextureGen) {
                this.groundTextureGen.dispose();
            }
            if (this.groundMat) {
                this.groundMat.material.dispose();
            }
            if (this.groundMesh) {
                this.scene.remove(this.groundMesh);
                this.groundMesh.geometry.dispose();
            }
            this.gravelTextures = textures;
            // Create new ground texture generator
            this.groundTextureGen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$ground$2d$texture$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["createGroundTextureGenerator"])(this.renderer, textures, ground);
            // Create new ground material
            this.groundMat = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$materials$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["createGroundMaterial"])(textures, this.groundTextureGen.normalDispTexture.texture, ground);
            // Update light uniforms
            this.updateLightPosition();
            this.groundMat.uniforms.ambientIntensity.value = this.$ambientIntensity.value;
            this.groundMat.uniforms.sunIntensity.value = this.$sunIntensity.value;
            // Create ground mesh
            const segments = 512;
            const groundGeometry = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["PlaneGeometry"](ground.size.x, ground.size.y, segments, segments);
            this.groundMesh = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Mesh"](groundGeometry, this.groundMat.material);
            this.groundMesh.rotation.x = -Math.PI / 2;
            this.scene.add(this.groundMesh);
            // Regenerate texture
            this.$regenerateTexture.next();
        })).subscribe();
        // When regenerate texture event fires, update the ground texture
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["combineLatest"])([
            this.$regenerateTexture,
            this.$objects
        ]).pipe((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["filter"])(()=>this.groundTextureGen !== null), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["map"])(([, objects])=>objects.filter((o)=>o.type === "rock"))).subscribe((rocks)=>{
            this.groundTextureGen?.update(rocks);
        });
        // When selected object changes, update visual appearance
        this.$selectedObjectId.pipe((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["distinctUntilChanged"])()).subscribe((selectedId)=>{
            this.updateRockSelectionVisuals(selectedId);
            this.updateMossSelectionVisuals(selectedId);
        });
        // Sync ambient intensity to Three.js light and shader
        this.$ambientIntensity.pipe((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["distinctUntilChanged"])()).subscribe((value)=>{
            this.ambientLight.intensity = value;
            if (this.groundMat) {
                this.groundMat.uniforms.ambientIntensity.value = value;
            }
        });
        // Sync sun intensity to Three.js light and shader
        this.$sunIntensity.pipe((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$rxjs$2f$dist$2f$cjs$2f$index$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["distinctUntilChanged"])()).subscribe((value)=>{
            this.directionalLight.intensity = value;
            if (this.groundMat) {
                this.groundMat.uniforms.sunIntensity.value = value;
            }
        });
    }
    updateRockSelectionVisuals(selectedId) {
        // Reset all rocks to default appearance
        this.rockMeshes.forEach((mesh)=>{
            const material = mesh.material;
            material.emissive.setHex(0x000000);
            material.emissiveIntensity = 0;
        });
        // Highlight selected rock
        if (selectedId) {
            const selectedMesh = this.rockMeshes.get(selectedId);
            if (selectedMesh) {
                const material = selectedMesh.material;
                material.emissive.setHex(0xffaa00); // Orange glow
                material.emissiveIntensity = 0.4;
            }
        }
    }
    updateMossSelectionVisuals(selectedId) {
        // Hide all moss points first
        this.hideAllMossPoints();
        // Show points for selected moss
        if (selectedId) {
            const obj = this.garden.objects.find((o)=>o.id === selectedId);
            if (obj?.type === "moss") {
                this.showMossPoints(selectedId);
            }
        }
    }
    setupEventListeners() {
        this.canvas.addEventListener("mousedown", this.handleMouseDown);
        this.canvas.addEventListener("mousemove", this.handleMouseMove);
        this.canvas.addEventListener("mouseup", this.handleMouseUp);
        this.canvas.addEventListener("click", this.handleClick);
        window.addEventListener("resize", this.handleResize);
        window.addEventListener("keydown", this.handleKeyDown);
    }
    removeEventListeners() {
        this.canvas.removeEventListener("mousedown", this.handleMouseDown);
        this.canvas.removeEventListener("mousemove", this.handleMouseMove);
        this.canvas.removeEventListener("mouseup", this.handleMouseUp);
        this.canvas.removeEventListener("click", this.handleClick);
        window.removeEventListener("resize", this.handleResize);
        window.removeEventListener("keydown", this.handleKeyDown);
    }
    handleMouseDown;
    handleMouseMove;
    handleMouseUp;
    handleClick;
    handleResize;
    handleKeyDown;
    updateMousePosition(event) {
        this.mouse.x = event.clientX / window.innerWidth * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    updateLightPosition() {
        const x = Math.cos(this.lightAngle) * this.lightRadius;
        const z = Math.sin(this.lightAngle) * this.lightRadius;
        this.directionalLight.position.set(x, this.lightHeight, z);
        if (this.groundMat) {
            this.groundMat.uniforms.lightDir.value.set(x, this.lightHeight, z).normalize();
        }
        const lightDir = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Vector3"](x, this.lightHeight, z).normalize();
        this.arrowHelper.setDirection(lightDir.negate());
        const edgePos = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Vector3"](x, 3, z).normalize().multiplyScalar(4);
        this.arrowHelper.position.copy(edgePos);
    }
    createGardenBorder() {
        const { x: width, y: depth } = this.garden.ground.size;
        const borderHeight = 0.3;
        const borderThickness = 0.15;
        const borderMaterial = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["MeshStandardMaterial"]({
            color: 0x1a1a1a,
            roughness: 0.8
        });
        // Create 4 border pieces
        const borders = [
            // Front (positive Z)
            {
                size: [
                    width + borderThickness * 2,
                    borderHeight,
                    borderThickness
                ],
                pos: [
                    0,
                    borderHeight / 2,
                    depth / 2 + borderThickness / 2
                ]
            },
            // Back (negative Z)
            {
                size: [
                    width + borderThickness * 2,
                    borderHeight,
                    borderThickness
                ],
                pos: [
                    0,
                    borderHeight / 2,
                    -depth / 2 - borderThickness / 2
                ]
            },
            // Left (negative X)
            {
                size: [
                    borderThickness,
                    borderHeight,
                    depth
                ],
                pos: [
                    -width / 2 - borderThickness / 2,
                    borderHeight / 2,
                    0
                ]
            },
            // Right (positive X)
            {
                size: [
                    borderThickness,
                    borderHeight,
                    depth
                ],
                pos: [
                    width / 2 + borderThickness / 2,
                    borderHeight / 2,
                    0
                ]
            }
        ];
        borders.forEach(({ size, pos })=>{
            const geometry = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["BoxGeometry"](...size);
            const mesh = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Mesh"](geometry, borderMaterial);
            mesh.position.set(...pos);
            this.scene.add(mesh);
        });
    }
    createRockMesh(rock) {
        const rockGeometry = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["SphereGeometry"](0.3, 8, 6);
        rockGeometry.scale(1, 0.6, 1);
        const rockMaterial = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["MeshStandardMaterial"]({
            color: 0x666666,
            roughness: 0.9
        });
        const mesh = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Mesh"](rockGeometry, rockMaterial);
        mesh.position.set(rock.position.x, 0.15, rock.position.y);
        mesh.userData.id = rock.id;
        return mesh;
    }
    createMossMesh(moss) {
        const shape = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Shape"]();
        const points = moss.polygonPath;
        // ShapeGeometry rotated by -PI/2 around X maps shape Y to world -Z
        // Negate Y so polygon coords match world XZ coords
        if (points.length > 0) {
            shape.moveTo(points[0].x, -points[0].y);
            for(let i = 1; i < points.length; i++){
                shape.lineTo(points[i].x, -points[i].y);
            }
            shape.closePath();
        }
        const geometry = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["ShapeGeometry"](shape);
        const material = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["MeshStandardMaterial"]({
            color: 0x4a7c23,
            roughness: 0.8,
            side: __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["DoubleSide"]
        });
        const mesh = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Mesh"](geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 1.0; // Float above ground for visibility
        mesh.userData.id = moss.id;
        return mesh;
    }
    createMossPointMeshes(moss) {
        const pointMaterial = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["MeshStandardMaterial"]({
            color: 0xffaa00,
            emissive: 0xffaa00,
            emissiveIntensity: 0.3
        });
        return moss.polygonPath.map((point, index)=>{
            const geometry = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["SphereGeometry"](0.1, 8, 8);
            const mesh = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["Mesh"](geometry, pointMaterial);
            mesh.position.set(point.x, 1.05, point.y);
            mesh.userData.mossId = moss.id;
            mesh.userData.pointIndex = index;
            return mesh;
        });
    }
    showMossPoints(mossId) {
        const moss = this.garden.objects.find((o)=>o.id === mossId);
        if (!moss || moss.type !== "moss") return;
        // Remove existing point meshes
        this.hideMossPoints(mossId);
        // Create and add new point meshes
        const pointMeshes = this.createMossPointMeshes(moss);
        pointMeshes.forEach((mesh)=>this.scene.add(mesh));
        this.mossPointMeshes.set(mossId, pointMeshes);
    }
    hideMossPoints(mossId) {
        const existingPoints = this.mossPointMeshes.get(mossId);
        if (existingPoints) {
            existingPoints.forEach((mesh)=>{
                this.scene.remove(mesh);
                mesh.geometry.dispose();
            });
            this.mossPointMeshes.delete(mossId);
        }
    }
    hideAllMossPoints() {
        this.mossPointMeshes.forEach((_, mossId)=>{
            this.hideMossPoints(mossId);
        });
    }
    updateMossGeometry(mossId) {
        const moss = this.garden.objects.find((o)=>o.id === mossId);
        if (!moss || moss.type !== "moss") return;
        // Remove old mesh
        const oldMesh = this.mossMeshes.get(mossId);
        if (oldMesh) {
            this.scene.remove(oldMesh);
            oldMesh.geometry.dispose();
        }
        // Create new mesh with updated geometry
        const newMesh = this.createMossMesh(moss);
        this.scene.add(newMesh);
        this.mossMeshes.set(mossId, newMesh);
        // Recreate point meshes
        this.showMossPoints(mossId);
    }
    animate;
    saveAndRegenerate() {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["saveGarden"])(this.garden);
        this.$objects.next([
            ...this.garden.objects
        ]);
        this.$regenerateTexture.next();
    }
    // Public methods for UI interaction
    addRock(x, z) {
        const newRock = {
            id: crypto.randomUUID(),
            type: "rock",
            position: {
                x,
                y: z
            }
        };
        this.garden.objects.push(newRock);
        const mesh = this.createRockMesh(newRock);
        this.scene.add(mesh);
        this.rockMeshes.set(newRock.id, mesh);
        this.saveAndRegenerate();
        // Auto-select the new rock
        this.$selectedObjectId.next(newRock.id);
    }
    addMoss(x, z) {
        const size = 0.5; // Initial size of moss square
        const newMoss = {
            id: crypto.randomUUID(),
            type: "moss",
            polygonPath: [
                {
                    x: x - size,
                    y: z - size
                },
                {
                    x: x + size,
                    y: z - size
                },
                {
                    x: x + size,
                    y: z + size
                },
                {
                    x: x - size,
                    y: z + size
                }
            ]
        };
        this.garden.objects.push(newMoss);
        const mesh = this.createMossMesh(newMoss);
        this.scene.add(mesh);
        this.mossMeshes.set(newMoss.id, mesh);
        this.saveAndRegenerate();
        // Auto-select the new moss
        this.$selectedObjectId.next(newMoss.id);
    }
    deleteRock(id) {
        this.garden.objects = this.garden.objects.filter((o)=>o.id !== id);
        const mesh = this.rockMeshes.get(id);
        if (mesh) {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
            this.rockMeshes.delete(id);
        }
        if (this.$selectedObjectId.value === id) {
            this.$selectedObjectId.next(null);
        }
        this.saveAndRegenerate();
    }
    updateRockSettings(id, settings) {
        const rock = this.garden.objects.find((o)=>o.id === id);
        if (rock && rock.type === "rock") {
            rock.waveSettings = settings;
            this.saveAndRegenerate();
        }
    }
    getObject(id) {
        return this.garden.objects.find((o)=>o.id === id);
    }
    setGroundTexture(name) {
        const current = this.$ground.value;
        this.$ground.next({
            ...current,
            textureName: name
        });
        this.garden.ground = this.$ground.value;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["saveGarden"])(this.garden);
    }
    setAmbientIntensity(value) {
        this.$ambientIntensity.next(value);
    }
    setSunIntensity(value) {
        this.$sunIntensity.next(value);
    }
    setMode(mode) {
        this.$mode.next(mode);
    }
    dispose() {
        this.disposed = true;
        this.removeEventListeners();
        if (this.gravelTextures) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$materials$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["disposeGravelTextures"])(this.gravelTextures);
        }
        if (this.groundTextureGen) {
            this.groundTextureGen.dispose();
        }
        if (this.groundMat) {
            this.groundMat.material.dispose();
        }
        if (this.groundMesh) {
            this.groundMesh.geometry.dispose();
        }
        this.rockMeshes.forEach((mesh)=>{
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.renderer.dispose();
    }
}
;
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/zen-garden/texture.ts [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "generateGardenPlainNormalMapTexture",
    ()=>generateGardenPlainNormalMapTexture,
    "generateGroundNormalMapTexture",
    ()=>generateGroundNormalMapTexture,
    "generateRockWaveTexture",
    ()=>generateRockWaveTexture
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__ = __turbopack_context__.i("[externals]/three [external] (three, esm_import, [project]/node_modules/three)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$types$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden/types.ts [ssr] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
const TEXTURE_RESOLUTION = 512; // pixels for wave disc
function generateGroundNormalMapTexture(garden, options = {}) {
    const { microNoiseScale = 50, microNoiseStrength = 0.3 } = options;
    const { size } = garden.ground;
    const width = Math.floor(size.x / 10 * 1024);
    const height = Math.floor(size.y / 10 * 1024);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(width, height);
    const { data } = imageData;
    for(let py = 0; py < height; py++){
        for(let px = 0; px < width; px++){
            const worldX = px / width * size.x - size.x / 2;
            const worldY = py / height * size.y - size.y / 2;
            let nx = 0;
            let ny = 1;
            let nz = 0;
            // Micro noise only
            const noiseVal = noise2D(worldX * microNoiseScale, worldY * microNoiseScale);
            const noiseValX = noise2D((worldX + 0.01) * microNoiseScale, worldY * microNoiseScale);
            const noiseValY = noise2D(worldX * microNoiseScale, (worldY + 0.01) * microNoiseScale);
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
    const texture = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["CanvasTexture"](canvas);
    texture.wrapS = __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["ClampToEdgeWrapping"];
    texture.wrapT = __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["ClampToEdgeWrapping"];
    texture.needsUpdate = true;
    return texture;
}
function generateRockWaveTexture(waveSettings) {
    const settings = waveSettings ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$types$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["DEFAULT_ROCK_WAVE_SETTINGS"];
    const diameter = (settings.radius + settings.waveCount * settings.waveSpacing) * 2;
    const canvas = document.createElement("canvas");
    canvas.width = TEXTURE_RESOLUTION;
    canvas.height = TEXTURE_RESOLUTION;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(TEXTURE_RESOLUTION, TEXTURE_RESOLUTION);
    const { data } = imageData;
    const center = TEXTURE_RESOLUTION / 2;
    const scale = TEXTURE_RESOLUTION / diameter; // pixels per world unit
    for(let py = 0; py < TEXTURE_RESOLUTION; py++){
        for(let px = 0; px < TEXTURE_RESOLUTION; px++){
            // Convert to local coordinates (centered at 0,0)
            const localX = (px - center) / scale;
            const localY = (py - center) / scale;
            const dist = Math.sqrt(localX * localX + localY * localY);
            let nx = 0;
            let ny = 1;
            let nz = 0;
            let alpha = 0;
            const maxWaveRadius = settings.radius + settings.waveCount * settings.waveSpacing;
            if (dist > settings.radius && dist < maxWaveRadius) {
                const adjustedDist = dist - settings.radius;
                const phase = adjustedDist / settings.waveSpacing * Math.PI * 2;
                const derivative = Math.cos(phase) * (2 * Math.PI / settings.waveSpacing) * 0.15;
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
    const texture = new __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["CanvasTexture"](canvas);
    texture.wrapS = __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["ClampToEdgeWrapping"];
    texture.wrapT = __TURBOPACK__imported__module__$5b$externals$5d2f$three__$5b$external$5d$__$28$three$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$three$29$__["ClampToEdgeWrapping"];
    texture.needsUpdate = true;
    return {
        texture,
        diameter
    };
}
// Simple hash-based noise function
function hash(x, y) {
    return (Math.sin(x * 127.1 + y * 311.7) * 43758.5453 % 1 + 1) % 1;
}
function noise2D(x, y) {
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
    return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
}
function generateGardenPlainNormalMapTexture(garden, options = {}) {
    return generateGroundNormalMapTexture(garden, options);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/zen-garden/index.ts [ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$editor$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/zen-garden/editor.ts [ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$ground$2d$texture$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden/ground-texture.ts [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$materials$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden/materials.ts [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden/storage.ts [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$texture$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden/texture.ts [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$types$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden/types.ts [ssr] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$editor$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$ground$2d$texture$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$materials$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$texture$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$editor$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$ground$2d$texture$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$materials$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$texture$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
;
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/zen-garden/editor.ts [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "DEFAULT_ROCK_WAVE_SETTINGS",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$types$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["DEFAULT_ROCK_WAVE_SETTINGS"],
    "ZenGardenEditor",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$editor$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ZenGardenEditor"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$editor$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/zen-garden/editor.ts [ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$types$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden/types.ts [ssr] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$editor$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$editor$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/pages/zen-garden.tsx [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$index$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/zen-garden/index.ts [ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$types$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden/types.ts [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$editor$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/zen-garden/editor.ts [ssr] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$index$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$editor$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$index$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$editor$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
function useZenGardenEditor(canvas) {
    const [editor, setEditor] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])({
        selectedObjectId: null,
        textureName: "gravel",
        ambientIntensity: 0.4,
        sunIntensity: 0.8,
        objects: [],
        mode: "normal"
    });
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (!canvas) return;
        const ed = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$editor$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["ZenGardenEditor"](canvas);
        setEditor(ed);
        return ()=>ed.dispose();
    }, [
        canvas
    ]);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (!editor) return;
        const subs = [
            editor.$selectedObjectId.subscribe((v)=>setState((s)=>({
                        ...s,
                        selectedObjectId: v
                    }))),
            editor.$groundTextureName.subscribe((v)=>setState((s)=>({
                        ...s,
                        textureName: v
                    }))),
            editor.$ambientIntensity.subscribe((v)=>setState((s)=>({
                        ...s,
                        ambientIntensity: v
                    }))),
            editor.$sunIntensity.subscribe((v)=>setState((s)=>({
                        ...s,
                        sunIntensity: v
                    }))),
            editor.$objects.subscribe((v)=>setState((s)=>({
                        ...s,
                        objects: v
                    }))),
            editor.$mode.subscribe((v)=>setState((s)=>({
                        ...s,
                        mode: v
                    })))
        ];
        return ()=>subs.forEach((s)=>s.unsubscribe());
    }, [
        editor
    ]);
    if (!editor) return null;
    return {
        editor,
        ...state,
        selectedObject: state.selectedObjectId ? editor.getObject(state.selectedObjectId) : null
    };
}
function RockEditor({ rock, onUpdate, onDelete, onClose }) {
    const settings = rock.waveSettings ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$zen$2d$garden$2f$types$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["DEFAULT_ROCK_WAVE_SETTINGS"];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "absolute right-4 top-4 w-64 rounded-lg bg-white/90 p-4 shadow-lg backdrop-blur",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "mb-4 flex items-center justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h3", {
                        className: "font-semibold text-gray-800",
                        children: "Rock Settings"
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 78,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                        onClick: onClose,
                        className: "text-gray-500 hover:text-gray-700",
                        children: "✕"
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 79,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 77,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "space-y-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                                className: "block text-sm text-gray-600",
                                children: [
                                    "Radius: ",
                                    settings.radius.toFixed(2)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/pages/zen-garden.tsx",
                                lineNumber: 86,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                type: "range",
                                min: "0.1",
                                max: "1",
                                step: "0.05",
                                value: settings.radius,
                                onChange: (e)=>onUpdate({
                                        ...settings,
                                        radius: parseFloat(e.target.value)
                                    }),
                                className: "w-full"
                            }, void 0, false, {
                                fileName: "[project]/src/pages/zen-garden.tsx",
                                lineNumber: 89,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 85,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                                className: "block text-sm text-gray-600",
                                children: [
                                    "Wave Count: ",
                                    settings.waveCount
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/pages/zen-garden.tsx",
                                lineNumber: 103,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                type: "range",
                                min: "1",
                                max: "10",
                                step: "1",
                                value: settings.waveCount,
                                onChange: (e)=>onUpdate({
                                        ...settings,
                                        waveCount: parseInt(e.target.value)
                                    }),
                                className: "w-full"
                            }, void 0, false, {
                                fileName: "[project]/src/pages/zen-garden.tsx",
                                lineNumber: 106,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 102,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                                className: "block text-sm text-gray-600",
                                children: [
                                    "Wave Spacing: ",
                                    settings.waveSpacing.toFixed(2)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/pages/zen-garden.tsx",
                                lineNumber: 120,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                type: "range",
                                min: "0.1",
                                max: "0.8",
                                step: "0.01",
                                value: settings.waveSpacing,
                                onChange: (e)=>onUpdate({
                                        ...settings,
                                        waveSpacing: parseFloat(e.target.value)
                                    }),
                                className: "w-full"
                            }, void 0, false, {
                                fileName: "[project]/src/pages/zen-garden.tsx",
                                lineNumber: 123,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 119,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                        onClick: onDelete,
                        className: "w-full rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600",
                        children: "Delete Rock"
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 136,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 84,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/pages/zen-garden.tsx",
        lineNumber: 76,
        columnNumber: 5
    }, this);
}
function SettingsPanel({ textureName, ambientIntensity, sunIntensity, mode, onTextureChange, onAmbientChange, onSunChange, onCreateMoss }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "absolute left-4 top-4 w-56 rounded-lg bg-white/90 p-3 shadow-lg backdrop-blur",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h3", {
                className: "mb-3 font-semibold text-gray-800",
                children: "Settings"
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 170,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "space-y-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                                className: "mb-1 block text-sm text-gray-600",
                                children: "Ground Texture"
                            }, void 0, false, {
                                fileName: "[project]/src/pages/zen-garden.tsx",
                                lineNumber: 174,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("select", {
                                value: textureName,
                                onChange: (e)=>onTextureChange(e.target.value),
                                className: "block w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-black shadow-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("option", {
                                        value: "gravel",
                                        children: "Gravel"
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/zen-garden.tsx",
                                        lineNumber: 182,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("option", {
                                        value: "grass",
                                        children: "Grass"
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/zen-garden.tsx",
                                        lineNumber: 183,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/pages/zen-garden.tsx",
                                lineNumber: 177,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 173,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                                className: "block text-sm text-gray-600",
                                children: [
                                    "Ambient: ",
                                    ambientIntensity.toFixed(2)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/pages/zen-garden.tsx",
                                lineNumber: 188,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                type: "range",
                                min: "0",
                                max: "1",
                                step: "0.05",
                                value: ambientIntensity,
                                onChange: (e)=>onAmbientChange(parseFloat(e.target.value)),
                                className: "w-full"
                            }, void 0, false, {
                                fileName: "[project]/src/pages/zen-garden.tsx",
                                lineNumber: 191,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 187,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                                className: "block text-sm text-gray-600",
                                children: [
                                    "Sun: ",
                                    sunIntensity.toFixed(2)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/pages/zen-garden.tsx",
                                lineNumber: 203,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                type: "range",
                                min: "0",
                                max: "2",
                                step: "0.05",
                                value: sunIntensity,
                                onChange: (e)=>onSunChange(parseFloat(e.target.value)),
                                className: "w-full"
                            }, void 0, false, {
                                fileName: "[project]/src/pages/zen-garden.tsx",
                                lineNumber: 206,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 202,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                        onClick: onCreateMoss,
                        className: `w-full rounded px-3 py-2 text-sm font-medium ${mode === "createMoss" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`,
                        children: mode === "createMoss" ? "Click garden to place moss" : "Create Moss"
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 217,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 172,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/pages/zen-garden.tsx",
        lineNumber: 169,
        columnNumber: 5
    }, this);
}
const ZenGardenPage = ()=>{
    const [canvas, setCanvas] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const ctx = useZenGardenEditor(canvas);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "relative h-screen w-screen",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("canvas", {
                ref: setCanvas,
                className: "w-full h-full"
            }, void 0, false, {
                fileName: "[project]/src/pages/zen-garden.tsx",
                lineNumber: 238,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            ctx && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(SettingsPanel, {
                        textureName: ctx.textureName,
                        ambientIntensity: ctx.ambientIntensity,
                        sunIntensity: ctx.sunIntensity,
                        mode: ctx.mode,
                        onTextureChange: (name)=>ctx.editor.setGroundTexture(name),
                        onAmbientChange: (value)=>ctx.editor.setAmbientIntensity(value),
                        onSunChange: (value)=>ctx.editor.setSunIntensity(value),
                        onCreateMoss: ()=>ctx.editor.setMode("createMoss")
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 242,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    ctx.selectedObject?.type === "rock" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(RockEditor, {
                        rock: ctx.selectedObject,
                        onUpdate: (settings)=>ctx.editor.updateRockSettings(ctx.selectedObject.id, settings),
                        onDelete: ()=>ctx.editor.deleteRock(ctx.selectedObject.id),
                        onClose: ()=>ctx.editor.$selectedObjectId.next(null)
                    }, void 0, false, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 254,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    ctx.selectedObject?.type === "moss" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "absolute right-4 top-4 w-64 rounded-lg bg-white/90 p-4 shadow-lg backdrop-blur",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "mb-4 flex items-center justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h3", {
                                        className: "font-semibold text-gray-800",
                                        children: "Moss Settings"
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/zen-garden.tsx",
                                        lineNumber: 267,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                        onClick: ()=>ctx.editor.$selectedObjectId.next(null),
                                        className: "text-gray-500 hover:text-gray-700",
                                        children: "✕"
                                    }, void 0, false, {
                                        fileName: "[project]/src/pages/zen-garden.tsx",
                                        lineNumber: 268,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/pages/zen-garden.tsx",
                                lineNumber: 266,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                className: "text-sm text-gray-600",
                                children: "Drag points to reshape the moss."
                            }, void 0, false, {
                                fileName: "[project]/src/pages/zen-garden.tsx",
                                lineNumber: 275,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/pages/zen-garden.tsx",
                        lineNumber: 265,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true)
        ]
    }, void 0, true, {
        fileName: "[project]/src/pages/zen-garden.tsx",
        lineNumber: 237,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
const __TURBOPACK__default__export__ = ZenGardenPage;
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__8ea3fdcc._.js.map