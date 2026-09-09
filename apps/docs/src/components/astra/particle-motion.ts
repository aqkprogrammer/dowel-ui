import * as THREE from "three";

import { PARTICLE_MOTION_SETTLE_SECONDS } from "./config";
import type { AstraField } from "./field";
import { PARTICLE_SIMULATION_FRAGMENT_SHADER } from "./shaders";
import type { ParticleMotionState } from "./animation";

/**
 * The pointer shove, simulated on the GPU.
 *
 * Every star owns one texel of a 128-column float texture holding its
 * displacement and velocity. When the pointer moves, the star materials are
 * drawn a second time with ASTRA_PARTICLE_SIMULATION defined: each vertex
 * lands on its own texel and writes its new state, which the visible pass
 * reads back next frame. Between moves nothing is drawn — the coast-back is
 * analytic in the shader, keyed on the time since the last impulse.
 */

const COLUMNS = 128;

/** Heavier stars are the large ones; they take more pushing and settle sooner. */
export function particleMotionMass(scale: number): number {
  return THREE.MathUtils.lerp(0.65, 2.4, THREE.MathUtils.smoothstep(scale, 1, 14));
}

function isShaderPoints(object: THREE.Object3D): object is THREE.Points {
  return (
    (object as THREE.Points).isPoints === true &&
    (object as THREE.Points).material instanceof THREE.ShaderMaterial
  );
}

interface SimulatedPoints {
  source: THREE.Points;
  simulation: THREE.Points;
}

export class ParticleMotionSimulation {
  readonly texture = new THREE.Uniform<THREE.Texture | null>(null);
  /** Texel (and mass) of each tracked hero star, so the flare can follow it. */
  readonly sourceUvs = new Map<THREE.Object3D, THREE.Vector3>();
  readonly age = new THREE.Uniform(PARTICLE_MOTION_SETTLE_SECONDS);
  readonly enabled = new THREE.Uniform(1);

  private readonly scene = new THREE.Scene();
  private readonly particles: SimulatedPoints[] = [];
  private readonly materials: THREE.ShaderMaterial[] = [];
  private readonly pointer = new THREE.Uniform(new THREE.Vector2());
  private readonly previous = new THREE.Uniform(new THREE.Vector2());
  private readonly impulse = new THREE.Uniform(new THREE.Vector2());
  private readonly clearColor = new THREE.Color();
  private front: THREE.WebGLRenderTarget;
  private back: THREE.WebGLRenderTarget;
  private epoch = -1;
  private initialized = false;
  private frame = -1;
  private programs: WebGLProgram[] | null = null;
  private prepared = false;

