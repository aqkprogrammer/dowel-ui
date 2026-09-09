import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  type Effect,
} from "postprocessing";
import * as THREE from "three";

import type { AstraAnimationState } from "./animation";
import type { AstraConfig } from "./config";
import { generateAstraField, type AstraField } from "./field";
import { AstraOpticsEffect, createLensDirtTexture } from "./optics";
import { ParticleMotionSimulation } from "./particle-motion";
import { computePixelRatio, type RendererProfile } from "./profile";

/**
 * Owns the WebGL side: the renderer, the scene graph the animation moves, and
 * the post-processing chain. The React layer hands it a canvas and calls
 * `render` once per frame; everything GPU-shaped is disposed from one place.
 */

export interface AstraRenderer {
  field: AstraField;
  camera: THREE.OrthographicCamera;
  animationRoot: THREE.Group;
  spinRoot: THREE.Group;
  profile: RendererProfile;
  resize: (width: number, height: number, devicePixelRatio?: number) => void;
  render: (
    deltaSeconds: number,
    state: AstraAnimationState,
    config: AstraConfig,
    still: boolean,
  ) => void;
  dispose: () => void;
}

function positive(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
}

function safeDispose(item: { dispose: () => void } | undefined): void {
  try {
    item?.dispose();
  } catch {
    // Disposing after a lost context throws; there is nothing left to free.
  }
}

