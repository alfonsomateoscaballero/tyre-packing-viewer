import overlapFixture from "../fixtures/overlap.json";
import validFixture from "../fixtures/valid.json";
import problemJson from "../problem.json";
import "./style.css";
import type { Problem, ValidationReport } from "./types";
import { validateSolution } from "./validate";
import { PackingViewer, TYPE_COLORS } from "./viewer";

const problem = problemJson as Problem;

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const viewer = new PackingViewer(canvas);
viewer.setProblem(problem);

const fileInput = document.querySelector<HTMLInputElement>("#file-input")!;
const dropZone = document.querySelector<HTMLLabelElement>("#drop-zone")!;
const fileName = document.querySelector("#file-name")!;
const statusCard = document.querySelector("#status-card")!;
const statusText = document.querySelector("#status-text")!;
const statusDot = document.querySelector("#status-dot")!;
const metaheuristicText = document.querySelector("#metaheuristic-text")!;
const metricTruck = document.querySelector("#metric-truck")!;
const metricOccupied = document.querySelector("#metric-occupied")!;
const metricFree = document.querySelector("#metric-free")!;
const metricDensity = document.querySelector("#metric-density")!;
const densityBar = document.querySelector<HTMLElement>("#density-bar")!;
const countsEl = document.querySelector("#counts")!;
const errorsEl = document.querySelector("#errors")!;
const errorPanel = document.querySelector("#error-panel")!;
const toggleVolumes = document.querySelector<HTMLInputElement>("#toggle-volumes")!;

function formatVolume(value: number): string {
  return `${value.toFixed(4)} m³`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function hexCss(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function setStatus(ok: boolean | null, label: string) {
  statusText.textContent = label;
  statusCard.className = "mt-1 inline-flex items-center gap-2 rounded-full border px-2.5 py-1";
  if (ok === true) {
    statusCard.classList.add("border-[#3f5a45]/80", "bg-[#1b241d]");
    statusText.className = "text-[11px] font-medium tracking-wide text-[#b7cbb6]";
    statusDot.className = "h-1.5 w-1.5 rounded-full bg-[#8fbf8a]";
  } else if (ok === false) {
    statusCard.classList.add("border-[#6a3a32]/90", "bg-[#2a1816]");
    statusText.className = "text-[11px] font-medium tracking-wide text-[#e3b2a8]";
    statusDot.className = "h-1.5 w-1.5 rounded-full bg-[#c45c4a]";
  } else {
    statusCard.classList.add("border-white/[0.08]");
    statusText.className = "text-[11px] font-medium tracking-wide text-[#8b8d87]";
    statusDot.className = "h-1.5 w-1.5 rounded-full bg-[#6e706b]";
  }
}

function renderCounts(report: ValidationReport) {
  const rows = Object.entries(report.counts).map(([type, count]) => {
    const color = hexCss(TYPE_COLORS[type] ?? 0x9a9b96);
    const spec = problem.types[type];
    const label = `${type} · ${spec.name}`;
    return `<div class="flex items-center justify-between">
      <span class="flex items-center gap-2.5 text-[#c8c9c3]">
        <span class="h-1.5 w-1.5 rounded-full" style="background:${color}"></span>
        ${label}
      </span>
      <span class="mono text-[#eeeee8]">${count}/${spec.available}</span>
    </div>`;
  });
  rows.push(`<div class="flex items-center justify-between border-t border-white/[0.06] pt-2 text-[#8b8d87]">
    <span>Total</span><span class="mono text-[#eeeee8]">${report.placements.length}</span>
  </div>`);
  countsEl.innerHTML = rows.join("");
}

function applyReport(report: ValidationReport, sourceLabel: string) {
  fileName.textContent = sourceLabel;
  viewer.setPacking(report);
  metricTruck.textContent = formatVolume(report.truckVolume);
  metricOccupied.textContent = formatVolume(report.occupiedVolume);
  renderCounts(report);

  if (report.metaheuristic) {
    metaheuristicText.textContent = report.metaheuristic;
    metaheuristicText.classList.remove("hidden");
  } else {
    metaheuristicText.classList.add("hidden");
  }

  if (report.ok) {
    setStatus(true, "Feasible");
    metricFree.textContent = (report.freeVolume ?? 0).toFixed(4);
    metricDensity.textContent = formatPercent(report.density ?? 0);
    densityBar.style.width = `${Math.min(100, (report.density ?? 0) * 100)}%`;
    errorPanel.classList.add("hidden");
    errorsEl.innerHTML = "";
    return;
  }

  setStatus(false, "Invalid");
  metricFree.textContent = "—";
  metricDensity.textContent = "n/a";
  densityBar.style.width = "0%";
  errorPanel.classList.remove("hidden");
  errorsEl.innerHTML = report.errors.map((error) => `<li>${error.message}</li>`).join("");
}

function loadJson(data: unknown, sourceLabel: string) {
  applyReport(validateSolution(data, problem), sourceLabel);
}

async function loadFile(file: File) {
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    applyReport(validateSolution(null, problem), file.name);
    fileName.textContent = file.name;
    setStatus(false, "Invalid JSON");
    errorPanel.classList.remove("hidden");
    errorsEl.innerHTML = `<li>Could not parse ${file.name} as JSON.</li>`;
    return;
  }
  loadJson(data, file.name);
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) void loadFile(file);
});

const setDropState = (active: boolean) => {
  dropZone.classList.toggle("border-white/40", active);
  dropZone.classList.toggle("bg-white/[0.06]", active);
};

for (const target of [dropZone, canvas]) {
  target.addEventListener("dragover", (event) => {
    event.preventDefault();
    setDropState(true);
  });
  target.addEventListener("dragleave", () => {
    setDropState(false);
  });
  target.addEventListener("drop", (event) => {
    event.preventDefault();
    setDropState(false);
    const file = (event as DragEvent).dataTransfer?.files[0];
    if (file) void loadFile(file);
  });
}

document.querySelector("#load-valid")!.addEventListener("click", () => {
  loadJson(validFixture, "fixtures/valid.json");
});
document.querySelector("#load-overlap")!.addEventListener("click", () => {
  loadJson(overlapFixture, "fixtures/overlap.json");
});
document.querySelector("#reset-view")!.addEventListener("click", () => {
  viewer.resetView();
});

toggleVolumes.addEventListener("change", () => {
  viewer.setShowCollisionVolumes(toggleVolumes.checked);
});

const resize = () => {
  const parent = canvas.parentElement!;
  viewer.resize(parent.clientWidth, parent.clientHeight);
};
resize();
new ResizeObserver(resize).observe(canvas.parentElement!);

loadJson(validFixture, "fixtures/valid.json");
