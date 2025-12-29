import type { NextPage } from 'next';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const STORAGE_KEY = 'zen-garden';
const MAX_ROCKS = 50;

// Vertex shader
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// Fragment shader
const fragmentShader = `
  uniform vec2 rockPositions[${MAX_ROCKS}];
  uniform int rockCount;
  uniform vec2 planeSize;
  uniform vec3 lightDir;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  const float PI = 3.14159265359;
  const float waveCount = 5.0;      // number of waves per rock
  const float waveSpacing = 0.3;    // distance between waves
  const float rockRadius = 0.35;    // where waves start
  const float waveHeight = 0.15;    // amplitude for normal calculation

  // Hash functions for procedural noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Smooth noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Get normal perturbation from noise (using finite differences)
  vec2 noiseNormal(vec2 p, float scale, float strength) {
    float eps = 0.125;
    float n = noise(p * scale);
    float nx = noise((p + vec2(eps, 0.0)) * scale);
    float ny = noise((p + vec2(0.0, eps)) * scale);

    // Gradient
    return vec2(n - nx, n - ny) * strength / eps;
  }

  void main() {
    vec3 sandColor = vec3(0.9, 0.9, 0.9);

    // Accumulated normal perturbation
    vec3 normal = vec3(0.0, 1.0, 0.0); // start with flat normal (pointing up)

    float maxWaveRadius = rockRadius + waveCount * waveSpacing;

    // Macro waves around rocks
    for (int i = 0; i < ${MAX_ROCKS}; i++) {
      if (i >= rockCount) break;

      vec2 rockPos = rockPositions[i];
      vec2 toPoint = vWorldPos.xz - rockPos;
      float dist = length(toPoint);

      // Only draw waves between rock radius and max wave radius
      if (dist > rockRadius && dist < maxWaveRadius) {
        float adjustedDist = dist - rockRadius;

        // Continuous sine wave
        float phase = adjustedDist / waveSpacing * PI * 2.0;

        // Wave height derivative (for normal calculation)
        float derivative = cos(phase) * (2.0 * PI / waveSpacing) * waveHeight;

        // Radial direction from rock center
        vec2 radialDir = normalize(toPoint);

        // Perturb normal based on wave slope
        normal.xz -= radialDir * derivative;
      }
    }

    // Micro pebble/grain noise - multiple octaves for natural look
    vec2 pos = vWorldPos.xz;
    vec2 microNormal = vec2(0.0);
    microNormal += noiseNormal(pos, 20.0, 0.15);  // medium grain
    microNormal += noiseNormal(pos, 50.0, 0.08);  // fine grain
    microNormal += noiseNormal(pos, 100.0, 0.04); // very fine grain

    normal.xz += microNormal;

    // Normalize the perturbed normal
    normal = normalize(normal);

    // Simple directional lighting
    float lighting = dot(normal, normalize(lightDir));
    lighting = lighting * 0.4 + 0.6; // remap to avoid too dark

    vec3 color = sandColor * lighting;
    gl_FragColor = vec4(color, 1.0);
  }
`;

interface ZenGardenData {
  objects: Array<{
    id: string;
    type: 'rock';
    position: { x: number; y: number };
  }>;
  plain: {
    size: { x: number; y: number };
  };
}

interface ZenGarden {
  objects: Array<ZenGardenObject>;
  plain: {
    size: THREE.Vector2;
  };
}

interface ZenGardenObject {
  id: string;
  type: 'rock';
  position: THREE.Vector2;
}

function loadGarden(): ZenGarden {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return createDefaultGarden();
  }
  try {
    const data: ZenGardenData = JSON.parse(stored);
    return {
      objects: data.objects.map((obj) => ({
        id: obj.id,
        type: obj.type,
        position: new THREE.Vector2(obj.position.x, obj.position.y),
      })),
      plain: {
        size: new THREE.Vector2(data.plain.size.x, data.plain.size.y),
      },
    };
  } catch {
    return createDefaultGarden();
  }
}

