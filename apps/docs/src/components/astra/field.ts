import * as THREE from "three";

import { ASTRA_ARMS, SECONDARY_COLOR_SEEDS, type AstraConfig } from "./config";
import { STAR_FRAGMENT_SHADER, STAR_VERTEX_SHADER } from "./shaders";

/**
 * Builds the star field: five spiral arms, a dense core, and for each of them
 * the one star the lens flare follows.
 *
 * Everything is seeded, so the same field comes back on every visit and a
 * replay puts each star back where it was. Arm positions are baked into a
 * 512-sample texture rather than the geometry: the vertex shader re-derives a
 * star's place from its progress along the arm every frame, which is what
 * lets the arms flow.
 */

export type PathShapeTexture = THREE.DataTexture;

export const PATH_SAMPLE_COUNT = 512;
export const PATH_SHAPE_SAMPLE_COUNT = 1024;

interface TrackedStar {
  acrossScatter: number;
  clearanceSeed: number;
  depthScatter: number;
  scatter: THREE.Vector3;
  seed: number;
}

export interface PathLayer {
  curve: THREE.Curve<THREE.Vector3> | null;
  flareAcrossOffset: number;
  flareBasePosition: THREE.Vector3;
  flareClearanceSeed: number;
  flareDepthOffset: number;
  flarePathSamples: Float32Array | null;
  flareProgress: number;
  flareScatter: THREE.Vector3;
  flareShapeAcrossScatter: number;
  flareShapeDepthScatter: number;
  flareShapeSeed: number;
  flareSource: THREE.Object3D | null;
  isCore: boolean;
  /** Per-second progress along the arm, signed by flow direction. */
  speed: number;
  phase: number;
  motionOffset: number;
  travel: number;
  starMaterial: THREE.ShaderMaterial;
  strong: boolean;
  pathShapeDepth: number;
  pathShapeDepthPhase: number;
  pathShapeTravel: number;
}

export interface Orbit {
  group: THREE.Group;
  /** How far behind the pointer this arm turns (outer arms lag more). */
  lag: number;
  spin: THREE.Vector2;
}

export interface AstraField {
  group: THREE.Group;
  coreCluster: THREE.Points | null;
  coreSource: THREE.Object3D;
  secondarySources: THREE.Object3D[];
  orbits: Orbit[];
  pathLayers: PathLayer[];
  particleCount: number;
  /** Set by the renderer once the pointer simulation is wired up. */
  particleMotionEnabled: boolean;
  dispose: () => void;
}

