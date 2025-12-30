import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  from,
  map,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import * as THREE from 'three';
// eslint-disable-next-line import/extensions
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import type { GroundTextureGenerator } from './ground-texture';
import { createGroundTextureGenerator } from './ground-texture';
import type { GravelTextureSet, GroundMaterial } from './materials';
import {
  createGroundMaterial,
  disposeGravelTextures,
  loadGravelTextures,
} from './materials';
import { loadGarden, saveGarden } from './storage';
import type { RockWaveSettings, ZenGarden, ZenGardenObject } from './types';
import { DEFAULT_ROCK_WAVE_SETTINGS } from './types';

export type TextureName = 'gravel' | 'grass';

const TEXTURE_PATHS: Record<TextureName, string> = {
  gravel: '/textures/gravel',
  grass: '/textures/grass',
};

export class ZenGardenEditor {
  // RxJS Subjects
  readonly $textureName = new BehaviorSubject<TextureName>('gravel');

  readonly $selectedRockId = new BehaviorSubject<string | null>(null);

  readonly $regenerateTexture = new Subject<void>();

  readonly $rocks = new BehaviorSubject<ZenGardenObject[]>([]);

  // Three.js objects
  private scene: THREE.Scene;

  private camera: THREE.PerspectiveCamera;

  private renderer: THREE.WebGLRenderer;

  private controls: OrbitControls;

  private ground: THREE.Mesh | null = null;

  private rockMeshes = new Map<string, THREE.Mesh>();

  private directionalLight: THREE.DirectionalLight;

  private arrowHelper: THREE.ArrowHelper;

  // Texture/material objects
  private gravelTextures: GravelTextureSet | null = null;

  private groundTextureGen: GroundTextureGenerator | null = null;

  private groundMat: GroundMaterial | null = null;

  private textureLoader = new THREE.TextureLoader();

  // Garden data
  private garden: ZenGarden;

  // State
  private lightAngle = Math.PI / 4;

  private readonly lightHeight = 10;

  private readonly lightRadius = 5;

  private disposed = false;

  // Dragging state
  private draggedRockId: string | null = null;

  private isDragging = false;

  private mouseDownPos = { x: 0, y: 0 };

  // Raycaster
  private raycaster = new THREE.Raycaster();

  private mouse = new THREE.Vector2();

