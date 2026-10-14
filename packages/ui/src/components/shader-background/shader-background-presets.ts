// Original design.

/*
 * The scenes. Each is one GLSL function, `vec3 scene(vec2 uv, vec2 p, float t)`,
 * written against the prelude in shader-background-engine.ts: `uC0`–`uC3` are
 * the palette, `fbm`/`vnoise`/`hash*` are the noise, `ramp` walks the palette.
 * `p` is centred and aspect-corrected, so a scene looks the same in a banner
 * and a portrait card — it just sees more or less of itself.
 *
 * Every scene is procedural: no textures, no images, nothing to download. The
 * palette is the art direction, so a scene can be re-dressed without touching
 * GLSL — the dunes at noon are four different colours, not a different shader.
 */

export type ShaderBackgroundCategory =
  "landscape" | "floral" | "abstract" | "particles" | "cosmic" | "science";

export interface ShaderBackgroundPresetSpec {
  title: string;
  category: ShaderBackgroundCategory;
  /** One line: what the scene shows. */
  description: string;
  /** The default palette, in the order the scene reads `uC0`–`uC3`. Tokens or CSS colours. */
  colors: readonly [string, string, string, string];
  /** The moment shown under reduced motion — chosen to be a good still. */
  still: number;
  glsl: string;
}

const dunes: ShaderBackgroundPresetSpec = {
  title: "Dunes",
  category: "landscape",
  description: "Ridges of sand at dusk under a low sun, drifting slowly sideways.",
  colors: ["#2b1846", "#f6a87c", "#e9b98a", "#5a2f5e"],
  still: 14,
  glsl: `
float duneH(float x, float i){
  return 0.02 - i * 0.12 + 0.06 * (1.0 + i * 0.3) * (sin(x * 2.1) * 0.6 + sin(x * 0.9 + 1.3) * 0.4)
    + 0.025 * fbm3(vec2(x * 2.0, i));
}
vec3 scene(vec2 uv, vec2 p, float t){
  float tt = t * 0.03;
  vec2 sp = vec2(0.28, 0.06);
  vec3 col = mix(uC1, uC0, smoothstep(-0.1, 0.5, p.y));
  float ds = length(p - sp);
  col += uC1 * 0.55 * exp(-ds * 6.0);
  col = mix(col, mix(uC1, vec3(1.0), 0.55), smoothstep(0.075, 0.068, ds));
  for (int n = 0; n < 4; n++){
    float i = float(n);
    float d = i / 3.0;
    float x = p.x * (1.0 + i * 0.6) + tt * (0.4 + i * 0.6) + i * 3.7;
    float h = duneH(x, i);
    float slope = (duneH(x + 0.01, i) - h) / 0.01;
    vec3 sand = mix(uC3, uC2, clamp(0.5 + slope * 1.6, 0.0, 1.0));
    float rip = sin((p.y - h) * 90.0 * (0.5 + d) + x * 12.0) * 0.5 + 0.5;
    sand *= 0.95 + 0.05 * rip * d;
    sand = mix(sand, mix(uC1, uC0, 0.45), (1.0 - d) * 0.55);
    sand *= 1.0 - 0.25 * smoothstep(0.0, 0.3, h - p.y);
    col = mix(col, sand, smoothstep(h + 0.002, h - 0.002, p.y));
  }
  return col;
}`,
};

const hills: ShaderBackgroundPresetSpec = {
  title: "Hills",
  category: "landscape",
  description: "Rolling hills fading into morning mist, layered for parallax.",
  colors: ["#9cc7e8", "#eaf1ee", "#2f6b4f", "#8fb59a"],
  still: 20,
  glsl: `
vec3 scene(vec2 uv, vec2 p, float t){
  float tt = t * 0.02;
  vec3 col = mix(uC1, uC0, smoothstep(-0.2, 0.55, p.y));
  float cl = fbm(vec2(p.x * 1.5 + tt * 2.0, p.y * 4.0));
  col = mix(col, mix(uC1, vec3(1.0), 0.6), smoothstep(0.55, 0.8, cl) * smoothstep(0.0, 0.3, p.y) * 0.5);
  for (int n = 0; n < 5; n++){
    float i = float(n);
    float d = i / 4.0;
    float x = p.x * (0.8 + i * 0.35) + tt * (0.3 + i * 0.5) + i * 5.1;
    float h = 0.1 - i * 0.11 + 0.07 * sin(x * 1.7 + i) + 0.04 * sin(x * 3.3 + i * 2.0)
      + 0.03 * (fbm3(vec2(x * 1.5, i * 3.0)) - 0.5);
    vec3 hill = mix(uC3, uC2, d) * (0.86 + 0.14 * cos(x * 1.7 + i));
    hill = mix(hill, uC1, (1.0 - d) * 0.6);
    float above = max(p.y - h, 0.0);
    col = mix(col, uC1, exp(-above * 18.0) * 0.2 * (1.0 - d * 0.5) * step(h, p.y));
    col = mix(col, hill, smoothstep(h + 0.002, h - 0.002, p.y));
  }
  return col;
}`,
};