export interface FieldOptions {
  /** 0 = no WebGL, 1 = low end, 2 = capable, 3 = desktop class. */
  tier?: number;
  maxParticleCount?: number;
  pixelRatio?: number;
  trackOpticalSources?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Maths shared with the animation loop                                        */
/* -------------------------------------------------------------------------- */

export function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function middleWeight(progress: number): number {
  return Math.sin(THREE.MathUtils.clamp(progress, 0, 1) * Math.PI);
}

/** Bunches progress towards the middle of an arm, matching the shader. */
export function densityProgress(progress: number, falloff: number): number {
  const wrapped = positiveModulo(progress, 1);
  return (
    wrapped +
    (THREE.MathUtils.clamp(falloff, 0, 0.98) * Math.sin(wrapped * Math.PI * 2)) / (2 * Math.PI)
  );
}

export function tipFade(progress: number): number {
  return (
    THREE.MathUtils.smoothstep(progress, 0, 0.055) *
    (1 - THREE.MathUtils.smoothstep(progress, 0.945, 1))
  );
}

export function sizeFalloff(progress: number, amount: number): number {
  return THREE.MathUtils.lerp(
    1,
    0.14 + 0.86 * middleWeight(progress) ** 0.68,
    THREE.MathUtils.clamp(amount, 0, 1),
  );
}

export function easeOutExpo(value: number): number {
  return value >= 1 ? 1 : 1 - 2 ** (-10 * value);
}

/** Reads a point from a sampled path (RGBA floats, xyz used). */
export function samplePath(
  samples: Float32Array,
  progress: number,
  target: THREE.Vector3,
): THREE.Vector3 {
  const count = Math.max(Math.floor(samples.length / 4), 1);
  const scaled = THREE.MathUtils.clamp(progress, 0, 1) * (count - 1);
  const lower = Math.floor(scaled);
  const upper = Math.min(lower + 1, count - 1);
  const blend = scaled - lower;
  const a = 4 * lower;
  const b = 4 * upper;
  return target.set(
    THREE.MathUtils.lerp(samples[a] ?? 0, samples[b] ?? 0, blend),
    THREE.MathUtils.lerp(samples[a + 1] ?? 0, samples[b + 1] ?? 0, blend),
    THREE.MathUtils.lerp(samples[a + 2] ?? 0, samples[b + 2] ?? 0, blend),
  );
}

/** Reads which sub-path (start, end fractions) a shape sample belongs to. */
export function samplePathRange(
  samples: Float32Array,
  progress: number,
  target: THREE.Vector2,
): THREE.Vector2 {
  const count = Math.max(Math.floor(samples.length / 4), 1);
  const index =
    4 * Math.min(Math.floor(THREE.MathUtils.clamp(progress, 0, 0.999999) * count), count - 1);
  return target.set(samples[index + 2] ?? 0, samples[index + 3] ?? 1);
}

/* -------------------------------------------------------------------------- */
/* Deterministic randomness                                                    */
/* -------------------------------------------------------------------------- */

/** mulberry32: small, fast, and the same on every machine. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    let value = (state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), 1 | value);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

/** The shader's `fract(sin(dot(...)) * 43758.5453)`, on the CPU. */
function shaderHash(a: number, b: number, x: number, y: number): number {
  const value = 43758.5453 * Math.sin(a * x + b * y);
  return value - Math.floor(value);
}

function configureTexture(texture: THREE.DataTexture): THREE.DataTexture {
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function createPathShapeTexture(): PathShapeTexture {
  return configureTexture(
    new THREE.DataTexture(
      new Float32Array(4 * PATH_SHAPE_SAMPLE_COUNT),
      PATH_SHAPE_SAMPLE_COUNT,
      1,
      THREE.RGBAFormat,
      THREE.FloatType,
    ),
  );
}

/* -------------------------------------------------------------------------- */
/* Colour                                                                      */
/* -------------------------------------------------------------------------- */

const paletteCache = new Map<string, THREE.Color[]>();

function paletteColors(colors: AstraConfig["colors"]): THREE.Color[] {
  const key = colors.join(",");
  let palette = paletteCache.get(key);
  if (!palette) {
    palette = colors.map((hex) => new THREE.Color(hex));
    paletteCache.set(key, palette);
  }
  return palette;
}

/** Cool, cool, warm, warm, white — weighted so white dominates. */
function writeStarColor(
  target: Float32Array,
  offset: number,
  seed: number,
  colors: AstraConfig["colors"],
): void {
  const palette = paletteColors(colors);
  const color =
    seed < 0.36
      ? palette[0]
      : seed < 0.52
        ? palette[1]
        : seed < 0.64
          ? palette[2]
          : seed < 0.74
            ? palette[3]
            : palette[4];
  const resolved = color ?? new THREE.Color(1, 1, 1);
  target[offset] = resolved.r;
  target[offset + 1] = resolved.g;
  target[offset + 2] = resolved.b;
}

/* -------------------------------------------------------------------------- */
/* The arms                                                                    */
/* -------------------------------------------------------------------------- */

interface ArmShape {
  startRadius: number;
  endRadius: number;
  /** Full turns from start to end. */
  turns: number;
  startAngle: number;
  /** Radial wobble frequency — what makes an arm read as drawn, not plotted. */
  wobble: number;
}

/**
 * Five arms of a loose barred spiral, all winding the same way but of
 * different reach: the three strong arms carry the eye out from the core,
 * the two faint ones fill the gaps between them.
 */
const ARM_SHAPES: readonly ArmShape[] = [
  { startRadius: 0.32, endRadius: 4.95, turns: 1.32, startAngle: 0.2, wobble: 2.3 },
  { startRadius: 0.85, endRadius: 3.55, turns: 0.9, startAngle: 2.45, wobble: 1.7 },
  { startRadius: 0.22, endRadius: 4.25, turns: 1.16, startAngle: 3.95, wobble: 2.6 },
  { startRadius: 1.1, endRadius: 3.15, turns: 0.74, startAngle: 5.25, wobble: 1.9 },
  { startRadius: 0.36, endRadius: 3.05, turns: 1.02, startAngle: 1.6, wobble: 2.1 },
];

class SpiralArm extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly shape: ArmShape,
    private readonly depth: number,
    private readonly rotationDepth: number,
    private readonly depthPhase: number,
  ) {
    super();
    this.arcLengthDivisions = 640;
  }

