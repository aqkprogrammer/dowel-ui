"use client";

// Original design.
import type * as Three from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { Button } from "@/components/button";
import { useInView } from "@/hooks/use-in-view";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A 3D model — glTF or GLB — that people can turn, with a picture first.
 *
 * The poster shows straight away and stays until the model is ready, so
 * there is always something to see, and it is what remains if anything
 * fails. three.js is loaded only when the model is: as the viewer nears the
 * screen, or when someone presses "View in 3D" (`reveal="interaction"`, to
 * spare data). Without WebGL, three.js is never fetched at all. `three` is
 * this component's own dependency, never the library's.
 *
 * The model is fitted to the frame and turns slowly on its own — not while
 * pointed at or focused, not off-screen, never under reduced motion. Drag it
 * or use the arrow keys to turn it, + and − to zoom. A status line says
 * when it is loading, ready or unavailable. Everything three.js allocates
 * is disposed, and the context released, on unmount.
 */

type Phase = "poster" | "loading" | "ready" | "error" | "unsupported";

export interface ModelViewerProps extends Omit<
  ComponentPropsWithRef<"figure">,
  "onLoad" | "onError"
> {
  /** The model: a .glb or .gltf URL. */
  src: string;
  /** Describes the model, for the poster and the 3D view alike. */
  alt: string;
  /** A picture shown until the model is ready, and if it cannot be. */
  poster?: string;
  /** Load when it nears the screen, or only when asked. Default "visible". */
  reveal?: "visible" | "interaction";
  /** Turn slowly on its own. Default true. */
  autoRotate?: boolean;
  /** The starting view, in degrees. */
  orbit?: { yaw?: number; pitch?: number };
  /** Light strength. Default 1. */
  exposure?: number;
  onLoad?: () => void;
  onError?: (error: unknown) => void;
}

let webgl: boolean | undefined;

/** True when this browser can make a WebGL context. Asked once per page. */
function webglAvailable(): boolean {
  if (webgl === undefined) {
    try {
      const probe = document.createElement("canvas");
      webgl = Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

const never = () => () => {};

/** Frees every geometry, material and texture under `root`. */
function dispose(root: Three.Object3D) {
  root.traverse((object) => {
    const mesh = object as Three.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value && typeof value === "object" && "isTexture" in value)
          (value as Three.Texture).dispose();
      }
      material.dispose();
    }
  });
}

