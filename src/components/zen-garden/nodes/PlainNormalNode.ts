import * as THREE from "three";

import type { ReactiveNodeContext, ReactiveNodeInputs } from "./Node";
import { ReactiveNode } from "./Node";

type PlainNormalNodeInputs = {
  displacement: THREE.Texture;
  strength: number;
};

export class PlainNormalNode extends ReactiveNode<PlainNormalNodeInputs, THREE.Texture> {
  private static readonly RESOLUTION = 1024;

  private static readonly vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  private static readonly fragmentShader = `
    precision highp float;

    uniform sampler2D displacement;
    uniform float strength;
    uniform vec2 texelSize;

    varying vec2 vUv;

    void main() {
      float hL = texture2D(displacement, vUv - vec2(texelSize.x, 0.0)).r;
      float hR = texture2D(displacement, vUv + vec2(texelSize.x, 0.0)).r;
      float hD = texture2D(displacement, vUv - vec2(0.0, texelSize.y)).r;
      float hU = texture2D(displacement, vUv + vec2(0.0, texelSize.y)).r;

      vec3 normal = normalize(vec3(hL - hR, hD - hU, 1.0 / strength));

      // Encode normal to 0-1 range for storage
      gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
    }
  `;

  private renderTarget: THREE.WebGLRenderTarget;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private material: THREE.ShaderMaterial;

  constructor(
    context: ReactiveNodeContext,
    inputs: ReactiveNodeInputs<PlainNormalNodeInputs>
  ) {
    super(context, inputs);

    this.renderTarget = new THREE.WebGLRenderTarget(
      PlainNormalNode.RESOLUTION,
      PlainNormalNode.RESOLUTION,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      }
    );

    this.material = new THREE.ShaderMaterial({
      vertexShader: PlainNormalNode.vertexShader,
      fragmentShader: PlainNormalNode.fragmentShader,
      uniforms: {
        displacement: { value: null },
        strength: { value: 1.0 },
        texelSize: { value: new THREE.Vector2(1 / PlainNormalNode.RESOLUTION, 1 / PlainNormalNode.RESOLUTION) },
      },
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene = new THREE.Scene();
    this.scene.add(quad);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  protected process(
    context: ReactiveNodeContext,
    { displacement, strength }: PlainNormalNodeInputs
  ): THREE.Texture {
    this.material.uniforms.displacement.value = displacement;
    this.material.uniforms.strength.value = strength;

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
