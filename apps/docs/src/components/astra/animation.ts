import * as THREE from "three";

import {
  AMBIENT_DRIFT_MAX,
  AMBIENT_DRIFT_MIN,
  AMBIENT_SPEED_MAX,
  AMBIENT_SPEED_MIN,
  PARALLAX_MAX,
  PARALLAX_MIN,
  PARTICLE_MOTION_SETTLE_SECONDS,
  PARTICLE_OPACITY_REVEAL_END,
  type AstraConfig,
} from "./config";
import {
  createPathShapeTexture,
  densityProgress,
  positiveModulo,
  samplePath,
  samplePathRange,
  sizeFalloff,
  tipFade,
  type AstraField,
  type PathShapeTexture,
} from "./field";

/**
 * The per-frame state of the scene, and the one function that advances it.
 *
 * Inputs arrive from the page (scroll position, pointer, the cue currently in
 * view); this turns them into uniforms and object transforms. Every value that
 * follows an input does so through damping, so a wheel tick or a resize never
 * lands as a jump — with the exception of the very first frame, where the page
 * may already be scrolled and there is nothing yet to ease from.
 */

const { clamp, lerp, smoothstep, smootherstep, degToRad } = THREE.MathUtils;

/** How far the spiral tips over as the page starts to scroll. */
const SPIRAL_TILT = degToRad(-52);

export interface AstraPointerInput {
  active: boolean;
  pressed: boolean;
  /** Set when the pointer left or the page changed shape: forget its history. */
  reset: boolean;
  /** Normalised device coordinates, -1..1 with y up. */
  x: number;
  y: number;
}

export interface AstraShapeInput {
  id: string | null;
  samples: Float32Array | null;
  strength: number;
  centerNdc: { x: number; y: number };
  sizeNdc: { x: number; y: number };
}

export interface AstraInput {
  /** On narrow viewports the core sits behind the copy rather than beside it. */
  centerCore: boolean;
  /** Where the intro copy is, as fractions of the canvas width, for the rails. */
  contentBounds: { left: number; right: number } | null;
  heroViewportHeight: number | null;
  heroViewportTop: number;
  reducedMotion: boolean;
  /** Scroll progress in units of the disperse distance; may exceed 1. */
  progress: number;
  scatterProgress: number | null;
  tiltProgress: number | null;
  starsOpacity: number;
  scrolling: boolean;
  /** A released drag easing back to face forward uses slower damping. */
  returning: boolean;
  rotation: { x: number; y: number };
  pointer: AstraPointerInput;
  shape: AstraShapeInput;
}

export interface ParticleMotionState {
  pointer: THREE.Vector2;
  previous: THREE.Vector2;
  impulse: THREE.Vector2;
  active: boolean;
  pressed: boolean;
  remaining: number;
  scrollCooldown: number;
  epoch: number;
  frame: number;
  delta: number;
}

export interface AstraAnimationState {
  elapsed: number;
  introElapsed: number;
  coreTargetRotation: number;
  coreRotation: number;
  scrollProgress: number;
  tiltProgress: number;
  scatterScrollProgress: number;
  scatterPositionProgress: number;
  shapePositionProgress: number;
  starsOpacity: number;
  hasResolvedInitialPose: boolean;
  lastShapeId: string | null;
  lastShapeSamples: Float32Array | null;
  shapeProgress: number;
  introProgress: number;
  scatter: number;
  /** How much of the rails (stars either side of the copy) is showing. */
  railPresence: number;
  railContentBounds: THREE.Vector2;
  spinRotation: THREE.Vector2;
  shapePointerRotation: THREE.Vector2;
  shapeRotation: THREE.Vector2;
  particleMotion: ParticleMotionState;
  pathShapeTexture: PathShapeTexture;
  scratch: {
    normal: THREE.Vector3;
    tangent: THREE.Vector3;
    next: THREE.Vector3;
    previous: THREE.Vector3;
    euler: THREE.Euler;
    formed: THREE.Vector3;
    relative: THREE.Vector3;
    position: THREE.Vector3;
    scattered: THREE.Vector3;
    dispersedOffset: THREE.Vector2;
    range: THREE.Vector2;
    center: THREE.Vector2;
    size: THREE.Vector2;
  };
  dispose: () => void;
}