const stormSea: ShaderBackgroundPresetSpec = {
  title: "Storm Sea",
  category: "landscape",
  description: "A heaving sea under racing cloud, lit now and then by a flash.",
  colors: ["#0d1620", "#7f93a6", "#16303f", "#d8e4ea"],
  still: 9,
  glsl: `
float seaH(vec2 q, float t){
  return sin(q.x * 1.3 + q.y * 0.7 + t * 1.1) * 0.35 + sin(q.x * -0.8 + q.y * 1.9 + t * 1.6) * 0.25
    + fbm3(q * 1.7 + vec2(t * 0.4, -t * 0.3)) * 0.8;
}
vec3 scene(vec2 uv, vec2 p, float t){
  float hz = 0.08;
  float beat = t * 0.6;
  float flash = step(0.82, hash11(floor(beat))) * exp(-fract(beat) * 9.0) * (0.6 + 0.4 * sin(t * 60.0));
  if (p.y > hz){
    float c = fbm(vec2(p.x * 1.6 + t * 0.05, p.y * 3.0 - t * 0.02) + fbm3(p * 3.0 + t * 0.03));
    vec3 sky = mix(uC0, uC1, smoothstep(0.35, 0.85, c) * 0.8);
    sky = mix(sky, uC1, exp(-(p.y - hz) * 10.0) * 0.35);
    return sky + uC3 * flash * smoothstep(0.3, 0.8, c) * 0.8;
  }
  float z = 0.35 / (hz - p.y + 0.02);
  vec2 q = vec2(p.x * z, z + t * 0.4);
  float h = seaH(q, t);
  float e = 0.05;
  float hx = (seaH(q + vec2(e, 0.0), t) - h) / e;
  float hy = (seaH(q + vec2(0.0, e), t) - h) / e;
  float shade = clamp(0.5 - hx * 0.25 + hy * 0.2, 0.0, 1.0);
  vec3 col = mix(uC2 * 0.55, mix(uC2, uC1, 0.4), shade);
  col += uC3 * smoothstep(1.05, 1.4, h) * 0.55;
  col += uC1 * flash * 0.25;
  return mix(col, mix(uC0, uC1, 0.45), 1.0 - exp(-z * 0.035));
}`,
};

const meadow: ShaderBackgroundPresetSpec = {
  title: "Meadow",
  category: "landscape",
  description: "Tall grass bending in gusts of wind against a warm evening sky.",
  colors: ["#f3b6c8", "#ffe2c6", "#c97ba6", "#3a1f40"],
  still: 3,
  glsl: `
vec3 scene(vec2 uv, vec2 p, float t){
  vec3 col = mix(uC1, uC0, smoothstep(-0.25, 0.5, p.y));
  col += uC1 * 0.5 * exp(-length(p - vec2(-0.35, 0.1)) * 4.0);
  float wind = t * 0.9;
  for (int n = 0; n < 5; n++){
    float i = float(n);
    float d = i / 4.0;
    float g = -0.04 - i * 0.085;
    float xs = p.x * (36.0 - i * 6.0) + i * 13.7;
    float id = floor(xs);
    float fx = fract(xs);
    float gust = sin(wind + id * 0.06 + i) * 0.5 + 0.3 * sin(wind * 1.7 - id * 0.04);
    vec3 thatch = mix(uC3, mix(uC3, uC2, 0.35), fbm3(vec2(p.x * 40.0, p.y * 8.0 + i)));
    col = mix(col, mix(thatch, uC1, (1.0 - d) * 0.55), step(p.y, g));
    for (int b = 0; b < 2; b++){
      float r = hash11(id * 2.0 + float(b) + i * 31.0);
      float v = (p.y - g) / ((0.05 + 0.2 * r * r) * (0.5 + d * 1.2));
      float cx = 0.3 + 0.4 * float(b) + (r - 0.5) * 0.2 + gust * (0.2 + 0.15 * r) * v * v;
      vec3 blade = mix(uC3, uC2, clamp(v * 0.8 + 0.15 * r, 0.0, 1.0));
      blade = mix(blade, uC1, (1.0 - d) * 0.55 + v * v * 0.15);
      float inBlade = step(0.0, v) * step(v, 1.0) * smoothstep(0.05, 0.0, abs(fx - cx) - (1.0 - v) * 0.2);
      col = mix(col, blade, inBlade);
    }
  }
  return col;
}`,
};

