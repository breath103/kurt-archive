import type { NextPage } from 'next';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const STORAGE_KEY = 'zen-garden';

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
  if (typeof window === 'undefined') {
    return createDefaultGarden();
  }
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

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(
      garden.plain.size.x,
      garden.plain.size.y
    );
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

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
          if (mesh) {
            mesh.position.set(point.x, 0.15, point.z);
          }
        }
      }
    };

    const handleMouseUp = () => {
      // If we were dragging a rock, save its new position
      if (draggedRockId && isDragging) {
        const mesh = rockMeshes.get(draggedRockId);
        const obj = garden.objects.find((o) => o.id === draggedRockId);
        if (mesh && obj) {
          obj.position.set(mesh.position.x, mesh.position.z);
          saveGarden(garden);
        }
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