  override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const progress = THREE.MathUtils.clamp(t, 0, 1);
    const { startRadius, endRadius, turns, startAngle, wobble } = this.shape;
    const radius =
      (startRadius + (endRadius - startRadius) * progress ** 1.22) *
      (1 + 0.045 * Math.sin(progress * Math.PI * wobble + this.depthPhase * 2));
    const angle = startAngle + turns * Math.PI * 2 * progress;
    const envelope = Math.sin(progress * Math.PI);
    const z =
      Math.sin(progress * Math.PI * 1.35 + this.depthPhase) *
      this.depth *
      this.rotationDepth *
      envelope;
    return target.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.92, z);
  }
}

/** Signed per-second progress so an arm flows in or out as configured. */
function flowSpeed(curve: THREE.Curve<THREE.Vector3>, speed: number, inward: boolean): number {
  const startDistance = curve.getPointAt(0).lengthSq();
  const endsNearer = curve.getPointAt(1).lengthSq() < startDistance;
  return Math.abs(speed) * ((inward ? endsNearer : !endsNearer) ? 1 : -1);
}

/* -------------------------------------------------------------------------- */
/* Materials                                                                   */
/* -------------------------------------------------------------------------- */

const ADDITIVE_BLENDING = {
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.SrcAlphaFactor,
  blendDst: THREE.OneFactor,
  blendEquationAlpha: THREE.AddEquation,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
} as const;

function createStarMaterial(
  config: AstraConfig,
  pixelRatio: number,
  pathTexture: THREE.DataTexture | null,
  pathSpeed: number,
  shapeDepth: number,
  shapeDepthPhase: number,
  brightRetention: number,
  tracked: TrackedStar | undefined,
): THREE.ShaderMaterial {
  const { stars } = config;
  return new THREE.ShaderMaterial({
    ...ADDITIVE_BLENDING,
    depthTest: false,
    depthWrite: false,
    fragmentShader: STAR_FRAGMENT_SHADER,
    toneMapped: false,
    transparent: true,
    uniforms: {
      uDensityFalloff: { value: THREE.MathUtils.clamp(stars.densityFalloff, 0, 0.98) },
      uDispersedMotion: { value: 0 },
      uBackgroundStarsEnabled: { value: 1 },
      uBackgroundModelMatrix: { value: new THREE.Matrix4() },
      uIntroProgress: { value: Number(!config.animationPlaying) },
      uIntensity: { value: THREE.MathUtils.clamp(stars.intensity, 0.1, 3) },
      uPathMotion: { value: Number(pathTexture !== null) },
      uPathOffset: { value: 0 },
      uPathSampleCount: { value: PATH_SAMPLE_COUNT },
      uPathSpeed: { value: pathSpeed },
      uPathTexture: { value: pathTexture },
      uPathShapeCenter: { value: new THREE.Vector2() },
      uPathShapeBrightRetention: { value: THREE.MathUtils.clamp(brightRetention, 0, 1) },
      uPathShapeDepth: { value: THREE.MathUtils.clamp(shapeDepth, -1.8, 1.8) },
      uPathShapeDepthPhase: { value: shapeDepthPhase },
      uPathShapeMotion: { value: 0 },
      uPathShapeProgress: { value: 0 },
      uPathShapePositionProgress: { value: 0 },
      uPathShapeRotation: { value: new THREE.Vector2() },
      uPathShapeScatter: { value: 1 },
      uPathShapeSampleCount: { value: PATH_SHAPE_SAMPLE_COUNT },
      uPathShapeSize: { value: new THREE.Vector2() },
      uPathShapeTrackedScatter: {
        value: new THREE.Vector2(tracked?.acrossScatter ?? 0, tracked?.depthScatter ?? 0),
      },
      uTrackedClearanceSeed: { value: tracked?.clearanceSeed ?? 0 },
      uTrackedScatter: { value: tracked?.scatter.clone() ?? new THREE.Vector3() },
      uPathShapeTrackedSeed: { value: tracked?.seed ?? 0 },
      uPathShapeTrackingEnabled: { value: Number(tracked !== undefined) },
      uPathShapeTexture: { value: null },
      uParticleMotionEnabled: { value: 0 },
      uPointerRepelRadius: { value: 0.2 },
      uPixelRatio: { value: pixelRatio },
      uSizeFalloff: { value: THREE.MathUtils.clamp(stars.sizeFalloff, 0, 1) },
      uScatterSize: { value: new THREE.Vector2(12, 12) },
      uScrollDrift: { value: 0 },
      uScrollScatter: { value: 0 },
      uScrollPositionProgress: { value: 0 },
      uScrollSizeScale: { value: 1 },
      uSpiralTilt: { value: 0 },
      uTextBounds: { value: new THREE.Vector2(-3, 3) },
      uTime: { value: 0 },
      uTwinkleSpeed: { value: THREE.MathUtils.clamp(stars.twinkleSpeed, 0, 2) },
      uViewportAspect: { value: 1 },
    },
    vertexShader: STAR_VERTEX_SHADER,
  });
}

