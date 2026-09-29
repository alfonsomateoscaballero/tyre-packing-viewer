import type { Aabb, Axis, Cylinder, Orientation, Placement, Problem, Truck, Vec3 } from "./types";

export const ORIENTATION_AXIS: Record<Orientation, Axis> = {
  flat: "z",
  parallel_to_end: "x",
  parallel_to_side: "y",
};

const AXES: Axis[] = ["x", "y", "z"];

export function cylinderVolume(radius: number, width: number): number {
  return Math.PI * radius * radius * width;
}

export function placementToCylinder(placement: Placement, problem: Problem): Cylinder {
  const spec = problem.types[placement.type];
  return {
    center: {
      x: placement.coord_x,
      y: placement.coord_y,
      z: placement.coord_z,
    },
    radius: spec.radius,
    height: spec.width,
    axis: ORIENTATION_AXIS[placement.orientation],
  };
}

export function cylinderAabb(c: Cylinder): Aabb {
  const { center: p, radius: r, height, axis } = c;
  const hh = height / 2;
  if (axis === "x") {
    return {
      min: { x: p.x - hh, y: p.y - r, z: p.z - r },
      max: { x: p.x + hh, y: p.y + r, z: p.z + r },
    };
  }
  if (axis === "y") {
    return {
      min: { x: p.x - r, y: p.y - hh, z: p.z - r },
      max: { x: p.x + r, y: p.y + hh, z: p.z + r },
    };
  }
  return {
    min: { x: p.x - r, y: p.y - r, z: p.z - hh },
    max: { x: p.x + r, y: p.y + r, z: p.z + hh },
  };
}

export function isInsideTruck(c: Cylinder, truck: Truck, epsilon: number): boolean {
  const { min, max } = cylinderAabb(c);
  return (
    min.x >= -epsilon &&
    min.y >= -epsilon &&
    min.z >= -epsilon &&
    max.x <= truck.length + epsilon &&
    max.y <= truck.width + epsilon &&
    max.z <= truck.height + epsilon
  );
}

export function boundsViolations(c: Cylinder, truck: Truck, epsilon: number): string[] {
  const { min, max } = cylinderAabb(c);
  const issues: string[] = [];
  if (min.x < -epsilon) issues.push(`x min ${min.x.toFixed(4)} < 0`);
  if (max.x > truck.length + epsilon) issues.push(`x max ${max.x.toFixed(4)} > ${truck.length}`);
  if (min.y < -epsilon) issues.push(`y min ${min.y.toFixed(4)} < 0`);
  if (max.y > truck.width + epsilon) issues.push(`y max ${max.y.toFixed(4)} > ${truck.width}`);
  if (min.z < -epsilon) issues.push(`z min ${min.z.toFixed(4)} < 0`);
  if (max.z > truck.height + epsilon) issues.push(`z max ${max.z.toFixed(4)} > ${truck.height}`);
  return issues;
}

function distToInterval(value: number, a: number, b: number): number {
  if (value < a) return a - value;
  if (value > b) return value - b;
  return 0;
}

function intervalOverlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

function otherAxis(a: Axis, b: Axis): Axis {
  return AXES.find((axis) => axis !== a && axis !== b)!;
}

function coord(v: Vec3, axis: Axis): number {
  return v[axis];
}

function hypot2(dx: number, dy: number): number {
  return Math.hypot(dx, dy);
}

function parallelOverlap(a: Cylinder, b: Cylinder, epsilon: number): boolean {
  const axis = a.axis;
  const [u, v] = AXES.filter((item) => item !== axis) as [Axis, Axis];
  const radial = hypot2(coord(a.center, u) - coord(b.center, u), coord(a.center, v) - coord(b.center, v));
  if (a.radius + b.radius - radial <= epsilon) return false;

  const a0 = coord(a.center, axis) - a.height / 2;
  const a1 = coord(a.center, axis) + a.height / 2;
  const b0 = coord(b.center, axis) - b.height / 2;
  const b1 = coord(b.center, axis) + b.height / 2;
  return intervalOverlap(a0, a1, b0, b1) > epsilon;
}

function perpendicularOverlap(a: Cylinder, b: Cylinder, epsilon: number): boolean {
  const axisA = a.axis;
  const axisB = b.axis;
  const shared = otherAxis(axisA, axisB);

  const dAlongB = distToInterval(
    coord(a.center, axisB),
    coord(b.center, axisB) - b.height / 2,
    coord(b.center, axisB) + b.height / 2,
  );
  const dAlongA = distToInterval(
    coord(b.center, axisA),
    coord(a.center, axisA) - a.height / 2,
    coord(a.center, axisA) + a.height / 2,
  );

  const s1sq = a.radius * a.radius - dAlongB * dAlongB;
  const s2sq = b.radius * b.radius - dAlongA * dAlongA;
  if (s1sq <= 0 || s2sq <= 0) return false;

  const s1 = Math.sqrt(s1sq);
  const s2 = Math.sqrt(s2sq);
  const y1 = coord(a.center, shared);
  const y2 = coord(b.center, shared);
  return intervalOverlap(y1 - s1, y1 + s1, y2 - s2, y2 + s2) > epsilon;
}

/** True when cylinder interiors overlap. Touching (zero-volume contact) is allowed. */
export function cylindersOverlap(a: Cylinder, b: Cylinder, epsilon: number): boolean {
  const boxA = cylinderAabb(a);
  const boxB = cylinderAabb(b);
  if (
    intervalOverlap(boxA.min.x, boxA.max.x, boxB.min.x, boxB.max.x) <= epsilon ||
    intervalOverlap(boxA.min.y, boxA.max.y, boxB.min.y, boxB.max.y) <= epsilon ||
    intervalOverlap(boxA.min.z, boxA.max.z, boxB.min.z, boxB.max.z) <= epsilon
  ) {
    return false;
  }

  if (a.axis === b.axis) return parallelOverlap(a, b, epsilon);
  return perpendicularOverlap(a, b, epsilon);
}
