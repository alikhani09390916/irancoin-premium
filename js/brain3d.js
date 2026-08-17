/**
 * IRANCOiN 3D Brain — Realistic Version
 * Procedural brain with real colors, visible folds, region colors
 */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var container = document.getElementById("brain-3d-container");
  if (!container) return;

  var brainLoaded = false;

  function loadBrain() {
    if (brainLoaded) return;
    brainLoaded = true;

    if (window.THREE) {
      initBrain(container);
      return;
    }

    var script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";
    script.async = true;
    script.onload = function () {
      initBrain(container);
    };
    script.onerror = function () {
      container.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:radial-gradient(circle,rgba(124,58,237,.15),transparent);border-radius:50%">' +
        '<svg viewBox="0 0 200 165" width="120" height="100" style="opacity:.4"><use href="#ic-brand"/></svg></div>';
    };
    document.head.appendChild(script);
  }

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            loadBrain();
            observer.disconnect();
          }
        });
      },
      { rootMargin: "200px" }
    );
    observer.observe(container);
  } else {
    loadBrain();
  }

  function initBrain(container) {
    var THREE = window.THREE;
    var W = container.clientWidth || 500;
    var H = container.clientHeight || 500;

    var scene = new THREE.Scene();

    var camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 1000);
    camera.position.set(0, 0.3, 5);

    var renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // ===== LIGHTING =====
    var ambientLight = new THREE.AmbientLight(0x887799, 0.6);
    scene.add(ambientLight);

    // Key light — warm
    var keyLight = new THREE.DirectionalLight(0xffeedd, 1.8);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    // Fill light — cool purple
    var fillLight = new THREE.DirectionalLight(0x9966ff, 0.8);
    fillLight.position.set(-3, 0, 3);
    scene.add(fillLight);

    // Rim light — cyan edge
    var rimLight = new THREE.DirectionalLight(0x22d3ee, 0.6);
    rimLight.position.set(0, -2, -4);
    scene.add(rimLight);

    // Top light
    var topLight = new THREE.PointLight(0xaabbff, 0.5, 15);
    topLight.position.set(0, 5, 0);
    scene.add(topLight);

    // ===== BRAIN GROUP =====
    var brainGroup = new THREE.Group();
    scene.add(brainGroup);

    // ===== BRAIN GEOMETRY =====
    var brainGeo = new THREE.SphereGeometry(1.3, 128, 128);
    var posAttr = brainGeo.attributes.position;
    var vertex = new THREE.Vector3();

    // Noise functions for brain folds
    function hash(x, y, z) {
      var n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
      return n - Math.floor(n);
    }

    function smoothNoise(x, y, z) {
      var ix = Math.floor(x);
      var iy = Math.floor(y);
      var iz = Math.floor(z);
      var fx = x - ix;
      var fy = y - iy;
      var fz = z - iz;

      fx = fx * fx * (3 - 2 * fx);
      fy = fy * fy * (3 - 2 * fy);
      fz = fz * fz * (3 - 2 * fz);

      var a = hash(ix, iy, iz);
      var b = hash(ix + 1, iy, iz);
      var c = hash(ix, iy + 1, iz);
      var d = hash(ix + 1, iy + 1, iz);
      var e = hash(ix, iy, iz + 1);
      var f = hash(ix + 1, iy, iz + 1);
      var g = hash(ix, iy + 1, iz + 1);
      var h = hash(ix + 1, iy + 1, iz + 1);

      return a * (1 - fx) * (1 - fy) * (1 - fz) +
        b * fx * (1 - fy) * (1 - fz) +
        c * (1 - fx) * fy * (1 - fz) +
        d * fx * fy * (1 - fz) +
        e * (1 - fx) * (1 - fy) * fz +
        f * fx * (1 - fy) * fz +
        g * (1 - fx) * fy * fz +
        h * fx * fy * fz;
    }

    function fbm(x, y, z) {
      var val = 0;
      var amp = 0.5;
      var freq = 1.0;
      for (var i = 0; i < 6; i++) {
        val += amp * smoothNoise(x * freq, y * freq, z * freq);
        amp *= 0.5;
        freq *= 2.0;
      }
      return val;
    }

    // Store displacement values for vertex coloring
    var displacements = new Float32Array(posAttr.count);

    for (var i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);
      var nx = vertex.x;
      var ny = vertex.y;
      var nz = vertex.z;

      // Normalize to unit sphere for noise
      var len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      var unx = nx / len;
      var uny = ny / len;
      var unz = nz / len;

      // Layer 1: Large brain folds (gyri and sulci)
      var folds = fbm(unx * 3.5, uny * 3.5, unz * 3.5) * 0.22;

      // Layer 2: Medium wrinkles
      var wrinkles = fbm(unx * 7, uny * 7, unz * 7) * 0.08;

      // Layer 3: Fine surface texture
      var fine = fbm(unx * 14, uny * 14, unz * 14) * 0.03;

      // Central fissure (left-right hemisphere split)
      var fissureDepth = Math.exp(-Math.pow(nx * 10, 2)) * 0.12;
      fissureDepth *= 1 + Math.abs(ny) * 0.3;

      // Brain shape — slightly elongated front-to-back
      var elongation = 1 + 0.08 * Math.cos(Math.atan2(nz, nx) * 2);

      // Bottom flattening (brainstem area)
      var bottomFlatten = ny < -0.8 ? (1 - (Math.abs(ny) - 0.8) * 0.3) : 1;

      // Frontal lobe bulge
      var frontal = Math.exp(-Math.pow((nz - 0.5) * 3, 2)) * 0.06;

      // Temporal lobe bulge (sides)
      var temporal = Math.exp(-Math.pow(ny + 0.3, 2) * 4) *
        Math.exp(-Math.pow(nz - 0.1, 2) * 3) * 0.08;

      var totalDisp = folds + wrinkles + fine - fissureDepth;
      var scale = (1 + totalDisp) * elongation * bottomFlatten + frontal + temporal;

      // Store displacement for coloring
      displacements[i] = totalDisp;

      vertex.multiplyScalar(scale);
      posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    brainGeo.computeVertexNormals();

    // ===== BRAIN MATERIAL — Realistic =====
    // Create vertex colors for brain regions
    var colors = new Float32Array(posAttr.count * 3);

    for (var ci = 0; ci < posAttr.count; ci++) {
      vertex.fromBufferAttribute(posAttr, ci);
      var px = vertex.x;
      var py = vertex.y;
      var pz = vertex.z;

      // Base brain color: pinkish-gray
      var r = 0.72;
      var g = 0.55;
      var b = 0.52;

      // Frontal lobe: slightly more pink/warm
      if (pz > 0.3 && Math.abs(px) < 0.8) {
        var frontalWeight = Math.max(0, (pz - 0.3) * 2);
        r += 0.08 * frontalWeight;
        g -= 0.02 * frontalWeight;
      }

      // Temporal lobe: slightly darker, more gray
      if (py < -0.2 && Math.abs(px) > 0.3) {
        var tempWeight = Math.max(0, Math.abs(px) - 0.3);
        r -= 0.06 * tempWeight;
        g -= 0.04 * tempWeight;
        b -= 0.02 * tempWeight;
      }

      // Parietal/occipital: slightly more purple tint
      if (pz < -0.2 && py > 0.2) {
        var backWeight = Math.max(0, Math.abs(pz) - 0.2);
        r += 0.02 * backWeight;
        b += 0.06 * backWeight;
      }

      // Sulci (folds) are darker — grooves between folds
      var disp = displacements[ci];
      if (disp < 0.05) {
        var grooveDarken = (0.05 - disp) * 8;
        r -= grooveDarken * 0.15;
        g -= grooveDarken * 0.12;
        b -= grooveDarken * 0.10;
      }

      // Gyri (ridges) are lighter — peaks of folds
      if (disp > 0.15) {
        var ridgeLighten = (disp - 0.15) * 4;
        r += ridgeLighten * 0.08;
        g += ridgeLighten * 0.05;
        b += ridgeLighten * 0.03;
      }

      // Central fissure — dark red line
      if (Math.abs(px) < 0.04 && Math.abs(py) < 0.8) {
        r = 0.55;
        g = 0.30;
        b = 0.28;
      }

      // Vein-like subtle purple lines on surface
      var veinNoise = fbm(px * 12, py * 12, pz * 12);
      if (veinNoise > 0.65) {
        var veinStrength = (veinNoise - 0.65) * 3;
        r -= veinStrength * 0.08;
        g -= veinStrength * 0.12;
        b += veinStrength * 0.05;
      }

      // Clamp
      r = Math.max(0.3, Math.min(0.95, r));
      g = Math.max(0.25, Math.min(0.85, g));
      b = Math.max(0.28, Math.min(0.85, b));

      colors[ci * 3] = r;
      colors[ci * 3 + 1] = g;
      colors[ci * 3 + 2] = b;
    }

    brainGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    var brainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.65,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    });

    var brainMesh = new THREE.Mesh(brainGeo, brainMat);
    brainGroup.add(brainMesh);

    // ===== BRAINSTEM =====
    var stemGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.6, 16);
    var stemMat = new THREE.MeshStandardMaterial({
      color: 0x9e7e7a,
      roughness: 0.7,
      metalness: 0.05,
    });
    var stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.position.set(0, -1.35, 0);
    stemMesh.rotation.x = 0.15;
    brainGroup.add(stemMesh);

    // ===== CEREBELLUM =====
    var cerebGeo = new THREE.SphereGeometry(0.45, 32, 32);
    // Deform cerebellum
    var cPos = cerebGeo.attributes.position;
    for (var ci2 = 0; ci2 < cPos.count; ci2++) {
      var cv = new THREE.Vector3().fromBufferAttribute(cPos, ci2);
      // Flatten top, bulge bottom
      if (cv.y > 0) cv.y *= 0.7;
      if (cv.y < 0) cv.y *= 1.2;
      // Add horizontal ridges
      var ridge = Math.sin(cv.y * 20) * 0.015;
      cv.x *= 1 + ridge;
      cv.z *= 1 + ridge;
      cPos.setXYZ(ci2, cv.x, cv.y, cv.z);
    }
    cerebGeo.computeVertexNormals();

    var cerebMat = new THREE.MeshStandardMaterial({
      color: 0x8a6e6a,
      roughness: 0.75,
      metalness: 0.03,
    });
    var cerebMesh = new THREE.Mesh(cerebGeo, cerebMat);
    cerebMesh.position.set(0, -0.85, -1.1);
    cerebMesh.rotation.x = 0.3;
    brainGroup.add(cerebMesh);

    // ===== GLOW SHELL =====
    var glowGeo = new THREE.SphereGeometry(1.55, 32, 32);
    var glowMat = new THREE.MeshBasicMaterial({
      color: 0x7c3aed,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
    });
    var glowMesh = new THREE.Mesh(glowGeo, glowMat);
    brainGroup.add(glowMesh);

    // ===== NEURAL NETWORK (visible lines) =====
    var neuralGroup = new THREE.Group();
    brainGroup.add(neuralGroup);

    var nodeCount = 60;
    var nodes = [];
    var nodeGeo = new THREE.SphereGeometry(0.025, 8, 8);

    for (var ni = 0; ni < nodeCount; ni++) {
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      var r = 1.35 + Math.random() * 0.08;

      var nx = r * Math.sin(phi) * Math.cos(theta);
      var ny = r * Math.sin(phi) * Math.sin(theta);
      var nz = r * Math.cos(phi);

      nodes.push({ x: nx, y: ny, z: nz });

      var nodeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.75 + Math.random() * 0.15, 0.8, 0.6),
        transparent: true,
        opacity: 0.8,
      });
      var nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.set(nx, ny, nz);
      neuralGroup.add(nodeMesh);
    }

    // Neural connections
    var connectionPairs = [];
    for (var n1 = 0; n1 < nodes.length; n1++) {
      for (var n2 = n1 + 1; n2 < nodes.length; n2++) {
        var dx = nodes[n1].x - nodes[n2].x;
        var dy = nodes[n1].y - nodes[n2].y;
        var dz = nodes[n1].z - nodes[n2].z;
        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 0.7 && Math.random() > 0.55) {
          var pts = [
            new THREE.Vector3(nodes[n1].x, nodes[n1].y, nodes[n1].z),
            new THREE.Vector3(nodes[n2].x, nodes[n2].y, nodes[n2].z),
          ];
          var lineGeo = new THREE.BufferGeometry().setFromPoints(pts);

          // Gradient color line
          var hue = 0.7 + Math.random() * 0.2;
          var lineMat = new THREE.LineBasicMaterial({
            color: new THREE.Color().setHSL(hue, 0.7, 0.55),
            transparent: true,
            opacity: 0.25,
          });
          var line = new THREE.Line(lineGeo, lineMat);
          neuralGroup.add(line);
          connectionPairs.push(line);
        }
      }
    }

    // ===== DATA CHARTS (orbiting) =====
    var chartGroup = new THREE.Group();
    brainGroup.add(chartGroup);

    function createChart(x, y, z, bars, color, label) {
      var group = new THREE.Group();
      group.position.set(x, y, z);

      // Chart background
      var bgGeo = new THREE.PlaneGeometry(0.6, 0.4);
      var bgMat = new THREE.MeshBasicMaterial({
        color: 0x0a0a1a,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });
      var bg = new THREE.Mesh(bgGeo, bgMat);
      group.add(bg);

      // Bars
      for (var bi = 0; bi < bars; bi++) {
        var h = 0.05 + Math.random() * 0.15;
        var barGeo = new THREE.BoxGeometry(0.035, h, 0.02);
        var barMat = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.85,
        });
        var bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set((bi - bars / 2) * 0.055, h / 2 - 0.1, 0.01);
        group.add(bar);
      }

      // Glow line at top
      var lineGeo = new THREE.PlaneGeometry(0.55, 0.005);
      var lineMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.4,
      });
      var line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(0, 0.18, 0.01);
      group.add(line);

      return group;
    }

    var charts = [
      createChart(2.0, 0.6, 0.3, 7, 0x22d3ee, "SIGNAL"),
      createChart(-2.0, 0.3, -0.2, 6, 0xec4899, "RISK"),
      createChart(1.5, -0.9, 0.6, 8, 0x34d399, "PROFIT"),
      createChart(-1.3, -0.6, -0.8, 5, 0xfbbf24, "DEPTH"),
    ];
    charts.forEach(function (c) {
      chartGroup.add(c);
    });

    // ===== PARTICLES =====
    var particleCount = 150;
    var pGeo = new THREE.BufferGeometry();
    var pPositions = new Float32Array(particleCount * 3);
    var pColors = new Float32Array(particleCount * 3);
    var pSpeeds = [];

    var palette = [
      new THREE.Color(0x22d3ee),
      new THREE.Color(0xec4899),
      new THREE.Color(0x7c3aed),
      new THREE.Color(0x34d399),
      new THREE.Color(0xfbbf24),
    ];

    for (var pi = 0; pi < particleCount; pi++) {
      var pTheta = Math.random() * Math.PI * 2;
      var pPhi = Math.acos(2 * Math.random() - 1);
      var pR = 1.6 + Math.random() * 0.6;

      pPositions[pi * 3] = pR * Math.sin(pPhi) * Math.cos(pTheta);
      pPositions[pi * 3 + 1] = pR * Math.sin(pPhi) * Math.sin(pTheta);
      pPositions[pi * 3 + 2] = pR * Math.cos(pPhi);

      var pc = palette[Math.floor(Math.random() * palette.length)];
      pColors[pi * 3] = pc.r;
      pColors[pi * 3 + 1] = pc.g;
      pColors[pi * 3 + 2] = pc.b;

      pSpeeds.push({
        speed: 0.003 + Math.random() * 0.008,
        radius: pR,
        theta: pTheta,
        phi: pPhi,
        offset: Math.random() * Math.PI * 2,
      });
    }

    pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(pColors, 3));

    var pMat = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    var particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ===== ORBIT RINGS =====
    for (var ri = 0; ri < 3; ri++) {
      var ringGeo = new THREE.TorusGeometry(1.9 + ri * 0.25, 0.008, 8, 100);
      var ringMat = new THREE.MeshBasicMaterial({
        color: [0x7c3aed, 0x22d3ee, 0xec4899][ri],
        transparent: true,
        opacity: 0.2 - ri * 0.04,
      });
      var ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 + (ri * 0.4 - 0.4);
      ring.rotation.z = ri * 0.3;
      brainGroup.add(ring);
    }

    // ===== PULSE RING =====
    var pulseGeo = new THREE.TorusGeometry(1.4, 0.01, 8, 100);
    var pulseMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.35,
    });
    var pulseRing = new THREE.Mesh(pulseGeo, pulseMat);
    brainGroup.add(pulseRing);

    // ===== ANIMATION =====
    var time = 0;
    var mouseX = 0;
    var mouseY = 0;
    var animating = true;

    container.addEventListener("mousemove", function (e) {
      var rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    var visObserver = new IntersectionObserver(function (entries) {
      animating = entries[0].isIntersecting;
    });
    visObserver.observe(container);

    function animate() {
      requestAnimationFrame(animate);
      if (!animating) return;

      time += 0.006;

      // Slow 360° rotation
      brainGroup.rotation.y = time * 0.4;
      brainGroup.rotation.x = Math.sin(time * 0.25) * 0.08 + 0.1;

      // Mouse tilt
      brainGroup.rotation.y += mouseX * 0.12;
      brainGroup.rotation.x += mouseY * 0.08;

      // Neural pulse
      connectionPairs.forEach(function (line, idx) {
        line.material.opacity = 0.1 + Math.sin(time * 2.5 + idx * 0.7) * 0.18;
      });

      // Chart bars animate
      charts.forEach(function (chart, ci) {
        chart.children.forEach(function (child, bi) {
          if (child.geometry && child.geometry.type === "BoxGeometry") {
            child.scale.y = 0.7 + Math.sin(time * 2 + bi * 0.9 + ci * 1.8) * 0.5;
          }
        });
        chart.rotation.y = time * 0.25 + ci * 1.5;
      });

      // Particles orbit
      var pp = particles.geometry.attributes.position;
      for (var pi2 = 0; pi2 < particleCount; pi2++) {
        var sp = pSpeeds[pi2];
        sp.theta += sp.speed;
        var pr = sp.radius + Math.sin(time + sp.offset) * 0.08;
        pp.array[pi2 * 3] = pr * Math.sin(sp.phi) * Math.cos(sp.theta);
        pp.array[pi2 * 3 + 1] = pr * Math.sin(sp.phi) * Math.sin(sp.theta);
        pp.array[pi2 * 3 + 2] = pr * Math.cos(sp.phi);
      }
      pp.needsUpdate = true;

      // Pulse ring
      var ps = 1 + Math.sin(time * 2) * 0.04;
      pulseRing.scale.setScalar(ps);
      pulseMat.opacity = 0.2 + Math.sin(time * 2) * 0.1;

      // Glow pulse
      glowMat.opacity = 0.04 + Math.sin(time * 1.2) * 0.02;

      renderer.render(scene, camera);
    }
    animate();

    // Resize
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var w = container.clientWidth;
        var h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }, 150);
    });
  }
})();