export function createAstraAnimationState(
  config: AstraConfig,
  initialProgress = 0,
): AstraAnimationState {
  const duration = clamp(config.convergeDuration, 1, 10);
  const playsIntro = config.animationPlaying && initialProgress === 0;
  const pathShapeTexture = createPathShapeTexture();
  return {
    elapsed: 0,
    introElapsed: playsIntro ? 0 : duration,
    coreTargetRotation: 0,
    coreRotation: 0,
    scrollProgress: clamp(initialProgress, 0, 1),
    tiltProgress: clamp(initialProgress, 0, 1),
    scatterScrollProgress: clamp(initialProgress, 0, 1.1875),
    scatterPositionProgress: 0,
    shapePositionProgress: 0,
    starsOpacity: 1,
    hasResolvedInitialPose: false,
    lastShapeId: null,
    lastShapeSamples: null,
    shapeProgress: 0,
    introProgress: playsIntro ? 0 : 1,
    scatter: 0,
    railPresence: 0,
    railContentBounds: new THREE.Vector2(0, 1),
    spinRotation: new THREE.Vector2(),
    shapePointerRotation: new THREE.Vector2(),
    shapeRotation: new THREE.Vector2(),
    particleMotion: {
      pointer: new THREE.Vector2(),
      previous: new THREE.Vector2(),
      impulse: new THREE.Vector2(),
      active: false,
      pressed: false,
      remaining: 0,
      scrollCooldown: 0,
      epoch: 0,
      frame: 0,
      delta: 0,
    },
    pathShapeTexture,
    scratch: {
      normal: new THREE.Vector3(),
      tangent: new THREE.Vector3(),
      next: new THREE.Vector3(),
      previous: new THREE.Vector3(),
      euler: new THREE.Euler(),
      formed: new THREE.Vector3(),
      relative: new THREE.Vector3(),
      position: new THREE.Vector3(),
      scattered: new THREE.Vector3(),
      dispersedOffset: new THREE.Vector2(),
      range: new THREE.Vector2(),
      center: new THREE.Vector2(),
      size: new THREE.Vector2(),
    },
    dispose: () => pathShapeTexture.dispose(),
  };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Exponential approach that snaps once it is within a ten-thousandth. */
function damp(current: number, target: number, delta: number, rate = 6): number {
  const next = THREE.MathUtils.damp(current, target, rate, delta);
  return Math.abs(target - next) <= 1e-4 ? target : next;
}

function differs(a: number, b: number): boolean {
  return Math.abs(a - b) > 0.001;
}

function wrapAngle(angle: number): number {
  return positiveModulo(angle + Math.PI, 2 * Math.PI) - Math.PI;
}

/** The shader's dispersed drift, so the tracked flare stays on its star. */
export function getDispersedMotionOffset(
  target: THREE.Vector2,
  time: number,
  scatterX: number,
  scatterY: number,
  scatterZ: number,
  scrollDrift: number,
  strength: number,
): THREE.Vector2 {
  const depth = clamp(scatterZ, 0, 1);
  const motion = clamp(strength, 0, 1);
  if (motion === 0) return target.set(0, 0);
  const speed = lerp(AMBIENT_SPEED_MIN, AMBIENT_SPEED_MAX, depth);
  const amount = lerp(AMBIENT_DRIFT_MIN, AMBIENT_DRIFT_MAX, depth) * motion;
  const phaseX = scatterX * Math.PI * 2 + 2.7 * scatterY;
  const phaseY = scatterY * Math.PI * 2 + 3.1 * scatterZ;
  const parallax = scrollDrift * lerp(PARALLAX_MIN, PARALLAX_MAX, depth * depth) * motion;
  return target.set(
    (Math.sin(phaseX + time * speed) - Math.sin(phaseX)) * amount,
    (Math.cos(phaseY + time * speed * 0.73) - Math.cos(phaseY)) * amount + parallax,
  );
}

/** The shader's intro swing, on the CPU, for the tracked flare. */
function applyIntroMotion(
  position: THREE.Vector3,
  scattered: THREE.Vector3,
  progress: number,
  seed: number,
  travelSeed: number,
): void {
  if (progress >= 1) return;
  const start = 0.14 + 0.18 * seed;
  const local = smootherstep(progress, start, start + (0.58 + 0.1 * travelSeed));
  const pull = lerp(local, Math.sin(local * Math.PI * 0.5), 0.5);
  const angle = Math.sin(pull * Math.PI) * (0.44 + 0.22 * seed);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  position.set(
    lerp(scattered.x * c - scattered.y * s, position.x, pull),
    lerp(scattered.x * s + scattered.y * c, position.y, pull),
    lerp(scattered.z, position.z, pull),
  );
}

function revealProgress(progress: number, seed: number): number {
  const p = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
  const delay = 0.015 * (Number.isFinite(seed) ? clamp(seed, 0, 1) : 0);
  return smoothstep(p, delay, 0.14 + delay) * lerp(0.2, 1, smoothstep(p, 0.2, 1));
}

/**
 * Turns pointer samples into an impulse for the simulation. A press, a
 * scroll, or a pointer that has left all stop the shove: dragging rotates the
 * field, and a wheel tick under a resting cursor must not fling the stars.
 */
function updateParticleMotion(
  motion: ParticleMotionState,
  pointer: AstraPointerInput,
  enabled: boolean,
  delta: number,
  scrolling: boolean,
): boolean {
  motion.frame += 1;
  motion.delta = delta;
  motion.impulse.set(0, 0);
  motion.scrollCooldown = scrolling ? 0.12 : Math.max(0, motion.scrollCooldown - delta);
  if (pointer.reset || (!enabled && (motion.active || motion.remaining > 0))) {
    motion.epoch += 1;
    motion.remaining = 0;
    motion.active = false;
  }
  const active = enabled && pointer.active && !pointer.pressed && motion.scrollCooldown === 0;
  if (active) {
    motion.previous.copy(motion.pointer);
    motion.pointer.set(pointer.x, pointer.y);
    if (motion.active) {
      motion.impulse.subVectors(motion.pointer, motion.previous);
      if (motion.impulse.lengthSq() > 1e-8) motion.remaining = PARTICLE_MOTION_SETTLE_SECONDS;
    } else {
      motion.previous.copy(motion.pointer);
    }
  }
  motion.active = active;
  motion.pressed = pointer.pressed;
  motion.remaining = Math.max(0, motion.remaining - delta);
  return motion.remaining > 0;
}

/* -------------------------------------------------------------------------- */
/* The frame                                                                   */
/* -------------------------------------------------------------------------- */

export interface AstraUpdateArgs {
  state: AstraAnimationState;
  config: AstraConfig;
  input: AstraInput;
  camera: THREE.OrthographicCamera;
  animationRoot: THREE.Object3D;
  spinRoot: THREE.Object3D;
  field: AstraField;
  viewport: { width: number; height: number };
}

/** Advances one frame. Returns whether anything is still moving. */
export function updateAstraAnimation(
  { state, config, input, camera, animationRoot, spinRoot, field, viewport }: AstraUpdateArgs,
  deltaSeconds: number,
  dampingSeconds = deltaSeconds,
): boolean {
  const width = Number.isFinite(viewport.width) ? Math.max(viewport.width, 1) : 1;
  const height = Number.isFinite(viewport.height) ? Math.max(viewport.height, 1) : 1;
  const dt = Number.isFinite(deltaSeconds) ? clamp(deltaSeconds, 0, 0.05) : 0;
  const ddt = Number.isFinite(dampingSeconds) ? clamp(dampingSeconds, 0, 0.05) : 0;
  const reduced = input.reducedMotion;
  const rawProgress = config.scrollEffects ? Math.max(input.progress, 0) : 0;
  const scrolled = rawProgress > 0;
  let changed = false;

  if (!reduced) state.elapsed += dt;

  // The opening. A page that loads already scrolled skips it.
  const duration = clamp(config.convergeDuration, 1, 10);
  if (scrolled && !state.hasResolvedInitialPose) {
    state.introElapsed = duration;
  } else if (!reduced && config.animationPlaying) {
    const next = Math.min(state.introElapsed + dt, duration);
    state.introElapsed = duration - next <= 1e-4 ? duration : next;
  }
  const introProgress =
    reduced || !config.animationPlaying ? 1 : clamp(state.introElapsed / duration, 0, 1);
  state.introProgress = introProgress;

  const targetProgress = clamp(rawProgress, 0, 1);
  const instant = reduced || !state.hasResolvedInitialPose;

  const starsOpacityTarget = clamp(input.starsOpacity, 0, 1);
  const starsOpacity = instant
    ? starsOpacityTarget
    : damp(state.starsOpacity, starsOpacityTarget, ddt);
  state.starsOpacity = starsOpacity;
  if (starsOpacity !== starsOpacityTarget) changed = true;

  const scrollProgress = instant
    ? targetProgress
    : damp(state.scrollProgress, targetProgress, ddt);
  state.scrollProgress = scrollProgress;
  if (scrollProgress !== targetProgress) changed = true;

  const tiltTarget =
    config.scrollEffects && !reduced && input.tiltProgress !== null
      ? clamp(input.tiltProgress, 0, 1)
      : targetProgress;
  const tiltProgress = instant ? tiltTarget : damp(state.tiltProgress, tiltTarget, ddt);
  state.tiltProgress = tiltProgress;
  if (tiltProgress !== tiltTarget) changed = true;

  const scatterStart = reduced ? 0.5 : 0.375;
  const scatterEnd = reduced ? 1 : 1.1875;
  const scatterTarget =
    config.scrollEffects && !reduced && input.scatterProgress !== null
      ? lerp(scatterStart, scatterEnd, clamp(input.scatterProgress, 0, 1))
      : clamp(rawProgress, 0, scatterEnd);
  const scatterScroll = instant
    ? scatterTarget
    : damp(state.scatterScrollProgress, scatterTarget, ddt);
  state.scatterScrollProgress = scatterScroll;
  if (scatterScroll !== scatterTarget) changed = true;

  const settle = smootherstep(scrollProgress, 0, 0.5);
  const tilt =
    SPIRAL_TILT *
    Math.sin(clamp(tiltProgress / 0.75, 0, 1) * Math.PI * 0.5) *
    (1 - smootherstep(tiltProgress, 0.75, 1));
  const scatter = smootherstep(scatterScroll, scatterStart, scatterEnd);
  const scatterPositionTarget = smoothstep(
    smootherstep(scatterTarget, scatterStart, scatterEnd),
    0,
    1,
  );
  const scatterPosition = instant
    ? scatterPositionTarget
    : damp(state.scatterPositionProgress, scatterPositionTarget, ddt, 4);
  state.scatterPositionProgress = scatterPosition;
  if (scatterPosition !== scatterPositionTarget) changed = true;

  // How much of the galaxy is still a galaxy: gone once dispersed, and not
  // yet there until the opening has mostly converged.
  const presence = (1 - scatter) * smoothstep(introProgress, 0.55, 1);
  state.scatter = scatter;
  const scrollSizeScale = config.scrollEffects ? lerp(1, 0.45, settle) : 1;

  animationRoot.scale.setScalar(1);
  animationRoot.rotation.set(0, 0, 0);

  const rotates = config.interactionMode === "rotate" ? 1 : 0;
  if (reduced) {
    state.spinRotation.set(0, 0);
    spinRoot.rotation.set(0, 0, 0);
  } else {
    const ease = 1 - Math.exp(-(input.returning ? 5.5 : 14) * ddt);
    const targetX = rotates * input.rotation.x;
    const targetY = rotates * input.rotation.y;
    state.spinRotation.x = lerp(state.spinRotation.x, targetX, ease);
    state.spinRotation.y = lerp(state.spinRotation.y, targetY, ease);
    spinRoot.rotation.set(state.spinRotation.x * presence, state.spinRotation.y * presence, 0);
    if (differs(state.spinRotation.x, targetX) || differs(state.spinRotation.y, targetY))
      changed = true;
  }

  const pointer = input.pointer;
  const motionActive = updateParticleMotion(
    state.particleMotion,
    pointer,
    field.particleMotionEnabled &&
      !reduced &&
      config.interaction.particleRepel &&
      config.interactionMode !== "none",
    ddt,
    input.scrolling,
  );
  if (pointer.reset) pointer.reset = false;

  const aspect = width / height;
  const worldHeight = aspect < 0.72 ? 12.7 : 10.9;
  const worldWidth = worldHeight * aspect;

  // A cue's outline arrives as samples; upload once per shape, not per frame.
  const shape = input.shape;
  if (
    shape.id &&
    shape.samples &&
    (shape.id !== state.lastShapeId || shape.samples !== state.lastShapeSamples)
  ) {
    state.pathShapeTexture.image.data?.set(shape.samples);
    state.pathShapeTexture.needsUpdate = true;
    state.lastShapeId = shape.id;
    state.lastShapeSamples = shape.samples;
  }
  const shapeProgress = instant
    ? shape.strength
    : damp(state.shapeProgress, shape.strength, ddt);
  state.shapeProgress = shapeProgress;
  const shapePositionTarget = smoothstep(shape.strength, 0, 1);
  const shapePosition = instant
    ? shapePositionTarget
    : damp(state.shapePositionProgress, shapePositionTarget, ddt, 4);
  state.shapePositionProgress = shapePosition;
  if (shapePosition !== shapePositionTarget) changed = true;

  const railPresence = config.scrollEffects ? clamp(scatter * (1 - shapeProgress), 0, 1) : 0;
  const dispersedMotion = reduced ? 0 : railPresence;
  state.railPresence = railPresence;
  const scrollDrift = reduced ? 0 : rawProgress * clamp(config.scrollStarDriftSpeed, 0, 3);
  const railIntensity = lerp(1, 0.18, railPresence);
  const railFlare = lerp(1, 0.1, railPresence);

  state.hasResolvedInitialPose = true;
  if (shapeProgress !== shape.strength) changed = true;

  // A formed shape turns a little on its own and follows a drag less than the
  // galaxy does, so the outline stays legible while still feeling held.
  if (reduced) {
    state.shapePointerRotation.set(0, 0);
    state.shapeRotation.set(0, 0);
  } else {
    const follow = smootherstep(shapeProgress, 0.05, 0.4);
    const ease = 1 - Math.exp(-(input.returning ? 5.5 : 14) * ddt);
    const targetX = rotates * input.rotation.x;
    const targetY = rotates * input.rotation.y;
    state.shapePointerRotation.x = lerp(state.shapePointerRotation.x, targetX, ease);
    state.shapePointerRotation.y = lerp(state.shapePointerRotation.y, targetY, ease);
    const amount = clamp(config.pathShapeAutoRotateAmount, 0, 1.2);
    const arriving = smootherstep(shapeProgress, 0.001, 0.12);
    const forming = smootherstep(shapeProgress, 0.04, 0.82);
    const auto = Number(config.pathShapeAutoRotate && config.animationPlaying);
    const yaw = lerp(-amount, 0, forming) * arriving * auto;
    const pitchEnvelope = forming > 0 && forming < 1 ? Math.sin(forming * Math.PI) : 0;
    state.shapeRotation.set(
      state.shapePointerRotation.x * follow + -pitchEnvelope * amount * 0.34 * arriving * auto,
      state.shapePointerRotation.y * follow + yaw,
    );
    if (
      differs(state.shapePointerRotation.x, targetX) ||
      differs(state.shapePointerRotation.y, targetY)
    ) {
      changed = true;
    }
  }

  const { scratch } = state;
  scratch.center.set(
    shape.centerNdc.x * worldWidth * 0.5,
    shape.centerNdc.y * worldHeight * 0.5,
  );
  scratch.size.set(shape.sizeNdc.x * worldWidth * 0.5, shape.sizeNdc.y * worldHeight * 0.5);

  // The rails: dispersed stars keep clear of the copy. Without measured copy
  // bounds, assume a centred column.
  const defaultHalfWidth =
    (Math.min(0.5 * Math.min(676, Math.max(width - 48, 0)) + 48, 0.36 * width) / width) *
    worldWidth;
  state.railContentBounds.set(
    input.contentBounds?.left ?? 0.5 - defaultHalfWidth / worldWidth,
    input.contentBounds?.right ?? 0.5 + defaultHalfWidth / worldWidth,
  );
  const textLeft = (state.railContentBounds.x - 0.5) * worldWidth;
  const textRight = (state.railContentBounds.y - 0.5) * worldWidth;

  // The camera sits a little above centre at rest and drops as the tilt goes.
  const cameraY = lerp(1.2, 0, settle);
  camera.position.set(0, cameraY, 12);
  camera.lookAt(0, cameraY, 0);
  camera.zoom = height / worldHeight;
  camera.updateProjectionMatrix();

  const heroHeight = clamp(input.heroViewportHeight ?? height, 1, height);
  animationRoot.position.y =
    ((height - heroHeight - 2 * input.heroViewportTop) / (2 * camera.zoom) +
      (input.centerCore ? cameraY : 0)) *
    (1 - scatter) *
    (1 - shapeProgress);

  const scatterWidth = worldHeight * aspect * 1.12;
  const scatterHeight = 1.12 * worldHeight;
  const repelRadius =
    (2 * clamp(config.interaction.repelRadius, 16, 360)) / Math.max(height, 1);

  if (field.coreCluster) {
    const rate = 0.36 * clamp(config.stars.flowSpeed, 0, 3);
    const direction = config.stars.flowInward ? 1 : -1;
    if (reduced) {
      state.coreTargetRotation = 0;
      state.coreRotation = 0;
    } else {
      state.coreTargetRotation = wrapAngle(state.coreTargetRotation + dt * rate * direction);
      const ease = 1 - Math.exp(-14 * ddt);
      const delta = Math.atan2(
        Math.sin(state.coreTargetRotation - state.coreRotation),
        Math.cos(state.coreTargetRotation - state.coreRotation),
      );
      state.coreRotation = wrapAngle(state.coreRotation + delta * ease);
      if (!config.animationPlaying && dt === 0 && Math.abs(delta) > 0.001) changed = true;
    }
    field.coreCluster.rotation.set(
      reduced ? 0 : 0.08 * Math.sin(0.22 * state.elapsed) * presence,
      reduced ? 0 : 0.14 * Math.cos(0.28 * state.elapsed) * presence,
      state.coreRotation * presence,
    );
  }

  // Each arm follows a drag with its own lag: the field turns as a body that
  // has some give in it, not as a rigid disc.
  const rotationLag = clamp(config.interaction.rotationLag, 0, 1);
  const spinRate = input.returning ? 5.5 : 14;
  for (const orbit of field.orbits) {
    if (reduced) {
      orbit.spin.set(0, 0);
    } else {
      const ease = 1 - Math.exp(-(spinRate / (1 + orbit.lag * rotationLag * 2.5)) * ddt);
      const targetX = rotates * input.rotation.x;
      const targetY = rotates * input.rotation.y;
      orbit.spin.x = lerp(orbit.spin.x, targetX, ease);
      orbit.spin.y = lerp(orbit.spin.y, targetY, ease);
      if (differs(orbit.spin.x, targetX) || differs(orbit.spin.y, targetY)) changed = true;
    }
    orbit.group.rotation.set(
      orbit.spin.x * presence * rotates - spinRoot.rotation.x,
      orbit.spin.y * presence * rotates - spinRoot.rotation.y,
      0,
    );
  }

  const flowSpeed = clamp(config.stars.flowSpeed, 0, 3);
  const shapeScatter = clamp(config.pathShapeScatter, 0, 3);
  const sizeFalloffAmount = config.stars.sizeFalloff;

  for (const layer of field.pathLayers) {
    const speed = layer.speed;
    const shapeFlowRate = layer.isCore ? 0.022 : Math.abs(speed);
    const shapeFlow = smootherstep(shapeProgress, 0.08, 0.5);
    if (!reduced) {
      layer.pathShapeTravel = positiveModulo(
        layer.pathShapeTravel +
          dt * shapeFlowRate * (config.stars.flowInward ? 1 : -1) * flowSpeed * shapeFlow,
        1,
      );
      layer.motionOffset = positiveModulo(
        layer.motionOffset + dt * speed * flowSpeed * presence,
        1,
      );
      layer.travel = positiveModulo(layer.travel + dt * Math.abs(speed) * presence, 1);
    }
    const time = reduced ? 0 : state.elapsed;
    const u = layer.starMaterial.uniforms;
    u.uTime!.value = time;
    u.uIntroProgress!.value = introProgress;
    u.uBackgroundStarsEnabled!.value = 1;
    u.uPathSpeed!.value = speed;
    u.uPathOffset!.value = reduced ? 0 : layer.motionOffset;
    (u.uPathShapeCenter!.value as THREE.Vector2).copy(scratch.center);
    u.uPathShapeProgress!.value = shapeProgress;
    u.uPathShapePositionProgress!.value = shapePosition;
    u.uPathShapeMotion!.value = layer.pathShapeTravel;
    (u.uPathShapeRotation!.value as THREE.Vector2).copy(state.shapeRotation);
    u.uPathShapeScatter!.value = shapeScatter;
    (u.uPathShapeSize!.value as THREE.Vector2).copy(scratch.size);
    u.uPathShapeTexture!.value = state.pathShapeTexture;
    u.uTwinkleSpeed!.value = reduced ? 0 : clamp(config.stars.twinkleSpeed, 0, 2) * presence;
    u.uIntensity!.value =
      clamp(config.stars.intensity * (layer.isCore ? 1.22 : 1) * railIntensity, 0.1, 3) *
      starsOpacity;
    u.uDispersedMotion!.value = dispersedMotion;
    u.uScrollScatter!.value = scatter;
    u.uScrollPositionProgress!.value = scatterPosition;
    u.uSpiralTilt!.value = tilt;
    u.uScrollDrift!.value = scrollDrift;
    u.uScrollSizeScale!.value = scrollSizeScale;
    (u.uTextBounds!.value as THREE.Vector2).set(textLeft, textRight);
    (u.uScatterSize!.value as THREE.Vector2).set(scatterWidth, scatterHeight);
    u.uPointerRepelRadius!.value = repelRadius;
    u.uViewportAspect!.value = aspect;

    // The flare follows its star through everything the shader does to it.
    if (layer.flareSource) {
      const samples = layer.flarePathSamples;
      const onPath = samples !== null;
      const phase = positiveModulo(layer.flareProgress + (reduced ? 0 : layer.motionOffset), 1);
      const pathProgress = onPath ? densityProgress(phase, config.stars.densityFalloff) : 0;
      if (samples) {
        const step = 1 / Math.max(Math.floor(samples.length / 4) - 1, 1);
        samplePath(samples, pathProgress, scratch.position);
        samplePath(samples, Math.max(pathProgress - step, 0), scratch.previous);
        samplePath(samples, Math.min(pathProgress + step, 1), scratch.next);
        scratch.tangent.subVectors(scratch.next, scratch.previous).normalize();
        scratch.normal.set(-scratch.tangent.y, scratch.tangent.x, 0).normalize();
        scratch.position.addScaledVector(scratch.normal, layer.flareAcrossOffset);
        scratch.position.z += layer.flareDepthOffset;
      } else {
        scratch.position.copy(layer.flareBasePosition);
      }
      scratch.position.applyEuler(scratch.euler.set(tilt, 0, 0, "XYZ"));

      const sx = Math.fround(layer.flareScatter.x);
      const sy = Math.fround(layer.flareScatter.y);
      const sz = Math.fround(layer.flareScatter.z);
      const keepInCenter = Number(Math.fround(layer.flareClearanceSeed) >= 0.72);
      const side = sx < 0.5 ? -1 : 1;
      const outerProgress = Math.sqrt(positiveModulo(2 * sx, 1));
      const outerX =
        side * lerp(side < 0 ? -textLeft : textRight, 0.5 * scatterWidth, outerProgress);
      getDispersedMotionOffset(
        scratch.dispersedOffset,
        Math.fround(time),
        sx,
        sy,
        sz,
        scrollDrift,
        dispersedMotion,
      );
      scratch.scattered.set(
        lerp(outerX, (sx - 0.5) * scatterWidth, keepInCenter) + scratch.dispersedOffset.x,
        positiveModulo(
          (sy - 0.5) * scatterHeight + scratch.dispersedOffset.y + 0.5 * scatterHeight,
          scatterHeight,
        ) -
          0.5 * scatterHeight -
          Math.sin(scatterPosition * Math.PI) * (0.15 + 0.25 * sz),
        (sz - 0.5) * 0.5,
      );
      scratch.position.lerp(scratch.scattered, scatterPosition);

      let endpointVisibility = onPath ? tipFade(pathProgress) : 1;
      let sizeEnvelope = onPath ? sizeFalloff(pathProgress, sizeFalloffAmount) : 1;
      endpointVisibility = lerp(endpointVisibility, 1, scatter);
      sizeEnvelope = lerp(sizeEnvelope, 1, scatter);
      let depthCue = 1;
      let opacityCue = 1;

      if (shape.samples && (shapeProgress > 0 || shapePosition > 0)) {
        samplePathRange(shape.samples, layer.flareShapeSeed, scratch.range);
        const rangeStart = scratch.range.x;
        const rangeEnd = scratch.range.y;
        const step = 1 / 1023;
        const span = Math.max(rangeEnd - rangeStart, step);
        const local = densityProgress(
          clamp((layer.flareShapeSeed - rangeStart) / span, 0, 1) +
            layer.pathShapeTravel / span,
          config.stars.densityFalloff,
        );
        const seed = lerp(rangeStart, rangeEnd, local);
        samplePath(shape.samples, seed, scratch.formed);
        samplePath(shape.samples, Math.max(seed - step, rangeStart), scratch.previous);
        samplePath(shape.samples, Math.min(seed + step, rangeEnd), scratch.next);
        scratch.tangent
          .set(
            (scratch.next.x - scratch.previous.x) * scratch.size.x + 1e-4,
            (scratch.next.y - scratch.previous.y) * scratch.size.y,
            0,
          )
          .normalize();
        scratch.normal.set(-scratch.tangent.y, scratch.tangent.x, 0).normalize();
        const envelope = Math.sin(local * Math.PI);
        const contourDepth =
          Math.sin(local * Math.PI * 1.35 + layer.pathShapeDepthPhase) *
          layer.pathShapeDepth *
          envelope;
        scratch.relative
          .set(
            scratch.formed.x * scratch.size.x,
            scratch.formed.y * scratch.size.y,
            (contourDepth + 0.75 * layer.flareDepthOffset + layer.flareShapeDepthScatter) *
              shapeScatter,
          )
          .addScaledVector(
            scratch.normal,
            (1.1 * layer.flareAcrossOffset + layer.flareShapeAcrossScatter) * shapeScatter,
          );
        scratch.euler.set(state.shapeRotation.x, state.shapeRotation.y, 0, "YXZ");
        scratch.relative.applyEuler(scratch.euler);
        scratch.formed.set(
          scratch.center.x + scratch.relative.x,
          scratch.center.y + scratch.relative.y,
          scratch.relative.z,
        );
        scratch.position.lerp(scratch.formed, shapePosition);
        const frontness = smoothstep(scratch.relative.z, -1.15, 1.15);
        endpointVisibility = lerp(endpointVisibility, tipFade(local), shapeProgress);
        sizeEnvelope = lerp(sizeEnvelope, sizeFalloff(local, sizeFalloffAmount), shapeProgress);
        depthCue = lerp(1, lerp(0.78, 1.18, frontness), shapeProgress);
        opacityCue = lerp(1, lerp(0.72, 1, frontness), shapeProgress);
      }

      scratch.formed.set(
        (sx - 0.5) * scatterWidth,
        (positiveModulo(sy, 1) - 0.5) * scatterHeight,
        (sz - 0.5) * 0.5,
      );
      applyIntroMotion(scratch.position, scratch.formed, introProgress, sz, sy);
      const reveal = revealProgress(introProgress, sz);
      const flareScale =
        endpointVisibility *
        sizeEnvelope *
        depthCue *
        opacityCue *
        lerp(scrollSizeScale, 1, shapeProgress) *
        Math.sqrt(reveal) *
        smoothstep(reveal, 0, PARTICLE_OPACITY_REVEAL_END) *
        railFlare;
      layer.flareSource.position.copy(scratch.position);
      layer.flareSource.scale.setScalar(clamp(flareScale, 0, 1) * starsOpacity);
    }
  }

  // Flow, twinkle and the opening are continuous while the field is playing;
  // only a paused or reduced-motion field settles into stillness.
  return (
    changed ||
    motionActive ||
    (!reduced && config.animationPlaying && (presence > 0 || introProgress < 1))
  );
}
