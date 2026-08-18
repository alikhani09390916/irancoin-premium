/**
 * IRANCOiN 3D Brain — "AI Core" Hero Visual
 * ============================================
 * Robust: renders brain even if post-processing fails
 *
 * CONSTANTS:
 *   ROTATION_PERIOD  — 26s per 360°
 *   PULSE_PERIOD     — 2.5s
 *   WOBBLE_PERIOD    — 10s
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

  // ===== LAZY LOAD =====
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
    var obs = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { boot(); obs.disconnect(); }
    }, { rootMargin: "300px" });
    obs.observe(container);
  } else { boot(); }

  // ====================================================================
  function start() {
    var THREE = window.THREE;
    var ROTATION_PERIOD = prefersReducedMotion ? 260 : 26;
    var ROTATION_SPEED = (2 * Math.PI) / ROTATION_PERIOD;
    var PULSE_PERIOD = 2.5;
    var WOBBLE_PERIOD = 10;
    var WOBBLE_DEG = 2;
    var BOB_AMP = prefersReducedMotion ? [0.02, 0.04] : [0.06, 0.14];
    var BOB_FREQ = [0.4, 0.8];
    var CAM_FOV = 40;

    var W = container.clientWidth || 500;
    var H = container.clientHeight || 500;

    // Scene
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0B0B14);

    var camera = new THREE.PerspectiveCamera(CAM_FOV, W / H, 0.1, 100);
    camera.position.set(0, 0.2, 5.2);

    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Try bloom (non-blocking)
    var composer = null;
    try {
      if (THREE.EffectComposer) {
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(new THREE.RenderPass(scene, camera));
        if (THREE.UnrealBloomPass) {
          composer.addPass(new THREE.UnrealBloomPass(
            new THREE.Vector2(W, H), prefersReducedMotion ? 0.3 : 0.7, 0.4, 0.15
          ));
        }
      }
    } catch (e) { composer = null; }

    // Lighting
    scene.add(new THREE.AmbientLight(0x332244, 0.5));
    var keyLight = new THREE.DirectionalLight(0xffeedd, 1.5);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    var fillLight = new THREE.DirectionalLight(0x7C3AED, 0.6);
    fillLight.position.set(-3, 0, 3);
    scene.add(fillLight);
    var rimLight = new THREE.DirectionalLight(0x22d3ee, 0.8);
    rimLight.position.set(0, -2, -4);
    scene.add(rimLight);

    // ===== 1) BRAIN =====
    var brainGroup = new THREE.Group();
    scene.add(brainGroup);

    var innerLight1 = new THREE.PointLight(0x7C3AED, 2, 3);
    innerLight1.position.set(0.3, 0.2, 0);
    brainGroup.add(innerLight1);
    var innerLight2 = new THREE.PointLight(0x22d3ee, 1.5, 2.5);
    innerLight2.position.set(-0.3, -0.1, 0.2);
    brainGroup.add(innerLight2);

    // Geometry
    var brainGeo = new THREE.IcosahedronGeometry(1.3, 5);
    var posAttr = brainGeo.attributes.position;
    var vtx = new THREE.Vector3();

    function hash3(x, y, z) {
      var n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
      return n - Math.floor(n);
    }
    function noise3(x, y, z) {
      var ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
      var fx = x - ix, fy = y - iy, fz = z - iz;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
      var a = hash3(ix,iy,iz), b = hash3(ix+1,iy,iz), c = hash3(ix,iy+1,iz), d = hash3(ix+1,iy+1,iz);
      var e = hash3(ix,iy,iz+1), f = hash3(ix+1,iy,iz+1), g = hash3(ix,iy+1,iz+1), h = hash3(ix+1,iy+1,iz+1);
      return a*(1-fx)*(1-fy)*(1-fz)+b*fx*(1-fy)*(1-fz)+c*(1-fx)*fy*(1-fz)+d*fx*fy*(1-fz)+
        e*(1-fx)*(1-fy)*fz+f*fx*(1-fy)*fz+g*(1-fx)*fy*fz+h*fx*fy*fz;
    }
    function fbm(x, y, z) {
      var v = 0, a = 0.5, f = 1;
      for (var i = 0; i < 6; i++) { v += a * noise3(x*f, y*f, z*f); a *= 0.5; f *= 2; }
      return v;
    }

    for (var i = 0; i < posAttr.count; i++) {
      vtx.fromBufferAttribute(posAttr, i);
      var len = vtx.length();
      var un = vtx.clone().normalize();
      var folds = fbm(un.x*3.5, un.y*3.5, un.z*3.5) * 0.20;
      var wrinkles = fbm(un.x*7, un.y*7, un.z*7) * 0.07;
      var fine = fbm(un.x*14, un.y*14, un.z*14) * 0.025;
      var fissure = Math.exp(-Math.pow(vtx.x*10, 2)) * 0.10 * (1 + Math.abs(vtx.y)*0.3);
      var elong = 1 + 0.06 * Math.cos(Math.atan2(vtx.z, vtx.x) * 2);
      var btm = vtx.y < -0.8 ? (1 - (Math.abs(vtx.y)-0.8)*0.25) : 1;
      vtx.normalize().multiplyScalar(len * (1 + folds + wrinkles + fine - fissure) * elong * btm);
      posAttr.setXYZ(i, vtx.x, vtx.y, vtx.z);
    }
    brainGeo.computeVertexNormals();

    // Material with fresnel
    var brainMat = new THREE.MeshPhysicalMaterial({
      color: 0x8B6F6B, roughness: 0.4, metalness: 0.05,
      clearcoat: 0.4, clearcoatRoughness: 0.3,
      emissive: new THREE.Color(0x7C3AED), emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    });
    brainMat.onBeforeCompile = function (shader) {
      shader.uniforms.uFP = { value: 2.5 };
      shader.uniforms.uFI = { value: 1.2 };
      shader.vertexShader = shader.vertexShader.replace("#include <common>",
        "#include <common>\nvarying vec3 vWN; varying vec3 vWP;");
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>",
        "#include <begin_vertex>\nvWN = normalize(mat3(modelMatrix) * normal); vWP = (modelMatrix * vec4(position,1.0)).xyz;");
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>",
        "#include <common>\nuniform float uFP; uniform float uFI;");
      shader.fragmentShader = shader.fragmentShader.replace("#include <dithering_fragment>",
        "vec3 vd=normalize(cameraPosition-vWP); float fr=pow(1.0-max(dot(vd,vWN),0.0),uFP);\n"+
        "gl_FragColor.rgb += gl_FragColor.rgb*fr*uFI*vec3(0.486,0.227,0.929);\n#include <dithering_fragment>");
    };
    brainGroup.add(new THREE.Mesh(brainGeo, brainMat));

    // Glow shell
    var glowMat = new THREE.MeshBasicMaterial({ color: 0x7C3AED, transparent: true, opacity: 0.04, side: THREE.BackSide });
    brainGroup.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 4), glowMat));

    // ===== 2) FLOATING HALO (sibling!) =====
    var floatingGroup = new THREE.Group();
    scene.add(floatingGroup);
    var floatingItems = [];

    function addFloat(obj, pos) {
      obj.position.copy(pos);
      floatingGroup.add(obj);
      var amp = rand(BOB_AMP[0], BOB_AMP[1]);
      floatingItems.push({ obj: obj, baseY: pos.y, amp: amp, freq: rand(BOB_FREQ[0], BOB_FREQ[1]), phase: Math.random()*6.28 });
    }
    function rand(a, b) { return a + Math.random() * (b - a); }

    // Stat cards
    function makeCard(label, value, hex) {
      var g = new THREE.Group();
      // Background
      var bg = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.35),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, side: THREE.DoubleSide })
      );
      g.add(bg);
      // Border
      g.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.6, 0.35)),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })
      ));
      // Accent line
      var line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.004),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), transparent: true, opacity: 0.6 })
      );
      line.position.y = 0.17;
      g.add(line);
      // Canvas text
      var cv = document.createElement("canvas");
      cv.width = 256; cv.height = 128;
      var cx = cv.getContext("2d");
      cx.clearRect(0, 0, 256, 128);
      cx.fillStyle = "#F5F5F7";
      cx.font = "bold 30px monospace";
      cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.fillText(value, 128, 45);
      cx.fillStyle = "rgba(245,245,247,0.6)";
      cx.font = "600 13px monospace";
      cx.fillText(label, 128, 82);
      var tm = new THREE.Mesh(
        new THREE.PlaneGeometry(0.55, 0.28),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, side: THREE.DoubleSide, depthWrite: false })
      );
      tm.position.z = 0.01;
      g.add(tm);
      return g;
    }

    // Candle glyph
    function makeCandle(up) {
      var g = new THREE.Group();
      var c = up ? 0x22D3EE : 0xF87171;
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.14, 0.01), new THREE.MeshBasicMaterial({ color: 0x888888 })));
      var body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.025), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85 }));
      body.position.y = -0.03;
      g.add(body);
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.12 })));
      return g;
    }

    // Distribute
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
    var radius = 2.4;
    for (var fi = 0; fi < count; fi++) {
      var phi = Math.acos(1 - (2*(fi+0.5))/count);
      var theta = Math.PI * (1 + Math.sqrt(5)) * fi;
      var pos = new THREE.Vector3(radius*Math.sin(phi)*Math.cos(theta), radius*Math.cos(phi), radius*Math.sin(phi)*Math.sin(theta));
      addFloat(fi < stats.length ? makeCard(stats[fi].l, stats[fi].v, stats[fi].c) : makeCandle(fi%2===0), pos);
    }

    // ===== 3) PARTICLES =====
    var pCount = prefersReducedMotion ? 30 : 80;
    var pGeo = new THREE.BufferGeometry();
    var pPos = new Float32Array(pCount * 3);
    var pCol = new Float32Array(pCount * 3);
    var pSpd = [];
    var pal = [new THREE.Color(0x7C3AED), new THREE.Color(0x22d3ee), new THREE.Color(0xec4899)];
    for (var pi = 0; pi < pCount; pi++) {
      var pt = Math.random()*6.28, pp = Math.acos(2*Math.random()-1), pr = 2+Math.random()*1.5;
      pPos[pi*3]=pr*Math.sin(pp)*Math.cos(pt); pPos[pi*3+1]=pr*Math.sin(pp)*Math.sin(pt); pPos[pi*3+2]=pr*Math.cos(pp);
      var pc = pal[pi%3]; pCol[pi*3]=pc.r; pCol[pi*3+1]=pc.g; pCol[pi*3+2]=pc.b;
      pSpd.push({ s: 0.002+Math.random()*0.005, r: pr, t: pt, p: pp, o: Math.random()*6.28 });
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
    var particlesObj = new THREE.Points(pGeo, new THREE.PointsMaterial({
      size: 0.025, vertexColors: true, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(particlesObj);

    // ===== ANIMATE =====
    var clock = new THREE.Clock();
    var visObs = new IntersectionObserver(function (e) { /* keep running even when not visible */ });
    visObs.observe(container);

    function animate() {
      requestAnimationFrame(animate);
      var dt = clock.getDelta();
      var t = clock.getElapsedTime();

      // Brain rotation
      brainGroup.rotation.y += ROTATION_SPEED * dt;
      brainGroup.rotation.x = Math.sin((t*6.28)/WOBBLE_PERIOD) * THREE.MathUtils.degToRad(WOBBLE_DEG);

      // Pulse
      var pulse = 0.5 + 0.5 * Math.sin((t*6.28)/PULSE_PERIOD);
      brainMat.emissiveIntensity = 0.15 + pulse * 0.45;
      innerLight1.intensity = 1 + pulse * 2;
      innerLight2.intensity = 0.8 + pulse * 1.5;
      glowMat.opacity = 0.03 + pulse * 0.03;

      // Float bob + billboard
      for (var fi2 = 0; fi2 < floatingItems.length; fi2++) {
        var it = floatingItems[fi2];
        it.obj.position.y = it.baseY + Math.sin(t * it.freq * 6.28 + it.phase) * it.amp;
        it.obj.quaternion.copy(camera.quaternion);
      }

      // Particles
      var pa = particlesObj.geometry.attributes.position;
      for (var pi2 = 0; pi2 < pCount; pi2++) {
        var sp = pSpd[pi2]; sp.t += sp.s;
        var r = sp.r + Math.sin(t + sp.o) * 0.1;
        pa.array[pi2*3] = r*Math.sin(sp.p)*Math.cos(sp.t);
        pa.array[pi2*3+1] = r*Math.sin(sp.p)*Math.sin(sp.t);
        pa.array[pi2*3+2] = r*Math.cos(sp.p);
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
        camera.aspect = w/h; camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        if (composer) composer.setSize(w, h);
      }, 150);
    });
  }
})();
