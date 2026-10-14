"use client";

// Original design.
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { useInView } from "@/hooks/use-in-view";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

import {
  facing,
  fibonacciSphere,
  greatCircle,
  resolveColor,
  rotate,
  rotation,
  toVector,
  type GlobePoint,
} from "./globe-math";

export {
  fibonacciSphere,
  greatCircle,
  rotation,
  toLatLng,
  toVector,
  type GlobePoint,
} from "./globe-math";

/*
 * A dotted globe with places and the routes between them, drawn in raw
 * WebGL — no 3D library.
 *
 * One canvas, one context, three draws: an even lattice of dots (kept to the
 * land, if you pass a `land` test), great-circle arcs lifted off the surface
 * with a pulse running along them, and the markers. It turns slowly; drag it,
 * or focus it and use the arrow keys. Nothing is drawn while it is off-screen
 * or the tab is hidden; under reduced motion it neither spins nor pulses, and
 * a drag still turns it. Colours are theme tokens, re-read when the theme
 * changes. The context is released on unmount.
 *
 * The picture is decoration; the information is not. Every place and route
 * is listed for screen readers inside the named region. Without WebGL — or
 * if the context is lost — an SVG of the same view stands in.
 */

export interface GlobeMarker extends GlobePoint {
  label: string;
}

export interface GlobeArc {
  from: GlobePoint;
  to: GlobePoint;
  /** How a screen reader names the route. Defaults to "from to to" by marker labels. */
  label?: string;
}

export interface GlobeProps extends ComponentPropsWithRef<"div"> {
  /** Names the globe. */
  label: string;
  markers?: GlobeMarker[];
  arcs?: GlobeArc[];
  /** Keep a dot only where this returns true — pass a land mask for continents. */
  land?: (point: GlobePoint) => boolean;
  /** Dots in the lattice before the land test. Default 5000. */
  dots?: number;
  /** The place facing the viewer at first. Default 20°N 0°E. */
  center?: GlobePoint;
  /** Turn speed in degrees per second; 0 holds it. Default 6. */
  speed?: number;
  dotColor?: string;
  markerColor?: string;
  arcColor?: string;
}

const DOT_VS = `attribute vec3 aPos;attribute float aSize;uniform mat3 uRot;uniform float uScale;uniform float uDpr;varying float vZ;
void main(){vec3 p=uRot*aPos;vZ=p.z;gl_Position=vec4(p.xy*uScale,-p.z*0.5,1.0);gl_PointSize=aSize*uDpr;}`;
const DOT_FS = `precision mediump float;uniform vec3 uColor;uniform float uBack;varying float vZ;
void main(){vec2 c=gl_PointCoord-0.5;if(dot(c,c)>0.25)discard;float a=mix(uBack,1.0,smoothstep(-0.15,0.35,vZ));gl_FragColor=vec4(uColor*a,a);}`;
// Arcs are dense runs of round points rather than lines: WebGL draws lines one pixel wide.
const ARC_VS = `attribute vec3 aPos;attribute float aT;attribute float aSeed;uniform mat3 uRot;uniform float uScale;uniform float uDpr;varying float vZ;varying float vT;varying float vSeed;
void main(){vec3 p=uRot*aPos;vZ=p.z;vT=aT;vSeed=aSeed;gl_Position=vec4(p.xy*uScale,-p.z*0.5,1.0);gl_PointSize=2.4*uDpr;}`;
const ARC_FS = `precision mediump float;uniform vec3 uColor;uniform float uTime;uniform float uPulse;varying float vZ;varying float vT;varying float vSeed;
void main(){vec2 c=gl_PointCoord-0.5;if(dot(c,c)>0.25)discard;float head=fract(uTime*0.35+vSeed);float d=vT-head;float glow=exp(-d*d*120.0)*uPulse;float a=(0.55+0.45*glow)*mix(0.1,1.0,smoothstep(-0.2,0.3,vZ));gl_FragColor=vec4(uColor*a,a);}`;

type GL = WebGLRenderingContext;

function compile(gl: GL, vs: string, fs: string): WebGLProgram | null {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

function buffer(gl: GL, data: Float32Array): WebGLBuffer {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buf;
}

function attribute(
  gl: GL,
  program: WebGLProgram,
  name: string,
  buf: WebGLBuffer,
  size: number,
  stride: number,
  offset: number,
) {
  const location = gl.getAttribLocation(program, name);
  if (location < 0) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride * 4, offset * 4);
}

