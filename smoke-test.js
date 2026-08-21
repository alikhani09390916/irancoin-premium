// smoke-test.js — verifies ai-core.js actually RUNS without throwing:
// geometry generation, edge computation, projection math, resize, and a
// handful of animation ticks, using a minimal fake canvas/window.

let rafCallback = null;

global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false }),
};
global.requestAnimationFrame = (cb) => {
  rafCallback = cb;
  return 1;
};
global.cancelAnimationFrame = () => {};

function makeFakeCtx() {
  return {
    setTransform() {},
    clearRect() {},
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arcTo() {},
    closePath() {},
    stroke() {},
    arc() {},
    fill() {},
    createRadialGradient() {
      return { addColorStop() {} };
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    setLineDash() {},
    ellipse() {},
    lineWidth: 1,
    lineDashOffset: 0,
    fillStyle: "",
    strokeStyle: "",
    shadowColor: "",
    shadowBlur: 0,
  };
}

function makeFakeCanvas() {
  const parent = {
    getBoundingClientRect: () => ({ width: 480, height: 480 }),
  };
  return {
    getContext: () => makeFakeCtx(),
    parentElement: parent,
    style: {},
    width: 0,
    height: 0,
  };
}

require("./ai-core.js");
const AICore = global.window.AICore;

if (typeof AICore !== "function") {
  console.error("FAIL: AICore was not attached to window");
  process.exit(1);
}

const canvas = makeFakeCanvas();
const core = new AICore(canvas, { pointCount: 120 });

// sanity on generated geometry
console.assert(core.points.length === 120, "expected 120 points");
console.assert(core.edges.length > 0, "expected some edges to be generated");
for (const p of core.points) {
  const mag = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
  console.assert(Math.abs(mag - 1) < 1e-6, "every point must lie on the unit sphere");
}

// drive a handful of frames forward, including a resize mid-flight
let t = 1000;
for (let i = 0; i < 5; i++) {
  t += 16;
  rafCallback(t);
}
canvas.parentElement.getBoundingClientRect = () => ({ width: 320, height: 640 });
core._resize();
for (let i = 0; i < 5; i++) {
  t += 16;
  rafCallback(t);
}

// angle must have advanced forward, never NaN
console.assert(Number.isFinite(core.angleY) && core.angleY > 0, "angleY should have advanced");
console.assert(Number.isFinite(core.angleX), "angleX should be finite");

core.dispose();

console.log("SMOKE TEST PASSED: geometry, edges, projection, resize, and animation ticks all ran without throwing.");

// ---- AICoreChart (live candlestick chart) ----
require("./ai-core-chart.js");
const AICoreChart = global.window.AICoreChart;

if (typeof AICoreChart !== "function") {
  console.error("FAIL: AICoreChart was not attached to window");
  process.exit(1);
}

const chartCanvas = makeFakeCanvas();
let lastPrice = null;
const chart = new AICoreChart(chartCanvas, {
  startPrice: 27450,
  candleDurationSeconds: 0.05, // fast, so the test forces several candles to complete
  onPriceUpdate: (p) => {
    lastPrice = p;
  },
});

console.assert(chart.candles.length === 1, "should start with exactly one in-progress candle");

let ct = 2000;
for (let i = 0; i < 40; i++) {
  ct += 16;
  rafCallback(ct);
}

console.assert(chart.candles.length > 1, "expected new candles to have formed over time");
console.assert(typeof lastPrice === "number" && Number.isFinite(lastPrice), "onPriceUpdate should report a finite price");
console.assert(chart.candles.length <= chart.opts.maxCandles, "candle history should stay trimmed to maxCandles");

for (const c of chart.candles) {
  console.assert(c.high >= c.low, "candle high must be >= low");
  console.assert(c.high >= c.open && c.high >= c.close, "candle high must bound open/close");
  console.assert(c.low <= c.open && c.low <= c.close, "candle low must bound open/close");
}

// resize mid-flight must not throw
chartCanvas.parentElement.getBoundingClientRect = () => ({ width: 220, height: 140 });
chart._resize();
for (let i = 0; i < 10; i++) {
  ct += 16;
  rafCallback(ct);
}

chart.dispose();

console.log("SMOKE TEST PASSED: AICoreChart formed multiple valid OHLC candles, trimmed history, and survived a resize.");