/** A glTF model people can turn, behind a poster, with three.js loaded only when needed. */
export function ModelViewer({
  src,
  alt,
  poster,
  reveal = "visible",
  autoRotate = true,
  orbit,
  exposure = 1,
  onLoad,
  onError,
  className,
  ...props
}: ModelViewerProps) {
  const [loadPhase, setPhase] = useState<Phase>("poster");
  const [progress, setProgress] = useState(0);
  const [asked, setAsked] = useState(false);
  const [held, setHeld] = useState(false);
  const { ref: viewRef, inView } = useInView<HTMLElement>({ rootMargin: "200px" });
  const reduced = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const hintId = useId();
  const view = useRef({
    yaw: ((orbit?.yaw ?? 25) * Math.PI) / 180,
    pitch: ((orbit?.pitch ?? 12) * Math.PI) / 180,
    zoom: 1,
  });
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number; id: number } | null>(
    null,
  );
  const render = useRef<(() => void) | null>(null);
  const motion = useRef({ spin: false, exposure });
  // Starts the frame loop if it has stopped; set once the model is ready.
  const start = useRef<(() => void) | null>(null);
  const callbacks = useRef({ onLoad, onError });
  useEffect(() => {
    callbacks.current = { onLoad, onError };
  });

  const wanted = reveal === "interaction" ? asked : asked || inView;
  // Whether WebGL exists never changes, so it is read, not stored. The server assumes it does.
  const supported = useSyncExternalStore(never, webglAvailable, () => true);
  const phase: Phase = wanted && !supported ? "unsupported" : loadPhase;

  // Load three.js and the model once wanted — never without WebGL. A new src
  // reruns this, back through loading.
  useEffect(() => {
    if (!wanted || !supported) return;
    const node = canvas.current;
    if (!node) return;
    setPhase("loading");
    setProgress(0);
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      try {
        const [THREE, { GLTFLoader }] = await Promise.all([
          import("three"),
          import("three/examples/jsm/loaders/GLTFLoader.js"),
        ]);
        if (cancelled) return;
        const renderer = new THREE.WebGLRenderer({
          canvas: node,
          alpha: true,
          antialias: true,
        });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a46, 1.6));
        const key = new THREE.DirectionalLight(0xffffff, 2.2);
        key.position.set(3, 5, 4);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xffffff, 0.8);
        rim.position.set(-4, 2, -3);
        scene.add(rim);
        const pivot = new THREE.Group();
        scene.add(pivot);

        const gltf: GLTF = await new Promise((resolve, reject) => {
          new GLTFLoader().load(
            src,
            resolve,
            (event) => {
              if (event.lengthComputable && event.total > 0)
                setProgress(Math.round((event.loaded / event.total) * 100));
            },
            reject,
          );
        });
        if (cancelled) {
          dispose(gltf.scene);
          renderer.dispose();
          renderer.forceContextLoss();
          return;
        }

        // Centre the model and fit the camera to it.
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const centre = box.getCenter(new THREE.Vector3());
        const radius = Math.max(1e-3, box.getSize(new THREE.Vector3()).length() / 2);
        model.position.sub(centre);
        pivot.add(model);
        const distance = radius / Math.sin(((camera.fov / 2) * Math.PI) / 180);
        camera.near = distance / 100;
        camera.far = distance * 100;

        const resize = () => {
          const { width, height } = node.getBoundingClientRect();
          if (width === 0 || height === 0) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        const draw = () => {
          const { yaw, pitch, zoom } = view.current;
          pivot.rotation.set(pitch, yaw, 0);
          renderer.toneMappingExposure = motion.current.exposure;
          camera.position.set(0, 0, distance * 1.08 * zoom);
          camera.lookAt(0, 0, 0);
          renderer.render(scene, camera);
        };
        resize();
        draw();
        render.current = draw;
        const observer =
          typeof ResizeObserver === "undefined"
            ? null
            : new ResizeObserver(() => {
                resize();
                draw();
              });
        observer?.observe(node);

        // The loop runs only while it turns on its own; drags and keys draw directly.
        let frame = 0;
        let last = 0;
        const tick = (time: number) => {
          const dt = last ? Math.min(0.1, (time - last) / 1000) : 0;
          last = time;
          if (!drag.current) view.current.yaw += 0.35 * dt;
          draw();
          if (motion.current.spin) {
            frame = requestAnimationFrame(tick);
          } else {
            frame = 0;
            last = 0;
          }
        };
        start.current = () => {
          if (!frame && motion.current.spin) frame = requestAnimationFrame(tick);
        };

        cleanup = () => {
          cancelAnimationFrame(frame);
          observer?.disconnect();
          render.current = null;
          start.current = null;
          dispose(scene);
          renderer.dispose();
          renderer.forceContextLoss();
        };
        setPhase("ready");
        callbacks.current.onLoad?.();
      } catch (error) {
        if (cancelled) return;
        setPhase("error");
        callbacks.current.onError?.(error);
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [wanted, supported, src]);

  // Whether it may turn on its own, and how bright; read by the loop.
  useEffect(() => {
    motion.current.spin = autoRotate && !reduced && inView && !held && phase === "ready";
    motion.current.exposure = exposure;
    if (motion.current.spin) start.current?.();
    else render.current?.();
  }, [autoRotate, reduced, inView, held, phase, exposure]);

  const turn = (yaw: number, pitch: number, zoom = view.current.zoom) => {
    view.current = {
      yaw,
      pitch: Math.max(-1.3, Math.min(1.3, pitch)),
      zoom: Math.max(0.6, Math.min(2.2, zoom)),
    };
    render.current?.();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const { yaw, pitch, zoom } = view.current;
    const moves: Record<string, [number, number, number]> = {
      ArrowLeft: [yaw - 0.2, pitch, zoom],
      ArrowRight: [yaw + 0.2, pitch, zoom],
      ArrowUp: [yaw, pitch - 0.2, zoom],
      ArrowDown: [yaw, pitch + 0.2, zoom],
      "+": [yaw, pitch, zoom * 0.85],
      "=": [yaw, pitch, zoom * 0.85],
      "-": [yaw, pitch, zoom / 0.85],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    turn(...move);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      yaw: view.current.yaw,
      pitch: view.current.pitch,
      id: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const from = drag.current;
    if (from?.id !== event.pointerId) return;
    const width = event.currentTarget.clientWidth || 1;
    turn(
      from.yaw + ((event.clientX - from.x) / width) * Math.PI * 1.5,
      from.pitch + ((event.clientY - from.y) / width) * Math.PI,
    );
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === event.pointerId) drag.current = null;
  };

  const ready = phase === "ready";
  const status =
    phase === "loading"
      ? `Loading the 3D model${progress > 0 ? `, ${String(progress - (progress % 25))}%` : ""}`
      : phase === "ready"
        ? "3D model ready"
        : phase === "error"
          ? "The 3D model couldn't be loaded"
          : phase === "unsupported"
            ? "3D isn't available in this browser"
            : "";

  return (
    <figure
      ref={viewRef}
      data-slot="model-viewer"
      data-phase={phase}
      className={cn(
        "relative isolate aspect-square w-full overflow-hidden rounded-xl bg-muted",
        className,
      )}
      {...props}
    >
      {poster && !ready ? (
        <img
          src={poster}
          alt={alt}
          className="absolute inset-0 size-full object-contain"
          decoding="async"
        />
      ) : null}
      {!poster && !ready ? <span className="sr-only">{alt}</span> : null}

      {wanted && phase !== "unsupported" && phase !== "error" ? (
        // A focusable region the arrow keys turn; see the keyboard handler.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
          role="region"
          aria-label={`3D model: ${alt}`}
          aria-describedby={hintId}
          tabIndex={ready ? 0 : -1}
          data-slot="model-viewer-stage"
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerEnter={() => {
            setHeld(true);
          }}
          onPointerLeave={() => {
            setHeld(false);
          }}
          onFocus={() => {
            setHeld(true);
          }}
          onBlur={() => {
            setHeld(false);
          }}
          className={cn(
            "absolute inset-0 cursor-grab touch-none rounded-[inherit] active:cursor-grabbing",
            !ready && "pointer-events-none opacity-0",
            focusRing,
          )}
        >
          <canvas ref={canvas} aria-hidden="true" className="size-full" />
          <span id={hintId} className="sr-only">
            Drag or use the arrow keys to turn it; plus and minus to zoom.
          </span>
        </div>
      ) : null}

      {phase === "poster" && reveal === "interaction" ? (
        <div className="absolute inset-x-0 bottom-4 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setAsked(true);
            }}
          >
            View in 3D
          </Button>
        </div>
      ) : null}
      {phase === "loading" ? (
        <div
          aria-hidden="true"
          className="absolute inset-x-6 bottom-4 h-1 overflow-hidden rounded-full bg-background/60"
        >
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${String(Math.max(8, progress))}%` }}
          />
        </div>
      ) : null}
      {phase === "error" || phase === "unsupported" ? (
        <figcaption className="absolute inset-x-3 bottom-3 rounded-md bg-background/90 px-3 py-2 text-center text-xs text-muted-foreground">
          {phase === "error" ? "The 3D model couldn't be loaded" : "3D isn't available here"}
          {poster ? " — showing a picture instead." : "."}
        </figcaption>
      ) : null}
      <span role="status" className="sr-only">
        {status}
      </span>
    </figure>
  );
}
