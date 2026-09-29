export const ORIENTATIONS = ["flat", "parallel_to_end", "parallel_to_side"] as const;
export type Orientation = (typeof ORIENTATIONS)[number];

export type Axis = "x" | "y" | "z";

export interface TyreType {
  name: string;
  radius: number;
  width: number;
  available: number;
}

export interface Truck {
  length: number;
  width: number;
  height: number;
}

export interface Problem {
  units: string;
  epsilon: number;
  truck: Truck;
  types: Record<string, TyreType>;
}

export interface Placement {
  coord_x: number;
  coord_y: number;
  coord_z: number;
  type: string;
  orientation: Orientation;
}

export interface Solution {
  metaheuristic?: string;
  placements: Placement[];
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Cylinder {
  center: Vec3;
  radius: number;
  height: number;
  axis: Axis;
}

export interface Aabb {
  min: Vec3;
  max: Vec3;
}

export type ValidationError = {
  kind: "parse" | "type" | "orientation" | "inventory" | "bounds" | "overlap";
  message: string;
  indices?: number[];
};

export interface ValidationReport {
  ok: boolean;
  errors: ValidationError[];
  metaheuristic?: string;
  placements: Placement[];
  cylinders: Cylinder[];
  counts: Record<string, number>;
  truckVolume: number;
  occupiedVolume: number;
  freeVolume: number | null;
  density: number | null;
}