const petals: ShaderBackgroundPresetSpec = {
  title: "Petals",
  category: "floral",
  description: "A slow, layered bloom turning in place among drifting pollen.",
  colors: ["#1b0f24", "#f7c6d9", "#b0457f", "#ffe9a8"],
  still: 6,
  glsl: `
vec3 scene(vec2 uv, vec2 p, float t){
  vec3 col = uC0 * (1.1 - length(p) * 0.6);
  for (int n = 0; n < 2; n++){
    float i = float(n);
    vec2 q = p * (4.0 + i * 3.0) + vec2(t * 0.05 * (1.0 + i), t * 0.03);
    vec2 id = floor(q);
    float s = hash21(id + 3.1);
    float d = length(fract(q) - 0.5 - (hash22(id) - 0.5) * 0.6);
    col += uC3 * smoothstep(0.08 + 0.06 * s, 0.0, d) * 0.25 * step(0.6, s);
  }
  vec2 c = p - vec2(0.0, -0.04);
  float r = length(c);
  float a = atan(c.y, c.x);
  float breathe = 1.0 + 0.025 * sin(t * 0.6);
  for (int n = 0; n < 5; n++){
    float i = float(n);
    float N = 6.0;
    float ang = a + t * 0.04 * (mod(i, 2.0) * 2.0 - 1.0) + i * PI / N;
    float pet = abs(cos(ang * N * 0.5));
    float edge = (0.48 - i * 0.085) * breathe * (0.35 + 0.65 * pow(pet, 0.6));
    float k = clamp(r / edge, 0.0, 1.0);
    vec3 pc = mix(uC1, uC2, k) * (0.75 + 0.25 * smoothstep(0.0, 0.25, pet)) * (0.85 + 0.0375 * i);
    pc += uC3 * 0.15 * (1.0 - k);
    float m = smoothstep(edge + 0.003, edge - 0.003, r);
    col *= 1.0 - 0.35 * smoothstep(edge + 0.05, edge, r) * (1.0 - m);
    col = mix(col, pc, m);
  }
  return col + uC3 * exp(-r * 22.0) * 0.9;
}`,
};

const glassWave: ShaderBackgroundPresetSpec = {
  title: "Glass Wave",
  category: "abstract",
  description: "Ribbons of tinted glass folding and twisting, with a travelling highlight.",
  colors: ["#070b1a", "#5cc8ff", "#8b5cf6", "#f5f7ff"],
  still: 8,
  glsl: `
vec3 scene(vec2 uv, vec2 p, float t){
  vec3 col = mix(uC0, uC0 * 1.5 + 0.02, uv.y);
  float tt = t * 0.25;
  for (int n = 0; n < 3; n++){
    float i = float(n);
    float c = 0.16 * sin(p.x * 1.6 + tt + i * 1.9) + 0.05 * sin(p.x * 3.7 - tt * 1.3 + i) + (i - 1.0) * 0.18;
    float w = 0.015 + 0.075 * abs(sin(p.x * 1.1 + tt * 0.8 + i * 2.4));
    float s = (p.y - c) / w;
    float m = smoothstep(1.0, 0.9, abs(s));
    float nz = sqrt(max(0.0, 1.0 - s * s));
    vec3 tint = mix(uC1, uC2, 0.5 + 0.5 * sin(s * 2.0 + p.x * 1.5 + i + tt));
    float fres = pow(1.0 - nz, 2.5);
    float spec = exp(-pow((s - 0.35) * 6.0, 2.0));
    vec3 glass = mix(col * 0.6, tint, 0.35 + 0.55 * fres) + uC3 * (spec * 0.8 + fres * 0.25);
    col = mix(col, glass, m * 0.92);
  }
  return col;
}`,
};

