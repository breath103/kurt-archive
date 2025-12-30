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
} from "rxjs";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { GroundTextureGenerator } from "./ground-texture";
import { createGroundTextureGenerator } from "./ground-texture";
import type { GravelTextureSet, GroundMaterial } from "./materials";
import {
  createGroundMaterial,
  disposeGravelTextures,
  loadGravelTextures,
} from "./materials";
import { loadGarden, saveGarden } from "./storage";
import type {
  GroundTextureName,
  RockWaveSettings,
  ZenGarden,
  ZenGardenGround,
  ZenGardenMoss,
  ZenGardenObject,
  ZenGardenRock,
} from "./types";
import { DEFAULT_ROCK_WAVE_SETTINGS } from "./types";

const TEXTURE_PATHS: Record<GroundTextureName, string> = {
  gravel: "/textures/gravel",
  grass: "/textures/grass",
};

export type EditorMode = "normal" | "createMoss";

export class ZenGardenEditor {
  // RxJS Subjects
  readonly $ground: BehaviorSubject<ZenGardenGround>;
  readonly $groundTextureName;
  readonly $selectedObjectId = new BehaviorSubject<string | null>(null);
  readonly $regenerateTexture = new Subject<void>();
  readonly $objects = new BehaviorSubject<ZenGardenObject[]>([]);
  readonly $ambientIntensity = new BehaviorSubject<number>(0.4);
  readonly $sunIntensity = new BehaviorSubject<number>(0.8);
  readonly $mode = new BehaviorSubject<EditorMode>("normal");

  // Three.js objects
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private groundMesh: THREE.Mesh | null = null;
  private rockMeshes = new Map<string, THREE.Mesh>();
  private mossMeshes = new Map<string, THREE.Mesh>();
  private mossPointMeshes = new Map<string, THREE.Mesh[]>();
  private ambientLight: THREE.AmbientLight;
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
  private draggedMossPoint: { mossId: string; pointIndex: number } | null = null;
  private isDragging = false;
  private mouseDownPos = { x: 0, y: 0 };