  constructor(field: AstraField) {
    const points: THREE.Points[] = [];
    field.group.traverse((object: THREE.Object3D) => {
      if (isShaderPoints(object)) points.push(object);
    });
    const total = points.reduce(
      (sum, item) => sum + item.geometry.getAttribute("position").count,
      0,
    );
    const rows = Math.max(1, Math.ceil(total / COLUMNS));
    this.front = new THREE.WebGLRenderTarget(COLUMNS, rows, {
      type: THREE.HalfFloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.back = this.front.clone();
    this.texture.value = this.front.texture;

    let offset = 0;
    for (const item of points) {
      const material = item.material as THREE.ShaderMaterial;
      const count = item.geometry.getAttribute("position").count;
      const uvs = new Float32Array(3 * count);
      const scale = item.geometry.getAttribute("starScale");
      for (let index = 0; index < count; index += 1) {
        uvs[3 * index] = (((offset + index) % COLUMNS) + 0.5) / COLUMNS;
        uvs[3 * index + 1] = (Math.floor((offset + index) / COLUMNS) + 0.5) / rows;
        uvs[3 * index + 2] = particleMotionMass(0.35 + 3.8 * scale.getX(index));
      }
      offset += count;
      item.geometry.setAttribute("particleMotionUv", new THREE.Float32BufferAttribute(uvs, 3));
      Object.assign(material.uniforms, {
        uParticleMotionEnabled: this.enabled,
        uParticleMotionTexture: this.texture,
        uParticleMotionAge: this.age,
        uParticleMotionPointer: this.pointer,
        uParticleMotionPrevious: this.previous,
        uParticleMotionImpulse: this.impulse,
      });
      material.needsUpdate = true;

      const simulationMaterial = new THREE.ShaderMaterial({
        uniforms: material.uniforms,
        defines: { ...material.defines, ASTRA_PARTICLE_SIMULATION: 1 },
        vertexShader: material.vertexShader,
        fragmentShader: PARTICLE_SIMULATION_FRAGMENT_SHADER,
        blending: THREE.NoBlending,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
      this.materials.push(simulationMaterial);
      const simulation = new THREE.Points(item.geometry, simulationMaterial);
      simulation.matrixAutoUpdate = false;
      simulation.frustumCulled = false;
      this.scene.add(simulation);
      this.particles.push({ source: item, simulation });

      const layer = field.pathLayers.find((entry) => entry.starMaterial === material);
      const hero = item.geometry.getAttribute("starHero");
      if (layer?.flareSource) {
        for (let index = 0; index < hero.count; index += 1) {
          if (hero.getX(index) > 0.5) {
            this.sourceUvs.set(
              layer.flareSource,
              new THREE.Vector3(
                uvs[3 * index] ?? 0,
                uvs[3 * index + 1] ?? 0,
                uvs[3 * index + 2] ?? 1,
              ),
            );
            break;
          }
        }
      }
    }
  }

  /**
   * Compiles the simulation programs ahead of the first shove, off-screen, and
   * reports whether they are ready — so the first pointer move never stalls
   * the page on a synchronous shader compile.
   */
  prepare(renderer: THREE.WebGLRenderer, camera: THREE.Camera): boolean {
    if (this.prepared) return true;
    if (this.programs === null) {
      const previous = renderer.getRenderTarget();
      const scratch = new THREE.WebGLRenderTarget(1, 1, {
        depthBuffer: false,
        stencilBuffer: false,
      });
      try {
        renderer.setRenderTarget(scratch);
        renderer.compile(this.scene, camera);
      } finally {
        renderer.setRenderTarget(previous);
        scratch.dispose();
      }
      this.programs = (renderer.info.programs ?? []).map(
        (entry) => entry.program as WebGLProgram,
      );
      return false;
    }
    const gl = renderer.getContext();
    const extension = renderer.extensions.get("KHR_parallel_shader_compile") as {
      COMPLETION_STATUS_KHR: number;
    };
    if (
      this.programs.every((program) =>
        gl.getProgramParameter(program, extension.COMPLETION_STATUS_KHR),
      )
    ) {
      this.prepared = true;
      this.programs = [];
    }
    return this.prepared;
  }

  reset(): void {
    this.initialized = false;
    this.age.value = PARTICLE_MOTION_SETTLE_SECONDS;
  }

  update(
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
    motion: ParticleMotionState,
  ): void {
    if (motion.frame === this.frame) return;
    this.frame = motion.frame;
    if (motion.epoch !== this.epoch || motion.remaining <= 0) this.reset();
    this.epoch = motion.epoch;
    this.age.value = Math.min(
      PARTICLE_MOTION_SETTLE_SECONDS,
      this.age.value + Math.max(motion.delta, 0),
    );
    if (motion.scrollCooldown > 0) return;
    if ((motion.active || motion.remaining > 0) && !this.prepare(renderer, camera)) return;
    if (motion.impulse.lengthSq() <= 1e-8) return;

    const previousTarget = renderer.getRenderTarget();
    const previousAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this.clearColor);
    renderer.setClearColor(0, 0);
    try {
      if (!this.initialized) {
        renderer.setRenderTarget(this.front);
        renderer.clear();
        this.age.value = 0;
        this.initialized = true;
      }
      this.pointer.value.copy(motion.pointer);
      this.previous.value.copy(motion.previous);
      this.impulse.value.copy(motion.impulse);
      for (const { source, simulation } of this.particles) {
        source.updateWorldMatrix(true, false);
        simulation.matrix.copy(source.matrixWorld);
      }
      renderer.setRenderTarget(this.back);
      renderer.render(this.scene, camera);
      [this.front, this.back] = [this.back, this.front];
      this.texture.value = this.front.texture;
      this.age.value = 0;
    } finally {
      renderer.setRenderTarget(previousTarget);
      renderer.setClearColor(this.clearColor, previousAlpha);
    }
  }

  dispose(): void {
    this.programs = [];
    this.front.dispose();
    this.back.dispose();
    for (const material of this.materials) material.dispose();
    this.scene.clear();
    this.sourceUvs.clear();
  }
}
