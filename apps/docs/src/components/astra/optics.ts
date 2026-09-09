import { BlendFunction, Effect } from "postprocessing";
import * as THREE from "three";

import {
  PARTICLE_MOTION_SETTLE_SECONDS,
  type AstraDirtyGlassConfig,
  type AstraLensFlareConfig,
} from "./config";
import { COAST_GLSL } from "./shaders";

/**
 * The glass in front of the galaxy.
 *
 * A lens flare on the core star and a fainter one on each arm's hero star,
 * plus a procedurally generated dirt map that warps and grains the picture
 * slightly. The dirt is generated rather than loaded: a texture would be one
 * more asset to ship, and this one is only ever looked at through a warp.
 */

const SECONDARY_SOURCES = 5;

/* -------------------------------------------------------------------------- */
/* Procedural lens dirt                                                        */
/* -------------------------------------------------------------------------- */

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothRange(edge0: number, edge1: number, value: number): number {
  const t = clampNumber((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    let value = (state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), 1 | value);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

interface NoiseGrid {
  columns: number;
  rows: number;
  values: Float32Array;
}

function createNoise(columns: number, rows: number, random: () => number): NoiseGrid {
  const values = new Float32Array(columns * rows);
  for (let index = 0; index < values.length; index += 1) values[index] = random();
  return { columns, rows, values };
}

function sampleNoise(grid: NoiseGrid, u: number, v: number): number {
  const x = clampNumber(u, 0, 1) * (grid.columns - 1);
  const y = clampNumber(v, 0, 1) * (grid.rows - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, grid.columns - 1);
  const y1 = Math.min(y0 + 1, grid.rows - 1);
  const fx = smoothRange(0, 1, x - x0);
  const fy = smoothRange(0, 1, y - y0);
  const row0 =
    (grid.values[y0 * grid.columns + x0] ?? 0) * (1 - fx) +
    (grid.values[y0 * grid.columns + x1] ?? 0) * fx;
  const row1 =
    (grid.values[y1 * grid.columns + x0] ?? 0) * (1 - fx) +
    (grid.values[y1 * grid.columns + x1] ?? 0) * fx;
  return row0 * (1 - fy) + row1 * fy;
}

/** Roughly Gaussian, centred on zero. */
function gaussian(random: () => number): number {
  return (random() + random() + random() + random() + random() + random() - 3) / 3;
}

function stampSpeck(
  target: Float32Array,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radius: number,
  strength: number,
  salt: number,
): void {
  const extent = Math.max(radius, 0.5);
  const left = Math.max(0, Math.floor(centerX - extent - 1));
  const right = Math.min(width - 1, Math.ceil(centerX + extent + 1));
  const top = Math.max(0, Math.floor(centerY - extent - 1));
  const bottom = Math.min(height - 1, Math.ceil(centerY + extent + 1));
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const distance = Math.hypot(x - centerX, y - centerY) / extent;
      if (distance >= 1) continue;
      let hash = Math.imul(x + 31 * salt, 0x466f45d);
      hash ^= Math.imul(y + 17 * salt, 0x127409f);
      hash = Math.imul(hash ^ (hash >>> 13), 0x4bf19f61);
      const noise = ((hash ^ (hash >>> 16)) >>> 0) / 0x100000000;
      if (distance > 0.42 && noise < 0.3 + 0.24 * distance) continue;
      const value = strength * (1 - smoothRange(0.48, 1, distance)) * (0.52 + 0.48 * noise);
      const index = y * width + x;
      target[index] = Math.max(target[index] ?? 0, value);
    }
  }
}