function saveGarden(garden: ZenGarden): void {
  const data: ZenGardenData = {
    objects: garden.objects.map((obj) => ({
      id: obj.id,
      type: obj.type,
      position: { x: obj.position.x, y: obj.position.y },
    })),
    plain: {
      size: { x: garden.plain.size.x, y: garden.plain.size.y },
    },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function createDefaultGarden(): ZenGarden {
  return {
    objects: [],
    plain: {
      size: new THREE.Vector2(10, 10),
    },
  };
}

const ZenGardenPage: NextPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Load garden state
    const garden = loadGarden();
    const rockMeshes = new Map<string, THREE.Mesh>();

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 8);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;

    // Ground plane with shader material
    const groundGeometry = new THREE.PlaneGeometry(
      garden.plain.size.x,
      garden.plain.size.y
    );

    // Initialize rock positions array for shader
    const rockPositionsArray = new Array(MAX_ROCKS)
      .fill(null)
      .map(() => new THREE.Vector2(0, 0));

    const groundUniforms = {
      rockPositions: { value: rockPositionsArray },
      rockCount: { value: 0 },
      planeSize: {
        value: new THREE.Vector2(garden.plain.size.x, garden.plain.size.y),
      },
      lightDir: { value: new THREE.Vector3(5, 10, 5).normalize() },
    };

    const groundMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: groundUniforms,
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Function to update shader with current rock positions
    function updateRockPositionsUniform() {
      const rocks = garden.objects.filter((o) => o.type === 'rock');
      groundUniforms.rockCount.value = rocks.length;
      rocks.forEach((rock, i) => {
        if (i < MAX_ROCKS) {
          rockPositionsArray[i].set(rock.position.x, rock.position.y);
        }
      });
    }

    // Initial update
    updateRockPositionsUniform();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Create rock mesh
    function createRockMesh(id: string, position: THREE.Vector2): THREE.Mesh {
      const geometry = new THREE.SphereGeometry(0.3, 8, 6);
      geometry.scale(1, 0.6, 1); // flatten it a bit
      const material = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.9,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(position.x, 0.15, position.y);
      mesh.userData.id = id; // store id for drag lookup
      return mesh;
    }

    // Render existing objects
    garden.objects.forEach((obj) => {
      if (obj.type === 'rock') {
        const mesh = createRockMesh(obj.id, obj.position);
        scene.add(mesh);
        rockMeshes.set(obj.id, mesh);
      }
    });

    // Raycaster for click detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Drag state
    let draggedRockId: string | null = null;
    let isDragging = false;
    let mouseDownPos = { x: 0, y: 0 };

    const updateMousePosition = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleMouseDown = (event: MouseEvent) => {
      mouseDownPos = { x: event.clientX, y: event.clientY };
      isDragging = false;

      updateMousePosition(event);
      raycaster.setFromCamera(mouse, camera);

      // Check if we clicked on a rock
      const rockMeshArray = Array.from(rockMeshes.values());
      const intersects = raycaster.intersectObjects(rockMeshArray);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        draggedRockId = hitMesh.userData.id;
        controls.enabled = false; // disable orbit while dragging rock
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const dx = event.clientX - mouseDownPos.x;
      const dy = event.clientY - mouseDownPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        isDragging = true;
      }

      // If dragging a rock, update its position
      if (draggedRockId && isDragging) {
        updateMousePosition(event);
        raycaster.setFromCamera(mouse, camera);
        const groundIntersects = raycaster.intersectObject(ground);

        if (groundIntersects.length > 0) {
          const { point } = groundIntersects[0];
          const mesh = rockMeshes.get(draggedRockId);
          const obj = garden.objects.find((o) => o.id === draggedRockId);
          if (mesh && obj) {
            mesh.position.set(point.x, 0.15, point.z);
            obj.position.set(point.x, point.z);
            updateRockPositionsUniform();
          }
        }
      }
    };

    const handleMouseUp = () => {
      // If we were dragging a rock, save to localStorage
      if (draggedRockId && isDragging) {
        saveGarden(garden);
      }

      draggedRockId = null;
      controls.enabled = true;
    };

    const handleClick = (event: MouseEvent) => {
      // Don't place new rock if we were dragging
      if (isDragging) return;

      updateMousePosition(event);
      raycaster.setFromCamera(mouse, camera);

      // Check if we clicked on a rock (don't place new one)
      const rockMeshArray = Array.from(rockMeshes.values());
      const rockIntersects = raycaster.intersectObjects(rockMeshArray);
      if (rockIntersects.length > 0) return;

      // Check if we clicked on ground
      const groundIntersects = raycaster.intersectObject(ground);
      if (groundIntersects.length > 0) {
        const { point } = groundIntersects[0];

        // Create new rock object
        const newObject: ZenGardenObject = {
          id: crypto.randomUUID(),
          type: 'rock',
          position: new THREE.Vector2(point.x, point.z),
        };

        garden.objects.push(newObject);
        saveGarden(garden);

        // Add mesh to scene
        const mesh = createRockMesh(newObject.id, newObject.position);
        scene.add(mesh);
        rockMeshes.set(newObject.id, mesh);

        // Update shader
        updateRockPositionsUniform();
      }
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('click', handleClick);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="block" />;
};

export default ZenGardenPage;
