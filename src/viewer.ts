import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { ORIENTATION_AXIS } from "./geometry";
import type { Cylinder, Placement, Problem, ValidationReport } from "./types";

export const TYPE_COLORS: Record<string, number> = {
  R1: 0x7d8fa0,
  R2: 0x91a7b8,
  R3: 0x6f8f7a,
  R4: 0x8fae85,
  R5: 0xb4a269,
  R6: 0xc4a574,
  R7: 0xb88368,
  R8: 0xa86d62,
  R9: 0x9b718f,
  R10: 0x7f79a7,
  R11: 0x668fa0,
  R12: 0x9a9b96,
};

function typeColor(typeId: string): number {
  return TYPE_COLORS[typeId] ?? 0x9a9b96;
}

function orientAlongAxis(object: THREE.Object3D, axis: "x" | "y" | "z") {
  object.rotation.set(0, 0, 0);
  if (axis === "x") object.rotation.z = Math.PI / 2;
  if (axis === "z") object.rotation.x = Math.PI / 2;
}

function makeTyreLathe(outerR: number, width: number): THREE.LatheGeometry {
  const inner = outerR * 0.58;
  const hw = width / 2;
  const shoulder = width * 0.34;
  const points = [
    new THREE.Vector2(inner, -hw),
    new THREE.Vector2(outerR * 0.9, -hw),
    new THREE.Vector2(outerR, -shoulder),
    new THREE.Vector2(outerR, shoulder),
    new THREE.Vector2(outerR * 0.9, hw),
    new THREE.Vector2(inner, hw),
  ];
  return new THREE.LatheGeometry(points, 72);
}

function makeFloorGrid(length: number, width: number, step: number): THREE.LineSegments {
  const positions: number[] = [];
  for (let x = 0; x <= length + 1e-9; x += step) {
    positions.push(x, 0, 0.0015, x, width, 0.0015);
  }
  for (let y = 0; y <= width + 1e-9; y += step) {
    positions.push(0, y, 0.0015, length, y, 0.0015);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0x2a2d32, transparent: true, opacity: 0.9 }),
  );
}

function dimLabel(text: string): CSS2DObject {
  const el = document.createElement("div");
  el.className = "dim-label";
  el.textContent = text;
  return new CSS2DObject(el);
}