/** Broad haze, wipe marks, grit, a few smears — the film on a lens. */
function generateDirtField(width: number, height: number, seed: number): Float32Array {
  const random = createRandom(seed);
  const coarse = createNoise(13, 10, random);
  const fine = createNoise(47, 35, random);
  const wipes = Array.from({ length: 7 }, () => {
    const angle = random() * Math.PI;
    return {
      centerX: 0.08 + 0.84 * random(),
      centerY: 0.08 + 0.84 * random(),
      cosine: Math.cos(angle),
      sine: Math.sin(angle),
      frequency: 8 + 18 * random(),
      phase: random() * Math.PI * 2,
      radiusX: 0.08 + 0.18 * random(),
      radiusY: 0.035 + 0.09 * random(),
      strength: 0.035 + 0.075 * random(),
    };
  });
  const field = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const v = y / Math.max(height - 1, 1);
    for (let x = 0; x < width; x += 1) {
      const u = x / Math.max(width - 1, 1);
      const broad = sampleNoise(coarse, u, v);
      const detail = sampleNoise(fine, u, v);
      const jitter = random();
      const haze = smoothRange(0.43, 0.74, 0.68 * broad + 0.32 * detail);
      let value =
        0.018 +
        0.032 * broad +
        0.022 * detail +
        0.012 * jitter +
        haze * (0.038 + 0.032 * jitter);
      for (const wipe of wipes) {
        const dx = u - wipe.centerX;
        const dy = v - wipe.centerY;
        const along = (dx * wipe.cosine + dy * wipe.sine) / wipe.radiusX;
        const across = (-dx * wipe.sine + dy * wipe.cosine) / wipe.radiusY;
        const distance = along * along + across * across;
        if (distance >= 1) continue;
        const falloff = 1 - smoothRange(0.18, 1, Math.sqrt(distance));
        const streaks = Math.pow(
          0.5 + 0.5 * Math.sin((0.72 * along + across) * wipe.frequency + wipe.phase),
          8,
        );
        value += wipe.strength * falloff * (0.18 + 0.82 * streaks) * (0.5 + 0.5 * jitter);
      }
      const spark = random();
      if (spark > 0.965) value += 0.5 * Math.pow((spark - 0.965) / 0.035, 1.8);
      field[y * width + x] = value;
    }
  }

  const clusters = Array.from({ length: 18 }, () => ({
    x: random() * width,
    y: random() * height,
    spreadX: width * (0.022 + 0.095 * random()),
    spreadY: height * (0.018 + 0.075 * random()),
  }));
  const speckCount = Math.max(32, Math.round((width * height) / 58));
  for (let index = 0; index < speckCount; index += 1) {
    let x = random() * width;
    let y = random() * height;
    if (random() < 0.58) {
      const cluster = clusters[Math.floor(random() * clusters.length)];
      if (cluster) {
        x = cluster.x + gaussian(random) * cluster.spreadX;
        y = cluster.y + gaussian(random) * cluster.spreadY;
      }
    }
    stampSpeck(
      field,
      width,
      height,
      x,
      y,
      0.52 + 1.15 * Math.pow(random(), 3),
      0.24 + 0.7 * Math.pow(random(), 1.8),
      seed + index,
    );
  }

  const blotCount = Math.max(6, Math.round((width * height) / 4e3));
  for (let index = 0; index < blotCount; index += 1) {
    const x = random() * width;
    const y = random() * height;
    const pieces = 2 + Math.floor(4 * random());
    const strength = 0.28 + 0.5 * random();
    for (let piece = 0; piece < pieces; piece += 1) {
      stampSpeck(
        field,
        width,
        height,
        x + 3.5 * gaussian(random),
        y + 3.5 * gaussian(random),
        1.2 + 3.8 * random(),
        strength * (0.55 + 0.45 * random()),
        seed + 7 * index + piece,
      );
    }
  }

  const smearCount = Math.max(3, Math.round((width * height) / 2e4));
  for (let index = 0; index < smearCount; index += 1) {
    const x = random() * width;
    const y = random() * height;
    const angle = random() * Math.PI * 2;
    const length = width * (0.08 + 0.22 * random());
    const steps = Math.max(1, Math.ceil(length / 0.7));
    const strength = 0.07 + 0.15 * random();
    for (let step = 0; step <= steps; step += 1) {
      if (random() < 0.28) continue;
      const t = step / steps;
      const wobble = 0.9 * gaussian(random);
      stampSpeck(
        field,
        width,
        height,
        x + Math.cos(angle) * length * t - Math.sin(angle) * wobble,
        y + Math.sin(angle) * length * t + Math.cos(angle) * wobble,
        0.45 + 0.45 * random(),
        strength * (0.55 + 0.45 * random()),
        seed + 131 * index + step,
      );
    }
  }
  return field;
}

