/**
 * IRANCOiN 3D Brain — "AI Core" Hero Visual
 * ============================================
 * Human-like brain: two hemispheres, longitudinal fissure,
 * gyri/sulci folds, cerebellum, brainstem.
 *
 * CONSTANTS:
 *   ROTATION_PERIOD  — 26s per 360°
 *   PULSE_PERIOD     — 2.5s
 *   WOBBLE_DEG       — ±2°
 *   BOB_AMP          — [0.06, 0.14]
 *   BOB_FREQ         — [0.4, 0.8] Hz
 *   BLOOM_STRENGTH   — 0.7
 */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var container = document.getElementById("brain-3d-container");
  if (!container) return;

  var loaded = false;
  function boot() {
    if (loaded) return;
    loaded = true;
    if (window.THREE) { start(); return; }
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";
    s.async = true;
    s.onload = start;
    s.onerror = function () {
      container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><svg viewBox="0 0 200 165" width="100" height="80" style="opacity:.3"><use href="#ic-brand"/></svg></div>';
    };
    document.head.appendChild(s);
  }

  if ("IntersectionObserver" in window) {
    var iobs = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { boot(); iobs.disconnect(); }
    }, { rootMargin: "300px" });
    iobs.observe(container);
  } else { boot(); }

  // ====================================================================
  function start() {
    var THREE = window.THREE;
    var ROTATION_PERIOD = prefersReducedMotion ? 260 : 26;
    var ROTATION_SPEED = (2 * Math.PI) / ROTATION_PERIOD;
    var PULSE_PERIOD = 2.5;
    var WOBBLE_PERIOD = 10;
    var WOBBLE_DEG = 2;
    var BOB_AMP_MIN = prefersReducedMotion ? 0.02 : 0.06;
    var BOB_AMP_MAX = prefersReducedMotion ? 0.04 : 0.14;
    var BOB_FREQ_MIN = 0.4, BOB_FREQ_MAX = 0.8;
    var CAM_FOV = 40;

    var W = container.clientWidth || 500;
    var H = container.clientHeight || 500;

    // Scene
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0B0B14);

    var camera = new THREE.PerspectiveCamera(CAM_FOV, W / H, 0.1, 100);
    camera.position.set(0, 0.3, 5.0);

    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Bloom (non-critical)
    var composer = null;
    try {
      if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(new THREE.RenderPass(scene, camera));
        composer.addPass(new THREE.UnrealBloomPass(
          new THREE.Vector2(W, H), prefersReducedMotion ? 0.3 : 0.6, 0.4, 0.2
        ));
      }
    } catch (e) { composer = null; }

    // Lighting
    scene.add(new THREE.AmbientLight(0x443355, 0.8));
    var keyLight = new THREE.DirectionalLight(0xffeedd, 2.0);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    var fillLight = new THREE.DirectionalLight(0x9966cc, 0.8);
    fillLight.position.set(-4, 1, 3);
    scene.add(fillLight);
    var rimLight = new THREE.DirectionalLight(0x22d3ee, 1.0);
    rimLight.position.set(0, -3, -5);
    scene.add(rimLight);
    var topLight = new THREE.DirectionalLight(0xffccee, 0.5);
    topLight.position.set(0, 6, 0);
    scene.add(topLight);

    // ===== BRAIN GROUP =====
    var brainGroup = new THREE.Group();
    scene.add(brainGroup);

    // Inner pulsing lights
    var innerLight1 = new THREE.PointLight(0x7C3AED, 3, 3);
    innerLight1.position.set(0.4, 0.3, 0);
    brainGroup.add(innerLight1);
    var innerLight2 = new THREE.PointLight(0x22d3ee, 2, 2.5);
    innerLight2.position.set(-0.4, -0.2, 0.3);
    brainGroup.add(innerLight2);

    // ===== BRAIN GEOMETRY =====
    // Use SphereGeometry as base — easier to shape into brain
    var brainGeo = new THREE.SphereGeometry(1.2, 64, 48);
    var pos = brainGeo.attributes.position;
    var v = new THREE.Vector3();

    // Simplex-like noise
    function hash3(x, y, z) {
      var n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
      return n - Math.floor(n);
    }
    function noise3(x, y, z) {
      var ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
      var fx = x - ix, fy = y - iy, fz = z - iz;
      fx = fx * fx * (3 - 2 * fx);
      fy = fy * fy * (3 - 2 * fy);
      fz = fz * fz * (3 - 2 * fz);
      var a = hash3(ix,iy,iz), b = hash3(ix+1,iy,iz);
      var c = hash3(ix,iy+1,iz), d = hash3(ix+1,iy+1,iz);
      var e = hash3(ix,iy,iz+1), f = hash3(ix+1,iy,iz+1);
      var g = hash3(ix,iy+1,iz+1), h = hash3(ix+1,iy+1,iz+1);
      return a*(1-fx)*(1-fy)*(1-fz)+b*fx*(1-fy)*(1-fz)+
             c*(1-fx)*fy*(1-fz)+d*fx*fy*(1-fz)+
             e*(1-fx)*(1-fy)*fz+f*fx*(1-fy)*fz+
             g*(1-fx)*fy*fz+h*fx*fy*fz;
    }
    function fbm(x, y, z) {
      var val = 0, amp = 0.5, freq = 1;
      for (var i = 0; i < 5; i++) {
        val += amp * noise3(x*freq, y*freq, z*freq);
        amp *= 0.5; freq *= 2;
      }
      return val;
    }

    for (var i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // Original spherical coords
      var ox = v.x, oy = v.y, oz = v.z;
      var len = v.length();
      var un = v.clone().normalize();
      var nx = un.x, ny = un.y, nz = un.z;

      // === SHAPE: elongated brain ===
      // Front-back elongation (x-axis)
      var frontBack = 1.0 + 0.12 * Math.cos(Math.atan2(nz, nx) * 2);
      // Slightly wider at top
      var topWiden = ny > 0 ? 1.0 + 0.04 * ny : 1.0;
      // Flatten bottom slightly
      var flattenBottom = ny < -0.3 ? 1.0 - Math.abs(ny + 0.3) * 0.15 : 1.0;

      // === TWO HEMISPHERES with longitudinal fissure ===
      var fissure = 0;
      var distFromMid = Math.abs(nx);
      if (distFromMid < 0.08) {
        // Deep groove down the middle
        fissure = (1.0 - distFromMid / 0.08) * 0.18;
      }

      // === GYRI AND SULCI (brain folds) ===
      // Large folds (primary gyri)
      var gyri1 = fbm(nx * 3.5, ny * 3.5, nz * 3.5) * 0.12;
      // Medium folds (secondary sulci)
      var gyri2 = fbm(nx * 7 + 10, ny * 7 + 10, nz * 7 + 10) * 0.06;
      // Fine wrinkles
      var gyri3 = fbm(nx * 14 + 20, ny * 14 + 20, nz * 14 + 20) * 0.02;

      // === CEREBELLUM (back-bottom bump) ===
      var cerebellum = 0;
      var cbx = nx + 0.3; // offset to back
      var cby = ny + 0.6; // offset to bottom
      var cbDist = Math.sqrt(cbx*cbx + cby*cby + nz*nz);
      if (cbDist < 0.5) {
        cerebellum = (1.0 - cbDist / 0.5) * 0.25;
        // Cerebellum has finer folds
        cerebellum += fbm(nx*12+30, ny*12+30, nz*12+30) * 0.04 * (1.0 - cbDist/0.5);
      }

      // === BRAINSTEM (bottom center protrusion) ===
      var brainstem = 0;
      var bsx = nx, bsy = ny + 0.9, bsz = nz;
      var bsDist = Math.sqrt(bsx*bsx + bsy*bsy + bsz*bsz);
      if (bsDist < 0.3 && ny < -0.5) {
        brainstem = (1.0 - bsDist / 0.3) * 0.2;
      }

      // === Apply all displacements ===
      var displacement = 1.0 + gyri1 + gyri2 + gyri3 - fissure + cerebellum + brainstem;
      var scale = frontBack * topWiden * flattenBottom;

      v.normalize().multiplyScalar(len * displacement * scale);
      pos.setXYZ(i, v.x, v.y, v.z);
    }

    brainGeo.computeVertexNormals();

    // Material — brain-like pinkish with emissive
    var brainMat = new THREE.MeshPhysicalMaterial({
      color: 0x9B7070,
      roughness: 0.45,
      metalness: 0.02,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
      emissive: new THREE.Color(0x7C3AED),
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
    });

    // Fresnel rim-light via onBeforeCompile
    brainMat.onBeforeCompile = function (shader) {
      shader.uniforms.uFP = { value: 2.5 };
      shader.uniforms.uFI = { value: 1.5 };
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vWN; varying vec3 vWP;"
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvWN = normalize(mat3(modelMatrix) * normal); vWP = (modelMatrix * vec4(position,1.0)).xyz;"
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        "#include <common>\nuniform float uFP; uniform float uFI;"
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        "vec3 vd=normalize(cameraPosition-vWP); float fr=pow(1.0-max(dot(vd,vWN),0.0),uFP);\n" +
        "gl_FragColor.rgb += fr*uFI*vec3(0.486,0.227,0.929);\n#include <dithering_fragment>"
      );
    };

    brainGroup.add(new THREE.Mesh(brainGeo, brainMat));

    // Glow shell
    var glowMat = new THREE.MeshBasicMaterial({
      color: 0x7C3AED, transparent: true, opacity: 0.05, side: THREE.BackSide
    });
    brainGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.45, 32, 24), glowMat));

    // ===== FLOATING HALO (sibling — NOT child of brainGroup) =====
    var floatingGroup = new THREE.Group();
    scene.add(floatingGroup);
    var floatingItems = [];

    function rand(a, b) { return a + Math.random() * (b - a); }

    function addFloat(obj, pos) {
      obj.position.copy(pos);
      floatingGroup.add(obj);
      floatingItems.push({
        obj: obj,
        baseY: pos.y,
        amp: rand(BOB_AMP_MIN, BOB_AMP_MAX),
        freq: rand(BOB_FREQ_MIN, BOB_FREQ_MAX),
        phase: Math.random() * Math.PI * 2
      });
    }

    // Stat card
    function makeCard(label, value, hex) {
      var g = new THREE.Group();
      var bg = new THREE.Mesh(
        new THREE.PlaneGeometry(0.65, 0.38),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, side: THREE.DoubleSide })
      );
      g.add(bg);
      g.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.65, 0.38)),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 })
      ));
      var accent = new THREE.Mesh(
        new THREE.PlaneGeometry(0.65, 0.004),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), transparent: true, opacity: 0.7 })
      );
      accent.position.y = 0.18;
      g.add(accent);
      // Canvas text
      var cv = document.createElement("canvas");
      cv.width = 256; cv.height = 128;
      var cx = cv.getContext("2d");
      cx.clearRect(0, 0, 256, 128);
      cx.fillStyle = "#F5F5F7";
      cx.font = "bold 32px monospace";
      cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.fillText(value, 128, 42);
      cx.fillStyle = "rgba(245,245,247,0.55)";
      cx.font = "600 13px monospace";
      cx.fillText(label, 128, 82);
      var tm = new THREE.Mesh(
        new THREE.PlaneGeometry(0.58, 0.3),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, side: THREE.DoubleSide, depthWrite: false })
      );
      tm.position.z = 0.01;
      g.add(tm);
      return g;
    }

    // Candle glyph
    function makeCandle(up) {
      var g = new THREE.Group();
      var col = up ? 0x22D3EE : 0xF87171;
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.012), new THREE.MeshBasicMaterial({ color: 0x999999 })));
      var body = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.095, 0.028),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 })
      );
      body.position.y = -0.03;
      g.add(body);
      g.add(new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.12 })
      ));
      return g;
    }

    var stats = [
      { l: "SIGNAL", v: "+4.2%", c: "#22D3EE" },
      { l: "LATENCY", v: "4ms", c: "#34d399" },
      { l: "WIN RATE", v: "67.8%", c: "#ec4899" },
      { l: "RISK", v: "متوسط", c: "#fbbf24" },
      { l: "NEURONS", v: "80", c: "#7C3AED" },
      { l: "ACTIVE", v: "●", c: "#34d399" },
      { l: "DEPTH", v: "5L", c: "#ec4899" },
      { l: "FLOPS", v: "2.4T", c: "#22D3EE" },
    ];
    var count = W > 1024 ? 12 : W > 768 ? 8 : 5;
    var radius = 2.5;
    for (var fi = 0; fi < count; fi++) {
      var phi = Math.acos(1 - (2 * (fi + 0.5)) / count);
      var theta = Math.PI * (1 + Math.sqrt(5)) * fi;
      var pos2 = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
      var item = fi < stats.length ? makeCard(stats[fi].l, stats[fi].v, stats[fi].c) : makeCandle(fi % 2 === 0);
      addFloat(item, pos2);
    }

    // ===== PARTICLES =====
    var pCount = prefersReducedMotion ? 30 : 80;
    var pGeo = new THREE.BufferGeometry();
    var pPos = new Float32Array(pCount * 3);
    var pCol = new Float32Array(pCount * 3);
    var pSpd = [];
    var pal = [new THREE.Color(0x7C3AED), new THREE.Color(0x22d3ee), new THREE.Color(0xec4899)];
    for (var pi = 0; pi < pCount; pi++) {
      var pt = Math.random() * Math.PI * 2;
      var pp = Math.acos(2 * Math.random() - 1);
      var pr = 2.0 + Math.random() * 1.5;
      pPos[pi*3] = pr*Math.sin(pp)*Math.cos(pt);
      pPos[pi*3+1] = pr*Math.sin(pp)*Math.sin(pt);
      pPos[pi*3+2] = pr*Math.cos(pp);
      var pc = pal[pi % 3];
      pCol[pi*3] = pc.r; pCol[pi*3+1] = pc.g; pCol[pi*3+2] = pc.b;
      pSpd.push({ s: 0.002 + Math.random() * 0.005, r: pr, t: pt, p: pp, o: Math.random() * Math.PI * 2 });
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
    var particlesObj = new THREE.Points(pGeo, new THREE.PointsMaterial({
      size: 0.025, vertexColors: true, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(particlesObj);

    // ===== ANIMATION =====
    var clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      var dt = clock.getDelta();
      var t = clock.getElapsedTime();

      // Brain rotation
      brainGroup.rotation.y += ROTATION_SPEED * dt;
      brainGroup.rotation.x = Math.sin((t * Math.PI * 2) / WOBBLE_PERIOD) * THREE.MathUtils.degToRad(WOBBLE_DEG);

      // Pulse
      var pulse = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / PULSE_PERIOD);
      brainMat.emissiveIntensity = 0.15 + pulse * 0.4;
      innerLight1.intensity = 1.5 + pulse * 2.5;
      innerLight2.intensity = 1.0 + pulse * 2.0;
      glowMat.opacity = 0.03 + pulse * 0.04;

      // Floating bob + billboard
      for (var fi2 = 0; fi2 < floatingItems.length; fi2++) {
        var it = floatingItems[fi2];
        it.obj.position.y = it.baseY + Math.sin(t * it.freq * Math.PI * 2 + it.phase) * it.amp;
        it.obj.quaternion.copy(camera.quaternion);
      }

      // Particles
      var pa = particlesObj.geometry.attributes.position;
      for (var pi2 = 0; pi2 < pCount; pi2++) {
        var sp = pSpd[pi2]; sp.t += sp.s;
        var r = sp.r + Math.sin(t + sp.o) * 0.1;
        pa.array[pi2*3] = r * Math.sin(sp.p) * Math.cos(sp.t);
        pa.array[pi2*3+1] = r * Math.sin(sp.p) * Math.sin(sp.t);
        pa.array[pi2*3+2] = r * Math.cos(sp.p);
      }
      pa.needsUpdate = true;

      if (composer) composer.render(); else renderer.render(scene, camera);
    }
    animate();

    // Resize
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var w = container.clientWidth, h = container.clientHeight;
        camera.aspect = w / h; camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        if (composer) composer.setSize(w, h);
      }, 150);
    });
  }
})();
