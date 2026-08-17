/**
 * IRANCOiN 3D Brain Visualization
 * Procedural brain with neural networks + chart data
 * Uses Three.js via CDN — lazy loaded when hero is visible
 */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var container = document.getElementById("brain-3d-container");
  if (!container) return;

  // ===== LAZY LOADING =====
  // Only load Three.js when brain container is near viewport
  var brainLoaded = false;

  function loadBrain() {
    if (brainLoaded) return;
    brainLoaded = true;

    // Check if Three.js already loaded
    if (window.THREE) {
      init3DBrain(container);
      return;
    }

    // Load Three.js from CDN
    var script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";
    script.async = true;
    script.onload = function () {
      init3DBrain(container);
    };
    script.onerror = function () {
      // Fallback: show static SVG brain
      container.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:radial-gradient(circle,rgba(124,58,237,.15),transparent);border-radius:50%">' +
        '<svg viewBox="0 0 200 165" width="120" height="100" style="opacity:.4"><use href="#ic-brand"/></svg></div>';
    };
    document.head.appendChild(script);
  }

  // Use IntersectionObserver for lazy loading
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
    // Fallback: load immediately
    loadBrain();
  }

  // ===== MAIN INIT =====
  function init3DBrain(container) {
    var THREE = window.THREE;
    var W = container.clientWidth || 500;
    var H = container.clientHeight || 500;

    // Scene
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
    camera.position.set(0, 0, 4.5);

    var renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Lights
    var ambient = new THREE.AmbientLight(0x7c3aed, 0.4);
    scene.add(ambient);
    var point1 = new THREE.PointLight(0x22d3ee, 1.5, 20);
    point1.position.set(3, 2, 4);
    scene.add(point1);
    var point2 = new THREE.PointLight(0xec4899, 1.0, 20);
    point2.position.set(-3, -1, 3);
    scene.add(point2);
    var point3 = new THREE.PointLight(0x7c3aed, 0.8, 15);
    point3.position.set(0, 3, 2);
    scene.add(point3);

    // ===== BRAIN GEOMETRY =====
    var brainGroup = new THREE.Group();
    scene.add(brainGroup);

    // Main brain shape — sphere with noise displacement
    var brainGeo = new THREE.SphereGeometry(1.4, 64, 64);
    var posAttr = brainGeo.attributes.position;
    var vertex = new THREE.Vector3();

    // Seed-based noise for brain folds
    function noise3D(x, y, z) {
      var n =
        Math.sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453;
      return n - Math.floor(n);
    }

    function fbm(x, y, z) {
      var val = 0;
      var amp = 0.5;
      var freq = 1.0;
      for (var i = 0; i < 5; i++) {
        val += amp * (noise3D(x * freq, y * freq, z * freq) * 2 - 1);
        amp *= 0.5;
        freq *= 2.1;
      }
      return val;
    }

    for (var i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);
      var nx = vertex.x;
      var ny = vertex.y;
      var nz = vertex.z;

      // Brain-like displacement: folds + lobes
      var fold = fbm(nx * 2.5, ny * 2.5, nz * 2.5) * 0.18;
      var lobe =
        Math.abs(Math.sin(ny * 2.5)) * 0.08 +
        Math.abs(Math.cos(nx * 1.8)) * 0.06;

      // Central fissure (split brain hemispheres)
      var fissure =
        Math.exp(-Math.pow(nx * 8, 2)) * 0.05 * (1 + Math.abs(ny) * 0.5);

      var scale = 1 + fold + lobe - fissure;
      vertex.multiplyScalar(scale);
      posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    brainGeo.computeVertexNormals();

    // Brain material — translucent with glow
    var brainMat = new THREE.MeshPhongMaterial({
      color: 0x1a0533,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.15,
      specular: 0xa78bfa,
      shininess: 40,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      wireframe: false,
    });

    var brainMesh = new THREE.Mesh(brainGeo, brainMat);
    brainGroup.add(brainMesh);

    // Wireframe overlay
    var wireMat = new THREE.MeshBasicMaterial({
      color: 0x7c3aed,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    var wireMesh = new THREE.Mesh(brainGeo.clone(), wireMat);
    wireMesh.scale.setScalar(1.002);
    brainGroup.add(wireMesh);

    // ===== NEURAL CONNECTIONS =====
    var neuralGroup = new THREE.Group();
    brainGroup.add(neuralGroup);

    // Generate neural nodes on brain surface
    var nodeCount = 80;
    var nodes = [];
    var nodeGeo = new THREE.SphereGeometry(0.018, 8, 8);

    for (var n = 0; n < nodeCount; n++) {
      // Random point on sphere
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      var r = 1.42 + (Math.random() - 0.5) * 0.1;

      var x = r * Math.sin(phi) * Math.cos(theta);
      var y = r * Math.sin(phi) * Math.sin(theta);
      var z = r * Math.cos(phi);

      nodes.push({ x: x, y: y, z: z });

      var nodeMat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0x22d3ee : 0xec4899,
        transparent: true,
        opacity: 0.7 + Math.random() * 0.3,
      });
      var nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.set(x, y, z);
      neuralGroup.add(nodeMesh);
    }

    // Neural connections (lines between nearby nodes)
    var lineMat = new THREE.LineBasicMaterial({
      color: 0x7c3aed,
      transparent: true,
      opacity: 0.15,
    });

    var connectionPairs = [];
    for (var ci = 0; ci < nodes.length; ci++) {
      for (var cj = ci + 1; cj < nodes.length; cj++) {
        var dx = nodes[ci].x - nodes[cj].x;
        var dy = nodes[ci].y - nodes[cj].y;
        var dz = nodes[ci].z - nodes[cj].z;
        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 0.8 && Math.random() > 0.6) {
          var points = [
            new THREE.Vector3(nodes[ci].x, nodes[ci].y, nodes[ci].z),
            new THREE.Vector3(nodes[cj].x, nodes[cj].y, nodes[cj].z),
          ];
          var lineGeo = new THREE.BufferGeometry().setFromPoints(points);
          var line = new THREE.Line(lineGeo, lineMat.clone());
          neuralGroup.add(line);
          connectionPairs.push({ line: line, i: ci, j: cj });
        }
      }
    }

    // ===== FLOATING CHART DATA =====
    var chartGroup = new THREE.Group();
    brainGroup.add(chartGroup);

    // Mini bar charts orbiting the brain
    function createMiniChart(x, y, z, barCount, color) {
      var group = new THREE.Group();
      group.position.set(x, y, z);

      for (var b = 0; b < barCount; b++) {
        var h = 0.1 + Math.random() * 0.25;
        var barGeo = new THREE.BoxGeometry(0.04, h, 0.04);
        var barMat = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.6,
        });
        var bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set((b - barCount / 2) * 0.06, h / 2, 0);
        group.add(bar);
      }
      return group;
    }

    // 4 mini charts at different positions
    var charts = [
      createMiniChart(1.8, 0.8, 0.5, 6, 0x22d3ee),
      createMiniChart(-1.8, 0.5, -0.3, 5, 0xec4899),
      createMiniChart(1.2, -1.2, 0.8, 7, 0x34d399),
      createMiniChart(-1.0, -0.8, -1.0, 5, 0xfbbf24),
    ];
    charts.forEach(function (c) {
      chartGroup.add(c);
    });

    // ===== DATA PARTICLES =====
    var particleCount = 200;
    var particleGeo = new THREE.BufferGeometry();
    var particlePositions = new Float32Array(particleCount * 3);
    var particleColors = new Float32Array(particleCount * 3);
    var particleSpeeds = [];

    for (var p = 0; p < particleCount; p++) {
      var pTheta = Math.random() * Math.PI * 2;
      var pPhi = Math.acos(2 * Math.random() - 1);
      var pR = 1.5 + Math.random() * 0.8;

      particlePositions[p * 3] = pR * Math.sin(pPhi) * Math.cos(pTheta);
      particlePositions[p * 3 + 1] = pR * Math.sin(pPhi) * Math.sin(pTheta);
      particlePositions[p * 3 + 2] = pR * Math.cos(pPhi);

      // Random colors: cyan, pink, purple
      var col = [0x22d3ee, 0xec4899, 0x7c3aed, 0x34d399][
        Math.floor(Math.random() * 4)
      ];
      particleColors[p * 3] = ((col >> 16) & 255) / 255;
      particleColors[p * 3 + 1] = ((col >> 8) & 255) / 255;
      particleColors[p * 3 + 2] = (col & 255) / 255;

      particleSpeeds.push({
        speed: 0.002 + Math.random() * 0.006,
        radius: pR,
        theta: pTheta,
        phi: pPhi,
        offset: Math.random() * Math.PI * 2,
      });
    }

    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );
    particleGeo.setAttribute(
      "color",
      new THREE.BufferAttribute(particleColors, 3)
    );

    var particleMat = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    var particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ===== ORBIT RINGS =====
    var ringGroup = new THREE.Group();
    scene.add(ringGroup);

    for (var ri = 0; ri < 3; ri++) {
      var ringGeo = new THREE.RingGeometry(
        1.8 + ri * 0.3,
        1.82 + ri * 0.3,
        64
      );
      var ringMat = new THREE.MeshBasicMaterial({
        color: [0x7c3aed, 0x22d3ee, 0xec4899][ri],
        transparent: true,
        opacity: 0.12 - ri * 0.03,
        side: THREE.DoubleSide,
      });
      var ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 + (ri * 0.3 - 0.3);
      ring.rotation.y = ri * 0.5;
      ringGroup.add(ring);
    }

    // ===== PULSE RING =====
    var pulseGeo = new THREE.RingGeometry(1.35, 1.37, 64);
    var pulseMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    var pulseRing = new THREE.Mesh(pulseGeo, pulseMat);
    pulseRing.lookAt(camera.position);
    scene.add(pulseRing);

    // ===== CHART WAVE LINES =====
    var waveGroup = new THREE.Group();
    scene.add(waveGroup);

    // Create sine wave lines around brain
    for (var wi = 0; wi < 3; wi++) {
      var wavePoints = [];
      var segments = 100;
      for (var si = 0; si <= segments; si++) {
        var t = (si / segments) * Math.PI * 2;
        var wR = 1.9 + wi * 0.15;
        var amp = 0.05 * (wi + 1);
        wavePoints.push(
          new THREE.Vector3(
            Math.cos(t) * wR,
            Math.sin(t * 3 + wi) * amp + (wi - 1) * 0.5,
            Math.sin(t) * wR
          )
        );
      }
      var waveGeo = new THREE.BufferGeometry().setFromPoints(wavePoints);
      var waveMat = new THREE.LineBasicMaterial({
        color: [0x22d3ee, 0xec4899, 0x34d399][wi],
        transparent: true,
        opacity: 0.2,
      });
      waveGroup.add(new THREE.Line(waveGeo, waveMat));
    }

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

    // Pause when not visible
    var visObserver = new IntersectionObserver(function (entries) {
      animating = entries[0].isIntersecting;
    });
    visObserver.observe(container);

    function animate() {
      requestAnimationFrame(animate);
      if (!animating) return;

      time += 0.008;

      // Slow 360° rotation
      brainGroup.rotation.y = time * 0.5;
      brainGroup.rotation.x = Math.sin(time * 0.3) * 0.1;

      // Mouse interaction
      brainGroup.rotation.y += mouseX * 0.15;
      brainGroup.rotation.x += mouseY * 0.1;

      // Neural connections pulse
      connectionPairs.forEach(function (pair, idx) {
        pair.line.material.opacity =
          0.05 + Math.sin(time * 3 + idx * 0.5) * 0.12;
      });

      // Chart bars animate
      charts.forEach(function (chart, ci) {
        chart.children.forEach(function (bar, bi) {
          bar.scale.y =
            0.8 + Math.sin(time * 2 + bi * 0.8 + ci * 1.5) * 0.4;
          bar.position.y =
            (bar.geometry.parameters.height * bar.scale.y) / 2;
        });
        chart.rotation.y = time * 0.3 + ci;
      });

      // Particle orbits
      var pPos = particles.geometry.attributes.position;
      for (var pi = 0; pi < particleCount; pi++) {
        var sp = particleSpeeds[pi];
        sp.theta += sp.speed;
        var pR2 = sp.radius + Math.sin(time + sp.offset) * 0.1;
        pPos.array[pi * 3] = pR2 * Math.sin(sp.phi) * Math.cos(sp.theta);
        pPos.array[pi * 3 + 1] =
          pR2 * Math.sin(sp.phi) * Math.sin(sp.theta);
        pPos.array[pi * 3 + 2] = pR2 * Math.cos(sp.phi);
      }
      pPos.needsUpdate = true;

      // Rings rotate
      ringGroup.rotation.y = time * 0.2;
      ringGroup.rotation.x = Math.sin(time * 0.15) * 0.3;

      // Pulse ring
      var pulseScale = 1 + Math.sin(time * 2) * 0.05;
      pulseRing.scale.setScalar(pulseScale);
      pulseMat.opacity = 0.15 + Math.sin(time * 2) * 0.1;

      // Wave lines animate
      waveGroup.rotation.y = time * 0.15;

      // Brain glow pulse
      brainMat.emissiveIntensity = 0.12 + Math.sin(time * 1.5) * 0.05;

      renderer.render(scene, camera);
    }
    animate();

    // ===== RESIZE =====
    var resizeTimer;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var w = container.clientWidth;
        var h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }, 150);
    }
    window.addEventListener("resize", onResize);
  }
})();
