// smoke-test.js — verifies every JS module actually RUNS without
// throwing: geometry generation, projection math, resize, a handful of
// animation ticks, and (for cables.js) real SVG element construction
// against a minimal fake DOM. No browser, no build step: `node smoke-test.js`.

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
    stroke() {},
    arc() {},
    ellipse() {},
    fill() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    createRadialGradient() {
      return { addColorStop() {} };
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    lineWidth: 1,
    fillStyle: "",
    strokeStyle: "",
    shadowColor: "",
    shadowBlur: 0,
    lineJoin: "",
    lineCap: "",
  };
}

function makeFakeCanvas(w, h) {
  const parent = {
    getBoundingClientRect: () => ({ width: w || 480, height: h || 480 }),
  };
  return {
    getContext: () => makeFakeCtx(),
    parentElement: parent,
    style: {},
    width: 0,
    height: 0,
  };
}

let failures = 0;
function check(cond, msg) {
  if (!cond) {
    console.error("FAIL: " + msg);
    failures++;
  } else {
    console.log("  ok  " + msg);
  }
}

// ---------------------------------------------------------------
console.log("\n[1/4] ai-core.js — rotating core + 3 orbit-ring agents");
require("./assets/js/ai-core.js");
const AICore = global.window.AICore;
check(typeof AICore === "function", "AICore attached to window");

const coreCanvas = makeFakeCanvas();
const core = new AICore(coreCanvas, { pointCount: 120 });
check(core.points.length === 120, "generated 120 sphere points");
check(core.edges.length > 0, "generated neural edges between points");
check(core.orbitAngles.length === 3, "three orbit-ring agents initialized");
for (const p of core.points) {
  const mag = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
  check(Math.abs(mag - 1) < 1e-6, "point lies on the unit sphere");
  break; // one representative check keeps the log readable
}

let t = 1000;
for (let i = 0; i < 5; i++) { t += 16; rafCallback(t); }
coreCanvas.parentElement.getBoundingClientRect = () => ({ width: 320, height: 640 });
core._resize();
for (let i = 0; i < 5; i++) { t += 16; rafCallback(t); }

check(Number.isFinite(core.angleY) && core.angleY > 0, "angleY advanced forward and stayed finite");
check(Number.isFinite(core.angleX), "angleX (wobble) stayed finite");
const center = core.getCenter();
check(Number.isFinite(center.x) && Number.isFinite(center.y), "getCenter() returns finite coordinates");
core.dispose();

// ---------------------------------------------------------------
console.log("\n[2/4] live-candles.js — ever-forming candlestick field");
require("./assets/js/live-candles.js");
const LiveCandles = global.window.LiveCandles;
check(typeof LiveCandles === "function", "LiveCandles attached to window");

const candleCanvas = makeFakeCanvas(600, 200);
const field = new LiveCandles(candleCanvas, { intervalSeconds: 0.05 });
check(field.candles.length > 0, "history seeded with finalized candles");
check(!!field.forming, "a forming (still-building) candle exists");

t = 1000;
for (let i = 0; i < 40; i++) { t += 30; rafCallback(t); } // enough ticks to roll several candles over
check(Number.isFinite(field.price) && field.price > 0, "simulated price stayed finite and positive");
check(
  field.candles.every((c) => [c.open, c.close, c.high, c.low].every(Number.isFinite)),
  "every finalized candle has finite OHLC values"
);
field.dispose();

// ---------------------------------------------------------------
console.log("\n[3/4] cables.js — SVG cable layer against a minimal fake DOM");
const fakeSvg = { children: [], attrs: {}, appendChild(n) { this.children.push(n); }, setAttribute(k, v) { this.attrs[k] = v; }, get firstChild() { return this.children[0] || null; }, removeChild(n) { this.children = this.children.filter((c) => c !== n); } };
function fakeEl(rect, tagName) {
  const attrs = {};
  return {
    tagName: tagName || "DIV",
    _rect: rect,
    getBoundingClientRect() { return this._rect; },
    getAttribute(k) { return attrs[k] || null; },
    setAttribute(k, v) { attrs[k] = String(v); },
    appendChild() {},
    style: {},
  };
}
const coreBadge = fakeEl({ left: 290, top: 290, width: 100, height: 40 });
const cardA = fakeEl({ left: 40, top: 40, width: 120, height: 60 });
cardA.setAttribute("data-cable", "market");
const cardB = fakeEl({ left: 500, top: 400, width: 120, height: 60 });
cardB.setAttribute("data-cable", "risk");
const container = {
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 680, height: 560 }),
  querySelector: (sel) => (sel === ".cable-layer" ? fakeSvg : sel === ".core-badge" ? coreBadge : null),
  querySelectorAll: (sel) => (sel === "[data-cable]" ? [cardA, cardB] : []),
};
global.document = {
  createElementNS: (ns, tag) => fakeEl({}, tag),
};
global.ResizeObserver = undefined; // exercise the "no ResizeObserver" fallback path too
require("./assets/js/cables.js");
const initCables = global.window.initCables;
check(typeof initCables === "function", "initCables attached to window");
const cablesHandle = initCables({ container });
check(fakeSvg.children.length === 6, "2 cards -> 6 svg nodes (glow path + line path + pulse dot each)");
cablesHandle.dispose();

// ---------------------------------------------------------------
console.log("\n[4/4] ui.js — loads without throwing in a DOM-less environment");
global.document.addEventListener = () => {};
global.document.querySelectorAll = () => [];
try {
  require("./assets/js/ui.js");
  check(true, "ui.js required without throwing");
} catch (e) {
  check(false, "ui.js required without throwing (" + e.message + ")");
}

// ---------------------------------------------------------------
console.log("");
if (failures > 0) {
  console.error(`SMOKE TEST FAILED: ${failures} check(s) did not pass.`);
  process.exit(1);
}
console.log("SMOKE TEST PASSED: all four modules run cleanly — geometry, projection,");
console.log("resize, animation ticks, candle formation, and SVG cable construction.");
