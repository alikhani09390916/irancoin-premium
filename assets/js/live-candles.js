/**
 * live-candles.js
 * ------------------------------------------------------------------
 * A self-contained, zero-dependency animated candlestick field.
 * Unlike a static decorative background, every candle here is a real
 * (simulated) price series: the right-most candle is *actively being
 * built* — its close ticks up/down every frame — and once its interval
 * elapses it's finalized and a fresh candle starts, exactly like a
 * live exchange chart. Older candles scroll left and fade out.
 *
 * This is intentionally simulated market data for visual atmosphere
 * only (labelled as such wherever it appears next to real numbers) —
 * it is not, and must never be presented as, real price data.
 *
 * USAGE
 * -----
 *   <canvas id="live-candles-canvas"></canvas>
 *   <script src="./assets/js/live-candles.js"></script>
 *   <script>
 *     const field = new LiveCandles(document.getElementById('live-candles-canvas'));
 *     // field.dispose() if removed from the DOM
 *   </script>
 * ------------------------------------------------------------------
 */

(function (global) {
  "use strict";

  function prefersReducedMotion() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  class LiveCandles {
    constructor(canvas, userOptions) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");

      this.opts = Object.assign(
        {
          candleWidth: 7,
          gap: 6,
          intervalSeconds: 1.1, // how long each candle stays "forming"
          driftBias: 0.58, // >0.5 = gentle upward drift (optimistic, luxury feel)
          volatility: 0.016, // per-tick relative price step
          upColor: "31,191,159", // teal
          downColor: "244,113,146", // soft rose
          wickAlpha: 0.55,
          bodyAlpha: 0.85,
          respectReducedMotion: true,
        },
        userOptions || {}
      );

      this.reduced = this.opts.respectReducedMotion && prefersReducedMotion();

      this.price = 100;
      this.candles = []; // finalized candles, oldest first
      this.forming = null;
      this.formingElapsed = 0;

      this._lastT = null;
      this._rafId = null;
      this._disposed = false;

      this._onResize = this._resize.bind(this);
      window.addEventListener("resize", this._onResize);
      this._resize();
      this._seed();

      this._tick = this._tick.bind(this);
      this._rafId = requestAnimationFrame(this._tick);
    }

    _resize() {
      const parent = this.canvas.parentElement || this.canvas;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.cssW = Math.max(1, rect.width);
      this.cssH = Math.max(1, rect.height);

      this.canvas.width = Math.round(this.cssW * dpr);
      this.canvas.height = Math.round(this.cssH * dpr);
      this.canvas.style.width = this.cssW + "px";
      this.canvas.style.height = this.cssH + "px";
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this.slot = this.opts.candleWidth + this.opts.gap;
      this.maxCandles = Math.ceil(this.cssW / this.slot) + 2;
    }

    _seed() {
      // fill history so the field isn't empty on first paint
      for (let i = 0; i < this.maxCandles; i++) {
        this._pushFinalized(this._stepPrice());
      }
      this._startForming();
    }

    _stepPrice() {
      const bias = this.opts.driftBias;
      const dir = Math.random() < bias ? 1 : -1;
      const step = this.price * this.opts.volatility * (0.4 + Math.random());
      this.price = Math.max(1, this.price + dir * step);
      return this.price;
    }

    _pushFinalized(closePrice) {
      const open = this.candles.length
        ? this.candles[this.candles.length - 1].close
        : closePrice;
      const high = Math.max(open, closePrice) * (1 + Math.random() * 0.006);
      const low = Math.min(open, closePrice) * (1 - Math.random() * 0.006);
      this.candles.push({ open, close: closePrice, high, low });
      if (this.candles.length > this.maxCandles) this.candles.shift();
    }

    _startForming() {
      const open = this.candles.length
        ? this.candles[this.candles.length - 1].close
        : this.price;
      this.forming = { open, close: open, high: open, low: open };
      this.formingElapsed = 0;
    }

    _tick(now) {
      if (this._disposed) return;
      if (this._lastT == null) this._lastT = now;
      const dt = Math.min((now - this._lastT) / 1000, 0.1);
      this._lastT = now;

      const slow = this.reduced ? 8 : 1;

      this.formingElapsed += dt;

      // nudge the forming candle's close every frame — this is the
      // "alive, still being built" behavior
      const nudge = this.price * this.opts.volatility * 0.35 * (Math.random() - 0.42);
      this.forming.close = Math.max(1, this.forming.close + nudge / slow);
      this.forming.high = Math.max(this.forming.high, this.forming.close);
      this.forming.low = Math.min(this.forming.low, this.forming.close);

      if (this.formingElapsed >= this.opts.intervalSeconds * slow) {
        this.price = this.forming.close;
        this.candles.push(this.forming);
        if (this.candles.length > this.maxCandles) this.candles.shift();
        this._startForming();
      }

      this._draw();
      this._rafId = requestAnimationFrame(this._tick);
    }

    _draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.cssW, this.cssH);

      const all = this.candles.concat([this.forming]);
      let lo = Infinity, hi = -Infinity;
      for (const c of all) {
        lo = Math.min(lo, c.low);
        hi = Math.max(hi, c.high);
      }
      const pad = (hi - lo) * 0.18 || 1;
      lo -= pad;
      hi += pad;
      const range = Math.max(1e-6, hi - lo);

      const toY = (price) => this.cssH - ((price - lo) / range) * this.cssH;

      const n = all.length;
      const startX = this.cssW - n * this.slot + this.opts.gap;

      for (let i = 0; i < n; i++) {
        const c = all[i];
        const isForming = i === n - 1;
        const x = startX + i * this.slot;
        if (x < -this.slot || x > this.cssW + this.slot) continue;

        const up = c.close >= c.open;
        const color = up ? this.opts.upColor : this.opts.downColor;
        const ageFade = 0.35 + 0.65 * (i / n); // older = fainter (depth)
        const bodyA = this.opts.bodyAlpha * ageFade * (isForming ? 1 : 0.85);
        const wickA = this.opts.wickAlpha * ageFade;

        ctx.strokeStyle = `rgba(${color},${wickA})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + this.opts.candleWidth / 2, toY(c.high));
        ctx.lineTo(x + this.opts.candleWidth / 2, toY(c.low));
        ctx.stroke();

        const yOpen = toY(c.open);
        const yClose = toY(c.close);
        const top = Math.min(yOpen, yClose);
        const h = Math.max(1.5, Math.abs(yClose - yOpen));

        ctx.fillStyle = `rgba(${color},${bodyA})`;
        if (isForming) {
          ctx.shadowColor = `rgba(${color},0.9)`;
          ctx.shadowBlur = 10;
        }
        ctx.fillRect(x, top, this.opts.candleWidth, h);
        ctx.shadowBlur = 0;
      }
    }

    dispose() {
      this._disposed = true;
      if (this._rafId) cancelAnimationFrame(this._rafId);
      window.removeEventListener("resize", this._onResize);
    }
  }

  global.LiveCandles = LiveCandles;
})(typeof window !== "undefined" ? window : this);