const liquidMetal: ShaderBackgroundPresetSpec = {
  title: "Liquid Metal",
  category: "abstract",
  description: "Molten chrome folding over itself, reflecting a hard horizon.",
  colors: ["#05060a", "#7d8597", "#b9a7ff", "#ffffff"],
  still: 12,
  glsl: `
float metalH(vec2 q, float tt){
  vec2 w = vec2(fbm3(q + vec2(tt, 0.0)), fbm3(q + vec2(5.2, 1.3) - tt));
  return fbm3(q * 1.3 + w * 1.8 + vec2(0.0, tt));
}
vec3 scene(vec2 uv, vec2 p, float t){
  vec2 q = p * 1.1;
  float tt = t * 0.05;
  float e = 0.01;
  float h = metalH(q, tt);
  vec2 g = vec2(metalH(q + vec2(e, 0.0), tt) - h, metalH(q + vec2(0.0, e), tt) - h) / e;
  vec3 n = normalize(vec3(-g * 0.6, 1.0));
  float y = 0.5 + n.x * 0.3 + n.y * 0.45;
  vec3 sky = mix(uC1, uC3, smoothstep(0.5, 0.95, y));
  vec3 ground = mix(uC0, uC2 * 0.45, smoothstep(0.5, 0.0, y));
  vec3 col = mix(ground, sky, smoothstep(0.42, 0.58, y));
  col += uC3 * exp(-abs(y - 0.5) * 60.0) * 0.5;
  return col * (0.8 + 0.2 * n.z);
}`,
};

const silk: ShaderBackgroundPresetSpec = {
  title: "Silk",
  category: "abstract",
  description: "Folds of satin catching the light as they slide across each other.",
  colors: ["#1a0b12", "#7a1f3d", "#d9667f", "#ffd7df"],
  still: 10,
  glsl: `
vec3 scene(vec2 uv, vec2 p, float t){
  float tt = t * 0.15;
  vec2 q = rot(0.6) * p * 1.5;
  float f = q.x + 0.35 * sin(q.y * 1.7 + tt) + 0.2 * sin(q.y * 3.1 - tt * 1.3 + q.x);
  float s = 0.5 + 0.5 * cos(f * 4.5 + 0.6 * sin(q.y * 2.0 + tt));
  vec3 col = mix(uC0, uC1, 0.25 + 0.75 * s);
  col = mix(col, uC2, pow(s, 4.0) * 0.7);
  col += uC3 * pow(s, 24.0) * 0.5;
  return col * (0.6 + 0.4 * vnoise(q * 0.8 + tt));
}`,
};

const meshGradient: ShaderBackgroundPresetSpec = {
  title: "Mesh Gradient",
  category: "abstract",
  description: "Four pools of the theme's colours wandering and blending, with fine grain.",
  colors: ["primary", "info", "warning", "background"],
  still: 5,
  glsl: `
vec3 scene(vec2 uv, vec2 p, float t){
  float tt = t * 0.12;
  vec2 q = p + 0.08 * vec2(vnoise(p * 3.0 + tt), vnoise(p * 3.0 - tt + 4.0));
  vec2 a = vec2(sin(tt * 0.9) * 0.45, cos(tt * 0.7) * 0.3);
  vec2 b = vec2(cos(tt * 0.6 + 2.0) * 0.5, sin(tt * 0.8 + 1.0) * 0.32);
  vec2 c = vec2(sin(tt * 0.5 + 4.0) * 0.4, cos(tt * 1.1 + 3.0) * 0.28);
  vec2 d = vec2(cos(tt * 0.4 + 5.0) * 0.55, sin(tt * 0.3 + 2.0) * 0.36);
  float wa = 1.0 / (dot(q - a, q - a) + 0.02);
  float wb = 1.0 / (dot(q - b, q - b) + 0.02);
  float wc = 1.0 / (dot(q - c, q - c) + 0.02);
  float wd = 1.0 / (dot(q - d, q - d) + 0.02);
  return (uC0 * wa + uC1 * wb + uC2 * wc + uC3 * wd) / (wa + wb + wc + wd);
}`,
};