  // Raycaster
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  constructor(private canvas: HTMLCanvasElement) {
    // Load garden data
    this.garden = loadGarden();
    this.$ground = new BehaviorSubject(this.garden.ground);
    this.$groundTextureName = this.$ground.pipe(
      map((g) => g.textureName),
      distinctUntilChanged()
    );
    this.$objects.next(this.garden.objects);

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

    this.ambientLight = new THREE.AmbientLight(
      0xffffff,
      this.$ambientIntensity.value
    );
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(
      0xffffff,
      this.$sunIntensity.value
    );
    this.scene.add(this.directionalLight);
    this.updateLightPosition();

    // Create border around garden
    this.createGardenBorder();

    // Create object meshes
    this.garden.objects.forEach((obj) => {
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

  private setupSubscriptions(): void {
    // When texture name changes, load new textures
    this.$groundTextureName
      .pipe(
        switchMap((name) => {
          const path = TEXTURE_PATHS[name];
          return from(loadGravelTextures(this.textureLoader, path));
        }),
        tap((textures) => {
          if (this.disposed) return;

          const ground = this.$ground.value;

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
          if (this.groundMesh) {
            this.scene.remove(this.groundMesh);
            this.groundMesh.geometry.dispose();
          }

          this.gravelTextures = textures;

          // Create new ground texture generator
          this.groundTextureGen = createGroundTextureGenerator(
            this.renderer,
            textures,
            ground
          );

          // Create new ground material
          this.groundMat = createGroundMaterial(
            textures,
            this.groundTextureGen.normalDispTexture.texture,
            ground
          );

          // Update light uniforms
          this.updateLightPosition();
          this.groundMat.uniforms.ambientIntensity.value =
            this.$ambientIntensity.value;
          this.groundMat.uniforms.sunIntensity.value = this.$sunIntensity.value;

          // Create ground mesh
          const segments = 512;
          const groundGeometry = new THREE.PlaneGeometry(
            ground.size.x,
            ground.size.y,
            segments,
            segments
          );
          this.groundMesh = new THREE.Mesh(groundGeometry, this.groundMat.material);
          this.groundMesh.rotation.x = -Math.PI / 2;
          this.scene.add(this.groundMesh);

          // Regenerate texture
          this.$regenerateTexture.next();
        })
      )
      .subscribe();

    // When regenerate texture event fires, update the ground texture
    combineLatest([this.$regenerateTexture, this.$objects])
      .pipe(
        filter(() => this.groundTextureGen !== null),
        map(([, objects]) => objects.filter((o) => o.type === "rock"))
      )
      .subscribe((rocks) => {
        this.groundTextureGen?.update(rocks);
      });

    // When selected object changes, update visual appearance
    this.$selectedObjectId
      .pipe(distinctUntilChanged())
      .subscribe((selectedId) => {
        this.updateRockSelectionVisuals(selectedId);
        this.updateMossSelectionVisuals(selectedId);
      });

    // Sync ambient intensity to Three.js light and shader
    this.$ambientIntensity.pipe(distinctUntilChanged()).subscribe((value) => {
      this.ambientLight.intensity = value;
      if (this.groundMat) {
        this.groundMat.uniforms.ambientIntensity.value = value;
      }
    });

    // Sync sun intensity to Three.js light and shader
    this.$sunIntensity.pipe(distinctUntilChanged()).subscribe((value) => {
      this.directionalLight.intensity = value;
      if (this.groundMat) {
        this.groundMat.uniforms.sunIntensity.value = value;
      }
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

  private updateMossSelectionVisuals(selectedId: string | null): void {
    // Hide all moss points first
    this.hideAllMossPoints();

    // Show points for selected moss
    if (selectedId) {
      const obj = this.garden.objects.find((o) => o.id === selectedId);
      if (obj?.type === "moss") {
        this.showMossPoints(selectedId);
      }
    }
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("click", this.handleClick);
    window.addEventListener("resize", this.handleResize);
    window.addEventListener("keydown", this.handleKeyDown);
  }

  private removeEventListeners(): void {
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("click", this.handleClick);
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  private handleMouseDown = (event: MouseEvent): void => {
    this.mouseDownPos = { x: event.clientX, y: event.clientY };
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
        pointIndex: pointMesh.userData.pointIndex,
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

  private handleMouseMove = (event: MouseEvent): void => {
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
      const moss = this.garden.objects.find((o) => o.id === mossId);

      if (moss && moss.type === "moss") {
        // Update the point in the polygon path
        moss.polygonPath[pointIndex] = { x: point.x, y: point.z };

        // Update the mesh geometry
        this.updateMossGeometry(mossId);
      }
      return;
    }

    // Handle rock dragging
    if (this.draggedRockId && this.isDragging) {
      const mesh = this.rockMeshes.get(this.draggedRockId);
      const obj = this.garden.objects.find(
        (o) => o.id === this.draggedRockId
      );
      if (mesh && obj && obj.type === "rock") {
        mesh.position.set(point.x, 0.15, point.z);
        obj.position.x = point.x;
        obj.position.y = point.z;
      }
    }
  };

  private handleMouseUp = (): void => {
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

  private handleClick = (event: MouseEvent): void => {
    if (this.isDragging) return;

    this.updateMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check all object meshes for selection
    const allMeshes = [
      ...Array.from(this.rockMeshes.values()),
      ...Array.from(this.mossMeshes.values()),
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

  private handleResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    const rotateSpeed = 0.1;
    if (event.key === "ArrowLeft" || event.key === "a") {
      this.lightAngle -= rotateSpeed;
      this.updateLightPosition();
    } else if (event.key === "ArrowRight" || event.key === "d") {
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
    const { x: width, y: depth } = this.garden.ground.size;
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

  private createRockMesh(rock: ZenGardenRock): THREE.Mesh {
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

  private createMossMesh(moss: ZenGardenMoss): THREE.Mesh {
    const shape = new THREE.Shape();
    const points = moss.polygonPath;

    // ShapeGeometry rotated by -PI/2 around X maps shape Y to world -Z
    // Negate Y so polygon coords match world XZ coords
    if (points.length > 0) {
      shape.moveTo(points[0].x, -points[0].y);
      for (let i = 1; i < points.length; i++) {
        shape.lineTo(points[i].x, -points[i].y);
      }
      shape.closePath();
    }

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a7c23,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 1.0; // Float above ground for visibility
    mesh.userData.id = moss.id;
    return mesh;
  }

  private createMossPointMeshes(moss: ZenGardenMoss): THREE.Mesh[] {
    const pointMaterial = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.3,
    });

    return moss.polygonPath.map((point, index) => {
      const geometry = new THREE.SphereGeometry(0.1, 8, 8);
      const mesh = new THREE.Mesh(geometry, pointMaterial);
      mesh.position.set(point.x, 1.05, point.y);
      mesh.userData.mossId = moss.id;
      mesh.userData.pointIndex = index;
      return mesh;
    });
  }

  private showMossPoints(mossId: string): void {
    const moss = this.garden.objects.find((o) => o.id === mossId);
    if (!moss || moss.type !== "moss") return;

    // Remove existing point meshes
    this.hideMossPoints(mossId);

    // Create and add new point meshes
    const pointMeshes = this.createMossPointMeshes(moss);
    pointMeshes.forEach((mesh) => this.scene.add(mesh));
    this.mossPointMeshes.set(mossId, pointMeshes);
  }

  private hideMossPoints(mossId: string): void {
    const existingPoints = this.mossPointMeshes.get(mossId);
    if (existingPoints) {
      existingPoints.forEach((mesh) => {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
      });
      this.mossPointMeshes.delete(mossId);
    }
  }

  private hideAllMossPoints(): void {
    this.mossPointMeshes.forEach((_, mossId) => {
      this.hideMossPoints(mossId);
    });
  }

  private updateMossGeometry(mossId: string): void {
    const moss = this.garden.objects.find((o) => o.id === mossId);
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
    this.$objects.next([...this.garden.objects]);
    this.$regenerateTexture.next();
  }

  // Public methods for UI interaction

  addRock(x: number, z: number): void {
    const newRock: ZenGardenRock = {
      id: crypto.randomUUID(),
      type: "rock",
      position: { x, y: z },
    };

    this.garden.objects.push(newRock);
    const mesh = this.createRockMesh(newRock);
    this.scene.add(mesh);
    this.rockMeshes.set(newRock.id, mesh);

    this.saveAndRegenerate();

    // Auto-select the new rock
    this.$selectedObjectId.next(newRock.id);
  }

  addMoss(x: number, z: number): void {
    const size = 0.5; // Initial size of moss square
    const newMoss: ZenGardenMoss = {
      id: crypto.randomUUID(),
      type: "moss",
      polygonPath: [
        { x: x - size, y: z - size },
        { x: x + size, y: z - size },
        { x: x + size, y: z + size },
        { x: x - size, y: z + size },
      ],
    };

    this.garden.objects.push(newMoss);
    const mesh = this.createMossMesh(newMoss);
    this.scene.add(mesh);
    this.mossMeshes.set(newMoss.id, mesh);

    this.saveAndRegenerate();

    // Auto-select the new moss
    this.$selectedObjectId.next(newMoss.id);
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

    if (this.$selectedObjectId.value === id) {
      this.$selectedObjectId.next(null);
    }

    this.saveAndRegenerate();
  }
  
  updateRockSettings(id: string, settings: RockWaveSettings): void {
    const rock = this.garden.objects.find((o) => o.id === id);
    if (rock && rock.type === "rock") {
      rock.waveSettings = settings;
      this.saveAndRegenerate();
    }
  }
  
  getObject(id: string): ZenGardenObject | undefined {
    return this.garden.objects.find((o) => o.id === id);
  }
  
  setGroundTexture(name: GroundTextureName): void {
    const current = this.$ground.value;
    this.$ground.next({ ...current, textureName: name });
    this.garden.ground = this.$ground.value;
    saveGarden(this.garden);
  }
  
  setAmbientIntensity(value: number): void {
    this.$ambientIntensity.next(value);
  }
  
  setSunIntensity(value: number): void {
    this.$sunIntensity.next(value);
  }

  setMode(mode: EditorMode): void {
    this.$mode.next(mode);
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
    if (this.groundMesh) {
      this.groundMesh.geometry.dispose();
    }

    this.rockMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });

    this.renderer.dispose();
  }
}

export { DEFAULT_ROCK_WAVE_SETTINGS };
