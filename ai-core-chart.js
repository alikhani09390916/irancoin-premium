/**
 * ai-core-chart.js
 * ------------------------------------------------------------------
 * A live, continuously-forming candlestick chart in proper OHLC
 * (open/high/low/close) coordinates — not decorative static bars.
 * The rightmost candle visibly ticks and grows in real time; once its
 * duration elapses it locks in place and a new candle begins, with
 * the whole series scrolling smoothly (never in discrete jumps). A
 * soft drifting glow and synced-scrolling gridlines give it its own
 * moving background, and candle bodies use a glassy gradient + glow
 * for the floating/luxury look.
 *
 * Zero dependencies. Meant to sit inside a small floating glass panel
 * (see ai-core.css `.ai-core-chart-panel`), not as a full analytical
 * chart — it is a decorative-but-real "the AI is watching the market
 * live" widget.
 *
 * USAGE
 * -----
 *   <div class="ai-core-chart-panel">
 *     <div class="ai-core-chart-header">
 *       <span class="symbol">BTC/USDT</span>
 *       <span class="live-dot"></span>
 *       <span class="price" id="btc-price">$27,481.32</span>
 *     </div>
 *     <canvas id="btc-chart"></canvas>
 *   </div>
 *
 *   <script src="./ai-core-chart.js"></script>
 *   <script>
 *     const priceEl = document.getElementById('btc-price');
 *     new AICoreChart(document.getElementById('btc-chart'), {
 *       startPrice: 27450,
 *       onPriceUpdate: (p) => { priceEl.textContent = '$' + p.toFixed(2); },
 *     });
 *   </script>
 * ------------------------------------------------------------------
 */

