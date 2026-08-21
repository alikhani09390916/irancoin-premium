# INTEGRATION PROMPT — paste this to Mimo v2.5 (OpenCode CLI)

You are integrating an **already-finished, already-tested** hero visual
into the existing "AI Core" (`هسته هوش مصنوعی`) section of this static
site. The files provided (`ai-core.js`, `ai-core.css`) are complete and
have already been verified to run correctly (see `smoke-test.js` — run
`node smoke-test.js` yourself right now if you want to confirm before
touching anything). **Do not rewrite, "improve," or regenerate them.**
This is a wiring task only. Unlike the previous attempts, this
implementation has **zero external dependencies** — no CDN, no import
map, no WebGL, no three.js — just one `<canvas>`, one script tag, and
one stylesheet.

## Files provided (copy them into the project, unchanged)

- `ai-core.js` — the rotating particle/neural sphere plus orbit rings
  and the inner core glow. Copy into the project's JS folder (e.g.
  `assets/js/ai-core.js`).
- `ai-core-chart.js` — a real, continuously-forming live candlestick
  (OHLC) chart with its own moving background glow and synced-scrolling
  gridlines. Used for the background market-data panels. Copy alongside
  `ai-core.js`.
- `ai-core-connectors.js` — draws the animated glowing cable/tube
  lines from the center hub (the IranCoin wordmark) out to every card
  and coin. Copy alongside `ai-core.js`.
- `ai-core.css` — styling for the canvas stage, the center wordmark
  hub, the cable lines, floating stat cards, coin badges, and the live
  chart panels. Copy into the project's CSS folder, or append its
  contents to the existing stylesheet.

## Steps

1. **Find** the current "AI Core" section markup and **delete** the old
   brain-rendering code entirely (any JS/Three.js/canvas code that
   builds the current broken visual). Do not merge or patch it.

2. Inside that section, build this structure exactly — it is what ties
   everything together (the hub, the cables, the cards, the live charts):
   ```html
   <div class="visual-wrap" id="visual-wrap">
     <!-- background market-data widgets — NOT connected by cable,
          purely ambient depth behind the core -->
     <div class="ai-core-chart-panel chart-a">
       <div class="ai-core-chart-header">
         <span class="symbol">BTC/USDT</span>
         <span class="live-dot"></span>
         <span class="price" id="btc-price">$0.00</span>
       </div>
       <canvas id="btc-chart-canvas"></canvas>
     </div>
     <div class="ai-core-chart-panel chart-b">
       <div class="ai-core-chart-header">
         <span class="symbol">ETH/USDT</span>
         <span class="live-dot"></span>
         <span class="price" id="eth-price">$0.00</span>
       </div>
       <canvas id="eth-chart-canvas"></canvas>
     </div>

     <div class="ai-core-stage" id="ai-core-stage">
       <canvas id="ai-core-canvas"></canvas>
     </div>

     <!-- the brand wordmark is the hub every cable connects to —
          do not replace this with a logo image; it must stay real
          text so it stays crisp and animatable -->
     <div class="ai-core-logo" data-ai-core-hub>
       <div class="wordmark">Iran<span class="accent">Coin</span></div>
       <div class="tagline">AI Trading Core</div>
     </div>

     <!-- every card/coin that should get a cable drawn to it needs
          data-ai-core-connect PLUS one position class from ai-core.css:
          pos-tl / pos-tr / pos-l / pos-r / pos-bl / pos-br -->
     <div class="ai-core-card pos-tl" data-ai-core-connect> ... </div>
     <div class="ai-core-card pos-tr" data-ai-core-connect> ... </div>
     <div class="ai-core-card pos-l"  data-ai-core-connect> ... </div>
     <div class="ai-core-card pos-r"  data-ai-core-connect> ... </div>
     <div class="ai-core-card pos-bl" data-ai-core-connect> ... </div>
     <div class="ai-core-card pos-br" data-ai-core-connect> ... </div>

     <div class="ai-core-coin btc" data-ai-core-connect>₿</div>
     <div class="ai-core-coin usdt" data-ai-core-connect>₮</div>
   </div>
   ```
   `preview.html` has the full working markup for each card (icon,
   label, value, subtitle, and an optional inline `<svg class="sparkline">`
   trend line) — copy that markup pattern exactly for each card, only
   changing the text/numbers.

   The `#visual-wrap` container needs `position: relative` and a real
   height (see the `.visual-wrap` rule in `preview.html`'s `<style>` —
   copy it into the site's stylesheet, adjusting the height to fit the
   section).