  constructor(private canvas: HTMLCanvasElement) {
    // Load garden data
    this.garden = loadGarden();
    this.$rocks.next(this.garden.objects);

    // Setup Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;

    // Lighting
    this.arrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 3, 0),
      1.5,
      0xffaa00,
      0.4,
      0.2
    );
    this.scene.add(this.arrowHelper);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0);
    this.scene.add(ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.scene.add(this.directionalLight);
    this.updateLightPosition();

    // Create border around garden
    this.createGardenBorder();

    // Create rock meshes
    this.garden.objects.forEach((obj) => {
      if (obj.type === 'rock') {
        const mesh = this.createRockMesh(obj);
        this.scene.add(mesh);
        this.rockMeshes.set(obj.id, mesh);
      }
    });

    // Setup RxJS subscriptions
    this.setupSubscriptions();

    // Setup event listeners
    this.setupEventListeners();

    // Start animation loop
    this.animate();

    // Load initial texture
    this.$textureName.next('gravel');
  }

  private setupSubscriptions(): void {
    // When texture name changes, load new textures
    this.$textureName
      .pipe(
        distinctUntilChanged(),
        switchMap((name) => {
          const path = TEXTURE_PATHS[name];
          return from(loadGravelTextures(this.textureLoader, path));
        }),
        tap((textures) => {
          if (this.disposed) return;

          // Dispose old textures
          if (this.gravelTextures) {
            disposeGravelTextures(this.gravelTextures);
          }
          if (this.groundTextureGen) {
            this.groundTextureGen.dispose();
          }
          if (this.groundMat) {
            this.groundMat.material.dispose();
          }
          if (this.ground) {
            this.scene.remove(this.ground);
            this.ground.geometry.dispose();
          }

          this.gravelTextures = textures;

          // Create new ground texture generator
          this.groundTextureGen = createGroundTextureGenerator(
            this.renderer,
            textures,
            {
              resolution: 2048,
              gardenSize: this.garden.plain.size,
              tileSize: 2.0,
            }
          );

          // Create new ground material
          this.groundMat = createGroundMaterial(
            textures,
            this.groundTextureGen.normalDispTexture.texture,
            {
              tileSize: 2.0,
              displacementScale: 0.05,
              gardenSize: this.garden.plain.size,
            }
          );

          // Update light uniform
          this.updateLightPosition();

          // Create ground mesh
          const segments = 512;
          const groundGeometry = new THREE.PlaneGeometry(
            this.garden.plain.size.x,
            this.garden.plain.size.y,
            segments,
            segments
          );
          this.ground = new THREE.Mesh(groundGeometry, this.groundMat.material);
          this.ground.rotation.x = -Math.PI / 2;
          this.scene.add(this.ground);

          // Regenerate texture
          this.$regenerateTexture.next();
        })
      )
      .subscribe();

    // When regenerate texture event fires, update the ground texture
    combineLatest([this.$regenerateTexture, this.$rocks])
      .pipe(
        filter(() => this.groundTextureGen !== null),
        map(([, rocks]) => rocks)
      )
      .subscribe((rocks) => {
        this.groundTextureGen?.update(rocks);
      });

    // When selected rock changes, update visual appearance
    this.$selectedRockId
      .pipe(distinctUntilChanged())
      .subscribe((selectedId) => {
        this.updateRockSelectionVisuals(selectedId);
      });
  }

  private updateRockSelectionVisuals(selectedId: string | null): void {
    // Reset all rocks to default appearance
    this.rockMeshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissive.setHex(0x000000);
      material.emissiveIntensity = 0;
    });

    // Highlight selected rock
    if (selectedId) {
      const selectedMesh = this.rockMeshes.get(selectedId);
      if (selectedMesh) {
        const material = selectedMesh.material as THREE.MeshStandardMaterial;
        material.emissive.setHex(0xffaa00); // Orange glow
        material.emissiveIntensity = 0.4;
      }
    }
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('click', this.handleClick);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private removeEventListeners(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('click', this.handleClick);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleMouseDown = (event: MouseEvent): void => {
    this.mouseDownPos = { x: event.clientX, y: event.clientY };
    this.isDragging = false;

    this.updateMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const rockMeshArray = Array.from(this.rockMeshes.values());
    const intersects = this.raycaster.intersectObjects(rockMeshArray);

    if (intersects.length > 0) {
      this.draggedRockId = intersects[0].object.userData.id;
      this.controls.enabled = false;
    }
  };

  private handleMouseMove = (event: MouseEvent): void => {
    const dx = event.clientX - this.mouseDownPos.x;
    const dy = event.clientY - this.mouseDownPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > 5) {
      this.isDragging = true;
    }

    if (this.draggedRockId && this.isDragging && this.ground) {
      this.updateMousePosition(event);
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const groundIntersects = this.raycaster.intersectObject(this.ground);

      if (groundIntersects.length > 0) {
        const { point } = groundIntersects[0];
        const mesh = this.rockMeshes.get(this.draggedRockId);
        const obj = this.garden.objects.find(
          (o) => o.id === this.draggedRockId
        );
        if (mesh && obj) {
          mesh.position.set(point.x, 0.15, point.z);
          obj.position.x = point.x;
          obj.position.y = point.z;
        }
      }
    }
  };

  private handleMouseUp = (): void => {
    if (this.draggedRockId && this.isDragging) {
      this.saveAndRegenerate();
    }
    this.draggedRockId = null;
    this.controls.enabled = true;
  };

  private handleClick = (event: MouseEvent): void => {
    if (this.isDragging) return;

    this.updateMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const rockMeshArray = Array.from(this.rockMeshes.values());
    const rockIntersects = this.raycaster.intersectObjects(rockMeshArray);

    if (rockIntersects.length > 0) {
      const clickedId = rockIntersects[0].object.userData.id;
      // Toggle selection: deselect if clicking already selected rock
      if (this.$selectedRockId.value === clickedId) {
        this.$selectedRockId.next(null);
      } else {
        this.$selectedRockId.next(clickedId);
      }
      return;
    }

    this.$selectedRockId.next(null);

    if (!this.ground) return;
    const groundIntersects = this.raycaster.intersectObject(this.ground);
    if (groundIntersects.length > 0) {
      const { point } = groundIntersects[0];
      this.addRock(point.x, point.z);
    }
  };

  private handleResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    const rotateSpeed = 0.1;
    if (event.key === 'ArrowLeft' || event.key === 'a') {
      this.lightAngle -= rotateSpeed;
      this.updateLightPosition();
    } else if (event.key === 'ArrowRight' || event.key === 'd') {
      this.lightAngle += rotateSpeed;
      this.updateLightPosition();
    }
  };

  private updateMousePosition(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private updateLightPosition(): void {
    const x = Math.cos(this.lightAngle) * this.lightRadius;
    const z = Math.sin(this.lightAngle) * this.lightRadius;
    this.directionalLight.position.set(x, this.lightHeight, z);

    if (this.groundMat) {
      this.groundMat.uniforms.lightDir.value
        .set(x, this.lightHeight, z)
        .normalize();
    }

    const lightDir = new THREE.Vector3(x, this.lightHeight, z).normalize();
    this.arrowHelper.setDirection(lightDir.negate());
    const edgePos = new THREE.Vector3(x, 3, z).normalize().multiplyScalar(4);
    this.arrowHelper.position.copy(edgePos);
  }

  private createGardenBorder(): void {
    const { x: width, y: depth } = this.garden.plain.size;
    const borderHeight = 0.3;
    const borderThickness = 0.15;

    const borderMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.8,
    });

    // Create 4 border pieces
    const borders: Array<{
      size: [number, number, number];
      pos: [number, number, number];
    }> = [
      // Front (positive Z)
      {
        size: [width + borderThickness * 2, borderHeight, borderThickness],
        pos: [0, borderHeight / 2, depth / 2 + borderThickness / 2],
      },
      // Back (negative Z)
      {
        size: [width + borderThickness * 2, borderHeight, borderThickness],
        pos: [0, borderHeight / 2, -depth / 2 - borderThickness / 2],
      },
      // Left (negative X)
      {
        size: [borderThickness, borderHeight, depth],
        pos: [-width / 2 - borderThickness / 2, borderHeight / 2, 0],
      },
      // Right (positive X)
      {
        size: [borderThickness, borderHeight, depth],
        pos: [width / 2 + borderThickness / 2, borderHeight / 2, 0],
      },
    ];

    borders.forEach(({ size, pos }) => {
      const geometry = new THREE.BoxGeometry(...size);
      const mesh = new THREE.Mesh(geometry, borderMaterial);
      mesh.position.set(...pos);
      this.scene.add(mesh);
    });
  }

  private createRockMesh(rock: ZenGardenObject): THREE.Mesh {
    const rockGeometry = new THREE.SphereGeometry(0.3, 8, 6);
    rockGeometry.scale(1, 0.6, 1);
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.9,
    });
    const mesh = new THREE.Mesh(rockGeometry, rockMaterial);
    mesh.position.set(rock.position.x, 0.15, rock.position.y);
    mesh.userData.id = rock.id;
    return mesh;
  }

  private animate = (): void => {
    if (this.disposed) return;
    requestAnimationFrame(this.animate);
    this.controls.update();
    if (this.groundMat) {
      this.groundMat.uniforms.cameraPos.value.copy(this.camera.position);
    }
    this.renderer.render(this.scene, this.camera);
  };

  private saveAndRegenerate(): void {
    saveGarden(this.garden);
    this.$rocks.next([...this.garden.objects]);
    this.$regenerateTexture.next();
  }

  // Public methods for UI interaction

  addRock(x: number, z: number): void {
    const newRock: ZenGardenObject = {
      id: crypto.randomUUID(),
      type: 'rock',
      position: { x, y: z },
    };

    this.garden.objects.push(newRock);
    const mesh = this.createRockMesh(newRock);
    this.scene.add(mesh);
    this.rockMeshes.set(newRock.id, mesh);

    this.saveAndRegenerate();

    // Auto-select the new rock
    this.$selectedRockId.next(newRock.id);
  }

  deleteRock(id: string): void {
    this.garden.objects = this.garden.objects.filter((o) => o.id !== id);

    const mesh = this.rockMeshes.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.rockMeshes.delete(id);
    }

    if (this.$selectedRockId.value === id) {
      this.$selectedRockId.next(null);
    }

    this.saveAndRegenerate();
  }

  updateRockSettings(id: string, settings: RockWaveSettings): void {
    const rock = this.garden.objects.find((o) => o.id === id);
    if (rock) {
      rock.waveSettings = settings;
      this.saveAndRegenerate();
    }
  }

  getRock(id: string): ZenGardenObject | undefined {
    return this.garden.objects.find((o) => o.id === id);
  }

  setTexture(name: TextureName): void {
    this.$textureName.next(name);
  }

  dispose(): void {
    this.disposed = true;
    this.removeEventListeners();

    if (this.gravelTextures) {
      disposeGravelTextures(this.gravelTextures);
    }
    if (this.groundTextureGen) {
      this.groundTextureGen.dispose();
    }
    if (this.groundMat) {
      this.groundMat.material.dispose();
    }
    if (this.ground) {
      this.ground.geometry.dispose();
    }

    this.rockMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });

    this.renderer.dispose();
  }
}

export { DEFAULT_ROCK_WAVE_SETTINGS };