(function (global) {
  "use strict";

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function prefersReducedMotion() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function roundedRectPath(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  class AICoreChart {
    constructor(canvas, userOptions) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");

      this.opts = Object.assign(
        {
          upColor: [31, 191, 159], // teal, matches the site's "up" candle color
          downColor: [244, 114, 182], // pink, matches the site's "down" candle color
          accentColor: [124, 58, 237],
          candleDurationSeconds: 2.2, // how long each candle takes to fully form
          candleWidthRatio: 0.6, // body width as a fraction of its slot
          visibleCandleTarget: 20, // roughly how many candles fit on screen
          maxCandles: 60, // trim history beyond this so memory stays flat
          startPrice: 100,
          volatility: 0.6,
          respectReducedMotion: true,
          onPriceUpdate: null, // (price:number) => void
        },
        userOptions || {}
      );

      this.reduced = this.opts.respectReducedMotion && prefersReducedMotion();

      this.firstIndex = 0;
      this.candles = [
        {
          open: this.opts.startPrice,
          high: this.opts.startPrice,
          low: this.opts.startPrice,
          close: this.opts.startPrice,
          done: false,
        },
      ];

      this.time = 0;
      this._lastT = null;
      this._rafId = null;
      this._disposed = false;

      this._smoothMin = this.opts.startPrice * 0.98;
      this._smoothMax = this.opts.startPrice * 1.02;

      this._onResize = this._resize.bind(this);
      window.addEventListener("resize", this._onResize);
      this._resize();

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

      this.unit = Math.min(40, Math.max(8, this.cssW / this.opts.visibleCandleTarget));
    }

    _tick(now) {
      if (this._disposed) return;
      if (this._lastT == null) this._lastT = now;
      const dt = Math.min((now - this._lastT) / 1000, 0.1);
      this._lastT = now;

      const speed = this.reduced ? 0.1 : 1;
      this.time += dt * speed;

      this._updateCandles(dt * speed);
      this._draw();
      this._rafId = requestAnimationFrame(this._tick);
    }

    _updateCandles(dt) {
      const duration = this.opts.candleDurationSeconds;
      const virtualIndex = this.time / duration;
      const curIndex = Math.floor(virtualIndex);
      const localIdx = curIndex - this.firstIndex;

      while (localIdx >= this.candles.length) {
        const prevClose = this.candles[this.candles.length - 1].close;
        this.candles.push({
          open: prevClose,
          high: prevClose,
          low: prevClose,
          close: prevClose,
          done: false,
        });
        if (this.candles.length >= 2) this.candles[this.candles.length - 2].done = true;
      }

      // live-tick the in-progress (rightmost) candle
      const cur = this.candles[this.candles.length - 1];
      const step = (Math.random() - 0.5) * this.opts.volatility * (dt * 10);
      cur.close = Math.max(0.01, cur.close + step);
      cur.high = Math.max(cur.high, cur.close);
      cur.low = Math.min(cur.low, cur.close);

      if (this.opts.onPriceUpdate) this.opts.onPriceUpdate(cur.close);

      if (this.candles.length > this.opts.maxCandles) {
        const removeCount = this.candles.length - this.opts.maxCandles;
        this.candles.splice(0, removeCount);
        this.firstIndex += removeCount;
      }
    }

    _draw() {
      const ctx = this.ctx;
      const w = this.cssW;
      const h = this.cssH;
      ctx.clearRect(0, 0, w, h);

      const [ar, ag, ab] = this.opts.accentColor;
      const duration = this.opts.candleDurationSeconds;
      const virtualIndex = this.time / duration;
      const unit = this.unit;
      const rightEdge = w - 8;

      // -- moving background: drifting ambient glow --
      const driftT = this.time * 0.15;
      const gx = w * (0.5 + 0.3 * Math.sin(driftT));
      const gy = h * (0.5 + 0.25 * Math.cos(driftT * 0.8));
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.65);
      glow.addColorStop(0, `rgba(${ar},${ag},${ab},0.10)`);
      glow.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // -- moving background: vertical gridlines, synced to the same scroll as the candles --
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      const frac = virtualIndex % 1;
      for (let g = 0; g < 14; g++) {
        const gxPos = rightEdge - frac * unit - g * unit * 3;
        if (gxPos < -unit) continue;
        ctx.beginPath();
        ctx.moveTo(gxPos, 0);
        ctx.lineTo(gxPos, h);
        ctx.stroke();
      }

      // -- static horizontal price gridlines --
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      for (let i = 1; i < 4; i++) {
        const y = (h / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // -- gather visible candles + smoothed price bounds (avoids jumpy rescaling) --
      let rawMin = Infinity;
      let rawMax = -Infinity;
      const visible = [];
      for (let i = 0; i < this.candles.length; i++) {
        const candleIndex = this.firstIndex + i;
        const x = rightEdge - (virtualIndex - candleIndex) * unit;
        if (x < -unit || x > w + unit) continue;
        const c = this.candles[i];
        rawMin = Math.min(rawMin, c.low);
        rawMax = Math.max(rawMax, c.high);
        visible.push({ x, c, isLast: i === this.candles.length - 1 });
      }
      if (!Number.isFinite(rawMin)) {
        rawMin = 0;
        rawMax = 1;
      }
      if (rawMax === rawMin) {
        rawMax += 1;
        rawMin -= 1;
      }
      const pad = (rawMax - rawMin) * 0.25;
      this._smoothMin = lerp(this._smoothMin, rawMin - pad, 0.06);
      this._smoothMax = lerp(this._smoothMax, rawMax + pad, 0.06);
      const span = this._smoothMax - this._smoothMin || 1;
      const priceToY = (p) => h - ((p - this._smoothMin) / span) * h;

      // -- candles: wick, then glassy gradient body with glow --
      const bodyW = unit * this.opts.candleWidthRatio;
      for (const v of visible) {
        const { x, c, isLast } = v;
        const up = c.close >= c.open;
        const [cr, cg, cb] = up ? this.opts.upColor : this.opts.downColor;

        const yHigh = priceToY(c.high);
        const yLow = priceToY(c.low);
        const yOpen = priceToY(c.open);
        const yClose = priceToY(c.close);
        const bodyTop = Math.min(yOpen, yClose);
        const bodyBottom = Math.max(yOpen, yClose);
        const bodyH = Math.max(2, bodyBottom - bodyTop);

        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.9)`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        const bodyGrad = ctx.createLinearGradient(0, bodyTop, 0, bodyBottom);
        bodyGrad.addColorStop(
          0,
          `rgba(${Math.min(255, cr + 60)},${Math.min(255, cg + 60)},${Math.min(255, cb + 60)},0.95)`
        );
        bodyGrad.addColorStop(1, `rgba(${cr},${cg},${cb},0.9)`);

        ctx.save();
        ctx.shadowColor = `rgba(${cr},${cg},${cb},${isLast ? 0.85 : 0.4})`;
        ctx.shadowBlur = isLast ? 14 : 6;
        ctx.fillStyle = bodyGrad;
        roundedRectPath(ctx, x - bodyW / 2, bodyTop, bodyW, bodyH, 2.5);
        ctx.fill();
        ctx.restore();

        if (isLast) {
          // bright outline on the in-progress candle — visibly "alive"
          ctx.strokeStyle = "rgba(255,255,255,0.65)";
          ctx.lineWidth = 1;
          roundedRectPath(ctx, x - bodyW / 2, bodyTop, bodyW, bodyH, 2.5);
          ctx.stroke();
        }
      }
    }

    dispose() {
      this._disposed = true;
      if (this._rafId) cancelAnimationFrame(this._rafId);
      window.removeEventListener("resize", this._onResize);
    }
  }

  global.AICoreChart = AICoreChart;
})(typeof window !== "undefined" ? window : this);