export class PackingViewer {
  readonly renderer: THREE.WebGLRenderer;
  private readonly labelRenderer: CSS2DRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly truckGroup = new THREE.Group();
  private readonly packingGroup = new THREE.Group();
  private readonly collisionGroup = new THREE.Group();
  private readonly shadowGroup = new THREE.Group();
  private showVolumes = false;
  private homePosition = new THREE.Vector3();
  private homeTarget = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.scene.background = new THREE.Color(0x0c0d0f);
    this.scene.fog = new THREE.Fog(0x0c0d0f, 7, 18);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.05, 80);
    this.camera.up.set(0, 0, 1);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
    this.scene.environmentIntensity = 0.35;

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.id = "label-layer";
    this.labelRenderer.domElement.style.position = "absolute";
    this.labelRenderer.domElement.style.inset = "0";
    this.labelRenderer.domElement.style.pointerEvents = "none";
    canvas.parentElement?.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.9;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 16;

    this.scene.add(this.truckGroup);
    this.scene.add(this.shadowGroup);
    this.scene.add(this.packingGroup);
    this.scene.add(this.collisionGroup);

    const hemi = new THREE.HemisphereLight(0xe8e6df, 0x1a1814, 0.7);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff6ea, 1.35);
    key.position.set(5, -9, 11);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xb9c7d4, 0.28);
    fill.position.set(-7, 4, 4);
    this.scene.add(fill);

    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.labelRenderer.render(this.scene, this.camera);
    });
  }

  resize(width: number, height: number) {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.labelRenderer.setSize(w, h);
  }

  setShowCollisionVolumes(show: boolean) {
    this.showVolumes = show;
    this.collisionGroup.visible = show;
  }

  resetView() {
    this.camera.position.copy(this.homePosition);
    this.controls.target.copy(this.homeTarget);
    this.controls.update();
  }

  setProblem(problem: Problem) {
    this.rebuildTruck(problem);
    const { length: L, width: W, height: H } = problem.truck;
    this.controls.maxDistance = Math.max(L, W, H) * 2.5;
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.near = Math.max(L, W, H) * 0.55;
      this.scene.fog.far = Math.max(L, W, H) * 2.2;
    }
    this.homePosition.set(L * 1.55, -W * 1.45, H * 1.15);
    this.homeTarget.set(L / 2, W / 2, H * 0.28);
    this.resetView();
  }

  setPacking(report: ValidationReport) {
    this.clearGroup(this.packingGroup);
    this.clearGroup(this.collisionGroup);
    this.clearGroup(this.shadowGroup);

    const overlapping = new Set<number>();
    for (const error of report.errors) {
      if (error.kind === "overlap" && error.indices) {
        for (const index of error.indices) overlapping.add(index);
      }
    }

    report.placements.forEach((placement, index) => {
      const cylinder = report.cylinders[index];
      if (!cylinder) return;
      this.packingGroup.add(this.makeTyre(placement, cylinder, overlapping.has(index)));
      this.collisionGroup.add(this.makeCollisionMesh(cylinder, overlapping.has(index)));
      this.shadowGroup.add(this.makeContactShadow(cylinder));
    });

    for (const error of report.errors) {
      if (error.kind !== "overlap" || !error.indices || error.indices.length < 2) continue;
      const [i, j] = error.indices;
      const a = report.cylinders[i];
      const b = report.cylinders[j];
      if (!a || !b) continue;
      this.packingGroup.add(this.makeOverlapLine(a, b));
    }

    this.collisionGroup.visible = this.showVolumes;
  }

  private rebuildTruck(problem: Problem) {
    this.clearGroup(this.truckGroup);
    const { length: L, width: W, height: H } = problem.truck;

    const studio = new THREE.Mesh(
      new THREE.CircleGeometry(18, 64),
      new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 1, metalness: 0 }),
    );
    studio.position.set(L / 2, W / 2, -0.02);
    this.truckGroup.add(studio);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(L, W),
      new THREE.MeshStandardMaterial({ color: 0x17191d, roughness: 0.92, metalness: 0.04 }),
    );
    floor.position.set(L / 2, W / 2, 0);
    this.truckGroup.add(floor);

    this.truckGroup.add(makeFloorGrid(L, W, 0.2));

    const boxGeo = new THREE.BoxGeometry(L, W, H);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(boxGeo),
      new THREE.LineBasicMaterial({ color: 0xd8d4c8, transparent: true, opacity: 0.38 }),
    );
    edges.position.set(L / 2, W / 2, H / 2);
    this.truckGroup.add(edges);

    const lengthTag = dimLabel(`${L.toFixed(2)} m`);
    lengthTag.position.set(L / 2, -0.16, 0);
    this.truckGroup.add(lengthTag);

    const widthTag = dimLabel(`${W.toFixed(2)} m`);
    widthTag.position.set(L + 0.18, W / 2, 0);
    this.truckGroup.add(widthTag);

    const heightTag = dimLabel(`${H.toFixed(2)} m`);
    heightTag.position.set(-0.16, -0.16, H / 2);
    this.truckGroup.add(heightTag);
  }

  private makeTyre(placement: Placement, cylinder: Cylinder, overlapping: boolean): THREE.Group {
    const group = new THREE.Group();
    const axis = ORIENTATION_AXIS[placement.orientation];
    const accent = overlapping ? 0xc45c4a : typeColor(placement.type);
    const outer = cylinder.radius;
    const width = cylinder.height;

    const rubber = new THREE.Mesh(
      makeTyreLathe(outer, width),
      new THREE.MeshStandardMaterial({
        color: overlapping ? 0x4a201c : 0x1a1b1d,
        roughness: 0.86,
        metalness: 0.04,
        envMapIntensity: 0.25,
      }),
    );
    orientAlongAxis(rubber, axis);
    group.add(rubber);

    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(outer * 0.97, width * 0.045, 10, 64),
      new THREE.MeshStandardMaterial({
        color: accent,
        roughness: 0.5,
        metalness: 0.12,
        emissive: new THREE.Color(accent),
        emissiveIntensity: overlapping ? 0.22 : 0.08,
      }),
    );
    if (axis === "x") stripe.rotation.y = Math.PI / 2;
    if (axis === "y") stripe.rotation.x = Math.PI / 2;
    group.add(stripe);

    const rimRadius = outer * 0.52;
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(rimRadius, rimRadius, width * 0.22, 40),
      new THREE.MeshStandardMaterial({
        color: overlapping ? 0xb08984 : 0x8a8e94,
        metalness: 0.82,
        roughness: 0.28,
        envMapIntensity: 0.8,
      }),
    );
    orientAlongAxis(rim, axis);
    group.add(rim);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(rimRadius * 0.28, rimRadius * 0.28, width * 0.26, 24),
      new THREE.MeshStandardMaterial({
        color: 0x2c2e32,
        metalness: 0.6,
        roughness: 0.35,
      }),
    );
    orientAlongAxis(hub, axis);
    group.add(hub);

    group.position.set(cylinder.center.x, cylinder.center.y, cylinder.center.z);
    return group;
  }

  private makeCollisionMesh(cylinder: Cylinder, overlapping: boolean): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(cylinder.radius, cylinder.radius, cylinder.height, 36),
      new THREE.MeshPhysicalMaterial({
        color: overlapping ? 0xc45c4a : 0xb9c7d4,
        transparent: true,
        opacity: 0.16,
        roughness: 0.2,
        thickness: 0.2,
        depthWrite: false,
      }),
    );
    orientAlongAxis(mesh, cylinder.axis);
    mesh.position.set(cylinder.center.x, cylinder.center.y, cylinder.center.z);
    return mesh;
  }

  private makeContactShadow(cylinder: Cylinder): THREE.Mesh {
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(cylinder.radius * 0.92, 40),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    );
    shadow.position.set(cylinder.center.x, cylinder.center.y, 0.002);
    return shadow;
  }

  private makeOverlapLine(a: Cylinder, b: Cylinder): THREE.Line {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(a.center.x, a.center.y, a.center.z),
      new THREE.Vector3(b.center.x, b.center.y, b.center.z),
    ]);
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xc45c4a }));
  }

  private clearGroup(group: THREE.Group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((obj) => {
        if (obj instanceof CSS2DObject) {
          obj.element.remove();
          return;
        }
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
          obj.geometry.dispose();
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const material of materials) material.dispose();
        }
      });
    }
  }
}
