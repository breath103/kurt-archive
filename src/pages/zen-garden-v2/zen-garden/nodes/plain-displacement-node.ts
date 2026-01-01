import * as THREE from "three";

import type { ZenGardenRakeStroke } from "../rake-stroke";
import type { ReactiveNodeContext, ReactiveNodeInputs } from "./node";
import { ReactiveNode } from "./node";
import type { Vector2 } from "../vector2";

type PlainDisplacementNodeInputs = {
  baseMap: THREE.Texture;
  textureRepeat: Vector2;
  plainSize: Vector2;
  rakes: ZenGardenRakeStroke[];
};
type PlainDisplacementNodeOutput = THREE.Texture;
export class PlainDisplacementNode extends ReactiveNode<PlainDisplacementNodeInputs, PlainDisplacementNodeOutput> {
  private static readonly RESOLUTION = 1024;
  private static readonly MAX_STROKES = 8;
  private static readonly SAMPLES_PER_STROKE = 32;

  private static readonly vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  private static readonly fragmentShader = `
    precision highp float;

    uniform sampler2D baseDisplacement;
    uniform vec2 textureRepeat;
    uniform vec2 plainSize;

    uniform vec4 strokeData[${PlainDisplacementNode.MAX_STROKES}];
    uniform vec2 circleCenters[${PlainDisplacementNode.MAX_STROKES}];
    uniform vec2 strokePoints[${PlainDisplacementNode.MAX_STROKES * PlainDisplacementNode.SAMPLES_PER_STROKE}];
    uniform int strokeCount;

    varying vec2 vUv;

    #define PI 3.14159265359

    // Returns: x = distance to segment, y = signed perpendicular distance
    vec2 distanceToSegmentWithPerp(vec2 p, vec2 a, vec2 b) {
      vec2 ab = b - a;
      float len2 = dot(ab, ab);
      if (len2 < 0.0001) return vec2(length(p - a), 0.0);
      float t = clamp(dot(p - a, ab) / len2, 0.0, 1.0);
      vec2 closest = a + t * ab;
      float dist = length(p - closest);
      // Signed perpendicular: cross product gives signed distance
      vec2 dir = normalize(ab);
      float signedPerp = (p.x - closest.x) * dir.y - (p.y - closest.y) * dir.x;
      return vec2(dist, signedPerp);
    }

    // Returns: x = distance to path, y = signed perpendicular distance
    vec2 distanceToPathWithPerp(vec2 worldPos, int strokeIndex, int pointCount) {
      float minDist = 1000000.0;
      float perpAtMin = 0.0;
      int base = strokeIndex * ${PlainDisplacementNode.SAMPLES_PER_STROKE};
      for (int i = 0; i < ${PlainDisplacementNode.SAMPLES_PER_STROKE - 1}; i++) {
        if (i >= pointCount - 1) break;
        vec2 result = distanceToSegmentWithPerp(worldPos, strokePoints[base + i], strokePoints[base + i + 1]);
        if (result.x < minDist) {
          minDist = result.x;
          perpAtMin = result.y;
        }
      }
      return vec2(minDist, perpAtMin);
    }

    void main() {
      vec2 worldPos = (vUv - 0.5) * plainSize;

      vec2 tiledUv = fract(vUv * textureRepeat);
      float baseHeight = texture2D(baseDisplacement, tiledUv).r;

      float rakeEffect = 0.0;
      for (int i = 0; i < ${PlainDisplacementNode.MAX_STROKES}; i++) {
        if (i >= strokeCount) break;

        vec4 data = strokeData[i];
        float strokeType = data.x;
        float strokeWidth = data.y;
        float tineFrequency = data.w; // tines per unit
        if (strokeType < 0.5) continue;

        float dist;
        float perpDist;

        if (strokeType < 1.5) {
          // Circle: wave is radial (concentric rings)
          vec2 center = circleCenters[i];
          float radius = data.z;
          float distFromCenter = length(worldPos - center);
          dist = abs(distFromCenter - radius);
          perpDist = distFromCenter - radius; // radial distance from circle centerline
        } else {
          // Path: use perpendicular distance for wave
          vec2 result = distanceToPathWithPerp(worldPos, i, int(data.z));
          dist = result.x;
          perpDist = result.y;
        }

        float halfWidth = strokeWidth * 0.5;
        float influence = 1.0 - smoothstep(halfWidth * 0.7, halfWidth, dist);

        // Sine wave for ridges and grooves
        float wave = sin(perpDist * tineFrequency * PI * 2.0);
        rakeEffect += influence * wave * 1.0;
      }

      gl_FragColor = vec4(vec3(baseHeight + rakeEffect), 1.0);
    }
  `;

