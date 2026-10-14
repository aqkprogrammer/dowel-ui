// Original design.
import {
  ACESFilmicToneMapping,
  Box3,
  DirectionalLight,
  Group,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  type Mesh,
  type Object3D,
  type Texture,
} from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

/*
 * The three.js half of ModelViewer: a renderer, three lights, the model
 * centred and the camera fitted to it.
 *
 * Its own module, loaded on demand, and importing three.js by name rather
 * than as a namespace, so a bundler keeps only the parts used here — not the
 * whole library — and none of it reaches a page until a model is wanted.
 */

export interface ModelSceneView {
  yaw: number;
  pitch: number;
  /** 1 fits the model to the frame; smaller is closer. */
  zoom: number;
  exposure: number;
}

export interface ModelScene {
  draw: (view: ModelSceneView) => void;
  /** Matches the drawing buffer to the canvas's size on the page. */
  resize: () => void;
  /** Frees everything and releases the context. */
  dispose: () => void;
}

/** Frees every geometry, material and texture under `root`. */
function release(root: Object3D) {
  root.traverse((object) => {
    const mesh = object as Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value && typeof value === "object" && "isTexture" in value)
          (value as Texture).dispose();
      }
      material.dispose();
    }
  });
}

/**
 * Loads `src` into a scene drawn on `canvas`. Resolves with null if
 * `cancelled()` turns true while loading, having freed what it made.
 */
export async function loadModelScene(
  canvas: HTMLCanvasElement,
  src: string,
  onProgress: (percent: number) => void,
  cancelled: () => boolean,
): Promise<ModelScene | null> {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = ACESFilmicToneMapping;
  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.01, 1000);
  scene.add(new HemisphereLight(0xffffff, 0x3a3a46, 1.6));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new DirectionalLight(0xffffff, 0.8);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
  const pivot = new Group();
  scene.add(pivot);

  const free = () => {
    release(scene);
    renderer.dispose();
    renderer.forceContextLoss();
  };

  let gltf: GLTF;
  try {
    gltf = await new GLTFLoader().loadAsync(src, (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
  } catch (error) {
    free();
    throw error;
  }
  if (cancelled()) {
    release(gltf.scene);
    free();
    return null;
  }

  // Centre the model and fit the camera to it.
  const model = gltf.scene;
  const box = new Box3().setFromObject(model);
  const centre = box.getCenter(new Vector3());
  const radius = Math.max(1e-3, box.getSize(new Vector3()).length() / 2);
  model.position.sub(centre);
  pivot.add(model);
  const distance = radius / Math.sin(((camera.fov / 2) * Math.PI) / 180);
  camera.near = distance / 100;
  camera.far = distance * 100;

  return {
    draw: ({ yaw, pitch, zoom, exposure }) => {
      pivot.rotation.set(pitch, yaw, 0);
      renderer.toneMappingExposure = exposure;
      camera.position.set(0, 0, distance * 1.08 * zoom);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    },
    resize: () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    dispose: free,
  };
}
