/**
 * 3D Neural Circuit Lattice Visualization
 * Renders an interactive multi-layer Transformer circuit lattice
 * showing layers, neurons, and causal attribution rays.
 */
'use strict';

(() => {
  const canvas = document.getElementById('latticeCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = canvas.parentElement.clientWidth || 900);
  let height = (canvas.height = canvas.parentElement.clientHeight || 380);

  // 3D Camera / Perspective state
  let rotX = -0.22;
  let rotY = 0.65;
  let zoom = 1.0;
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let autoRotate = true;
  let idleTimer = null;

  function resize() {
    if (!canvas.parentElement) return;
    width = canvas.width = canvas.parentElement.clientWidth;
    height = canvas.height = canvas.parentElement.clientHeight;
  }
  window.addEventListener('resize', resize);

  // Mouse / Touch interaction for 3D orbit
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    autoRotate = false;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    clearTimeout(idleTimer);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    rotY += dx * 0.0055;
    rotX += dy * 0.0055;
    rotX = Math.max(-1.15, Math.min(0.45, rotX));
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { autoRotate = true; }, 4000);
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom -= e.deltaY * 0.0012;
    zoom = Math.max(0.65, Math.min(1.85, zoom));
  }, { passive: false });

  // Double click resets camera view
  canvas.addEventListener('dblclick', () => {
    rotX = -0.22;
    rotY = 0.65;
    zoom = 1.0;
  });

  // Layer planes configuration: Layers 6 through 16 of Qwen3.5
  const layerNames = ['L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12', 'L13', 'L14', 'L15', 'L16'];
  const planeWidth = 200;
  const planeHeight = 250;
  const zSpacing = 65;
  const zOffset = -((layerNames.length - 1) * zSpacing) / 2;

  function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  const layers = layerNames.map((name, lIdx) => {
    const isA = name === 'L14';
    const isB = name === 'L13';
    const z = zOffset + lIdx * zSpacing;
    let s = lIdx * 133 + 7;

    // Build regular micro-grid of neuron matrix points (10 cols x 12 rows)
    const gridPoints = [];
    const cols = 9;
    const rows = 11;
    const xStep = (planeWidth - 36) / (cols - 1);
    const yStep = (planeHeight - 36) / (rows - 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = -planeWidth / 2 + 18 + c * xStep + (seededRandom(s++) - 0.5) * 3;
        const y = -planeHeight / 2 + 18 + r * yStep + (seededRandom(s++) - 0.5) * 3;
        const baseAlpha = seededRandom(s++) * 0.22 + 0.12;
        gridPoints.push({ x, y, baseAlpha });
      }
    }

    // Active firing neurons on this plane
    const activeNeurons = [];
    const activeCount = isA || isB ? 7 : 3 + Math.floor(seededRandom(s++) * 4);
    for (let i = 0; i < activeCount; i++) {
      const idx = Math.floor(seededRandom(s++) * gridPoints.length);
      const gp = gridPoints[idx];
      activeNeurons.push({
        x: gp.x,
        y: gp.y,
        size: 1.8 + seededRandom(s++) * 1.5,
        alpha: 0.65 + seededRandom(s++) * 0.35,
        pulseOffset: seededRandom(s++) * Math.PI * 2,
        color: seededRandom(s++) > 0.6 ? '#e9b76d' : (seededRandom(s++) > 0.4 ? '#adcadb' : '#f0eee5'),
      });
    }

    // Key focal neurons
    let keyNeuron = null;
    if (isA) {
      keyNeuron = {
        x: -25,
        y: 35,
        name: 'L14 N8949',
        color: '#e9b76d',
        label: 'Neuron 8949 (Layer 14 · A)',
      };
    } else if (isB) {
      keyNeuron = {
        x: 28,
        y: -32,
        name: 'L13 N7956',
        color: '#adcadb',
        label: 'Neuron 7956 (Layer 13 · B)',
      };
    }

    return {
      name,
      z,
      isA,
      isB,
      gridPoints,
      activeNeurons,
      keyNeuron,
    };
  });

  const l14Idx = layers.findIndex(l => l.name === 'L14');
  const l13Idx = layers.findIndex(l => l.name === 'L13');
  const l12Idx = layers.findIndex(l => l.name === 'L12');
  const l11Idx = layers.findIndex(l => l.name === 'L11');
  const l10Idx = layers.findIndex(l => l.name === 'L10');
  const l15Idx = layers.findIndex(l => l.name === 'L15');
  const l16Idx = layers.findIndex(l => l.name === 'L16');

  const rays = [];

  // 1. Radiating fan from L14 N8949 (amber)
  const l14Key = layers[l14Idx].keyNeuron;
  [l10Idx, l11Idx, l12Idx].forEach((srcIdx) => {
    const srcLayer = layers[srcIdx];
    srcLayer.activeNeurons.forEach((an, i) => {
      if (i % 2 === 0) {
        rays.push({
          fromLayer: srcIdx,
          fromPos: { x: an.x, y: an.y },
          toLayer: l14Idx,
          toPos: { x: l14Key.x, y: l14Key.y },
          color: 'rgba(233, 183, 109, 0.45)',
          isFocal: true,
        });
      }
    });
  });

  // 2. Interaction bridge between Layer 13 Neuron B and Layer 14 Neuron A
  const l13Key = layers[l13Idx].keyNeuron;
  rays.push({
    fromLayer: l13Idx,
    fromPos: { x: l13Key.x, y: l13Key.y },
    toLayer: l14Idx,
    toPos: { x: l14Key.x, y: l14Key.y },
    color: '#e9b76d',
    width: 2.2,
    isFocal: true,
  });

  // 3. Downstream projection from L14 N8949 to L15 & L16
  [l15Idx, l16Idx].forEach((dstIdx) => {
    const dstLayer = layers[dstIdx];
    dstLayer.activeNeurons.forEach((an, i) => {
      rays.push({
        fromLayer: l14Idx,
        fromPos: { x: l14Key.x, y: l14Key.y },
        toLayer: dstIdx,
        toPos: { x: an.x, y: an.y },
        color: i % 2 === 0 ? 'rgba(233, 183, 109, 0.5)' : 'rgba(173, 202, 219, 0.5)',
        width: 1.2,
        isFocal: true,
      });
    });
  });

  // 4. Cross-layer feedforward paths
  for (let li = 0; li < layers.length - 1; li++) {
    const lA = layers[li];
    const lB = layers[li + 1];
    const maxLinks = Math.min(lA.activeNeurons.length, lB.activeNeurons.length);
    for (let k = 0; k < maxLinks; k++) {
      if ((li + k) % 2 === 0) {
        rays.push({
          fromLayer: li,
          fromPos: { x: lA.activeNeurons[k].x, y: lA.activeNeurons[k].y },
          toLayer: li + 1,
          toPos: { x: lB.activeNeurons[k].x, y: lB.activeNeurons[k].y },
          color: 'rgba(173, 202, 219, 0.28)',
          width: 0.9,
        });
      }
    }
  }

  // Travelling signal pulses / photon packets
  const pulses = [];
  for (let i = 0; i < 24; i++) {
    pulses.push({
      rayIdx: i % rays.length,
      progress: Math.random(),
      speed: 0.004 + Math.random() * 0.008,
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

    const distance = 800;
    const factor = (distance / (distance + z2)) * zoom;

    return {
      x: width * 0.5 + x1 * factor,
      y: height * 0.48 + y2 * factor,
      z: z2,
      scale: factor,
    };
  }

  // Render Loop
  let time = 0;
  function render() {
    time += 0.016;

    if (autoRotate && !isDragging) {
      rotY += 0.0005;
    }

    ctx.clearRect(0, 0, width, height);

    const runBtn = document.getElementById('runButton');
    const isGenerating = runBtn && runBtn.disabled && (runBtn.textContent.includes('Generating') || runBtn.textContent.includes('Running'));

    const renderList = [];

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

      if (layer.keyNeuron) {
        const pt = project(layer.keyNeuron.x, layer.keyNeuron.y, z);
        renderList.push({
          type: 'keyNeuron',
          z: pt.z,
          pt,
          keyNeuron: layer.keyNeuron,
          layer,
        });
      }
    });

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

    renderList.sort((a, b) => b.z - a.z);

    renderList.forEach((item) => {
      if (item.type === 'plane') {
        const { c1, c2, c3, c4, layer } = item;

        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(c3.x, c3.y);
        ctx.lineTo(c4.x, c4.y);
        ctx.closePath();

        const isHighlight = layer.isA || layer.isB;
        ctx.fillStyle = layer.isA
          ? 'rgba(233, 183, 109, 0.06)'
          : layer.isB
          ? 'rgba(173, 202, 219, 0.06)'
          : 'rgba(22, 35, 45, 0.35)';
        ctx.fill();

        ctx.strokeStyle = layer.isA
          ? 'rgba(233, 183, 109, 0.65)'
          : layer.isB
          ? 'rgba(173, 202, 219, 0.65)'
          : 'rgba(48, 64, 74, 0.5)';
        ctx.lineWidth = isHighlight ? 1.4 : 0.8;
        ctx.stroke();

        // Layer Name Label floating on top edge
        const topMidX = (c1.x + c2.x) * 0.5;
        const topMidY = (c1.y + c2.y) * 0.5 - 12 * c1.scale;
        ctx.font = `600 ${Math.max(9, Math.round(11 * c1.scale))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = layer.isA
          ? '#e9b76d'
          : layer.isB
          ? '#adcadb'
          : 'rgba(163, 176, 183, 0.65)';
        ctx.fillText(layer.name, topMidX, topMidY);

      } else if (item.type === 'gridPoint') {
        const { pt, baseAlpha, layer } = item;
        const r = 0.9 * pt.scale;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(0.6, r), 0, Math.PI * 2);
        ctx.fillStyle = layer.isA
          ? `rgba(233, 183, 109, ${baseAlpha})`
          : layer.isB
          ? `rgba(173, 202, 219, ${baseAlpha})`
          : `rgba(163, 176, 183, ${baseAlpha * 0.7})`;
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
        const { pt, an } = item;
        const pulse = Math.sin(time * 2.5 + an.pulseOffset) * 0.25 + 0.75;
        const r = an.size * pt.scale * pulse;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r * 2.0, 0, Math.PI * 2);
        ctx.fillStyle = an.color === '#e9b76d' ? 'rgba(233, 183, 109, 0.18)' : 'rgba(240, 238, 229, 0.12)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(0.9, r), 0, Math.PI * 2);
        ctx.fillStyle = an.color;
        ctx.fill();

      } else if (item.type === 'keyNeuron') {
        const { pt, keyNeuron } = item;
        const pulse = Math.sin(time * 4.0) * 0.35 + 1.0;
        const baseRadius = 5.5 * pt.scale;

        // Outer glow
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, baseRadius * 3.4 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = keyNeuron.color === '#e9b76d'
          ? 'rgba(233, 183, 109, 0.2)'
          : 'rgba(173, 202, 219, 0.2)';
        ctx.fill();

        // Target reticle
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, baseRadius * 2.0 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = keyNeuron.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Solid core
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Target Label
        ctx.font = `600 ${Math.max(10, Math.round(11 * pt.scale))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = keyNeuron.color;
        ctx.fillText(` ${keyNeuron.label}`, pt.x + baseRadius * 2.2, pt.y);
      }
    });

    // Photon packets
    pulses.forEach((p) => {
      p.progress += isGenerating ? p.speed * 3.0 : p.speed;
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
      ctx.arc(curX, curY, Math.max(1.2, 2.4 * curScale), 0, Math.PI * 2);
      ctx.fillStyle = ray.isFocal ? '#e9b76d' : '#adcadb';
      ctx.shadowColor = ray.isFocal ? '#e9b76d' : '#adcadb';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    requestAnimationFrame(render);
  }

  resize();
  requestAnimationFrame(render);
})();