const topography: ShaderBackgroundPresetSpec = {
  title: "Topography",
  category: "abstract",
  description: "Contour lines of a slowly shifting terrain, every fifth one in the accent.",
  colors: ["background", "muted-foreground", "primary", "foreground"],
  still: 4,
  glsl: `
vec3 scene(vec2 uv, vec2 p, float t){
  vec2 q = p * 2.2 + vec2(t * 0.02, t * 0.015);
  float h = fbm(q);
  float e = 0.004;
  vec2 g = vec2(fbm(q + vec2(e, 0.0)) - h, fbm(q + vec2(0.0, e)) - h) / e;
  float levels = 14.0;
  float v = h * levels;
  float fv = fract(v);
  float width = length(g) * levels * 2.2 / (uRes.y * uScale) * 1.3;
  float line = 1.0 - smoothstep(0.0, width + 1e-4, min(fv, 1.0 - fv));
  float major = step(mod(floor(v + 0.5), 5.0), 0.5);
  vec3 col = mix(uC0, uC3, h * 0.06);
  col = mix(col, uC1, line * 0.45 * (1.0 - major));
  return mix(col, uC2, line * 0.8 * major);
}`,
};

const particleOcean: ShaderBackgroundPresetSpec = {
  title: "Particle Ocean",
  category: "particles",
  description: "A sea made of points of light, swelling towards a glowing horizon.",
  colors: ["#030616", "#3b5bdb", "#7cc4ff", "#ffffff"],
  still: 7,
  glsl: `
vec3 scene(vec2 uv, vec2 p, float t){
  float hz = 0.12;
  vec3 col = mix(uC1 * 0.35, uC0, smoothstep(hz - 0.05, 0.55, p.y));
  col += uC1 * exp(-abs(p.y - hz) * 9.0) * 0.45;
  if (p.y >= hz) return col;
  float z = 2.4 / (hz - p.y);
  vec2 w = vec2(p.x * z, z + t * 0.6);
  float h = sin(w.x * 0.5 + w.y * 0.3 + t * 0.8) * 0.5 + sin(w.y * 0.7 - t * 1.1 + w.x * 0.2) * 0.5
    + (fbm3(w * 0.15 + t * 0.1) - 0.5);
  vec2 g = w * 2.6 + vec2(0.0, h * 0.7);
  float d = length(fract(g) - 0.5);
  float fade = exp(-z * 0.04);
  float dots = mix(0.06, smoothstep(0.2, 0.04, d), fade);
  vec3 dc = mix(uC2, uC3, smoothstep(0.4, 1.2, h));
  col += dc * dots * (0.25 + 0.75 * smoothstep(-0.6, 1.0, h));
  return mix(col, uC1 * 0.6, (1.0 - fade) * 0.4);
}`,
};

const nebula: ShaderBackgroundPresetSpec = {
  title: "Nebula",
  category: "cosmic",
  description: "Billowing gas clouds threaded with dust lanes over a field of stars.",
  colors: ["#05030f", "#5b21b6", "#db2777", "#fde68a"],
  still: 16,
  glsl: `
vec3 scene(vec2 uv, vec2 p, float t){
  vec2 q = p * 1.2;
  float tt = t * 0.02;
  vec2 w = vec2(fbm(q + vec2(tt, -tt)), fbm(q + vec2(5.2, 1.3) - tt));
  float f = fbm(q + 2.0 * w + vec2(tt * 2.0, 0.0));
  vec3 col = mix(uC0, uC1, smoothstep(0.25, 0.7, f));
  col = mix(col, uC2, smoothstep(0.45, 0.85, f * (0.6 + w.x)));
  col += uC3 * pow(smoothstep(0.55, 0.95, f), 2.0) * 0.7;
  col *= 0.7 + 0.3 * smoothstep(0.2, 0.6, fbm3(q * 2.5 - w));
  for (int n = 0; n < 2; n++){
    float i = float(n);
    vec2 s = p * (60.0 + i * 50.0);
    vec2 id = floor(s);
    float h = hash21(id + i * 7.0);
    float tw = 0.6 + 0.4 * sin(t * 2.0 + h * 50.0);
    float d = length(fract(s) - 0.5 - (hash22(id) - 0.5) * 0.6);
    col += mix(uC3, vec3(1.0), 0.6) * smoothstep(0.09, 0.0, d) * tw * step(0.965, h);
  }
  return col;
}`,
};