export function createAstraRenderer(
  canvas: HTMLCanvasElement,
  config: AstraConfig,
  profile: RendererProfile,
): AstraRenderer {
  if (!profile.available) throw new Error("Astra needs WebGL2.");

  const disposables = new Set<{ dispose: () => void }>();
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.add(item);
    return item;
  };
  let disposed = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0);
  const animationRoot = new THREE.Group();
  const spinRoot = new THREE.Group();
  scene.add(animationRoot);
  animationRoot.add(spinRoot);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40);
  camera.position.set(0, 1.2, 12);

  const devicePixelRatio = () => canvas.ownerDocument.defaultView?.devicePixelRatio ?? 1;
  let renderer: THREE.WebGLRenderer | undefined;
  let composer: EffectComposer | undefined;
  let bloom: BloomEffect | undefined;
  let optics: AstraOpticsEffect | undefined;
  let simulation: ParticleMotionSimulation | undefined;
  let field: AstraField | undefined;
  let lastBloomIntensity: number | undefined;
  let lastBloomThreshold: number | undefined;
  let lastFlare: AstraConfig["lensFlare"] | undefined;
  let lastGlass: AstraConfig["dirtyGlass"] | undefined;
  let warmedUp = false;

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    for (const item of disposables) safeDispose(item);
    disposables.clear();
    safeDispose(composer);
    safeDispose(field);
    spinRoot.clear();
    animationRoot.clear();
    scene.clear();
    safeDispose(renderer);
  }

  try {
    const pixelRatio = computePixelRatio(
      devicePixelRatio(),
      canvas.clientWidth || undefined,
      canvas.clientHeight || undefined,
    );
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: profile.antialias,
      depth: false,
      powerPreference: "high-performance",
    });
    renderer.debug.checkShaderErrors = true;
    renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
      const log = [
        gl.getProgramInfoLog(program),
        gl.getShaderInfoLog(vertexShader),
        gl.getShaderInfoLog(fragmentShader),
      ]
        .filter(Boolean)
        .join("\n");
      throw new Error(`Astra shader compilation failed. ${log}`);
    };
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping =
      profile.postprocessing === "none" ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setClearColor(0, 1);
    renderer.setPixelRatio(pixelRatio);

    field = generateAstraField(config, {
      tier: profile.tier,
      maxParticleCount: profile.maxParticleCount,
      pixelRatio,
      trackOpticalSources: profile.optics !== null,
    });
    spinRoot.add(field.group);
    for (const layer of field.pathLayers) {
      layer.starMaterial.uniforms.uBackgroundModelMatrix!.value = animationRoot.matrixWorld;
    }

    // The shove needs float render targets and async compile; without either
    // the field is simply not pushable, which is a fine thing to be.
    if (
      renderer.extensions.has("EXT_color_buffer_float") &&
      renderer.extensions.has("KHR_parallel_shader_compile")
    ) {
      simulation = track(new ParticleMotionSimulation(field));
    }
    field.particleMotionEnabled = simulation !== undefined;

    if (profile.postprocessing === "none") {
      // Without a composer the materials must tone-map themselves.
      for (const layer of field.pathLayers) {
        const material = layer.starMaterial;
        material.toneMapped = true;
        material.fragmentShader = `${material.fragmentShader.replace("void main()", "void astraLinearMain()")}
          void main() {
            astraLinearMain();
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `;
        material.needsUpdate = true;
      }
    } else {
      composer = new EffectComposer(renderer, {
        depthBuffer: false,
        frameBufferType: THREE.HalfFloatType,
        multisampling: profile.multisampling,
      });
      composer.addPass(new RenderPass(scene, camera));
      bloom = track(
        new BloomEffect({
          intensity: config.bloomIntensity,
          levels: profile.bloomLevels,
          luminanceSmoothing: 0.18,
          luminanceThreshold: config.bloomThreshold,
          mipmapBlur: true,
          radius: 0.72,
          resolutionScale: profile.bloomResolutionScale,
        }),
      );
      const effects: Effect[] = [bloom];
      if (profile.optics) {
        const dirt = track(createLensDirtTexture());
        optics = track(
          new AstraOpticsEffect(config.lensFlare, dirt, config.dirtyGlass, profile.optics),
        );
        effects.push(optics);
      }
      effects.push(track(new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })));
      composer.addPass(new EffectPass(camera, ...effects));
    }
  } catch (error) {
    dispose();
    try {
      renderer?.forceContextLoss();
    } catch {
      // Already lost.
    }
    throw error;
  }

  const activeRenderer = renderer;
  const activeField = field;
  const coreUv = simulation?.sourceUvs.get(activeField.coreSource);
  const secondaryUvs = activeField.secondarySources.map((source) =>
    simulation?.sourceUvs.get(source),
  );

  function resize(width: number, height: number, dpr = devicePixelRatio()): void {
    if (disposed) return;
    const w = positive(width);
    const h = positive(height);
    const ratio = computePixelRatio(dpr, w, h);
    activeRenderer.setDrawingBufferSize(w, h, ratio);
    simulation?.reset();
    camera.left = -w / 2;
    camera.right = w / 2;
    camera.top = h / 2;
    camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
    composer?.setSize(w, h, false);
    optics?.setViewport(w, h);
    for (const layer of activeField.pathLayers)
      layer.starMaterial.uniforms.uPixelRatio!.value = ratio;
  }

  function render(
    deltaSeconds: number,
    state: AstraAnimationState,
    current: AstraConfig,
    still: boolean,
  ): void {
    if (disposed) return;
    const delta = Number.isFinite(deltaSeconds)
      ? THREE.MathUtils.clamp(deltaSeconds, 0, 0.05)
      : 0;

    if (simulation) {
      const view = canvas.ownerDocument.defaultView;
      if (
        !warmedUp &&
        !still &&
        current.interaction.particleRepel &&
        current.interactionMode !== "none" &&
        view?.requestIdleCallback &&
        view.matchMedia("(any-hover: hover)").matches
      ) {
        warmedUp = true;
        const handle = view.requestIdleCallback(() => {
          if (
            !disposed &&
            canvas.ownerDocument.visibilityState === "visible" &&
            state.particleMotion.scrollCooldown === 0
          ) {
            simulation?.prepare(activeRenderer, camera);
          }
        });
        track({ dispose: () => view.cancelIdleCallback(handle) });
      }
      simulation.update(activeRenderer, camera, state.particleMotion);
      optics?.setParticleMotion(
        simulation.texture.value,
        simulation.age.value,
        coreUv,
        secondaryUvs,
      );
    }

    if (
      bloom &&
      (lastBloomIntensity !== current.bloomIntensity ||
        lastBloomThreshold !== current.bloomThreshold)
    ) {
      lastBloomIntensity = current.bloomIntensity;
      lastBloomThreshold = current.bloomThreshold;
      bloom.intensity = current.bloomIntensity;
      bloom.luminanceMaterial.threshold = current.bloomThreshold;
    }
    if (optics) {
      if (lastFlare !== current.lensFlare) {
        lastFlare = current.lensFlare;
        optics.setConfig(current.lensFlare);
      }
      if (lastGlass !== current.dirtyGlass) {
        lastGlass = current.dirtyGlass;
        optics.setDirtyGlass(current.dirtyGlass);
      }
      const scroll = THREE.MathUtils.clamp(state.scrollProgress, 0, 1);
      const dispersed = current.scrollEffects
        ? THREE.MathUtils.smootherstep(scroll, 0.5, 1)
        : 0;
      optics.updateSources(
        activeField.coreSource,
        activeField.secondarySources,
        camera,
        current.showCenterCluster ? 1 - dispersed : 0,
      );
      optics.updateDirtDrift(
        spinRoot.rotation.x,
        spinRoot.rotation.y,
        spinRoot.rotation.z,
        current.dirtyGlass,
        still,
      );
    }

    if (composer) composer.render(delta);
    else activeRenderer.render(scene, camera);
  }

  resize(canvas.clientWidth, canvas.clientHeight);

  return {
    field: activeField,
    camera,
    animationRoot,
    spinRoot,
    profile,
    resize,
    render,
    dispose,
  };
}