3. Link `ai-core.css` in `<head>` (or confirm its contents were merged
   into the existing stylesheet). Before `</body>`, add all three
   scripts in this exact order, then the init code:
   ```html
   <script src="./ai-core.js"></script>
   <script src="./ai-core-chart.js"></script>
   <script src="./ai-core-connectors.js"></script>
   <script>
     new AICore(document.getElementById('ai-core-canvas'));
     initAICoreConnectors(document.getElementById('visual-wrap'));

     const btcPriceEl = document.getElementById('btc-price');
     new AICoreChart(document.getElementById('btc-chart-canvas'), {
       startPrice: /* real current BTC price if available, else any number */ 27450,
       volatility: 40,
       onPriceUpdate: (p) => { btcPriceEl.textContent = '$' + p.toLocaleString('en-US', { maximumFractionDigits: 2 }); },
     });

     const ethPriceEl = document.getElementById('eth-price');
     new AICoreChart(document.getElementById('eth-chart-canvas'), {
       startPrice: 1842,
       volatility: 5,
       onPriceUpdate: (p) => { ethPriceEl.textContent = '$' + p.toLocaleString('en-US', { maximumFractionDigits: 2 }); },
     });
   </script>
   ```
   `initAICoreConnectors` must run AFTER the cards/coins/hub already
   exist in the DOM (it measures their real positions), so keep this
   script block after the markup from step 2, not before it.

   Note: `AICoreChart`'s live price is a simulated random walk seeded
   from `startPrice` — it is a decorative "market is alive" effect, not
   real market data. If the site has a real price feed, keep the visual
   the same but feed real ticks into `onPriceUpdate`'s target text
   instead of relying on the simulation — ask if unsure which the user
   wants before deciding.

4. **Reuse the site's real, live data** for each card's value/subtitle
   (market sentiment %, actual daily/weekly PnL, actual active-user
   count, actual risk level, etc.) — do not ship the sample numbers
   from `preview.html` to production. The `#user-counter` growth
   animation in `preview.html` is a demo pattern only; wire it to the
   site's real user-count source if one exists, or remove that
   `setInterval` block and just render the real static number.

5. Keep "IranCoin" as literal text inside `.wordmark`, not an image —
   that is intentional (it is the product's logo *and* the visual's
   center hub at the same time, per the design brief). Do not replace
   it with an `<img>`.

6. **Do not touch** anything outside the AI Core section — pricing
   page, login page, header/nav, ticker bar, etc. are unrelated.

## Verify before you say you're done

- [ ] `node smoke-test.js` (provided) passes with no errors — it now
      also checks `ai-core-chart.js` directly (valid OHLC candles,
      history trimming, survives resize).
- [ ] The page shows a glowing sphere made of small connected points,
      rotating continuously and smoothly around its own vertical axis,
      with two faint dashed rings orbiting around it independently.
- [ ] The "IranCoin" wordmark sits glowing at dead-center and gently
      pulses.
- [ ] A thin glowing cable runs from the IranCoin wordmark to every
      card and every coin, with a small bright dot continuously
      traveling along each cable.
- [ ] The two background chart panels (BTC/USDT, ETH/USDT) show real
      candlestick bars — wick + body, green/pink by direction — with
      the rightmost candle visibly ticking/growing, and the whole
      series scrolling smoothly leftward. The panel's own background
      (soft glow + gridlines) drifts/scrolls too, not just the candles.
      The price text in each panel's header updates continuously.
- [ ] No console errors on load.
- [ ] The floating cards/coins/chart-panels bob independently (pure
      CSS), and the cables stay correctly attached to the cards/coins
      as they bob.
- [ ] Resizing the window keeps the canvas, charts, AND the cables
      correctly positioned (no stretching, no cables pointing at empty
      space).
- [ ] On a throttled/mobile viewport it still runs smoothly.

If integration causes a console error, report the **exact error text**
back instead of silently changing `ai-core.js`, `ai-core-chart.js`, or
`ai-core-connectors.js` to work around it.