/** A dotted WebGL globe with markers and arcs, listed for screen readers. */
export function Globe({
  label,
  markers = [],
  arcs = [],
  land,
  dots = 5000,
  center = { lat: 20, lng: 0 },
  speed = 6,
  dotColor = "muted-foreground",
  markerColor = "primary",
  arcColor = "primary",
  className,
  ...props
}: GlobeProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { ref: viewRef, inView } = useInView<HTMLDivElement>({ rootMargin: "100px" });
  const reduced = useReducedMotion();
  const [supported, setSupported] = useState(true);
  const view = useRef(facing(center));
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number; id: number } | null>(
    null,
  );
  const redraw = useRef<(() => void) | null>(null);
  const [held, setHeld] = useState(false);
  // The data the buffers are built from, by value, so inline arrays and a
  // land function written inline do not rebuild the context on every render.
  const data = useRef({ markers, arcs, land });
  // Declared before the setup effect, so it has the latest data when that runs.
  useEffect(() => {
    data.current = { markers, arcs, land };
  });
  const dataKey = JSON.stringify([markers, arcs, dots, land ? land.toString() : ""]);

  const markerLabel = (point: GlobePoint) =>
    markers.find(
      (m) => Math.abs(m.lat - point.lat) < 1e-6 && Math.abs(m.lng - point.lng) < 1e-6,
    )?.label;

  // Set up the context, the buffers and the loop. Rebuilt when the data changes.
  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const { markers, arcs, land } = data.current;
    const gl = node.getContext("webgl", {
      antialias: true,
      premultipliedAlpha: true,
      alpha: true,
    });
    if (!gl) {
      setSupported(false);
      return;
    }
    const dotProgram = compile(gl, DOT_VS, DOT_FS);
    const arcProgram = compile(gl, ARC_VS, ARC_FS);
    if (!dotProgram || !arcProgram) {
      setSupported(false);
      return;
    }

    // Dots: x, y, z, size. Markers go in the same layout, drawn after the arcs.
    const lattice = fibonacciSphere(Math.max(200, Math.min(40000, Math.round(dots)))).filter(
      (p) => (land ? land(p) : true),
    );
    const dotData = new Float32Array(lattice.length * 4);
    lattice.forEach((point, i) => {
      dotData.set([...toVector(point), 2.2], i * 4);
    });
    const markerData = new Float32Array(markers.length * 4);
    markers.forEach((marker, i) => {
      const v = toVector(marker);
      markerData.set([v[0] * 1.01, v[1] * 1.01, v[2] * 1.01, 9], i * 4);
    });
    // Arcs as points along each route: x, y, z, t, seed.
    const arcVerts: number[] = [];
    arcs.forEach((arc, index) => {
      const path = greatCircle(arc.from, arc.to, 160);
      const seed = (index * 0.37) % 1;
      path.forEach((point, i) => {
        arcVerts.push(...point, i / (path.length - 1), seed);
      });
    });
    const dotBuf = buffer(gl, dotData);
    const markerBuf = buffer(gl, markerData);
    const arcBuf = buffer(gl, new Float32Array(arcVerts));

    let colors = {
      dot: resolveColor(node, dotColor),
      marker: resolveColor(node, markerColor),
      arc: resolveColor(node, arcColor),
    };
    const themeWatch = new MutationObserver(() => {
      colors = {
        dot: resolveColor(node, dotColor),
        marker: resolveColor(node, markerColor),
        arc: resolveColor(node, arcColor),
      };
      draw(performance.now());
    });
    themeWatch.observe(node.ownerDocument.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (node.width !== width || node.height !== height) {
        node.width = width;
        node.height = height;
      }
      gl.viewport(0, 0, node.width, node.height);
    };

    const draw = (time: number) => {
      size();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const rot = rotation(view.current.yaw, view.current.pitch);
      const scale = 0.86;

      gl.useProgram(dotProgram);
      gl.uniformMatrix3fv(gl.getUniformLocation(dotProgram, "uRot"), false, rot);
      gl.uniform1f(gl.getUniformLocation(dotProgram, "uScale"), scale);
      gl.uniform1f(gl.getUniformLocation(dotProgram, "uDpr"), dpr);
      gl.uniform3fv(gl.getUniformLocation(dotProgram, "uColor"), colors.dot);
      gl.uniform1f(gl.getUniformLocation(dotProgram, "uBack"), 0.12);
      attribute(gl, dotProgram, "aPos", dotBuf, 3, 4, 0);
      attribute(gl, dotProgram, "aSize", dotBuf, 1, 4, 3);
      gl.drawArrays(gl.POINTS, 0, lattice.length);

      if (arcVerts.length > 0) {
        gl.useProgram(arcProgram);
        gl.uniformMatrix3fv(gl.getUniformLocation(arcProgram, "uRot"), false, rot);
        gl.uniform1f(gl.getUniformLocation(arcProgram, "uScale"), scale);
        gl.uniform1f(gl.getUniformLocation(arcProgram, "uDpr"), dpr);
        gl.uniform3fv(gl.getUniformLocation(arcProgram, "uColor"), colors.arc);
        gl.uniform1f(gl.getUniformLocation(arcProgram, "uTime"), time / 1000);
        gl.uniform1f(gl.getUniformLocation(arcProgram, "uPulse"), reduced ? 0 : 1);
        attribute(gl, arcProgram, "aPos", arcBuf, 3, 5, 0);
        attribute(gl, arcProgram, "aT", arcBuf, 1, 5, 3);
        attribute(gl, arcProgram, "aSeed", arcBuf, 1, 5, 4);
        gl.drawArrays(gl.POINTS, 0, arcVerts.length / 5);
      }

      if (markers.length > 0) {
        gl.useProgram(dotProgram);
        gl.uniform3fv(gl.getUniformLocation(dotProgram, "uColor"), colors.marker);
        gl.uniform1f(gl.getUniformLocation(dotProgram, "uBack"), 0.08);
        attribute(gl, dotProgram, "aPos", markerBuf, 3, 4, 0);
        attribute(gl, dotProgram, "aSize", markerBuf, 1, 4, 3);
        gl.drawArrays(gl.POINTS, 0, markers.length);
      }
    };

    // The first frame now, so the globe shows even before the loop runs.
    draw(performance.now());
    redraw.current = () => {
      draw(performance.now());
    };

    const onLost = (event: Event) => {
      event.preventDefault();
      setSupported(false);
    };
    node.addEventListener("webglcontextlost", onLost);
    const resizeWatch =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            draw(performance.now());
          });
    resizeWatch?.observe(node);
    return () => {
      resizeWatch?.disconnect();
      themeWatch.disconnect();
      node.removeEventListener("webglcontextlost", onLost);
      redraw.current = null;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // Colours are re-read on theme change; the data rebuilds the buffers.
  }, [dataKey, dots, dotColor, markerColor, arcColor, reduced]);

  // The loop: spin while allowed, pulse the arcs, and stop otherwise.
  const animate =
    supported && inView && ((speed > 0 && !reduced && !held) || (!reduced && arcs.length > 0));
  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    let last = 0;
    const tick = (time: number) => {
      const dt = last ? Math.min(0.1, (time - last) / 1000) : 0;
      last = time;
      if (speed > 0 && !held && !drag.current)
        view.current.yaw += ((speed * Math.PI) / 180) * dt;
      redraw.current?.();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [animate, speed, held]);

  const turn = (yaw: number, pitch: number) => {
    view.current = { yaw, pitch: Math.max(-1.2, Math.min(1.2, pitch)) };
    redraw.current?.();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const { yaw, pitch } = view.current;
    const step = 0.25;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [yaw - step, pitch],
      ArrowRight: [yaw + step, pitch],
      ArrowUp: [yaw, pitch - step],
      ArrowDown: [yaw, pitch + step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    turn(...move);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, ...view.current, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    setHeld(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const from = drag.current;
    if (from?.id !== event.pointerId) return;
    const width = event.currentTarget.clientWidth || 1;
    turn(
      from.yaw + ((event.clientX - from.x) / width) * Math.PI,
      from.pitch + ((event.clientY - from.y) / width) * Math.PI,
    );
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setHeld(false);
  };

  return (
    // A focusable region the arrow keys turn; see the keyboard handler.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={viewRef}
      role="region"
      aria-label={label}
      tabIndex={0}
      data-slot="globe"
      data-supported={supported || undefined}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerEnter={() => {
        setHeld(true);
      }}
      onPointerLeave={() => {
        if (!drag.current) setHeld(false);
      }}
      className={cn(
        "relative aspect-square w-full max-w-[32rem] cursor-grab touch-pan-y rounded-full select-none active:cursor-grabbing",
        focusRing,
        className,
      )}
      {...props}
    >
      {supported ? (
        <canvas
          ref={canvas}
          aria-hidden="true"
          data-slot="globe-canvas"
          className="absolute inset-0 size-full"
        />
      ) : (
        <GlobeFallback center={center} markers={markers} />
      )}
      <div className="sr-only">
        {markers.length > 0 ? (
          <ul aria-label="Places">
            {markers.map((marker) => (
              <li key={`${marker.label}-${String(marker.lat)}-${String(marker.lng)}`}>
                {marker.label}
              </li>
            ))}
          </ul>
        ) : null}
        {arcs.length > 0 ? (
          <ul aria-label="Routes">
            {arcs.map((arc, i) => (
              <li key={i}>
                {arc.label ??
                  `${markerLabel(arc.from) ?? `${String(arc.from.lat)}, ${String(arc.from.lng)}`} to ${
                    markerLabel(arc.to) ?? `${String(arc.to.lat)}, ${String(arc.to.lng)}`
                  }`}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

/** The same view as an SVG: a shaded disc with the markers that face the viewer. */
function GlobeFallback({ center, markers }: { center: GlobePoint; markers: GlobeMarker[] }) {
  const { yaw, pitch } = facing(center);
  const rot = rotation(yaw, pitch);
  return (
    <svg
      aria-hidden="true"
      viewBox="-1 -1 2 2"
      data-slot="globe-fallback"
      className="absolute inset-0 size-full"
    >
      <defs>
        <radialGradient id="dowel-globe-shade" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="var(--color-muted)" />
          <stop offset="1" stopColor="var(--color-border)" />
        </radialGradient>
      </defs>
      <circle r="0.86" fill="url(#dowel-globe-shade)" />
      {markers.map((marker) => {
        const [x, y, z] = rotate(rot, toVector(marker));
        if (z < 0) return null;
        return (
          <circle
            key={marker.label}
            cx={x * 0.86}
            cy={-y * 0.86}
            r="0.025"
            fill="var(--color-primary)"
          />
        );
      })}
    </svg>
  );
}