const warp: ShaderBackgroundPresetSpec = {
  title: "Warp",
  category: "cosmic",
  description: "Stars streaking past from a bright vanishing point.",
  colors: ["#02030a", "#7dd3fc", "#c4b5fd", "#ffffff"],
  still: 11,
  glsl: `
vec3 scene(vec2 uv, vec2 p, float t){
  float r = length(p);
  float a = atan(p.y, p.x);
  vec3 col = uC0;
  for (int n = 0; n < 3; n++){
    float i = float(n);
    float sa = a / TAU * (90.0 + i * 40.0);
    float id = floor(sa);
    float fa = fract(sa) - 0.5;
    float h = hash11(id + i * 13.0);
    float z = fract(h * 7.0 + t * (0.25 + 0.5 * h) * 0.15 + i * 0.33);
    float head = z * z * 1.2;
    float len = 0.02 + 0.25 * z * z;
    float m = step(head - len, r) * step(r, head) * (r - head + len) / len;
    col += mix(uC1, uC2, h) * m * smoothstep(0.35, 0.0, abs(fa)) * z * step(0.35, h) * 1.4;
  }
  return col + uC3 * exp(-r * 7.0) * 0.3;
}`,
};

const helix: ShaderBackgroundPresetSpec = {
  title: "Helix",
  category: "science",
  description: "A double helix of glowing beads and rungs turning on a diagonal.",
  colors: ["#030a14", "#38bdf8", "#f59e0b", "#ffffff"],
  still: 2,
  glsl: `
vec3 scene(vec2 uv, vec2 p, float t){
  vec3 col = uC0 * (1.6 - length(p));
  for (int n = 0; n < 2; n++){
    float i = float(n);
    vec2 bq = p * (5.0 + i * 4.0) + vec2(t * 0.03, -t * 0.02) * (1.0 + i);
    vec2 bid = floor(bq);
    float s = hash21(bid + 9.0 + i);
    col += mix(uC1, uC2, s) * smoothstep(0.3, 0.0, length(fract(bq) - 0.5)) * 0.06 * step(0.7, s);
  }
  vec2 q = rot(0.45) * p;
  float k = 7.0;
  float A = 0.14;
  float spacing = 0.045;
  float xn = floor(q.x / spacing + 0.5) * spacing;
  float ph = xn * k + t * 0.5;
  float phx = q.x * k + t * 0.5;
  for (int n = 0; n < 2; n++){
    float off = float(n) * PI;
    vec3 sc = mix(uC1, uC2, float(n));
    float slope = A * k * cos(phx + off);
    float d = abs(q.y - A * sin(phx + off)) / sqrt(1.0 + slope * slope);
    float depth = 0.55 + 0.45 * cos(phx + off);
    col += sc * (smoothstep(0.006, 0.0, d) * 0.8 + exp(-d * 60.0) * 0.15) * depth;
  }
  float yA = A * sin(ph);
  float yB = A * sin(ph + PI);
  float rung = smoothstep(0.004, 0.0, abs(q.x - xn)) * step(min(yA, yB), q.y) * step(q.y, max(yA, yB));
  col += mix(uC1, uC2, (q.y - yA) / (yB - yA + 1e-4)) * rung * 0.45 * (0.5 + 0.5 * abs(sin(ph)));
  for (int n = 0; n < 2; n++){
    float off = float(n) * PI;
    vec2 b = vec2(xn, A * sin(ph + off));
    float z = cos(ph + off);
    float rad = 0.011 * (0.75 + 0.35 * z);
    float d = length(q - b);
    float depth = 0.5 + 0.5 * z;
    vec3 bead = mix(uC1, uC2, float(n)) * (0.5 + 0.6 * depth)
      + uC3 * 0.4 * smoothstep(rad, 0.0, length(q - b - vec2(-0.3, 0.3) * rad));
    col = mix(col, bead, smoothstep(rad, rad * 0.7, d));
    col += uC3 * exp(-d * 40.0) * 0.12 * depth;
  }
  return col;
}`,
};

/** Every scene, by name. The order is the order the docs and stories show them in. */
export const SHADER_BACKGROUND_PRESETS = {
  dunes,
  hills,
  "storm-sea": stormSea,
  meadow,
  petals,
  "glass-wave": glassWave,
  "liquid-metal": liquidMetal,
  silk,
  "mesh-gradient": meshGradient,
  topography,
  "particle-ocean": particleOcean,
  nebula,
  warp,
  helix,
} as const satisfies Record<string, ShaderBackgroundPresetSpec>;

export type ShaderBackgroundPreset = keyof typeof SHADER_BACKGROUND_PRESETS;

export const SHADER_BACKGROUND_PRESET_NAMES = Object.keys(
  SHADER_BACKGROUND_PRESETS,
) as ShaderBackgroundPreset[];
