/* IRANCOiN — SVG candlestick & line chart generators */
(function () {
  "use strict";

  function seededRand(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function trendPath(points, width, height, pad) {
    const step = (width - pad * 2) / (points.length - 1);
    let d = `M ${pad} ${height - pad - points[0] * (height - pad * 2)}`;
    for (let i = 1; i < points.length; i++) {
      const x = pad + i * step;
      const y = height - pad - points[i] * (height - pad * 2);
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  }

  function smoothPath(points, width, height, pad) {
    const step = (width - pad * 2) / (points.length - 1);
    let d = `M ${pad} ${height - pad - points[0] * (height - pad * 2)}`;
    for (let i = 1; i < points.length; i++) {
      const x = pad + i * step;
      const y = height - pad - points[i] * (height - pad * 2);
      const px = pad + (i - 1) * step;
      const py = height - pad - points[i - 1] * (height - pad * 2);
      const cx = (px + x) / 2;
      d += ` C ${cx.toFixed(1)} ${py.toFixed(1)}, ${cx.toFixed(1)} ${y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  }

  /* Candlestick chart */
  function renderCandles(el, opts) {
    if (!el) return;
    const o = Object.assign({
      seed: 42,
      count: 42,
      up: "#10B981",
      down: "#F43F5E",
      areaFrom: 0.35
    }, opts);

    const rnd = seededRand(o.seed);
    let price = 0.45;
    const candles = [];
    for (let i = 0; i < o.count; i++) {
      const drift = 0.5 + rnd();
      const open = price;
      const close = Math.max(0.06, Math.min(0.94, open + (rnd() - 0.48) * 0.1 * drift));
      const high = Math.min(0.97, Math.max(open, close) + rnd() * 0.03);
      const low = Math.max(0.03, Math.min(open, close) - rnd() * 0.03);
      candles.push({ open, close, high, low });
      price = close;
    }

    const W = 720, H = 320, padX = 10, padY = 18;
    const innerW = W - padX * 2, innerH = H - padY * 2;
    const step = innerW / candles.length;
    const bodyW = Math.max(3, step * 0.52);

    let svg = `<svg id="${el.id || ""}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="نمودار شمعی بازار">`;

    // horizontal grid
    svg += `<defs>
      <linearGradient id="candle-area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8B5CF6" stop-opacity="0.32"/>
        <stop offset="1" stop-color="#8B5CF6" stop-opacity="0"/>
      </linearGradient>
      <filter id="candle-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`;

    for (let g = 0; g <= 4; g++) {
      const y = padY + (innerH / 4) * g;
      svg += `<line x1="${padX}" y1="${y}" x2="${W - padX}" y2="${y}" stroke="#12142A" stroke-opacity="0.05" stroke-width="1"/>`;
    }

    const linePts = candles.map(c => c.close);
    // area under close line
    svg += `<path d="${smoothPath(linePts, W, H, padY)} L ${W - padX} ${H - padY} L ${padX} ${H - padY} Z" fill="url(#candle-area)"/>`;
    svg += `<path d="${smoothPath(linePts, W, H, padY)}" fill="none" stroke="#7C3AED" stroke-width="2.5" stroke-linecap="round" filter="url(#candle-glow)"/>`;

    // moving average
    const ma = [];
    const period = 7;
    for (let i = 0; i < candles.length; i++) {
      const from = Math.max(0, i - period + 1);
      let sum = 0;
      for (let j = from; j <= i; j++) sum += candles[j].close;
      ma.push(sum / (i - from + 1));
    }
    svg += `<path d="${smoothPath(ma, W, H, padY)}" fill="none" stroke="#06B6D4" stroke-width="1.8" stroke-dasharray="5 5" stroke-opacity="0.75" stroke-linecap="round"/>`;

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const x = padX + i * step + step / 2;
      const yHigh = padY + (1 - c.high) * innerH;
      const yLow = padY + (1 - c.low) * innerH;
      const yOpen = padY + (1 - c.open) * innerH;
      const yClose = padY + (1 - c.close) * innerH;
      const up = c.close >= c.open;
      const color = up ? o.up : o.down;
      const yTop = Math.min(yOpen, yClose);
      const hBody = Math.max(2.5, Math.abs(yClose - yOpen));

      svg += `<line x1="${x.toFixed(1)}" y1="${yHigh.toFixed(1)}" x2="${x.toFixed(1)}" y2="${yLow.toFixed(1)}" stroke="${color}" stroke-width="1.6" stroke-opacity="0.75"/>`;
      svg += `<rect x="${(x - bodyW / 2).toFixed(1)}" y="${yTop.toFixed(1)}" width="${bodyW.toFixed(1)}" height="${hBody.toFixed(1)}" rx="1.5" fill="${color}" fill-opacity="0.9"/>`;
      if (up) {
        svg += `<rect x="${(x - bodyW / 2).toFixed(1)}" y="${yTop.toFixed(1)}" width="${bodyW.toFixed(1)}" height="${(hBody * 0.28).toFixed(1)}" rx="1.5" fill="#FFFFFF" fill-opacity="0.5"/>`;
      }
    }

    svg += `</svg>`;
    el.innerHTML = svg;

    // animate line draw
    const path = el.querySelector("path[stroke='#7C3AED']");
    if (path && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.getBoundingClientRect();
      path.style.transition = "stroke-dashoffset 1.8s cubic-bezier(0.22,1,0.36,1) 0.3s";
      path.style.strokeDashoffset = "0";
    }
  }

  /* Mini sparkline (single path) */
  function renderSpark(el, opts) {
    if (!el) return;
    const o = Object.assign({ seed: 7, count: 30, up: true }, opts);
    const rnd = seededRand(o.seed);
    const pts = [];
    let v = 0.5;
    for (let i = 0; i < o.count; i++) {
      v = Math.max(0.1, Math.min(0.9, v + (rnd() - (o.up ? 0.44 : 0.56)) * 0.14));
      pts.push(v);
    }
    const W = 120, H = 40;
    const color = o.up ? "#10B981" : "#F43F5E";
    const d = smoothPath(pts, W, H, 3);
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-${o.seed}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${color}" stop-opacity="0.35"/>
          <stop offset="1" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${d} L ${W - 3} ${H - 3} L 3 ${H - 3} Z" fill="url(#spark-${o.seed})"/>
      <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="${W - 3}" cy="${(H - 3 - pts[pts.length - 1] * (H - 6)).toFixed(1)}" r="2.6" fill="${color}"/>
    </svg>`;
  }

  /* Donut gauge for risk */
  function renderGauge(el, value, opts) {
    if (!el) return;
    const o = Object.assign({ label: "", color: "#7C3AED", track: "#E4E7F3" }, opts);
    const v = Math.max(0, Math.min(1, value));
    const R = 80;
    const C = Math.PI * R; // half circle
    const finalDash = `${(C * v).toFixed(1)} ${(C - C * v).toFixed(1)}`;
    el.innerHTML = `<svg viewBox="0 0 220 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${o.label}">
      <path d="M 30 110 A 80 80 0 0 1 190 110" fill="none" stroke="${o.track}" stroke-width="16" stroke-linecap="round"/>
      <path d="M 30 110 A 80 80 0 0 1 190 110" fill="none" stroke="${o.color}" stroke-width="16" stroke-linecap="round"
        stroke-dasharray="0 ${C.toFixed(1)}"
        style="transition: stroke-dasharray 1.4s cubic-bezier(0.22,1,0.36,1) 0.4s"/>
    </svg>`;
    const arc = el.querySelector("path:last-child");
    if (!arc) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      arc.setAttribute("stroke-dasharray", finalDash);
      return;
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        arc.setAttribute("stroke-dasharray", finalDash);
      });
    });
  }

  window.IRANCOINCharts = { renderCandles, renderSpark, renderGauge };
})();