let cachedDirt: Uint8Array | undefined;

export function createLensDirtTexture(
  width = 256,
  height = 192,
  seed = 0xa57ad175,
): THREE.DataTexture {
  const isDefault = width === 256 && height === 192 && seed === 0xa57ad175;
  let data = isDefault ? cachedDirt : undefined;
  if (!data) {
    const field = generateDirtField(width, height, seed);
    data = new Uint8Array(width * height * 4);
    for (let index = 0; index < field.length; index += 1) {
      const value = Math.round(255 * Math.pow(clampNumber(field[index] ?? 0, 0, 1), 0.94));
      const offset = 4 * index;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
    if (isDefault) cachedDirt = data;
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.name = "Astra procedural lens dirt";
  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = false;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

/* -------------------------------------------------------------------------- */
/* The effect                                                                  */
/* -------------------------------------------------------------------------- */

const VERTEX_SHADER = /* glsl */ `
  uniform sampler2D uParticleMotionTexture;
  uniform float uParticleMotionAge;
  uniform vec3 uPrimaryMotionUv;
  uniform vec3 uSecondaryMotionUvs[${SECONDARY_SOURCES}];
  varying vec2 vPrimaryMotion;
  varying vec2 vSecondaryMotion[${SECONDARY_SOURCES}];
  ${COAST_GLSL}
  vec2 particleOffset(vec3 particleUv) {
    if (particleUv.x < 0.0 || uParticleMotionAge >= ${PARTICLE_MOTION_SETTLE_SECONDS}.0) return vec2(0.0);
    return astraCoast(texture2D(uParticleMotionTexture, particleUv.xy), particleUv.z, uParticleMotionAge).xy * 0.5;
  }
  void mainSupport() {
    vPrimaryMotion = particleOffset(uPrimaryMotionUv);
    for (int i = 0; i < ${SECONDARY_SOURCES}; i++) vSecondaryMotion[i] = particleOffset(uSecondaryMotionUvs[i]);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uDirtTexture;
  varying vec2 vPrimaryMotion;
  varying vec2 vSecondaryMotion[${SECONDARY_SOURCES}];
  uniform vec2 uCenter;
  uniform float uAspect;
  uniform float uDirtyGlassEnabled;
  uniform float uDistortion;
  uniform float uDirtTextureAspect;
  uniform vec2 uDirtTextureOffset;
  uniform float uDirtTextureRotation;
  uniform float uFlareEnabled;
  uniform float uGhosts;
  uniform float uGrain;
  uniform float uHalo;
  uniform float uIntensity;
  uniform vec2 uSecondaryCenters[${SECONDARY_SOURCES}];
  uniform float uSecondaryIntensity;
  uniform float uSecondaryVisibility[${SECONDARY_SOURCES}];
  uniform float uStreakLength;
  uniform float uStreaks;
  uniform float uVerticalStreaks;
  uniform float uVisibility;

  float astraHash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float softDisc(vec2 point, float radius, float softness) {
    return 1.0 - smoothstep(radius - softness, radius + softness, length(point));
  }

  float softRing(vec2 point, float radius, float width) {
    float distanceToRing = abs(length(point) - radius);
    return 1.0 - smoothstep(width, width * 2.0, distanceToRing);
  }

  vec2 aspectCorrect(vec2 point) {
    point.x *= uAspect;
    return point;
  }

  vec2 coverTextureUv(vec2 uv, float viewportAspect, float textureAspect) {
    vec2 centeredUv = uv - 0.5;
    if (viewportAspect > textureAspect) {
      centeredUv.y *= textureAspect / viewportAspect;
    } else {
      centeredUv.x *= viewportAspect / textureAspect;
    }
    return centeredUv + 0.5;
  }

  float secondaryFlare(vec2 center, vec2 uv) {
    vec2 point = aspectCorrect(uv - center);
    float distanceToSource = length(point);
    // The star and its bloom already give the sharp core. Optics add only a
    // soft halo and restrained streaks, so a tracking difference of a pixel
    // can never read as a second, detached star.
    float nearHalo = exp(-distanceToSource * distanceToSource * 520.0) * 0.1;
    float halo = exp(-distanceToSource * 17.0) * 0.055;
    float horizontalWindow = 1.0 - smoothstep(uStreakLength * 0.72, uStreakLength, abs(point.x));
    float verticalWindow = 1.0 - smoothstep(uStreakLength * 0.72, uStreakLength, abs(point.y));
    horizontalWindow = mix(horizontalWindow, 1.0, step(0.99, uStreakLength));
    verticalWindow = mix(verticalWindow, 1.0, step(0.99, uStreakLength));
    float horizontalStreak = exp(-abs(point.y) * 360.0) * exp(-abs(point.x) * 10.0) * horizontalWindow * 0.24;
    float verticalStreak = exp(-abs(point.x) * 360.0) * exp(-abs(point.y) * 10.0) * verticalWindow * 0.24 * uVerticalStreaks;
    return nearHalo + halo + horizontalStreak + verticalStreak;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 base = inputColor.rgb;
    vec2 movingCenter = uCenter + vPrimaryMotion;
    vec2 source = aspectCorrect(uv - movingCenter);
    float sourceDistance = length(source);

    float core = exp(-sourceDistance * sourceDistance * 480.0) * 0.18;
    float halo = exp(-sourceDistance * 11.5) * uHalo;
    halo += softRing(source, 0.105, 0.006) * 0.05 * uHalo;

    float horizontalWindow = 1.0 - smoothstep(uStreakLength * 0.72, uStreakLength, abs(source.x));
    float verticalWindow = 1.0 - smoothstep(uStreakLength * 0.72, uStreakLength, abs(source.y));
    horizontalWindow = mix(horizontalWindow, 1.0, step(0.99, uStreakLength));
    verticalWindow = mix(verticalWindow, 1.0, step(0.99, uStreakLength));
    float horizontalStreak = exp(-abs(source.y) * 310.0) * exp(-abs(source.x) * 7.5) * horizontalWindow;
    float softHorizontalStreak = exp(-abs(source.y) * 78.0) * exp(-abs(source.x) * 5.2) * horizontalWindow * 0.16;
    float verticalStreak = exp(-abs(source.x) * 310.0) * exp(-abs(source.y) * 7.5) * verticalWindow;
    float softVerticalStreak = exp(-abs(source.x) * 78.0) * exp(-abs(source.y) * 5.2) * verticalWindow * 0.16;
    float streak = (horizontalStreak + softHorizontalStreak + (verticalStreak + softVerticalStreak) * uVerticalStreaks) * uStreaks;

    vec2 opticalAxis = vec2(0.5) - movingCenter;
    vec2 ghostA = aspectCorrect(uv - (movingCenter + opticalAxis * 0.82));
    vec2 ghostB = aspectCorrect(uv - (movingCenter + opticalAxis * 1.38));
    vec2 ghostC = aspectCorrect(uv - (movingCenter + opticalAxis * 1.82));
    float ghosts = 0.0;
    ghosts += softDisc(ghostA, 0.016, 0.014) * 0.18;
    ghosts += softRing(ghostB, 0.046, 0.006) * 0.11;
    ghosts += softDisc(ghostC, 0.025, 0.02) * 0.08;
    ghosts *= uGhosts;

    float flare = (core + halo + streak + ghosts) * uIntensity;
    float secondary = 0.0;
    float secondaryDirtHalo = 0.0;
    for (int i = 0; i < ASTRA_SECONDARY_SOURCES; i++) {
      vec2 secondaryCenter = uSecondaryCenters[i] + vSecondaryMotion[i];
      secondary += secondaryFlare(secondaryCenter, uv) * uSecondaryVisibility[i];
      secondaryDirtHalo += exp(-length(aspectCorrect(uv - secondaryCenter)) * 10.0) * uSecondaryVisibility[i];
    }
    secondary *= uIntensity * uSecondaryIntensity;
    vec3 flareColor = vec3(0.956, 0.956, 0.956) * (flare * uVisibility + secondary) * uFlareEnabled;

    vec3 opticalColor = base + flareColor;
    float baseLuminance = dot(base, vec3(0.2126, 0.7152, 0.0722));
    float reveal = smoothstep(0.025, 0.72, baseLuminance);
    vec2 driftingDirtUv = uv - 0.5;
    float dirtRotationCos = cos(uDirtTextureRotation);
    float dirtRotationSin = sin(uDirtTextureRotation);
    driftingDirtUv = mat2(dirtRotationCos, -dirtRotationSin, dirtRotationSin, dirtRotationCos) * driftingDirtUv;
    driftingDirtUv += uDirtTextureOffset;
    vec2 dirtTextureUv = clamp(coverTextureUv(driftingDirtUv + 0.5, uAspect, uDirtTextureAspect), vec2(0.001), vec2(0.999));
    float dirtTextureLuminance = texture2D(uDirtTexture, dirtTextureUv).r;
    // Dirt responds to the rendered scene, not to the flare it is generating,
    // which removes the feedback-like pop at transition peaks.
    float dirtReveal = smoothstep(0.008, 0.2, baseLuminance) * (1.0 - smoothstep(0.9, 3.0, baseLuminance) * 0.68);
    float primaryDirtHalo = exp(-sourceDistance * 6.5) * uVisibility;
    float dirtHalo = (primaryDirtHalo + secondaryDirtHalo * uSecondaryIntensity) * uIntensity * uFlareEnabled;

    #if ASTRA_DISTORTION == 1
    vec2 warpUvX = dirtTextureUv * vec2(0.72, 0.78) + vec2(0.17, 0.08);
    vec2 warpUvY = vec2(1.0 - dirtTextureUv.y, dirtTextureUv.x) * vec2(0.74, 0.7) + vec2(0.12, 0.16);
    float warpSampleX = texture2D(uDirtTexture, warpUvX).r;
    float warpSampleY = texture2D(uDirtTexture, warpUvY).r;
    vec2 warpField = clamp((vec2(warpSampleX, warpSampleY) - dirtTextureLuminance) * 6.0, vec2(-0.5), vec2(0.5));
    vec2 warp = warpField * vec2(1.0 / max(uAspect, 0.001), 1.0) * uDistortion * 0.004;
    vec3 warpedBase = texture2D(inputBuffer, clamp(uv + warp, vec2(0.001), vec2(0.999))).rgb;
    opticalColor += (warpedBase - base) * reveal * uDirtyGlassEnabled * 0.55;
    #endif
    float dirtMask = smoothstep(0.1, 0.72, dirtTextureLuminance) * 0.0;
    opticalColor += vec3(0.956) * dirtHalo * dirtMask * 0.14;

    float grain = astraHash(floor(uv * vec2(1536.0, 1024.0)));
    opticalColor += vec3((grain - 0.5) * uGrain) * (0.18 + reveal * 0.82) * uDirtyGlassEnabled;

    outputColor = vec4(max(opticalColor, vec3(0.0)), inputColor.a);
  }
`;

/** Fades a flare out as its source leaves the frame, rather than clipping it. */
function edgeVisibility(projected: THREE.Vector3): number {
  if (
    !Number.isFinite(projected.x) ||
    !Number.isFinite(projected.y) ||
    projected.z < -1 ||
    projected.z > 1
  )
    return 0;
  const extent = Math.max(Math.abs(projected.x), Math.abs(projected.y));
  return 1 - THREE.MathUtils.smoothstep(extent, 0.88, 1.08);
}

export interface OpticsOptions {
  secondarySourceCount?: number;
  distortion?: boolean;
}

export class AstraOpticsEffect extends Effect {
  private readonly parameters: Record<string, THREE.Uniform>;
  private readonly dirtDriftOffset = new THREE.Vector2();
  private readonly projected = new THREE.Vector3();
  private readonly secondaryProjected = Array.from(
    { length: SECONDARY_SOURCES },
    () => new THREE.Vector3(),
  );
  private viewportAspect = 1;

  constructor(
    flare: AstraLensFlareConfig,
    dirt: THREE.DataTexture,
    glass: AstraDirtyGlassConfig,
    options: OpticsOptions = {},
  ) {
    const image = dirt.image as { width?: number; height?: number };
    const parameters: Record<string, THREE.Uniform> = {
      uParticleMotionTexture: new THREE.Uniform(null),
      uParticleMotionAge: new THREE.Uniform(PARTICLE_MOTION_SETTLE_SECONDS),
      uPrimaryMotionUv: new THREE.Uniform(new THREE.Vector3(-1, -1, 1)),
      uSecondaryMotionUvs: new THREE.Uniform(
        Array.from({ length: SECONDARY_SOURCES }, () => new THREE.Vector3(-1, -1, 1)),
      ),
      uAspect: new THREE.Uniform(1),
      uCenter: new THREE.Uniform(new THREE.Vector2(0.5, 0.5)),
      uDirtTexture: new THREE.Uniform(dirt),
      uDirtTextureAspect: new THREE.Uniform(
        image.width && image.height ? image.width / image.height : 2 / 3,
      ),
      uDirtTextureOffset: new THREE.Uniform(new THREE.Vector2()),
      uDirtTextureRotation: new THREE.Uniform(0),
      uDirtyGlassEnabled: new THREE.Uniform(Number(glass.enabled)),
      uDistortion: new THREE.Uniform(glass.distortion),
      uFlareEnabled: new THREE.Uniform(Number(flare.enabled)),
      uGhosts: new THREE.Uniform(flare.ghosts),
      uGrain: new THREE.Uniform(glass.grain),
      uHalo: new THREE.Uniform(flare.halo),
      uIntensity: new THREE.Uniform(flare.intensity),
      uSecondaryCenters: new THREE.Uniform(
        Array.from({ length: SECONDARY_SOURCES }, () => new THREE.Vector2(-2, -2)),
      ),
      uSecondaryIntensity: new THREE.Uniform(flare.secondary),
      uSecondaryVisibility: new THREE.Uniform(
        Array.from({ length: SECONDARY_SOURCES }, () => 0),
      ),
      uStreakLength: new THREE.Uniform(flare.streakLength),
      uStreaks: new THREE.Uniform(flare.streaks),
      uVerticalStreaks: new THREE.Uniform(flare.verticalStreaks),
      uVisibility: new THREE.Uniform(1),
    };
    const secondaryCount =
      options.secondarySourceCount !== undefined &&
      Number.isFinite(options.secondarySourceCount)
        ? THREE.MathUtils.clamp(Math.floor(options.secondarySourceCount), 0, SECONDARY_SOURCES)
        : SECONDARY_SOURCES;
    super("AstraOptics", FRAGMENT_SHADER, {
      blendFunction: BlendFunction.NORMAL,
      vertexShader: VERTEX_SHADER,
      defines: new Map([
        ["ASTRA_SECONDARY_SOURCES", String(secondaryCount)],
        ["ASTRA_DISTORTION", options.distortion === false ? "0" : "1"],
      ]),
      uniforms: new Map(Object.entries(parameters)),
    });
    this.parameters = parameters;
  }

  private uniform<T = number>(name: string): THREE.Uniform<T> {
    const uniform = this.parameters[name];
    if (!uniform) throw new Error(`Astra optics has no uniform named ${name}.`);
    return uniform as THREE.Uniform<T>;
  }

  setConfig(flare: AstraLensFlareConfig): void {
    this.uniform("uFlareEnabled").value = Number(flare.enabled);
    this.uniform("uGhosts").value = flare.ghosts;
    this.uniform("uHalo").value = flare.halo;
    this.uniform("uIntensity").value = flare.intensity;
    this.uniform("uSecondaryIntensity").value = flare.secondary;
    this.uniform("uStreakLength").value = flare.streakLength;
    this.uniform("uStreaks").value = flare.streaks;
    this.uniform("uVerticalStreaks").value = flare.verticalStreaks;
  }

  setDirtyGlass(glass: AstraDirtyGlassConfig): void {
    this.uniform("uDirtyGlassEnabled").value = Number(glass.enabled);
    this.uniform("uDistortion").value = glass.distortion;
    this.uniform("uGrain").value = glass.grain;
  }

  /** The dirt slides a little as the field is dragged, as glass in front would. */
  updateDirtDrift(
    rotationX: number,
    rotationY: number,
    rotationZ: number,
    glass: AstraDirtyGlassConfig,
    still: boolean,
  ): void {
    const strength =
      glass.drift && !still ? THREE.MathUtils.clamp(glass.driftStrength, 0, 1) : 0;
    this.dirtDriftOffset.set(
      -(0.032 * Math.sin(rotationY + 0.35 * rotationZ)) * strength,
      0.032 * Math.sin(rotationX - 0.2 * rotationZ) * strength,
    );
    this.uniform<THREE.Vector2>("uDirtTextureOffset").value.copy(this.dirtDriftOffset);
    this.uniform("uDirtTextureRotation").value =
      -(0.055 * Math.sin(rotationZ + 0.5 * rotationY)) * strength;
  }

  setViewport(width: number, height: number): void {
    this.viewportAspect = Math.max(width, 1) / Math.max(height, 1);
    this.uniform("uAspect").value = this.viewportAspect;
  }

  setParticleMotion(
    texture: THREE.Texture | null,
    age: number,
    primary: THREE.Vector3 | undefined,
    secondary: (THREE.Vector3 | undefined)[],
  ): void {
    this.uniform<THREE.Texture | null>("uParticleMotionTexture").value = texture;
    this.uniform("uParticleMotionAge").value = age;
    const primaryUv = this.uniform<THREE.Vector3>("uPrimaryMotionUv").value;
    if (primary) primaryUv.copy(primary);
    else primaryUv.set(-1, -1, 1);
    const secondaryUvs = this.uniform<THREE.Vector3[]>("uSecondaryMotionUvs").value;
    for (let index = 0; index < SECONDARY_SOURCES; index += 1) {
      const uv = secondaryUvs[index];
      const source = secondary[index];
      if (!uv) continue;
      if (source) uv.copy(source);
      else uv.set(-1, -1, 1);
    }
  }

  /** Projects the tracked stars into screen space for this frame. */
  updateSources(
    primary: THREE.Object3D,
    secondary: THREE.Object3D[],
    camera: THREE.Camera,
    visibility = 1,
  ): void {
    camera.updateMatrixWorld();
    primary.getWorldPosition(this.projected).project(camera);
    this.uniform<THREE.Vector2>("uCenter").value.set(
      0.5 * this.projected.x + 0.5,
      0.5 * this.projected.y + 0.5,
    );
    this.uniform("uVisibility").value =
      edgeVisibility(this.projected) *
      THREE.MathUtils.clamp(visibility, 0, 1) *
      THREE.MathUtils.clamp(primary.scale.x, 0, 1);
    const centers = this.uniform<THREE.Vector2[]>("uSecondaryCenters").value;
    const visibilities = this.uniform<number[]>("uSecondaryVisibility").value;
    for (let index = 0; index < SECONDARY_SOURCES; index += 1) {
      const source = secondary[index];
      const projected = this.secondaryProjected[index];
      const center = centers[index];
      if (!projected || !center) continue;
      if (!source) {
        center.set(-2, -2);
        visibilities[index] = 0;
        continue;
      }
      source.getWorldPosition(projected).project(camera);
      center.set(0.5 * projected.x + 0.5, 0.5 * projected.y + 0.5);
      visibilities[index] =
        THREE.MathUtils.clamp(source.scale.x, 0, 1) * edgeVisibility(projected);
    }
  }
}
