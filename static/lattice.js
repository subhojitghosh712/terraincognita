/**
 * 3D Neural Circuit Lattice Visualization — Focused on Layer 13 & Layer 14
 * Terra Incognita Mechanistic Interpretability Engine
 * Features physics-based inertia, smooth zoom, floating depth,
 * interactive neuron hover HUD, and real-time causal synaptic streams.
 */
'use strict';

(() => {
  const canvas = document.getElementById('latticeCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = canvas.parentElement.clientWidth || 900);
  let height = (canvas.height = canvas.parentElement.clientHeight || 420);

  // 3D Camera & Physics Orbit State
  let rotX = -0.18;
  let rotY = 0.58;
  let velX = 0;
  let velY = 0;
  let zoom = 1.05;
  let targetZoom = 1.05;

  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let mouseX = -1000;
  let mouseY = -1000;
  let hoveredNeuron = null;
  let autoRotate = true;
  let idleTimer = null;

  function resize() {
    if (!canvas.parentElement) return;
    width = canvas.width = canvas.parentElement.clientWidth;
    height = canvas.height = canvas.parentElement.clientHeight;
  }
  window.addEventListener('resize', resize);

  // Mouse / Touch Interaction with Inertia Physics
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    autoRotate = false;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    velX = 0;
    velY = 0;
    clearTimeout(idleTimer);
  });

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;

    velY = dx * 0.0045;
    velX = dy * 0.0045;

    rotY += velY;
    rotX += velX;
    rotX = Math.max(-1.15, Math.min(0.55, rotX));

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { autoRotate = true; }, 3500);
    }
  });

  canvas.addEventListener('mouseleave', () => {
    mouseX = -1000;
    mouseY = -1000;
    hoveredNeuron = null;
    canvas.style.cursor = 'grab';
  });

  // Smooth Zoom with Lerp
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    targetZoom -= e.deltaY * 0.0014;
    targetZoom = Math.max(0.7, Math.min(1.9, targetZoom));
  }, { passive: false });

  // Double-click resets view
  canvas.addEventListener('dblclick', () => {
    rotX = -0.18;
    rotY = 0.58;
    velX = 0;
    velY = 0;
    targetZoom = 1.05;
  });

  // Click to sync neuron with UI controls
  canvas.addEventListener('click', () => {
    if (hoveredNeuron) {
      if (hoveredNeuron.key === 'a') {
        const inputA = document.getElementById('doseA');
        if (inputA) {
          inputA.focus();
          inputA.value = inputA.value === '0' ? '1' : '0';
          inputA.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } else if (hoveredNeuron.key === 'b') {
        const inputB = document.getElementById('doseB');
        if (inputB) {
          inputB.focus();
          inputB.value = inputB.value === '0' ? '-1' : '0';
          inputB.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
  });

  // Focused Geometry: Layer 13 and Layer 14 are the primary heroes,
  // flanked by soft contextual boundary planes (Layer 12 & Layer 15).
  const planeWidth = 260;
  const planeHeight = 310;
  const zGap = 160;

  function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  // Define layers focusing specifically on L13 & L14
  const layerDefs = [
    { name: 'Layer 12', short: 'L12', z: -zGap * 1.35, isContext: true, label: 'L12 (Context Inflow)' },
    {
      name: 'Layer 13',
      short: 'L13',
      z: -zGap * 0.5,
      isHero: true,
      isB: true,
      color: '#adcadb',
      accentColor: '#56b6c2',
      label: 'LAYER 13 · MLP INTERMEDIATE',
      sublabel: 'Neuron 7956 · Suppression Target',
      keyNeuron: {
        key: 'b',
        x: 42,
        y: -36,
        id: '7956',
        name: 'Neuron 7956 (B)',
        color: '#adcadb',
        glowColor: 'rgba(173, 202, 219, 0.45)',
        deltaScale: '-22.89 Δ / dose',
        norm: '0.4183',
        description: 'Suppresses sycophantic praise / natural baseline'
      }
    },
    {
      name: 'Layer 14',
      short: 'L14',
      z: zGap * 0.5,
      isHero: true,
      isA: true,
      color: '#e9b76d',
      accentColor: '#f3a638',
      label: 'LAYER 14 · MLP DOWN_PROJ',
      sublabel: 'Neuron 8949 · Hostility Target',
      keyNeuron: {
        key: 'a',
        x: -38,
        y: 44,
        id: '8949',
        name: 'Neuron 8949 (A)',
        color: '#e9b76d',
        glowColor: 'rgba(233, 183, 109, 0.55)',
        deltaScale: '+22.08 Δ / dose',
        norm: '0.4649',
        description: 'Amplifies hostile / adversarial semantic shift'
      }
    },
    { name: 'Layer 15', short: 'L15', z: zGap * 1.35, isContext: true, label: 'L15 (Context Outflow)' }
  ];

  // Populate dense neuron matrix dots for each layer
  const layers = layerDefs.map((def, lIdx) => {
    let s = (lIdx + 1) * 311;
    const gridPoints = [];
    const cols = def.isHero ? 12 : 8;
    const rows = def.isHero ? 14 : 9;
    const xStep = (planeWidth - 44) / (cols - 1);
    const yStep = (planeHeight - 44) / (rows - 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = -planeWidth / 2 + 22 + c * xStep + (seededRandom(s++) - 0.5) * 4;
        const y = -planeHeight / 2 + 22 + r * yStep + (seededRandom(s++) - 0.5) * 4;
        const baseAlpha = def.isHero ? (seededRandom(s++) * 0.28 + 0.12) : 0.06;
        gridPoints.push({ x, y, baseAlpha });
      }
    }

    // Active firing nodes
    const activeNeurons = [];
    const activeCount = def.isHero ? 10 : 3;
    for (let i = 0; i < activeCount; i++) {
      const idx = Math.floor(seededRandom(s++) * gridPoints.length);
      const gp = gridPoints[idx];
      activeNeurons.push({
        x: gp.x,
        y: gp.y,
        size: 2.0 + seededRandom(s++) * 1.6,
        alpha: 0.65 + seededRandom(s++) * 0.35,
        pulseOffset: seededRandom(s++) * Math.PI * 2,
        color: def.isA
          ? (seededRandom(s++) > 0.5 ? '#e9b76d' : '#f0eee5')
          : (def.isB ? (seededRandom(s++) > 0.5 ? '#adcadb' : '#f0eee5') : 'rgba(163, 176, 183, 0.4)')
      });
    }

    return {
      ...def,
      gridPoints,
      activeNeurons,
    };
  });

  const l13 = layers[1];
  const l14 = layers[2];

  // Construct High-Definition Synaptic Pathways connecting Layer 13 & Layer 14
  const rays = [];

  // 1. The Causal Intervention Super-Highway (Neuron 7956 -> Neuron 8949)
  // Multi-strand bundle with glowing amber and cyan fibers
  for (let b = -2; b <= 2; b++) {
    rays.push({
      fromLayer: 1,
      fromPos: { x: l13.keyNeuron.x + b * 2.5, y: l13.keyNeuron.y - b * 1.5 },
      toLayer: 2,
      toPos: { x: l14.keyNeuron.x + b * 2.0, y: l14.keyNeuron.y + b * 1.5 },
      color: b === 0 ? '#e9b76d' : (b > 0 ? 'rgba(233, 183, 109, 0.5)' : 'rgba(173, 202, 219, 0.5)'),
      width: b === 0 ? 3.0 : 1.4,
      isCoreBridge: true,
      offset: b,
    });
  }

  // 2. Inter-layer Synaptic Web between active neurons on L13 and L14
  l13.activeNeurons.forEach((an13, i) => {
    l14.activeNeurons.forEach((an14, j) => {
      if ((i * 3 + j * 7) % 5 === 0) {
        rays.push({
          fromLayer: 1,
          fromPos: { x: an13.x, y: an13.y },
          toLayer: 2,
          toPos: { x: an14.x, y: an14.y },
          color: (i + j) % 2 === 0 ? 'rgba(173, 202, 219, 0.3)' : 'rgba(233, 183, 109, 0.28)',
          width: 0.95,
        });
      }
    });
  });

  // 3. Inflow from L12 context into L13 Neuron 7956
  layers[0].activeNeurons.forEach((an12, i) => {
    if (i % 2 === 0) {
      rays.push({
        fromLayer: 0,
        fromPos: { x: an12.x, y: an12.y },
        toLayer: 1,
        toPos: { x: l13.keyNeuron.x, y: l13.keyNeuron.y },
        color: 'rgba(173, 202, 219, 0.22)',
        width: 0.9,
      });
    }
  });

  // 4. Outflow from L14 Neuron 8949 into L15 context
  layers[3].activeNeurons.forEach((an15, j) => {
    if (j % 2 === 0) {
      rays.push({
        fromLayer: 2,
        fromPos: { x: l14.keyNeuron.x, y: l14.keyNeuron.y },
        toLayer: 3,
        toPos: { x: an15.x, y: an15.y },
        color: 'rgba(233, 183, 109, 0.24)',
        width: 0.9,
      });
    }
  });

  // Flowing Particles / Photon Packets
  const particles = [];
  const particleCount = 36;
  for (let p = 0; p < particleCount; p++) {
    particles.push({
      rayIdx: p % rays.length,
      progress: Math.random(),
      speed: 0.005 + Math.random() * 0.009,
      size: 1.5 + Math.random() * 1.5,
    });
  }

  // 3D Perspective Projection
  function project(x, y, z) {
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const x1 = x * cosY - z * sinY;
    const z1 = z * cosY + x * sinY;

    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const y2 = y * cosX - z1 * sinX;
    const z2 = z1 * cosX + y * sinX;

    const distance = 860;
    const factor = (distance / (distance + z2)) * zoom;

    return {
      x: width * 0.5 + x1 * factor,
      y: height * 0.49 + y2 * factor,
      z: z2,
      scale: factor,
    };
  }

  // Animation Loop
  let time = 0;
  function render() {
    time += 0.016;

    // Apply inertia physics
    if (!isDragging) {
      rotY += velY;
      rotX += velX;
      velY *= 0.92;
      velX *= 0.92;

      // Gentle organic breathing drift
      if (autoRotate && Math.abs(velY) < 0.0001 && Math.abs(velX) < 0.0001) {
        rotY += 0.0006;
        rotX += Math.sin(time * 0.7) * 0.0002;
      }
    }

    // Smooth Zoom interpolation
    zoom += (targetZoom - zoom) * 0.12;

    ctx.clearRect(0, 0, width, height);

    // Dynamic generation status check
    const runBtn = document.getElementById('runButton');
    const isGenerating = runBtn && runBtn.disabled && (runBtn.textContent.includes('Generating') || runBtn.textContent.includes('Running') || runBtn.textContent.includes('…'));

    // Depth sorting list
    const renderList = [];
    hoveredNeuron = null;

    layers.forEach((layer, lIdx) => {
      const hw = planeWidth / 2;
      const hh = planeHeight / 2;
      const z = layer.z;

      const c1 = project(-hw, -hh, z);
      const c2 = project(hw, -hh, z);
      const c3 = project(hw, hh, z);
      const c4 = project(-hw, hh, z);
      const center = project(0, 0, z);

      renderList.push({
        type: 'plane',
        z: center.z,
        layer,
        lIdx,
        c1, c2, c3, c4, center,
      });

      // Grid matrix points
      layer.gridPoints.forEach((gp) => {
        const pt = project(gp.x, gp.y, z);
        renderList.push({
          type: 'gridPoint',
          z: pt.z,
          pt,
          baseAlpha: gp.baseAlpha,
          layer,
        });
      });

      // Active neurons
      layer.activeNeurons.forEach((an) => {
        const pt = project(an.x, an.y, z);
        renderList.push({
          type: 'activeNeuron',
          z: pt.z,
          pt,
          an,
          layer,
        });
      });

      // Focal Target Neurons (Layer 13 Neuron 7956 & Layer 14 Neuron 8949)
      if (layer.keyNeuron) {
        const pt = project(layer.keyNeuron.x, layer.keyNeuron.y, z);
        
        // Mouse hover detection
        const dMouse = Math.hypot(mouseX - pt.x, mouseY - pt.y);
        const isHovered = dMouse < 26;
        if (isHovered) {
          hoveredNeuron = { ...layer.keyNeuron, screenX: pt.x, screenY: pt.y };
        }

        renderList.push({
          type: 'keyNeuron',
          z: pt.z,
          pt,
          keyNeuron: layer.keyNeuron,
          layer,
          isHovered,
        });
      }
    });

    // Synaptic connection rays
    rays.forEach((ray, rIdx) => {
      const srcLayer = layers[ray.fromLayer];
      const dstLayer = layers[ray.toLayer];
      const p1 = project(ray.fromPos.x, ray.fromPos.y, srcLayer.z);
      const p2 = project(ray.toPos.x, ray.toPos.y, dstLayer.z);

      renderList.push({
        type: 'ray',
        z: (p1.z + p2.z) * 0.5,
        p1, p2, ray, rIdx,
      });
    });

    // Sort ascending by depth (furthest to nearest)
    renderList.sort((a, b) => b.z - a.z);

    // Draw sorted elements
    renderList.forEach((item) => {
      if (item.type === 'plane') {
        const { c1, c2, c3, c4, layer } = item;

        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(c3.x, c3.y);
        ctx.lineTo(c4.x, c4.y);
        ctx.closePath();

        if (layer.isHero) {
          // Hero planes (L13 & L14): rich semi-transparent fill with gradient depth
          const grad = ctx.createLinearGradient(c1.x, c1.y, c3.x, c3.y);
          if (layer.isA) {
            grad.addColorStop(0, 'rgba(233, 183, 109, 0.08)');
            grad.addColorStop(1, 'rgba(30, 24, 18, 0.45)');
          } else {
            grad.addColorStop(0, 'rgba(173, 202, 219, 0.08)');
            grad.addColorStop(1, 'rgba(18, 28, 36, 0.45)');
          }
          ctx.fillStyle = grad;
          ctx.fill();

          // Glowing border
          ctx.strokeStyle = layer.isA ? 'rgba(233, 183, 109, 0.75)' : 'rgba(173, 202, 219, 0.75)';
          ctx.lineWidth = 1.6;
          ctx.stroke();

          // Internal hairline grid divisions
          ctx.strokeStyle = layer.isA ? 'rgba(233, 183, 109, 0.12)' : 'rgba(173, 202, 219, 0.12)';
          ctx.lineWidth = 0.7;
          for (let g = 1; g < 4; g++) {
            const t = g / 4;
            // Vertical line
            ctx.beginPath();
            ctx.moveTo(c1.x + (c2.x - c1.x) * t, c1.y + (c2.y - c1.y) * t);
            ctx.lineTo(c4.x + (c3.x - c4.x) * t, c4.y + (c3.y - c4.y) * t);
            ctx.stroke();
            // Horizontal line
            ctx.beginPath();
            ctx.moveTo(c1.x + (c4.x - c1.x) * t, c1.y + (c4.y - c1.y) * t);
            ctx.lineTo(c2.x + (c3.x - c2.x) * t, c2.y + (c3.y - c2.y) * t);
            ctx.stroke();
          }

          // Top Header on Plane
          const topMidX = (c1.x + c2.x) * 0.5;
          const topMidY = (c1.y + c2.y) * 0.5 - 14 * c1.scale;

          ctx.font = `700 ${Math.max(10, Math.round(12 * c1.scale))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillStyle = layer.isA ? '#e9b76d' : '#adcadb';
          ctx.fillText(layer.short, topMidX, topMidY);

          // Subtitle
          ctx.font = `500 ${Math.max(8, Math.round(9 * c1.scale))}px -apple-system, sans-serif`;
          ctx.fillStyle = 'rgba(240, 238, 229, 0.75)';
          ctx.fillText(layer.isA ? 'MLP Down-Projection' : 'MLP Intermediate', topMidX, topMidY + 12 * c1.scale);

        } else {
          // Contextual planes (L12 & L15): subtle wireframe boundary
          ctx.strokeStyle = 'rgba(48, 64, 74, 0.28)';
          ctx.lineWidth = 0.8;
          ctx.stroke();

          const topMidX = (c1.x + c2.x) * 0.5;
          const topMidY = (c1.y + c2.y) * 0.5 - 8 * c1.scale;
          ctx.font = `600 ${Math.max(8, Math.round(9 * c1.scale))}px ui-monospace, SFMono-Regular, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillStyle = 'rgba(120, 138, 150, 0.45)';
          ctx.fillText(layer.name, topMidX, topMidY);
        }

      } else if (item.type === 'gridPoint') {
        const { pt, baseAlpha, layer } = item;
        const r = (layer.isHero ? 1.05 : 0.75) * pt.scale;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(0.6, r), 0, Math.PI * 2);
        ctx.fillStyle = layer.isA
          ? `rgba(233, 183, 109, ${baseAlpha})`
          : (layer.isB ? `rgba(173, 202, 219, ${baseAlpha})` : `rgba(163, 176, 183, ${baseAlpha})`);
        ctx.fill();

      } else if (item.type === 'ray') {
        const { p1, p2, ray } = item;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = ray.color;
        ctx.lineWidth = (ray.width || 1.0) * ((p1.scale + p2.scale) * 0.5);
        ctx.stroke();

      } else if (item.type === 'activeNeuron') {
        const { pt, an, layer } = item;
        const pulse = Math.sin(time * 2.8 + an.pulseOffset) * 0.3 + 0.7;
        const r = an.size * pt.scale * pulse;

        if (layer.isHero) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = an.color === '#e9b76d' ? 'rgba(233, 183, 109, 0.16)' : 'rgba(173, 202, 219, 0.16)';
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(0.9, r), 0, Math.PI * 2);
        ctx.fillStyle = an.color;
        ctx.fill();

      } else if (item.type === 'keyNeuron') {
        const { pt, keyNeuron, isHovered } = item;
        const pulse = Math.sin(time * 4.2) * 0.35 + 1.0;
        const baseRadius = (isHovered ? 7.5 : 6.0) * pt.scale;

        // Radiating pulse halo
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, baseRadius * 3.6 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = keyNeuron.key === 'a'
          ? `rgba(233, 183, 109, ${isHovered ? 0.35 : 0.2})`
          : `rgba(173, 202, 219, ${isHovered ? 0.35 : 0.2})`;
        ctx.fill();

        // Target reticle ring
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, baseRadius * 2.1 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = keyNeuron.color;
        ctx.lineWidth = isHovered ? 2.2 : 1.6;
        ctx.stroke();

        // Solid inner core
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = keyNeuron.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Badge label
        ctx.font = `700 ${Math.max(10, Math.round(11 * pt.scale))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = keyNeuron.color;
        ctx.fillText(` ${keyNeuron.name}`, pt.x + baseRadius * 2.3, pt.y);
      }
    });

    // Flowing Particles / Photon Streams
    particles.forEach((p) => {
      p.progress += isGenerating ? p.speed * 3.5 : p.speed;
      if (p.progress > 1.0) p.progress = 0;

      const ray = rays[p.rayIdx];
      const srcLayer = layers[ray.fromLayer];
      const dstLayer = layers[ray.toLayer];
      const p1 = project(ray.fromPos.x, ray.fromPos.y, srcLayer.z);
      const p2 = project(ray.toPos.x, ray.toPos.y, dstLayer.z);

      const curX = p1.x + (p2.x - p1.x) * p.progress;
      const curY = p1.y + (p2.y - p1.y) * p.progress;
      const curScale = p1.scale + (p2.scale - p1.scale) * p.progress;

      ctx.beginPath();
      ctx.arc(curX, curY, Math.max(1.3, p.size * curScale), 0, Math.PI * 2);
      ctx.fillStyle = ray.isCoreBridge ? '#ffffff' : (ray.color.includes('233') ? '#e9b76d' : '#adcadb');
      ctx.shadowColor = ray.isCoreBridge ? '#e9b76d' : '#adcadb';
      ctx.shadowBlur = ray.isCoreBridge ? 10 : 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Interactive Hover HUD Tooltip
    if (hoveredNeuron) {
      canvas.style.cursor = 'pointer';
      const hx = Math.min(width - 240, Math.max(15, hoveredNeuron.screenX + 16));
      const hy = Math.min(height - 110, Math.max(15, hoveredNeuron.screenY - 45));

      ctx.save();
      // Frosted tooltip background
      ctx.fillStyle = 'rgba(16, 27, 36, 0.94)';
      ctx.strokeStyle = hoveredNeuron.color;
      ctx.lineWidth = 1.2;

      // Rounded rect
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(hx, hy, 230, 92, 8) : ctx.rect(hx, hy, 230, 92);
      ctx.fill();
      ctx.stroke();

      // Tooltip Text
      ctx.font = '700 11px ui-monospace, SFMono-Regular, monospace';
      ctx.fillStyle = hoveredNeuron.color;
      ctx.fillText(hoveredNeuron.name.toUpperCase(), hx + 12, hy + 20);

      ctx.font = '500 10px -apple-system, sans-serif';
      ctx.fillStyle = '#f0eee5';
      ctx.fillText(hoveredNeuron.description, hx + 12, hy + 38);

      ctx.font = '9px ui-monospace, SFMono-Regular, monospace';
      ctx.fillStyle = 'rgba(163, 176, 183, 0.85)';
      ctx.fillText(`Calibration: ${hoveredNeuron.deltaScale}`, hx + 12, hy + 56);
      ctx.fillText(`Weight Norm: ||W|| = ${hoveredNeuron.norm}`, hx + 12, hy + 70);

      ctx.font = '8px ui-monospace, SFMono-Regular, monospace';
      ctx.fillStyle = hoveredNeuron.key === 'a' ? '#e9b76d' : '#adcadb';
      ctx.fillText('[ Click to toggle in controls ]', hx + 12, hy + 83);
      ctx.restore();
    } else if (!isDragging) {
      canvas.style.cursor = 'grab';
    }

    requestAnimationFrame(render);
  }

  resize();
  requestAnimationFrame(render);
})();
