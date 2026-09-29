import { boundsViolations, cylinderVolume, cylindersOverlap, isInsideTruck, placementToCylinder } from "./geometry";
import { ORIENTATIONS, type Placement, type Problem, type Solution, type ValidationError, type ValidationReport } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isOrientation(value: unknown): value is Placement["orientation"] {
  return typeof value === "string" && (ORIENTATIONS as readonly string[]).includes(value);
}

export function parseSolution(data: unknown): { ok: true; solution: Solution } | { ok: false; message: string } {
  if (Array.isArray(data)) {
    return { ok: true, solution: { placements: data as Placement[] } };
  }
  if (!isRecord(data)) {
    return { ok: false, message: "Root must be a JSON array of placements, or an object with a placements array." };
  }
  if (!Array.isArray(data.placements)) {
    return { ok: false, message: "Object form must include a placements array." };
  }
  const metaheuristic = data.metaheuristic;
  if (metaheuristic !== undefined && typeof metaheuristic !== "string") {
    return { ok: false, message: "metaheuristic, if present, must be a string." };
  }
  return {
    ok: true,
    solution: {
      metaheuristic,
      placements: data.placements as Placement[],
    },
  };
}

function emptyCounts(problem: Problem): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of Object.keys(problem.types)) counts[id] = 0;
  return counts;
}

export function validateSolution(data: unknown, problem: Problem): ValidationReport {
  const truckVolume = problem.truck.length * problem.truck.width * problem.truck.height;
  const base = {
    cylinders: [] as ValidationReport["cylinders"],
    counts: emptyCounts(problem),
    truckVolume,
    occupiedVolume: 0,
    freeVolume: null as number | null,
    density: null as number | null,
  };

  const parsed = parseSolution(data);
  if (!parsed.ok) {
    return {
      ok: false,
      errors: [{ kind: "parse", message: parsed.message }],
      placements: [],
      ...base,
    };
  }

  const { solution } = parsed;
  const errors: ValidationError[] = [];
  const placements: Placement[] = [];

  solution.placements.forEach((raw, index) => {
    if (!isRecord(raw)) {
      errors.push({ kind: "parse", message: `Placement ${index} is not an object.`, indices: [index] });
      return;
    }
    if (!isFiniteNumber(raw.coord_x) || !isFiniteNumber(raw.coord_y) || !isFiniteNumber(raw.coord_z)) {
      errors.push({
        kind: "parse",
        message: `Placement ${index} needs finite coord_x, coord_y, coord_z numbers.`,
        indices: [index],
      });
      return;
    }
    if (typeof raw.type !== "string") {
      errors.push({ kind: "type", message: `Placement ${index} is missing a type string.`, indices: [index] });
      return;
    }
    if (!(raw.type in problem.types)) {
      errors.push({
        kind: "type",
        message: `Placement ${index} has unknown type "${raw.type}". Use: ${Object.keys(problem.types).join(", ")}.`,
        indices: [index],
      });
      return;
    }
    if (!isOrientation(raw.orientation)) {
      errors.push({
        kind: "orientation",
        message: `Placement ${index} has invalid orientation "${String(raw.orientation)}". Use: ${ORIENTATIONS.join(", ")}.`,
        indices: [index],
      });
      return;
    }

    placements.push({
      coord_x: raw.coord_x,
      coord_y: raw.coord_y,
      coord_z: raw.coord_z,
      type: raw.type,
      orientation: raw.orientation,
    });
  });

  const cylinders = placements.map((placement) => placementToCylinder(placement, problem));
  const counts = emptyCounts(problem);
  let occupiedVolume = 0;

  cylinders.forEach((cylinder, index) => {
    const typeId = placements[index].type;
    counts[typeId] += 1;
    occupiedVolume += cylinderVolume(cylinder.radius, cylinder.height);
    if (!isInsideTruck(cylinder, problem.truck, problem.epsilon)) {
      const details = boundsViolations(cylinder, problem.truck, problem.epsilon).join("; ");
      errors.push({
        kind: "bounds",
        message: `Placement ${index} (${typeId}) is outside the truck: ${details}.`,
        indices: [index],
      });
    }
  });

  for (const [typeId, count] of Object.entries(counts)) {
    const available = problem.types[typeId].available;
    if (count > available) {
      errors.push({
        kind: "inventory",
        message: `Type ${typeId} uses ${count} units, but only ${available} are available.`,
      });
    }
  }

  for (let i = 0; i < cylinders.length; i += 1) {
    for (let j = i + 1; j < cylinders.length; j += 1) {
      if (cylindersOverlap(cylinders[i], cylinders[j], problem.epsilon)) {
        errors.push({
          kind: "overlap",
          message: `Placements ${i} and ${j} overlap.`,
          indices: [i, j],
        });
      }
    }
  }

  const ok = errors.length === 0;
  return {
    ok,
    errors,
    metaheuristic: solution.metaheuristic,
    placements,
    cylinders,
    counts,
    truckVolume,
    occupiedVolume,
    freeVolume: ok ? truckVolume - occupiedVolume : null,
    density: ok && truckVolume > 0 ? occupiedVolume / truckVolume : null,
  };
}