/* -------------------------------------------------------------------------- */
/* Budgeting                                                                   */
/* -------------------------------------------------------------------------- */

/** Largest-remainder split of a particle budget across the requested counts. */
function distribute(counts: number[], budget: number): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (budget >= total) return counts;
  if (budget <= 0) return counts.map(() => 0);
  const scaled = counts.map((count) => (count / total) * budget);
  const floored = scaled.map(Math.floor);
  let remaining = budget - floored.reduce((sum, count) => sum + count, 0);
  const order = scaled
    .map((value, index) => ({ index, fraction: value - (floored[index] ?? 0) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (remaining <= 0) break;
    floored[index] = (floored[index] ?? 0) + 1;
    remaining -= 1;
  }
  return floored;
}

/* -------------------------------------------------------------------------- */
/* Star generation                                                             */
/* -------------------------------------------------------------------------- */

interface ArmStars {
  flareAcrossOffset: number;
  flareBasePosition: THREE.Vector3;
  flareClearanceSeed: number;
  flareDepthOffset: number;
  flarePathSamples: Float32Array;
  flarePosition: THREE.Vector3;
  flareProgress: number;
  flareScatter: THREE.Vector3;
  flareShapeAcrossScatter: number;
  flareShapeDepthScatter: number;
  flareShapeSeed: number;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  pathShapeDepth: number;
  pathShapeDepthPhase: number;
  pathTexture: THREE.DataTexture;
  points: THREE.Points;
}

function samplePathTexture(curve: THREE.Curve<THREE.Vector3>): {
  samples: Float32Array;
  texture: THREE.DataTexture;
} {
  const samples = new Float32Array(4 * PATH_SAMPLE_COUNT);
  const point = new THREE.Vector3();
  for (let index = 0; index < PATH_SAMPLE_COUNT; index += 1) {
    curve.getPointAt(index / (PATH_SAMPLE_COUNT - 1), point);
    const offset = 4 * index;
    samples[offset] = point.x;
    samples[offset + 1] = point.y;
    samples[offset + 2] = point.z;
    samples[offset + 3] = 1;
  }
  return {
    samples,
    texture: configureTexture(
      new THREE.DataTexture(samples, PATH_SAMPLE_COUNT, 1, THREE.RGBAFormat, THREE.FloatType),
    ),
  };
}

function buildArmStars(
  curve: THREE.Curve<THREE.Vector3>,
  arm: (typeof ASTRA_ARMS)[number],
  speed: number,
  armIndex: number,
  config: AstraConfig,
  authoredCount: number,
  backgroundCount: number,
  pixelRatio: number,
): ArmStars {
  const { stars, colors, rotationDepth } = config;
  const total = authoredCount + backgroundCount;
  const positions = new Float32Array(3 * total);
  const acrossOffsets = new Float32Array(total);
  const brightness = new Float32Array(total);
  const starColors = new Float32Array(3 * total);
  const depthOffsets = new Float32Array(total);
  const hero = new Float32Array(total);
  const opacity = new Float32Array(total);
  const orbitProgress = new Float32Array(total);
  const scale = new Float32Array(total);
  const twinklePhase = new Float32Array(total);
  const twinkleRate = new Float32Array(total);
  const random = createRandom(0x243f6a88 ^ ((armIndex + 1) * 0x9e3779b9));
  const colorRandom = createRandom(0xa4093822 ^ ((armIndex + 1) * 0x299f31d0));
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const across = new THREE.Vector3();
  const brightest = new THREE.Vector3();
  const falloff = THREE.MathUtils.clamp(stars.densityFalloff, 0, 1);
  const scatter = THREE.MathUtils.clamp(stars.scatter, 0, 0.45);
  const { samples, texture } = samplePathTexture(curve);
  const sizeScale = THREE.MathUtils.clamp(stars.size, 0.25, 3);

  let brightestScale = -Infinity;
  let brightestAcross = 0;
  let brightestDepth = 0;
  let brightestProgress = 0.5;
  let brightestIndex = 0;

  for (let index = 0; index < total; index += 1) {
    const seed = random();
    const progress = densityProgress(seed, falloff);
    const weight = middleWeight(progress);
    curve.getPointAt(progress, point);
    curve.getTangentAt(progress, tangent).normalize();
    across.set(-tangent.y, tangent.x, 0).normalize();
    const spread = scatter * THREE.MathUtils.lerp(0.3, 1, weight) * (0.22 + 0.78 * random());
    const acrossOffset = (random() + random() - 1) * spread;
    const depthOffset = (random() + random() - 1) * spread * 0.65;
    point.addScaledVector(across, acrossOffset);
    point.z += depthOffset;
    const brightChance = THREE.MathUtils.lerp(
      (arm.strong ? 0.085 : 0.055) * 0.22,
      arm.strong ? 0.085 : 0.055,
      weight,
    );
    const isBright = random() < brightChance;
    const starScale =
      (isBright ? 0.85 + 1.25 * random() : 0.12 + random() ** 2.4 * 0.68) * sizeScale;
    const starBrightness =
      (isBright ? 2 + 1.5 * random() : 0.56 + 0.78 * random()) * (arm.strong ? 1 : 0.82);
    const offset = 3 * index;
    positions[offset] = point.x;
    positions[offset + 1] = point.y;
    positions[offset + 2] = point.z;
    acrossOffsets[index] = acrossOffset;
    brightness[index] = starBrightness;
    writeStarColor(starColors, offset, colorRandom(), colors);
    depthOffsets[index] = depthOffset;
    opacity[index] = 0.82 + 0.16 * random();
    orbitProgress[index] = seed;
    scale[index] = starScale;
    twinklePhase[index] = random() * Math.PI * 2;
    twinkleRate[index] = 0.65 + 0.7 * random();
    if (index < authoredCount && starScale > brightestScale) {
      brightestScale = starScale;
      brightestAcross = acrossOffset;
      brightestDepth = depthOffset;
      brightestProgress = seed;
      brightestIndex = index;
      brightest.copy(point);
    }
  }

  // The brightest star of the arm becomes its hero: a little larger and
  // brighter than chance gave it, tracked on the CPU so the lens flare can
  // sit exactly on it wherever the shader sends it.
  const heroIndex = brightestIndex;
  brightestProgress = orbitProgress[heroIndex] ?? brightestProgress;
  brightestAcross = acrossOffsets[heroIndex] ?? brightestAcross;
  brightestDepth = depthOffsets[heroIndex] ?? brightestDepth;
  scale[heroIndex] = Math.max(scale[heroIndex] ?? 0, (arm.strong ? 2.2 : 2.05) * sizeScale);
  brightness[heroIndex] = Math.max(brightness[heroIndex] ?? 0, arm.strong ? 3.35 : 2.85);
  hero[heroIndex] = 1;

  const pathShapeDepth = arm.depth * THREE.MathUtils.clamp(rotationDepth, 0, 2);
  const pathShapeDepthPhase = 0.82 * armIndex;
  const heroProgress = orbitProgress[heroIndex] ?? 0;
  const heroPhase = twinklePhase[heroIndex] ?? 0;
  const heroScale = scale[heroIndex] ?? 0;
  const shapeSeed = Math.fround(
    positiveModulo(heroProgress * 0.754877666 + heroPhase * 0.159154943 + heroScale * 0.117, 1),
  );
  const scatterX = shaderHash(heroProgress, heroPhase, 127.1, 311.7);
  const scatterY = shaderHash(heroPhase, heroScale, 269.5, 183.3);
  const scatterZ = shaderHash(heroProgress, brightness[heroIndex] ?? 0, 419.2, 371.9);
  const clearanceSeed = shaderHash(
    opacity[heroIndex] ?? 0,
    twinkleRate[heroIndex] ?? 0,
    157.3,
    283.9,
  );
  const flareScatter = new THREE.Vector3(scatterX, scatterY, scatterZ);
  const shapeAcrossScatter = Math.fround((scatterX + scatterY - 1) * 0.12);
  const shapeDepthScatter = Math.fround((scatterZ - 0.5) * 0.22);
  writeStarColor(starColors, 3 * heroIndex, SECONDARY_COLOR_SEEDS[armIndex] ?? 0.08, colors);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("orbitProgress", new THREE.Float32BufferAttribute(orbitProgress, 1));
  geometry.setAttribute("starAcrossOffset", new THREE.Float32BufferAttribute(acrossOffsets, 1));
  geometry.setAttribute("starDepthOffset", new THREE.Float32BufferAttribute(depthOffsets, 1));
  geometry.setAttribute("starHero", new THREE.Float32BufferAttribute(hero, 1));
  geometry.setAttribute(
    "starBackground",
    new THREE.Float32BufferAttribute(new Float32Array(total).fill(1, authoredCount), 1),
  );
  geometry.setAttribute("starBrightness", new THREE.Float32BufferAttribute(brightness, 1));
  geometry.setAttribute("starColor", new THREE.Float32BufferAttribute(starColors, 3));
  geometry.setAttribute("starOpacity", new THREE.Float32BufferAttribute(opacity, 1));
  geometry.setAttribute("starScale", new THREE.Float32BufferAttribute(scale, 1));
  geometry.setAttribute("twinklePhase", new THREE.Float32BufferAttribute(twinklePhase, 1));
  geometry.setAttribute("twinkleRate", new THREE.Float32BufferAttribute(twinkleRate, 1));

  const material = createStarMaterial(
    config,
    pixelRatio,
    texture,
    speed,
    pathShapeDepth,
    pathShapeDepthPhase,
    0.5,
    {
      acrossScatter: shapeAcrossScatter,
      clearanceSeed,
      depthScatter: shapeDepthScatter,
      scatter: flareScatter,
      seed: shapeSeed,
    },
  );
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 40 + armIndex;

  return {
    flareAcrossOffset: brightestAcross,
    flareBasePosition: brightest.clone(),
    flareClearanceSeed: clearanceSeed,
    flareDepthOffset: brightestDepth,
    flarePathSamples: samples,
    flarePosition: brightest,
    flareProgress: brightestProgress,
    flareScatter,
    flareShapeAcrossScatter: shapeAcrossScatter,
    flareShapeDepthScatter: shapeDepthScatter,
    flareShapeSeed: shapeSeed,
    geometry,
    material,
    pathShapeDepth,
    pathShapeDepthPhase,
    pathTexture: texture,
    points,
  };
}

interface CoreStars {
  flareBasePosition: THREE.Vector3;
  flareClearanceSeed: number;
  flareScatter: THREE.Vector3;
  flareShapeAcrossScatter: number;
  flareShapeDepthScatter: number;
  flareShapeSeed: number;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  points: THREE.Points;
}

/** The dense knot at the centre, brighter towards the middle. */
function buildCoreStars(config: AstraConfig, count: number, pixelRatio: number): CoreStars {
  const { stars, colors } = config;
  const positions = new Float32Array(3 * count);
  const brightness = new Float32Array(count);
  const starColors = new Float32Array(3 * count);
  const hero = new Float32Array(count);
  const opacity = new Float32Array(count);
  const scale = new Float32Array(count);
  const twinklePhase = new Float32Array(count);
  const twinkleRate = new Float32Array(count);
  const random = createRandom(0xb7e15162);
  const colorRandom = createRandom(0xc0ac29b7);
  const sizeScale = THREE.MathUtils.clamp(stars.size, 0.25, 3);
  let heroIndex = 0;
  let heroWeight = -Infinity;

  for (let index = 0; index < count; index += 1) {
    const radius = random() ** 2.4 * 0.42;
    const angle = random() * Math.PI * 2;
    const offset = 3 * index;
    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = Math.sin(angle) * radius * 0.72;
    positions[offset + 2] = (random() - 0.5) * 0.16;
    const centrality = 1 - radius / 0.42;
    brightness[index] = 1.2 + 2.8 * centrality + 0.6 * random();
    writeStarColor(starColors, offset, centrality > 0.74 ? 0.99 : colorRandom(), colors);
    opacity[index] = 0.62 + 0.38 * centrality;
    scale[index] = (0.28 + 1.45 * centrality + 0.45 * random()) * sizeScale * 0.8;
    const weight = (brightness[index] ?? 0) * (scale[index] ?? 0);
    if (weight > heroWeight) {
      heroIndex = index;
      heroWeight = weight;
    }
    twinklePhase[index] = random() * Math.PI * 2;
    twinkleRate[index] = 0.55 + 0.45 * random();
  }
  hero[heroIndex] = 1;

  const heroOffset = 3 * heroIndex;
  const flareBasePosition = new THREE.Vector3(
    positions[heroOffset] ?? 0,
    positions[heroOffset + 1] ?? 0,
    positions[heroOffset + 2] ?? 0,
  );
  const heroPhase = twinklePhase[heroIndex] ?? 0;
  const heroScale = scale[heroIndex] ?? 0;
  const flareScatter = new THREE.Vector3(
    shaderHash(0, heroPhase, 127.1, 311.7),
    shaderHash(heroPhase, heroScale, 269.5, 183.3),
    shaderHash(0, brightness[heroIndex] ?? 0, 419.2, 371.9),
  );
  const clearanceSeed = shaderHash(
    opacity[heroIndex] ?? 0,
    twinkleRate[heroIndex] ?? 0,
    157.3,
    283.9,
  );
  const shapeSeed = Math.fround(positiveModulo(heroPhase * 0.159154943 + heroScale * 0.117, 1));
  const shapeAcrossScatter = Math.fround((flareScatter.x + flareScatter.y - 1) * 0.12);
  const shapeDepthScatter = Math.fround((flareScatter.z - 0.5) * 0.22);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute(
    "orbitProgress",
    new THREE.Float32BufferAttribute(new Float32Array(count), 1),
  );
  geometry.setAttribute(
    "starAcrossOffset",
    new THREE.Float32BufferAttribute(new Float32Array(count), 1),
  );
  geometry.setAttribute(
    "starDepthOffset",
    new THREE.Float32BufferAttribute(new Float32Array(count), 1),
  );
  geometry.setAttribute("starHero", new THREE.Float32BufferAttribute(hero, 1));
  geometry.setAttribute(
    "starBackground",
    new THREE.Float32BufferAttribute(new Float32Array(count), 1),
  );
  geometry.setAttribute("starBrightness", new THREE.Float32BufferAttribute(brightness, 1));
  geometry.setAttribute("starColor", new THREE.Float32BufferAttribute(starColors, 3));
  geometry.setAttribute("starOpacity", new THREE.Float32BufferAttribute(opacity, 1));
  geometry.setAttribute("starScale", new THREE.Float32BufferAttribute(scale, 1));
  geometry.setAttribute("twinklePhase", new THREE.Float32BufferAttribute(twinklePhase, 1));
  geometry.setAttribute("twinkleRate", new THREE.Float32BufferAttribute(twinkleRate, 1));

  const material = createStarMaterial(
    { ...config, stars: { ...stars, intensity: 1.22 * stars.intensity } },
    pixelRatio,
    null,
    0,
    0.18,
    2.4,
    0.5,
    {
      acrossScatter: shapeAcrossScatter,
      clearanceSeed,
      depthScatter: shapeDepthScatter,
      scatter: flareScatter,
      seed: shapeSeed,
    },
  );
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 100;

  return {
    flareBasePosition,
    flareClearanceSeed: clearanceSeed,
    flareScatter,
    flareShapeAcrossScatter: shapeAcrossScatter,
    flareShapeDepthScatter: shapeDepthScatter,
    flareShapeSeed: shapeSeed,
    geometry,
    material,
    points,
  };
}

/* -------------------------------------------------------------------------- */
/* Assembly                                                                    */
/* -------------------------------------------------------------------------- */

export function generateAstraField(
  config: AstraConfig,
  options: FieldOptions = {},
): AstraField {
  const tier = options.tier ?? 3;
  const trackSources = options.trackOpticalSources ?? true;
  const maxDensity = tier <= 1 ? 2 : 4;
  const density = THREE.MathUtils.clamp(config.stars.density, 0.25, maxDensity);
  const pixelRatio = Number.isFinite(options.pixelRatio)
    ? THREE.MathUtils.clamp(options.pixelRatio ?? 1, 0.1, tier <= 1 ? 1 : tier === 2 ? 1.5 : 2)
    : 1;

  // Authored stars form the galaxy; a further 12% per arm stay in the sky so
  // the opening reads as a field converging rather than appearing from black.
  const authored = ASTRA_ARMS.map((arm) =>
    Math.max(8, Math.round((arm.strong ? 220 : 170) * density)),
  );
  authored.push(config.showCenterCluster ? Math.max(18, Math.round(24 * density)) : 0);
  const background = authored.map((count, index) =>
    index < ASTRA_ARMS.length ? Math.ceil((0.12 * count) / 0.88) : 0,
  );
  const requested = [...authored, ...background].reduce((sum, count) => sum + count, 0);
  const budget =
    tier === 0
      ? 0
      : options.maxParticleCount === undefined || options.maxParticleCount === Infinity
        ? requested
        : Math.max(0, Math.floor(options.maxParticleCount));
  const authoredCounts = distribute(authored, budget);
  const authoredTotal = authoredCounts.reduce((sum, count) => sum + count, 0);
  const backgroundCounts = distribute(background, Math.max(0, budget - authoredTotal));

  const group = new THREE.Group();
  const coreSource = new THREE.Object3D();
  coreSource.scale.setScalar(0);
  group.add(coreSource);

  const disposables: { dispose: () => void }[] = [];
  const orbits: Orbit[] = [];
  const pathLayers: PathLayer[] = [];
  const secondarySources: THREE.Object3D[] = [];
  let coreCluster: THREE.Points | null = null;
  const particleCount = authoredTotal + backgroundCounts.reduce((sum, count) => sum + count, 0);

  if (particleCount > 0) {
    ASTRA_ARMS.forEach((arm, index) => {
      const shape = ARM_SHAPES[index];
      const count = authoredCounts[index] ?? 0;
      if (!shape || count === 0) return;
      const curve = new SpiralArm(
        shape,
        arm.depth,
        THREE.MathUtils.clamp(config.rotationDepth, 0, 2),
        0.82 * index,
      );
      const speed = flowSpeed(curve, arm.speed, config.stars.flowInward);
      const stars = buildArmStars(
        curve,
        arm,
        speed,
        index,
        config,
        count,
        backgroundCounts[index] ?? 0,
        pixelRatio,
      );

      const orbitGroup = new THREE.Group();
      orbitGroup.add(stars.points);

      let flareSource: THREE.Object3D | null = null;
      if (trackSources) {
        flareSource = new THREE.Object3D();
        flareSource.position.copy(stars.flarePosition);
        const progress = densityProgress(stars.flareProgress, config.stars.densityFalloff);
        flareSource.scale.setScalar(
          tipFade(progress) * sizeFalloff(progress, config.stars.sizeFalloff),
        );
        orbitGroup.add(flareSource);
        secondarySources.push(flareSource);
      }

      group.add(orbitGroup);
      orbits.push({ group: orbitGroup, lag: 0.18 + 0.17 * index, spin: new THREE.Vector2() });
      pathLayers.push({
        curve,
        flareAcrossOffset: stars.flareAcrossOffset,
        flareBasePosition: stars.flareBasePosition,
        flareClearanceSeed: stars.flareClearanceSeed,
        flareDepthOffset: stars.flareDepthOffset,
        flarePathSamples: stars.flarePathSamples,
        flareProgress: stars.flareProgress,
        flareScatter: stars.flareScatter,
        flareShapeAcrossScatter: stars.flareShapeAcrossScatter,
        flareShapeDepthScatter: stars.flareShapeDepthScatter,
        flareShapeSeed: stars.flareShapeSeed,
        flareSource,
        isCore: false,
        speed,
        phase: arm.phase,
        motionOffset: 0,
        travel: arm.phase,
        starMaterial: stars.material,
        strong: arm.strong,
        pathShapeDepth: stars.pathShapeDepth,
        pathShapeDepthPhase: stars.pathShapeDepthPhase,
        pathShapeTravel: 0,
      });
      disposables.push(stars.geometry, stars.material, stars.pathTexture);
    });

    const coreCount = authoredCounts[ASTRA_ARMS.length] ?? 0;
    if (coreCount > 0) {
      const core = buildCoreStars(config, coreCount, pixelRatio);
      group.add(core.points);
      if (trackSources) {
        coreSource.position.copy(core.flareBasePosition);
        coreSource.scale.setScalar(1);
        core.points.add(coreSource);
      }
      coreCluster = core.points;
      disposables.push(core.geometry, core.material);
      pathLayers.push({
        curve: null,
        flareAcrossOffset: 0,
        flareBasePosition: core.flareBasePosition,
        flareClearanceSeed: core.flareClearanceSeed,
        flareDepthOffset: 0,
        flarePathSamples: null,
        flareProgress: 0,
        flareScatter: core.flareScatter,
        flareShapeAcrossScatter: core.flareShapeAcrossScatter,
        flareShapeDepthScatter: core.flareShapeDepthScatter,
        flareShapeSeed: core.flareShapeSeed,
        flareSource: trackSources ? coreSource : null,
        isCore: true,
        speed: 0,
        phase: 0,
        motionOffset: 0,
        travel: 0,
        starMaterial: core.material,
        strong: true,
        pathShapeDepth: 0.18,
        pathShapeDepthPhase: 2.4,
        pathShapeTravel: 0,
      });
    }
  }

  let disposed = false;
  return {
    group,
    coreCluster,
    coreSource,
    secondarySources,
    orbits,
    pathLayers,
    particleCount,
    particleMotionEnabled: false,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const item of disposables) item.dispose();
      group.clear();
    },
  };
}
