import problemJson from "../problem.json";
import { cylindersOverlap, isInsideTruck, placementToCylinder } from "./geometry";
import type { Cylinder, Problem } from "./types";
import { validateSolution } from "./validate";
import validFixture from "../fixtures/valid.json";
import overlapFixture from "../fixtures/overlap.json";

const problem = problemJson as Problem;
const eps = problem.epsilon;

function cyl(partial: Omit<Cylinder, "center"> & { center: Cylinder["center"] }): Cylinder {
  return partial;
}

let failed = 0;

function assert(name: string, condition: boolean) {
  if (!condition) {
    failed += 1;
    console.error(`FAIL: ${name}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

const unitZ: Cylinder = cyl({ center: { x: 1, y: 1, z: 1 }, radius: 0.5, height: 0.4, axis: "z" });
assert("inside truck", isInsideTruck(unitZ, problem.truck, eps));

const outside: Cylinder = cyl({ center: { x: -0.1, y: 1, z: 1 }, radius: 0.5, height: 0.4, axis: "z" });
assert("outside truck", !isInsideTruck(outside, problem.truck, eps));

const a = cyl({ center: { x: 1, y: 1, z: 1 }, radius: 0.5, height: 0.4, axis: "z" });
const touching = cyl({ center: { x: 2, y: 1, z: 1 }, radius: 0.5, height: 0.4, axis: "z" });
assert("parallel touching is allowed", !cylindersOverlap(a, touching, eps));

const overlapping = cyl({ center: { x: 1.6, y: 1, z: 1 }, radius: 0.5, height: 0.4, axis: "z" });
assert("parallel overlap detected", cylindersOverlap(a, overlapping, eps));

const stackedTouch = cyl({ center: { x: 1, y: 1, z: 1.4 }, radius: 0.5, height: 0.4, axis: "z" });
assert("stacked face-touch is allowed", !cylindersOverlap(a, stackedTouch, eps));

const perp: Cylinder = cyl({ center: { x: 1, y: 1.2, z: 1 }, radius: 0.5, height: 1.2, axis: "x" });
assert("perpendicular overlap detected", cylindersOverlap(a, perp, eps));

const perpFar: Cylinder = cyl({ center: { x: 1, y: 3, z: 1 }, radius: 0.5, height: 1.2, axis: "x" });
assert("perpendicular miss", !cylindersOverlap(a, perpFar, eps));

const capTouch: Cylinder = cyl({ center: { x: 1, y: 1, z: 1.7 }, radius: 0.5, height: 1, axis: "x" });
assert("end-cap tangent is allowed", !cylindersOverlap(a, capTouch, eps));

const valid = validateSolution(validFixture, problem);
assert("valid fixture is feasible", valid.ok);
assert("valid fixture reports free volume", valid.freeVolume !== null && valid.freeVolume < valid.truckVolume);

const overlap = validateSolution(overlapFixture, problem);
assert("overlap fixture is invalid", !overlap.ok);
assert("overlap fixture has overlap error", overlap.errors.some((error) => error.kind === "overlap"));
assert("overlap fixture hides free volume", overlap.freeVolume === null);

const excessInventory = validateSolution(
  Array.from({ length: 16 }, (_, index) => ({
    coord_x: 0.2933 + index * 0.5866,
    coord_y: 0.2933,
    coord_z: 0.0825,
    type: "R1",
    orientation: "flat",
  })),
  problem,
);
assert("inventory limit is enforced", excessInventory.errors.some((error) => error.kind === "inventory"));

const parsedPlacement = placementToCylinder(valid.placements[0], problem);
assert("flat maps to Z axis", parsedPlacement.axis === "z");

if (failed > 0) {
  throw new Error(`${failed} test(s) failed`);
}
console.log("\nAll geometry/validator tests passed.");
