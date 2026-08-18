/**
 * IRANCOiN 3D Brain — "AI Core" Hero Visual
 * ============================================
 * Per 01_MASTER_PROMPT.md — cinematic WebGL brain with floating halo
 *
 * TUNABLE CONSTANTS:
 *   ROTATION_PERIOD_SECONDS  — 26s per 360° (range: 22–30)
 *   PULSE_PERIOD_SECONDS     — 2.5s breathing cycle (range: 2.2–2.8)
 *   WOBBLE_PERIOD_SECONDS    — 10s secondary tilt (range: 9–12)
 *   WOBBLE_DEG               — ±2° tilt amplitude
 *   BOB_AMPLITUDE_RANGE      — [0.06, 0.14] world units
 *   BOB_FREQUENCY_RANGE      — [0.4, 0.8] Hz
 *   BLOOM_STRENGTH           — 0.7 (range: 0.6–0.9)
 *   BLOOM_RADIUS             — 0.4
 *   BLOOM_THRESHOLD          — 0.15
 *   CAMERA_FOV               — 40° (range: 35–45)
 */
(function () {
  "use strict";

  // ===== REDUCED MOTION =====
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var container = document.getElementById("brain-3d-container");
  if (!container) return;

  // ===== LAZY LOAD =====
  var brainLoaded = false;
  function loadBrain() {
    if (brainLoaded) return;
    brainLoaded = true;
    if (window.THREE) { initBrain(container); return; }
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";
    s.async = true;
    s.onload = function () {
      // Load post-processing
      var bloom = document.createElement("script");
      bloom.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/postprocessing/EffectComposer.js";
      bloom.async = true;
      bloom.onload = function () {
        var rp = document.createElement("script");
        rp.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/postprocessing/RenderPass.js";
        rp.async = true;
        rp.onload = function () {
          var bp = document.createElement("script");
          bp.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/postprocessing/UnrealBloomPass.js";
          bp.async = true;
          bp.onload = function () {
            var sp = document.createElement("script");
            sp.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/shaders/LuminosityHighPassShader.js";
            sp.async = true;
            sp.onload = function () {
              var cop = document.createElement("script");
              cop.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/shaders/CopyShader.js";
              cop.async = true;
              cop.onload = function () { initBrain(container); };
              document.head.appendChild(cop);
            };
            document.head.appendChild(sp);
          };
          document.head.appendChild(bp);
        };
        document.head.appendChild(rp);
      };
      document.head.appendChild(bloom);
    };
    s.onerror = function () {
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:radial-gradient(circle,rgba(124,58,237,.12),transparent)"><svg viewBox="0 0 200 165" width="100" height="80" style="opacity:.3"><use href="#ic-brand"/></svg></div>';
    };
    document.head.appendChild(s);
  }

  if ("IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { loadBrain(); obs.disconnect(); }
    }, { rootMargin: "300px" });
    obs.observe(container);
  } else { loadBrain(); }

  // ====================================================================
  // MAIN INIT
  // ====================================================================
  function initBrain(container) {
    var THREE = window.THREE;

    // ===== CONSTANTS =====
    var ROTATION_PERIOD = prefersReducedMotion ? 260 : 26;
    var ROTATION_SPEED = (2 * Math.PI) / ROTATION_PERIOD;
    var PULSE_PERIOD = 2.5;
    var WOBBLE_PERIOD = 10;
    var WOBBLE_DEG = 2;
    var BOB_AMP = [0.06, 0.14];
    var BOB_FREQ = [0.4, 0.8];
    var BLOOM_STRENGTH = prefersReducedMotion ? 0.3 : 0.7;
    var BLOOM_RADIUS = 0.4;
    var BLOOM_THRESHOLD = 0.15;
    var CAMERA_FOV = 40;

    // ===== SCENE =====
    var W = container.clientWidth || 500;
    var H = container.clientHeight || 500;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0B0B14);

    var camera = new THREE.PerspectiveCamera(CAMERA_FOV, W / H, 0.1, 100);
    camera.position.set(0, 0.2, 5.2);

    var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // ===== POST-PROCESSING (Bloom) =====
    var composer = null;
    if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
      composer = new THREE.EffectComposer(renderer);
      composer.addPass(new THREE.RenderPass(scene, camera));
      var bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(W, H), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD
      );
      composer.addPass(bloomPass);
    }

    // ===== LIGHTING =====
    var ambientLight = new THREE.AmbientLight(0x332244, 0.5);
    scene.add(ambientLight);

    var keyLight = new THREE.DirectionalLight(0xffeedd, 1.5);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    var fillLight = new THREE.DirectionalLight(0x7C3AED, 0.6);
    fillLight.position.set(-3, 0, 3);
    scene.add(fillLight);

    var rimLight = new THREE.DirectionalLight(0x22d3ee, 0.8);
    rimLight.position.set(0, -2, -4);
    scene.add(rimLight);

    // ===== 1) BRAIN GROUP (rotation only) =====
    var brainGroup = new THREE.Group();
    scene.add(brainGroup);

    // Inner pulsing lights (firing synapses)
    var innerLight1 = new THREE.PointLight(0x7C3AED, 2, 3);
    innerLight1.position.set(0.3, 0.2, 0);
    brainGroup.add(innerLight1);

    var innerLight2 = new THREE.PointLight(0x22d3ee, 1.5, 2.5);
    innerLight2.position.set(-0.3, -0.1, 0.2);
    brainGroup.add(innerLight2);

    // ===== BRAIN GEOMETRY =====
    // IcosahedronGeometry subdivision 5 → ~5000 faces, smooth
    var brainGeo = new THREE.IcosahedronGeometry(1.3, 5);
    var posAttr = brainGeo.attributes.position;
    var vertex = new THREE.Vector3();

    // Simplex-like noise
    function hash3(x, y, z) {
      var n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
      return n - Math.floor(n);
    }

    function smoothNoise(x, y, z) {
      var ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
      var fx = x - ix, fy = y - iy, fz = z - iz;
      fx = fx * fx * (3 - 2 * fx);
      fy = fy * fy * (3 - 2 * fy);
      fz = fz * fz * (3 - 2 * fz);
      var a = hash3(ix, iy, iz), b = hash3(ix + 1, iy, iz);
      var c = hash3(ix, iy + 1, iz), d = hash3(ix + 1, iy + 1, iz);
      var e = hash3(ix, iy, iz + 1), f = hash3(ix + 1, iy, iz + 1);
      var g = hash3(ix, iy + 1, iz + 1), h = hash3(ix + 1, iy + 1, iz + 1);
      return a*(1-fx)*(1-fy)*(1-fz) + b*fx*(1-fy)*(1-fz) + c*(1-fx)*fy*(1-fz) + d*fx*fy*(1-fz) +
        e*(1-fx)*(1-fy)*fz + f*fx*(1-fy)*fz + g*(1-fx)*fy*fz + h*fx*fy*fz;
    }

    function fbm(x, y, z) {
      var v = 0, a = 0.5, freq = 1;
      for (var i = 0; i < 6; i++) {
        v += a * smoothNoise(x * freq, y * freq, z * freq);
        a *= 0.5; freq *= 2.0;
      }
      return v;
    }

    // Displace vertices along normals for brain folds
    for (var i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);
      var len = vertex.length();
      var un = vertex.clone().normalize();

      // Large folds (gyri/sulci)
      var folds = fbm(un.x * 3.5, un.y * 3.5, un.z * 3.5) * 0.20;
      // Medium wrinkles
      var wrinkles = fbm(un.x * 7, un.y * 7, un.z * 7) * 0.07;
      // Fine texture
      var fine = fbm(un.x * 14, un.y * 14, un.z * 14) * 0.025;

      // Central fissure (hemisphere split)
      var fissure = Math.exp(-Math.pow(vertex.x * 10, 2)) * 0.10;
      fissure *= 1 + Math.abs(vertex.y) * 0.3;

      // Brain shape tweaks
      var elongation = 1 + 0.06 * Math.cos(Math.atan2(vertex.z, vertex.x) * 2);
      var bottomFlat = vertex.y < -0.8 ? (1 - (Math.abs(vertex.y) - 0.8) * 0.25) : 1;

      var scale = (1 + folds + wrinkles + fine - fissure) * elongation * bottomFlat;
      vertex.normalize().multiplyScalar(len * scale);
      posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    brainGeo.computeVertexNormals();

    // ===== BRAIN MATERIAL — MeshPhysicalMaterial with fresnel =====
    var brainMat = new THREE.MeshPhysicalMaterial({
      color: 0x8B6F6B,
      roughness: 0.4,
      metalness: 0.05,
      clearcoat: 0.4,
      clearcoatRoughness: 0.3,
      emissive: new THREE.Color(0x7C3AED),
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    });

    // Fresnel/rim-light via onBeforeCompile
    brainMat.onBeforeCompile = function (shader) {
      shader.uniforms.uFresnelPower = { value: 2.5 };
      shader.uniforms.uFresnelIntensity = { value: 1.2 };
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        "#include <common>\n varying vec3 vWorldNormal; varying vec3 vWorldPos;"
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        "#include <common>\n vWorldNormal = normalize(mat3(modelMatrix) * normal); vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;"
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        "#include <common>\n uniform float uFresnelPower; uniform float uFresnelIntensity;"
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        "vec3 viewDir = normalize(cameraPosition - vWorldPos);\n float fresnel = pow(1.0 - max(dot(viewDir, vWorldNormal), 0.0), uFresnelPower);\n gl_FragColor.rgb += gl_FragColor.rgb * fresnel * uFresnelIntensity * vec3(0.486, 0.227, 0.929);\n #include <dithering_fragment>"
      );
      brainMat.userData.shader = shader;
    };

    var brainMesh = new THREE.Mesh(brainGeo, brainMat);
    brainGroup.add(brainMesh);

    // ===== GLOW SHELL =====
    var glowGeo = new THREE.IcosahedronGeometry(1.5, 4);
    var glowMat = new THREE.MeshBasicMaterial({
      color: 0x7C3AED, transparent: true, opacity: 0.04, side: THREE.BackSide,
    });
    brainGroup.add(new THREE.Mesh(glowGeo, glowMat));

    // ===== 2) FLOATING HALO (sibling group — NOT child of brainGroup) =====
    var floatingGroup = new THREE.Group();
    scene.add(floatingGroup);

    var floatingItems = [];

    function addFloatingItem(obj3D, basePos) {
      obj3D.position.copy(basePos);
      floatingGroup.add(obj3D);
      floatingItems.push({
        obj: obj3D,
        baseY: basePos.y,
        amplitude: randFloat(BOB_AMP[0], BOB_AMP[1]),
        frequency: randFloat(BOB_FREQ[0], BOB_FREQ[1]),
        phase: Math.random() * Math.PI * 2,
      });
    }

    function randFloat(min, max) { return min + Math.random() * (max - min); }

    // ===== STAT CARDS (glassmorphism) =====
    function makeStatCard(label, value, accentColor) {
      var group = new THREE.Group();

      // Card plane
      var cardGeo = new THREE.PlaneGeometry(0.55, 0.32);
      var cardMat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.06, side: THREE.DoubleSide,
      });
      var card = new THREE.Mesh(cardGeo, cardMat);
      group.add(card);

      // Border
      var borderGeo = new THREE.EdgesGeometry(cardGeo);
      var borderMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 });
      group.add(new THREE.LineSegments(borderGeo, borderMat));

      // Accent glow line
      var lineGeo = new THREE.PlaneGeometry(0.55, 0.003);
      var lineMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(accentColor), transparent: true, opacity: 0.5,
      });
      var line = new THREE.Mesh(lineGeo, lineMat);
      line.position.y = 0.155;
      group.add(line);

      // Canvas texture for text
      var canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 128;
      var ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, 256, 128);

      // Value
      ctx.fillStyle = "#F5F5F7";
      ctx.font = "bold 28px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(value, 128, 55);

      // Label
      ctx.fillStyle = "rgba(245,245,247,0.6)";
      ctx.font = "600 13px JetBrains Mono, monospace";
      ctx.fillText(label, 128, 85);

      var tex = new THREE.CanvasTexture(canvas);
      var textGeo = new THREE.PlaneGeometry(0.5, 0.25);
      var textMat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false,
      });
      var textMesh = new THREE.Mesh(textGeo, textMat);
      textMesh.position.z = 0.01;
      group.add(textMesh);

      return group;
    }

    // ===== CANDLE GLYPH =====
    function makeCandleGlyph(bullish) {
      var group = new THREE.Group();
      var color = bullish ? 0x22D3EE : 0xF87171;

      // Wick
      var wickGeo = new THREE.BoxGeometry(0.008, 0.12, 0.008);
      var wickMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
      var wick = new THREE.Mesh(wickGeo, wickMat);
      wick.position.y = 0.06;
      group.add(wick);

      // Body
      var bodyGeo = new THREE.BoxGeometry(0.04, 0.08, 0.02);
      var bodyMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
      var body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = -0.02;
      group.add(body);

      // Glow
      var glowGeo = new THREE.SphereGeometry(0.06, 8, 8);
      var glowMat = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 0.15,
      });
      var glow = new THREE.Mesh(glowGeo, glowMat);
      group.add(glow);

      return group;
    }

    // ===== DISTRIBUTE FLOATING ITEMS =====
    var statData = [
      { label: "SIGNAL", value: "+4.2%", color: "#22D3EE" },
      { label: "LATENCY", value: "4ms", color: "#34d399" },
      { label: "WIN RATE", value: "67.8%", color: "#ec4899" },
      { label: "RISK", value: "متوسط", color: "#fbbf24" },
      { label: "NEURONS", value: "80", color: "#7C3AED" },
      { label: "ACTIVE", value: "●", color: "#34d399" },
      { label: "DEPTH", value: "5L", color: "#ec4899" },
      { label: "FLOPS", value: "2.4T", color: "#22D3EE" },
    ];

    // Responsive count
    var itemCount = W > 1024 ? 12 : W > 768 ? 8 : 5;
    var totalItems = Math.min(itemCount, statData.length + 4); // +4 for candles

    var radius = 2.4;
    for (var fi = 0; fi < totalItems; fi++) {
      var phi = Math.acos(1 - (2 * (fi + 0.5)) / totalItems);
      var theta = Math.PI * (1 + Math.sqrt(5)) * fi;
      var pos = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );

      var item;
      if (fi < statData.length) {
        var sd = statData[fi];
        item = makeStatCard(sd.label, sd.value, sd.color);
      } else {
        item = makeCandleGlyph(fi % 2 === 0);
      }
      addFloatingItem(item, pos);
    }

    // ===== PARTICLES (subtle background) =====
    var pCount = prefersReducedMotion ? 30 : 80;
    var pGeo = new THREE.BufferGeometry();
    var pPos = new Float32Array(pCount * 3);
    var pCol = new Float32Array(pCount * 3);
    var pSpeeds = [];
    var palette = [
      new THREE.Color(0x7C3AED),
      new THREE.Color(0x22d3ee),
      new THREE.Color(0xec4899),
    ];
    for (var pi = 0; pi < pCount; pi++) {
      var pt = Math.random() * Math.PI * 2;
      var pp = Math.acos(2 * Math.random() - 1);
      var pr = 2.0 + Math.random() * 1.5;
      pPos[pi * 3] = pr * Math.sin(pp) * Math.cos(pt);
      pPos[pi * 3 + 1] = pr * Math.sin(pp) * Math.sin(pt);
      pPos[pi * 3 + 2] = pr * Math.cos(pp);
      var pc = palette[pi % 3];
      pCol[pi * 3] = pc.r; pCol[pi * 3 + 1] = pc.g; pCol[pi * 3 + 2] = pc.b;
      pSpeeds.push({ speed: 0.002 + Math.random() * 0.005, r: pr, t: pt, p: pp, off: Math.random() * 6.28 });
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
    var pMat = new THREE.PointsMaterial({
      size: 0.025, vertexColors: true, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(new THREE.Points(pGeo, pMat));

    // ===== 3) ANIMATION LOOP =====
    var clock = new THREE.Clock();
    var animating = true;

    var visObs = new IntersectionObserver(function (e) { animating = e[0].isIntersecting; });
    visObs.observe(container);

    function animate() {
      requestAnimationFrame(animate);
      if (!animating) return;

      var dt = clock.getDelta();
      var t = clock.getElapsedTime();

      // --- Brain rotation: constant, infinite, delta-time ---
      brainGroup.rotation.y += ROTATION_SPEED * dt;

      // Small organic wobble
      brainGroup.rotation.x = Math.sin((t * 2 * Math.PI) / WOBBLE_PERIOD) * THREE.MathUtils.degToRad(WOBBLE_DEG);

      // --- Brain pulse: emissive + inner lights ---
      var pulse = 0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / PULSE_PERIOD);
      brainMat.emissiveIntensity = 0.15 + pulse * 0.45;
      innerLight1.intensity = 1.0 + pulse * 2.0;
      innerLight2.intensity = 0.8 + pulse * 1.5;
      glowMat.opacity = 0.03 + pulse * 0.03;

      // --- Floating halo: independent bob + billboard ---
      for (var fi2 = 0; fi2 < floatingItems.length; fi2++) {
        var item = floatingItems[fi2];
        item.obj.position.y = item.baseY + Math.sin(t * item.frequency * 2 * Math.PI + item.phase) * item.amplitude;
        item.obj.quaternion.copy(camera.quaternion); // billboard
      }

      // --- Particles orbit ---
      var pp2 = scene.children.find(function (c) { return c.isPoints; });
      if (pp2) {
        var pa = pp2.geometry.attributes.position;
        for (var pi2 = 0; pi2 < pCount; pi2++) {
          var sp = pSpeeds[pi2];
          sp.t += sp.speed;
          var r = sp.r + Math.sin(t + sp.off) * 0.1;
          pa.array[pi2 * 3] = r * Math.sin(sp.p) * Math.cos(sp.t);
          pa.array[pi2 * 3 + 1] = r * Math.sin(sp.p) * Math.sin(sp.t);
          pa.array[pi2 * 3 + 2] = r * Math.cos(sp.p);
        }
        pa.needsUpdate = true;
      }

      // Render
      if (composer) { composer.render(); }
      else { renderer.render(scene, camera); }
    }
    animate();

    // ===== RESIZE =====
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var w = container.clientWidth;
        var h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        if (composer) composer.setSize(w, h);
      }, 150);
    });
  }
})();