  private renderTarget: THREE.WebGLRenderTarget;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private material: THREE.ShaderMaterial;
  private strokeDataArray = new Float32Array(PlainDisplacementNode.MAX_STROKES * 4);
  private circleCentersArray = new Float32Array(PlainDisplacementNode.MAX_STROKES * 2);
  private strokePointsArray = new Float32Array(PlainDisplacementNode.MAX_STROKES * PlainDisplacementNode.SAMPLES_PER_STROKE * 2);

  constructor(
    context: ReactiveNodeContext,
    inputs: ReactiveNodeInputs<PlainDisplacementNodeInputs>
  ) {
    super(context, inputs);

    this.renderTarget = new THREE.WebGLRenderTarget(PlainDisplacementNode.RESOLUTION, PlainDisplacementNode.RESOLUTION, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    this.renderTarget.texture.flipY = false;

    this.material = new THREE.ShaderMaterial({
      vertexShader: PlainDisplacementNode.vertexShader,
      fragmentShader: PlainDisplacementNode.fragmentShader,
      uniforms: {
        baseDisplacement: { value: null },
        textureRepeat: { value: new THREE.Vector2(1, 1) },
        plainSize: { value: new THREE.Vector2(1, 1) },
        strokeData: { value: this.strokeDataArray },
        circleCenters: { value: this.circleCentersArray },
        strokePoints: { value: this.strokePointsArray },
        strokeCount: { value: 0 },
      },
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene = new THREE.Scene();
    this.scene.add(quad);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  protected process(context: ReactiveNodeContext, { baseMap, textureRepeat, plainSize, rakes }: PlainDisplacementNodeInputs): PlainDisplacementNodeOutput {
    this.material.uniforms.baseDisplacement.value = baseMap;
    this.material.uniforms.textureRepeat.value.set(textureRepeat.x, textureRepeat.y);
    this.material.uniforms.plainSize.value.set(plainSize.x, plainSize.y);

    this.strokeDataArray.fill(0);
    this.circleCentersArray.fill(0);
    this.strokePointsArray.fill(0);

    const count = Math.min(rakes.length, PlainDisplacementNode.MAX_STROKES);
    for (let i = 0; i < count; i++) {
      const rake = rakes[i];
      const encoded = rake.serialize();
      const pos = rake.object.position;

      // Tine frequency: number of forks across the stroke width
      const tineFrequency = encoded.numberOfForks / encoded.width;

      if (encoded.path.type === "circle") {
        this.strokeDataArray[i * 4] = 1;
        this.strokeDataArray[i * 4 + 1] = encoded.width;
        this.strokeDataArray[i * 4 + 2] = encoded.path.radius;
        this.strokeDataArray[i * 4 + 3] = tineFrequency;
        this.circleCentersArray[i * 2] = encoded.path.center.x + pos.x;
        this.circleCentersArray[i * 2 + 1] = encoded.path.center.y + pos.y;
      } else {
        const points = encoded.path.points.map(p => new THREE.Vector3(p.x + pos.x, p.y + pos.y, 0));
        if (points.length < 2) continue;

        const curve = new THREE.CatmullRomCurve3(points, encoded.path.closed);
        const sampled = curve.getPoints(PlainDisplacementNode.SAMPLES_PER_STROKE - 1);

        this.strokeDataArray[i * 4] = 2;
        this.strokeDataArray[i * 4 + 1] = encoded.width;
        this.strokeDataArray[i * 4 + 2] = sampled.length;
        this.strokeDataArray[i * 4 + 3] = tineFrequency;

        const base = i * PlainDisplacementNode.SAMPLES_PER_STROKE * 2;
        for (let j = 0; j < sampled.length; j++) {
          this.strokePointsArray[base + j * 2] = sampled[j].x;
          this.strokePointsArray[base + j * 2 + 1] = sampled[j].y;
        }
      }
    }

    this.material.uniforms.strokeCount.value = count;

    const prev = context.textureRenderer.getRenderTarget();
    context.textureRenderer.setRenderTarget(this.renderTarget);
    context.textureRenderer.render(this.scene, this.camera);
    context.textureRenderer.setRenderTarget(prev);

    return this.renderTarget.texture;
  }

  dispose(): void {
    this.renderTarget.dispose();
    this.material.dispose();
  }
}
