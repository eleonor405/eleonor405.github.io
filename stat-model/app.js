import * as THREE from 'three';

const $ = (selector) => document.querySelector(selector);
const palette = {
  mean: '#7c5cba', mode: '#d47a2c', median: '#d04f5f', q1: '#168b89',
  q3: '#637cbe', iqr: '#3e92c7', range: '#b36a9a', outlier: '#db4e34',
  sd: '#4a9a68', skew: '#8a6d3b'
};
const PRACTICE_SCORE_STORAGE_KEY = 'statistics-explorer.practice-scores.v1';

let learningData = [];
let practiceData = [];
let practiceScore = 0;
const practiceScores = [];
let practiceQuestionRecorded = false;
let practiceScoreStorageReady = true;
const chartInstances = new WeakMap();

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function display(value) {
  if (!Number.isFinite(value)) return '—';
  const rounded = round2(value);
  return String(rounded).includes('.') ? rounded.toFixed(2) : String(rounded);
}
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (!n) return null;
  return n % 2 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}
function calculate(data) {
  if (!data.length) return null;
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const med = median(sorted);
  let lower, upper;
  if (n % 2) {
    lower = sorted.slice(0, Math.floor(n / 2));
    upper = sorted.slice(Math.floor(n / 2) + 1);
  } else {
    lower = sorted.slice(0, n / 2);
    upper = sorted.slice(n / 2);
  }
  const q1 = median(lower) ?? med;
  const q3 = median(upper) ?? med;
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers = sorted.filter((value) => value < lowerFence || value > upperFence);
  const variance = sorted.reduce((acc, value) => acc + (value - mean) ** 2, 0) / n;
  const frequencies = new Map();
  sorted.forEach((value) => frequencies.set(value, (frequencies.get(value) || 0) + 1));
  const observations = data.map((value, index) => ({ value, index }));
  const maxCount = Math.max(...frequencies.values());
  const modes = maxCount === 1 ? [] : [...frequencies.entries()].filter(([, count]) => count === maxCount).map(([value]) => value);
  let skew = 'approximately symmetric';
  if (q1 !== q3) {
    const lowerSpread = med - q1;
    const upperSpread = q3 - med;
    const symmetryTolerance = iqr * 0.1;
    if (upperSpread - lowerSpread > symmetryTolerance) skew = 'positive skew';
    else if (lowerSpread - upperSpread > symmetryTolerance) skew = 'negative skew';
  }
  return { sorted, n, sum, mean, median: med, q1, q3, iqr, range: sorted[n - 1] - sorted[0],
    min: sorted[0], max: sorted[n - 1], lowerFence, upperFence, outliers, observations,
    sd: Math.sqrt(variance), modes, skew };
}

function parseData(text) {
  if (!text.trim()) return { error: 'Enter at least one valid data value.' };
  const parts = text.split(',').map((part) => part.trim());
  for (const part of parts) {
    if (!part) return { error: 'Remove the empty entry and enter a comma-separated data set.' };
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(part)) {
      return { error: `“${part}” is invalid. Use non-negative numeric values separated by commas.` };
    }
  }
  const values = parts.map(Number);
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    return { error: 'All values must be finite, non-negative numbers.' };
  }
  return { values };
}

function randomData(size = 12) {
  const n = size || 8 + Math.floor(Math.random() * 8);
  const base = 5 + Math.floor(Math.random() * 20);
  const values = Array.from({ length: n }, () => base + Math.floor(Math.random() * 32));
  if (Math.random() < 0.55) values[0] = base + 45 + Math.floor(Math.random() * 25);
  return values;
}

const statDefinitions = [
  ['mean', 'Mean', 'Add all values, then divide by the number of values.', 'sum of values ÷ n'],
  ['mode', 'Mode', 'Count how often each value occurs. The value(s) occurring most often are the mode.', 'Count values → choose greatest frequency'],
  ['median', 'Median', 'Order the data; find the middle value, or average the two middle values.', 'Middle of ordered data'],
  ['iqr', 'IQR', 'Order the data, find Q1 and Q3 as the medians of the lower and upper halves, then subtract Q1 from Q3.', 'Q3 − Q1'],
  ['range', 'Range', 'Subtract the smallest value from the largest value.', 'maximum − minimum'],
  ['outlier', 'Outliers', 'Compare values with fences 1.5 × IQR below Q1 and above Q3.', 'Fences: Q1 − 1.5IQR, Q3 + 1.5IQR'],
  ['sd', 'Population standard deviation', 'Find the mean; square each distance from it; average those squares; take the square root.', '√(Σ(x − μ)² ÷ N)'],
  ['skew', 'Skew', 'Compare the median’s position within the box and the whisker lengths.', 'Positive / negative / approximately symmetric']
];

function renderStats(stats, gridId = 'statsGrid', data = learningData) {
  const grid = $('#' + gridId);
  const values = {
    mean: display(stats.mean), mode: stats.modes.length ? stats.modes.map(display).join(', ') : 'No mode',
    median: display(stats.median), iqr: display(stats.iqr), range: display(stats.range),
    outlier: stats.outliers.length ? stats.outliers.map(display).join(', ') : 'None',
    sd: display(stats.sd), skew: stats.skew
  };
  const descriptions = {
    mode: stats.modes.length > 1 ? 'More than one value shares the highest count (multimodal).' : stats.modes.length === 0 ? 'Every value occurs once, so there is no mode.' : 'Count each value; the greatest frequency identifies the mode.',
    outlier: `Fences: ${display(stats.lowerFence)} to ${display(stats.upperFence)}`,
    skew: 'Based on box-plot asymmetry'
  };
  grid.innerHTML = statDefinitions.map(([key, label, description, rule]) => `
    <article class="stat-card" style="--stat-color:${palette[key]}">
      <button class="help-button" type="button" data-example="${key}" aria-label="Worked example for ${label}">?</button>
      <span class="stat-label">${label}</span>
      <strong>${values[key]}</strong>
      <p>${descriptions[key] || description}</p>
      <p class="stat-rule">${rule}</p>
    </article>
  `).join('');
  grid.querySelectorAll('[data-example]').forEach((button) => button.addEventListener('click', () => openExample(button.dataset.example, data)));
}

function updateLearning() {
  const parsed = parseData($('#dataInput').value);
  if (parsed.error) {
    $('#dataError').textContent = parsed.error;
    $('#statsGrid').innerHTML = '';
    ['boxPlot', 'ogivePlot', 'distributionPlot'].forEach((id) => renderPrompt(id, 'Enter a valid data set to draw this graph.'));
    $('#distributionLegend').replaceChildren();
    $('#distributionNote').textContent = '';
    $('#stemPlot').innerHTML = '<p class="hint">Enter a valid data set to create the stem-and-leaf plot.</p>';
    return;
  }
  $('#dataError').textContent = '';
  learningData = parsed.values;
  const stats = calculate(learningData);
  renderStats(stats);
  renderBoxPlot('boxPlot', stats, false);
  renderOgive('ogivePlot', stats);
  renderStem(stats);
  renderDistribution('distributionPlot', stats);
}

function setupScene(container) {
  const width = Math.max(container.clientWidth, 200);
  const height = Math.max(container.clientHeight, 180);
  let chart = chartInstances.get(container);
  if (!chart) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, width, 0, height, 0.1, 100);
    camera.position.set(0, 0, 50);
    camera.lookAt(0, 0, 0);
    const tooltip = document.createElement('div');
    tooltip.className = 'graph-tooltip';
    const labelLayer = document.createElement('div');
    labelLayer.className = 'chart-label-layer';
    container.classList.add('has-tooltip');
    container.replaceChildren(renderer.domElement, labelLayer, tooltip);
    scene.userData.labelLayer = labelLayer;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragState = null;
    const pointerHits = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(scene.children, true).filter((hit) => hit.object.userData.indicator);
    };
    renderer.domElement.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const target = pointerHits(event)
        .find((hit) => Number.isInteger(hit.object.userData.dataIndex));
      const domain = scene.userData.dragDomain;
      if (!target || !domain) return;
      dragState = { pointerId: event.pointerId, index: target.object.userData.dataIndex, domain };
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = 'grabbing';
      tooltip.style.display = 'none';
      event.preventDefault();
    });
    renderer.domElement.addEventListener('pointermove', (event) => {
      if (dragState && dragState.pointerId === event.pointerId) {
        const rect = renderer.domElement.getBoundingClientRect();
        const { min, max, left, right } = dragState.domain;
        const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left - left) / (right - left)));
        const value = round2(min + ratio * (max - min));
        if (learningData[dragState.index] !== value) {
          learningData[dragState.index] = value;
          $('#dataInput').value = learningData.map(display).join(', ');
          updateLearning();
        }
        return;
      }
      const targets = pointerHits(event);
      targets.sort((a, b) => (b.object.userData.priority || 0) - (a.object.userData.priority || 0));
      const target = targets[0];
      renderer.domElement.style.cursor = target && Number.isInteger(target.object.userData.dataIndex) ? 'grab' : 'crosshair';
      if (!target) {
        tooltip.style.display = 'none';
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      tooltip.textContent = target.object.userData.indicator;
      tooltip.style.display = 'block';
      tooltip.style.left = `${Math.max(4, Math.min(event.clientX - rect.left + 12, rect.width - 230))}px`;
      tooltip.style.top = `${Math.max(4, event.clientY - rect.top - 36)}px`;
    });
    const endDrag = (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      dragState = null;
      renderer.domElement.style.cursor = 'crosshair';
    };
    renderer.domElement.addEventListener('pointerup', endDrag);
    renderer.domElement.addEventListener('pointercancel', endDrag);
    renderer.domElement.addEventListener('lostpointercapture', endDrag);
    renderer.domElement.addEventListener('pointerleave', () => { tooltip.style.display = 'none'; });
    chart = { renderer, scene, camera, tooltip };
    chartInstances.set(container, chart);
  } else {
    chart.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (material.map) material.map.dispose();
          material.dispose();
        });
      }
    });
    chart.scene.clear();
  }
  const { renderer, scene, camera } = chart;
  chart.scene.userData.labelLayer.replaceChildren();
  scene.userData.labelLayer = chart.scene.userData.labelLayer;
  chart.tooltip.style.display = 'none';
  renderer.setSize(width, height);
  camera.right = width;
  camera.bottom = height;
  camera.updateProjectionMatrix();
  return { renderer, scene, camera, width, height };
}

function renderPrompt(containerId, message) {
  const { renderer, scene, camera, width, height } = setupScene($('#' + containerId));
  label(scene, message, width / 2, height / 2, '#697386', 10);
  renderer.render(scene, camera);
}

function line(scene, x1, y1, x2, y2, color = '#758198', width = 1) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (!length) return;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(length, Math.max(width, 2)),
    new THREE.MeshBasicMaterial({ color, depthTest: false, side: THREE.DoubleSide })
  );
  mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 1);
  mesh.rotation.z = Math.atan2(dy, dx);
  scene.add(mesh);
}
function label(scene, text, x, y, color = '#536078', scale = 11) {
  const element = document.createElement('span');
  element.className = 'chart-label';
  element.textContent = text;
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;
  element.style.color = color;
  element.style.fontSize = `${Math.max(9, scale)}px`;
  scene.userData.labelLayer.append(element);
}
function targetMarker(scene, x, y, color, indicator, radius = 5, dataIndex = null) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshBasicMaterial({ color, depthTest: false, side: THREE.DoubleSide })
  );
  mesh.position.set(x, y, 3);
  mesh.userData.indicator = indicator;
  mesh.userData.priority = Number.isInteger(dataIndex) ? 3 : /median|quartile|mode|mean/i.test(indicator) ? 2 : 1;
  if (Number.isInteger(dataIndex)) mesh.userData.dataIndex = dataIndex;
  scene.add(mesh);
  return mesh;
}
function dashedLine(scene, x1, y1, x2, y2, color = '#66758a') {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const dashSize = 7;
  const gapSize = 5;
  for (let start = 0; start < length; start += dashSize + gapSize) {
    const end = Math.min(start + dashSize, length);
    const startRatio = start / length;
    const endRatio = end / length;
    line(scene, x1 + dx * startRatio, y1 + dy * startRatio,
      x1 + dx * endRatio, y1 + dy * endRatio, color, 2);
  }
}
function axisScale(min, max, targetTicks = 5) {
  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.1, 1);
    min = Math.max(0, min - padding);
    max += padding;
  }
  const rawStep = (max - min) / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceStep = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  return {
    min: Math.max(0, Math.floor(min / niceStep) * niceStep),
    max: Math.ceil(max / niceStep) * niceStep,
    step: niceStep
  };
}
function renderBoxPlot(containerId, stats, practice, draggable = !practice) {
  const container = $('#' + containerId);
  const { renderer, scene, camera, width, height } = setupScene(container);
  const hasSummary = [stats.min, stats.q1, stats.median, stats.q3, stats.max].every(Number.isFinite);
  const low = hasSummary ? stats.min : 0;
  const high = hasSummary ? stats.max : 100;
  const scale = axisScale(low, high);
  const left = 58, right = width - 24, y = 92, axisY = height - 42;
  scene.userData.dragDomain = draggable ? { min: scale.min, max: scale.max, left, right } : null;
  const mapX = (value) => left + ((value - scale.min) / (scale.max - scale.min)) * (right - left);
  line(scene, left, axisY, right, axisY, '#59677b', 1.5);
  const tickCount = Math.round((scale.max - scale.min) / scale.step);
  for (let i = 0; i <= tickCount; i++) {
    const x = left + (i / tickCount) * (right - left);
    line(scene, x, axisY - 5, x, axisY + 5, '#7f8a9b');
    if (i > 0 && i < tickCount) line(scene, x, 45, x, axisY, '#e8ecf1');
    const value = scale.min + i * scale.step;
    label(scene, display(value), x, axisY + 17, '#536078', 9);
  }
  label(scene, 'Data value', (left + right) / 2, height - 6, '#536078', 9);
  if (hasSummary) {
    label(scene, `Q1 ${display(stats.q1)}`, left + (right - left) * 0.2, 49, palette.q1, 8);
    label(scene, `Median ${display(stats.median)}`, left + (right - left) * 0.5, 49, palette.median, 8);
    label(scene, `Q3 ${display(stats.q3)}`, left + (right - left) * 0.8, 49, palette.q3, 8);
  } else if (practice) {
    label(scene, 'Enter the five-number summary below', width / 2, 90, '#697386', 9);
  }

  if (hasSummary) {
    let whiskerMin = stats.min;
    let whiskerMax = stats.max;
    if (!practice && stats.sorted) {
      const inliers = stats.sorted.filter((value) => value >= stats.lowerFence && value <= stats.upperFence);
      if (inliers.length) {
        whiskerMin = inliers[0];
        whiskerMax = inliers[inliers.length - 1];
      }
    }
    const minX = mapX(whiskerMin), maxX = mapX(whiskerMax);
    const q1x = mapX(stats.q1), medx = mapX(stats.median), q3x = mapX(stats.q3);
    line(scene, minX, y, maxX, y, '#536078', 2);
    line(scene, minX, y - 12, minX, y + 12, '#536078', 2);
    line(scene, maxX, y - 12, maxX, y + 12, '#536078', 2);

    const boxHeight = 42;
    const boxFill = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(q3x - q1x, 2), boxHeight),
      new THREE.MeshBasicMaterial({ color: palette.iqr, transparent: true, opacity: 0.18, depthTest: false, side: THREE.DoubleSide })
    );
    boxFill.position.set((q1x + q3x) / 2, y, 0.5);
    boxFill.userData.indicator = `Interquartile range: Q1 ${display(stats.q1)} to Q3 ${display(stats.q3)}; IQR ${display(stats.iqr ?? stats.q3 - stats.q1)}.`;
    scene.add(boxFill);
    line(scene, q1x, y - boxHeight / 2, q3x, y - boxHeight / 2, palette.iqr, 2);
    line(scene, q3x, y - boxHeight / 2, q3x, y + boxHeight / 2, palette.iqr, 2);
    line(scene, q3x, y + boxHeight / 2, q1x, y + boxHeight / 2, palette.iqr, 2);
    line(scene, q1x, y + boxHeight / 2, q1x, y - boxHeight / 2, palette.iqr, 2);
    line(scene, medx, y - boxHeight / 2, medx, y + boxHeight / 2, palette.median, 3);
    label(scene, `Whisker low ${display(whiskerMin)}`, minX, y + 29, '#536078', 8);
    label(scene, `Whisker high ${display(whiskerMax)}`, maxX, y + 43, '#536078', 8);
    targetMarker(scene, q1x, y, palette.q1, `Q1 (lower quartile): ${display(stats.q1)}.`);
    targetMarker(scene, medx, y, palette.median, `Median (Q2): ${display(stats.median)}.`);
    targetMarker(scene, q3x, y, palette.q3, `Q3 (upper quartile): ${display(stats.q3)}.`);
    targetMarker(scene, minX, y, '#536078', `Lower whisker: ${display(whiskerMin)}.`);
    targetMarker(scene, maxX, y, '#536078', `Upper whisker: ${display(whiskerMax)}.`);
    if (!practice && stats.outliers) {
      stats.outliers.forEach((value) => targetMarker(scene, mapX(value), y, palette.outlier, `Outlier: ${display(value)}.`, 6));
    }
    if (!practice && stats.observations) {
      const frequencies = new Map();
      stats.sorted.forEach((value) => frequencies.set(value, (frequencies.get(value) || 0) + 1));
      const seen = new Map();
      stats.observations.forEach(({ value, index }) => {
        const occurrence = seen.get(value) || 0;
        const frequency = frequencies.get(value);
        seen.set(value, occurrence + 1);
        const offset = (occurrence - (frequency - 1) / 2) * 5;
        targetMarker(scene, mapX(value), y + offset, palette.iqr,
          `Data observation ${index + 1}: ${display(value)}. Drag to edit this value.`,
          3, draggable ? index : null);
      });
    }
  }
  renderer.render(scene, camera);
}

function renderOgive(containerId, stats, practice = false, draggable = !practice) {
  const container = $('#' + containerId);
  const { renderer, scene, camera, width, height } = setupScene(container);
  const left = 58, right = width - 22, top = 30, bottom = height - 45;
  const n = stats.n || 1;
  const hasSummary = [stats.min, stats.q1, stats.median, stats.q3, stats.max].every(Number.isFinite);
  const low = hasSummary ? stats.min : 0;
  const high = hasSummary ? stats.max : 100;
  const scale = axisScale(low, high);
  line(scene, left, top, left, bottom, '#59677b', 1.5);
  line(scene, left, bottom, right, bottom, '#59677b', 1.5);
  label(scene, 'Cumulative frequency (number of values)', width / 2, 12, '#536078', 8);
  label(scene, 'Data value', (left + right) / 2, height - 5, '#536078', 9);
  const mapX = (value) => left + ((value - scale.min) / (scale.max - scale.min)) * (right - left);
  const mapY = (count) => bottom - (count / n) * (bottom - top);
  scene.userData.dragDomain = draggable ? { min: scale.min, max: scale.max, left, right } : null;
  for (let i = 0; i <= 4; i++) {
    const count = n * i / 4;
    const y = mapY(count);
    line(scene, left - 4, y, right, y, count === 0 ? '#59677b' : '#e5e9ef');
    label(scene, display(count), left - 22, y, '#536078', 8);
  }
  const xTickCount = Math.round((scale.max - scale.min) / scale.step);
  for (let i = 0; i <= xTickCount; i++) {
    const x = left + (i / xTickCount) * (right - left);
    line(scene, x, bottom, x, bottom + 4, '#59677b');
    label(scene, display(scale.min + i * scale.step), x, bottom + 17, '#536078', 8);
  }

  if (hasSummary) {
    const actualEntries = practice
      ? []
      : (() => {
          const counts = new Map();
          stats.sorted.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
          let cumulative = 0;
          const result = [];
          [...counts.entries()].forEach(([value, frequency]) => {
            cumulative += frequency;
            result.push([value, cumulative, `Observed value ${display(value)}; cumulative frequency ${cumulative}.`]);
          });
          return result;
        })();
    const summaryEntries = [
      [stats.min, 0, 'Start of data range.'],
      [stats.q1, n * 0.25, `Q1 (lower quartile): ${display(stats.q1)} at one-quarter cumulative frequency.`],
      [stats.median, n * 0.5, `Median (Q2): ${display(stats.median)} at half the total frequency (${display(n / 2)}).`],
      [stats.q3, n * 0.75, `Q3 (upper quartile): ${display(stats.q3)} at three-quarter cumulative frequency.`],
      [stats.max, n, 'End of data range.']
    ];
    const entries = practice ? summaryEntries : actualEntries;
    entries.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const points = entries.map(([value, count]) => new THREE.Vector3(mapX(value), mapY(count), 0));
    points.slice(1).forEach((point, index) => {
      const previous = points[index];
      line(scene, previous.x, previous.y, point.x, point.y, palette.q1, 3);
    });
    if (practice) {
      entries.forEach(([value, count, description]) => {
        targetMarker(scene, mapX(value), mapY(count), '#168b89', description);
      });
    } else if (stats.observations) {
      [...stats.observations].sort((a, b) => a.value - b.value || a.index - b.index)
        .forEach(({ value, index }, rank) => {
          targetMarker(scene, mapX(value), mapY(rank + 1), palette.iqr,
            `Data observation ${index + 1}: ${display(value)}; cumulative frequency ${rank + 1}. Drag to edit this value.`,
            4, draggable ? index : null);
        });
    }

    const quartileGuides = [
      { name: 'Q1', value: stats.q1, count: n * 0.25, color: palette.q1 },
      { name: 'Median (Q2)', value: stats.median, count: n * 0.5, color: palette.median },
      { name: 'Q3', value: stats.q3, count: n * 0.75, color: palette.q3 }
    ];
    quartileGuides.forEach(({ name, value, count, color }) => {
      const x = mapX(value), y = mapY(count);
      dashedLine(scene, left, y, x, y, color);
      dashedLine(scene, x, y, x, bottom, color);
      targetMarker(scene, x, y, color, `${name}: ${display(value)} at cumulative frequency ${display(count)}.`, 6);
      label(scene, `${name} ${display(value)}`, x, y - 13, color, 8);
    });
    if (!practice && Number.isFinite(stats.mean)) {
      const meanX = mapX(stats.mean);
      dashedLine(scene, meanX, bottom - 3, meanX, bottom, palette.mean);
      targetMarker(scene, meanX, bottom, palette.mean, `Mean: ${display(stats.mean)}.`, 5);
    }
    if (!practice && stats.modes) {
      stats.modes.forEach((value) => targetMarker(scene, mapX(value), bottom, palette.mode, `Mode value: ${display(value)}.`, 5));
    }
  } else if (practice) {
    label(scene, 'Enter the five-number summary to plot the ogive', width / 2, height / 2, '#697386', 9);
  }
  renderer.render(scene, camera);
}

function renderDistribution(containerId, stats, legendId = 'distributionLegend', noteId = 'distributionNote', draggable = true) {
  const container = $('#' + containerId);
  const { renderer, scene, camera, width, height } = setupScene(container);
  const lowerMarker = stats.mean - stats.sd;
  const upperMarker = stats.mean + stats.sd;
  const scale = axisScale(Math.min(stats.min, lowerMarker), Math.max(stats.max, upperMarker));
  const left = 58, right = width - 24, top = 36, bottom = height - 42;
  scene.userData.dragDomain = draggable ? { min: scale.min, max: scale.max, left, right } : null;
  const mapX = (value) => left + ((value - scale.min) / (scale.max - scale.min)) * (right - left);
  const mapY = (value) => bottom - value * (bottom - top);
  line(scene, left, top, left, bottom, '#59677b', 2);
  line(scene, left, bottom, right, bottom, '#59677b', 2);
  label(scene, 'Relative density (scaled shape guide)', width / 2, 12, '#536078', 8);
  label(scene, 'Data value', (left + right) / 2, height - 5, '#536078', 9);
  [0, 0.5, 1].forEach((value) => {
    const y = mapY(value);
    line(scene, left - 4, y, right, y, value === 0 ? '#59677b' : '#e5e9ef', 2);
    label(scene, display(value), left - 22, y, '#536078', 8);
  });
  const tickCount = Math.round((scale.max - scale.min) / scale.step);
  for (let i = 0; i <= tickCount; i++) {
    const x = left + (i / tickCount) * (right - left);
    line(scene, x, bottom, x, bottom + 4, '#59677b', 2);
    label(scene, display(scale.min + i * scale.step), x, bottom + 16, '#536078', 8);
  }

  const span = stats.max - stats.min;
  const bandwidth = Math.max(1.06 * stats.sd * stats.n ** -0.2, span / 20, 0.01);
  const densityAt = (value) => stats.sorted.reduce((total, sample) => {
    const z = (value - sample) / bandwidth;
    return total + Math.exp(-0.5 * z * z);
  }, 0) / stats.n;
  const samples = 140;
  const curve = Array.from({ length: samples + 1 }, (_, index) => {
    const value = scale.min + (index / samples) * (scale.max - scale.min);
    return { value, density: densityAt(value) };
  });
  const peak = Math.max(...curve.map(({ density }) => density), Number.EPSILON);
  const curvePoints = curve.map(({ value, density }) => [mapX(value), mapY(density / peak)]);
  curvePoints.slice(1).forEach(([x, y], index) => {
    const [prevX, prevY] = curvePoints[index];
    line(scene, prevX, prevY, x, y, palette.skew, 3);
  });

  const guides = [
    { name: 'Q1', value: stats.q1, color: palette.q1, text: `Q1 (lower quartile): ${display(stats.q1)}.` },
    { name: 'Median (Q2)', value: stats.median, color: palette.median, text: `Median (Q2): ${display(stats.median)}.` },
    { name: 'Q3', value: stats.q3, color: palette.q3, text: `Q3 (upper quartile): ${display(stats.q3)}.` },
    { name: 'Mean', value: stats.mean, color: palette.mean, text: `Mean: ${display(stats.mean)}.` },
    { name: 'Mean − SD (μ − σ)', value: lowerMarker, color: palette.sd, text: `One population standard deviation below the mean (μ − σ): ${display(lowerMarker)}.` },
    { name: 'Mean + SD (μ + σ)', value: upperMarker, color: palette.sd, text: `One population standard deviation above the mean (μ + σ): ${display(upperMarker)}.` }
  ];
  guides.forEach(({ value, color, text, name }) => {
    const x = Math.max(left, Math.min(right, mapX(value)));
    if (name === 'Mean') line(scene, x, top, x, bottom, color, 3);
    else dashedLine(scene, x, top, x, bottom, color);
    targetMarker(scene, x, mapY(densityAt(value) / peak), color, text, 5);
  });

  const frequencies = new Map();
  stats.observations.forEach(({ value }) => frequencies.set(value, (frequencies.get(value) || 0) + 1));
  const seen = new Map();
  stats.observations.forEach(({ value, index }) => {
    const occurrence = seen.get(value) || 0;
    const frequency = frequencies.get(value);
    seen.set(value, occurrence + 1);
    const x = mapX(value);
    const y = mapY(densityAt(value) / peak) + (occurrence - (frequency - 1) / 2) * 5;
    const isMode = stats.modes.includes(value);
    targetMarker(scene, x, y, isMode ? palette.mode : palette.iqr,
      isMode ? `Mode observation ${index + 1}: ${display(value)}. Drag to edit this value.` : `Data observation ${index + 1}: ${display(value)}. Drag to edit this value.`,
      isMode ? 4 : 3, draggable ? index : null);
  });

  const legend = $('#' + legendId);
  legend.replaceChildren();
  const legendItems = [
    ...guides.map(({ name, value, color }) => [`${name}: ${display(value)}`, color]),
    ...(stats.modes.length ? [[`Mode: ${stats.modes.map(display).join(', ')}`, palette.mode]] : [])
  ];
  legendItems.forEach(([text, color]) => {
    const item = document.createElement('span');
    const swatch = document.createElement('i');
    swatch.style.setProperty('--legend-color', color);
    item.append(swatch, document.createTextNode(text));
    legend.append(item);
  });
  $('#' + noteId).textContent = stats.n < 5
    ? `Smoothed from ${stats.n} value${stats.n === 1 ? '' : 's'}; treat the curve as a rough shape guide, not a normal model.`
    : 'Smoothed from the current data; the curve is a shape guide and does not assume a normal distribution.';
  renderer.render(scene, camera);
}

function renderStem(stats, containerId = 'stemPlot', keyId = 'stemKey', keyText = 'Key: 3 | 5 = 35; 3 | 5.2 = 35.2') {
  const frequencies = new Map();
  stats.sorted.forEach((value) => frequencies.set(value, (frequencies.get(value) || 0) + 1));
  const maxFrequency = Math.max(...frequencies.values());
  const modes = new Set(maxFrequency === 1 ? [] : [...frequencies.entries()].filter(([, count]) => count === maxFrequency).map(([value]) => value));
  const groups = new Map();
  stats.sorted.forEach((value) => {
    const stem = Math.floor(value / 10);
    const leaf = display(value - stem * 10);
    if (!groups.has(stem)) groups.set(stem, []);
    groups.get(stem).push({ leaf, value });
  });
  const stemHtml = [...groups.entries()].map(([stem, leaves]) =>
    `<tr><td>${stem}</td><td>${leaves.map(({ leaf, value }) =>
      `<span class="${modes.has(value) ? 'mode-leaf' : ''}" title="${modes.has(value) ? `Mode value ${display(value)}; frequency ${frequencies.get(value)}.` : `Data value ${display(value)}.`}">${leaf}</span>`).join(' ')}</td></tr>`).join('');
  $('#' + containerId).innerHTML = `<table class="stem-table"><thead><tr><th>Stem</th><th>Leaves</th></tr></thead><tbody>${stemHtml}</tbody></table>`;
  $('#' + keyId).textContent = keyText;
}

function openExample(key, data = learningData) {
  const stats = calculate(data);
  const sortedText = stats.sorted.join(', ');
  const lowerText = stats.sorted.length % 2 ? stats.sorted.slice(0, Math.floor(stats.n / 2)).join(', ') : stats.sorted.slice(0, stats.n / 2).join(', ');
  const upperText = stats.sorted.length % 2 ? stats.sorted.slice(Math.floor(stats.n / 2) + 1).join(', ') : stats.sorted.slice(stats.n / 2).join(', ');
  const titles = { mean: 'Mean', mode: 'Mode', median: 'Median', q1: 'Q1 and quartiles', q3: 'Q1 and quartiles',
    iqr: 'Interquartile range', range: 'Range', outlier: 'Outliers', sd: 'Population standard deviation', skew: 'Skew' };
  let body = '';
  if (key === 'mean') body = `<ol><li>Add the values: <code>${stats.sorted.join(' + ')}</code> = ${stats.sum}.</li><li>Divide by the number of values: ${stats.sum} ÷ ${stats.n}.</li></ol><strong>Mean = ${display(stats.mean)}</strong>`;
  if (key === 'mode') {
    const frequencies = new Map();
    stats.sorted.forEach((value) => frequencies.set(value, (frequencies.get(value) || 0) + 1));
    const frequencyRows = [...frequencies.entries()].map(([value, count]) => `<tr><td>${display(value)}</td><td>${count}</td></tr>`).join('');
    body = `<ol><li>List each different value once.</li><li>Count how often each value occurs.</li><li>Find the greatest frequency and select every value with that count.</li></ol>
      <table class="frequency-table"><thead><tr><th>Value</th><th>Frequency (count)</th></tr></thead><tbody>${frequencyRows}</tbody></table>
      <strong>${stats.modes.length ? `Mode(s): ${stats.modes.map(display).join(', ')} (frequency ${Math.max(...frequencies.values())}).` : 'No mode — every value occurs once.'}</strong>`;
  }
  if (key === 'median') body = `<ol><li>Order the data: <code>${sortedText}</code>.</li><li>Locate the middle value${stats.n % 2 ? '.' : 's and average them.'}</li></ol><strong>Median = ${display(stats.median)}</strong>`;
  if (key === 'q1' || key === 'q3') body = `<ol><li>Ordered data: <code>${sortedText}</code>.</li><li>Overall median: ${display(stats.median)}.</li><li>Lower half: <code>${lowerText}</code>; Q1 = ${display(stats.q1)}.</li><li>Upper half: <code>${upperText}</code>; Q3 = ${display(stats.q3)}.</li></ol><strong>Q1 = ${display(stats.q1)}, Q3 = ${display(stats.q3)}</strong>`;
  if (key === 'iqr') body = `<ol>
    <li>Order the data: <code>${sortedText}</code>.</li>
    <li>Find the overall median: ${display(stats.median)}. For an odd number of values, leave it out of both halves.</li>
    <li>Lower half: <code>${lowerText}</code>. Its median is Q1 = <strong>${display(stats.q1)}</strong>.</li>
    <li>Upper half: <code>${upperText}</code>. Its median is Q3 = <strong>${display(stats.q3)}</strong>.</li>
    <li>Subtract: <code>IQR = Q3 − Q1 = ${display(stats.q3)} − ${display(stats.q1)}</code>.</li>
  </ol><strong>IQR = ${display(stats.iqr)}</strong>`;
  if (key === 'range') body = `<p>Minimum = ${display(stats.min)} and maximum = ${display(stats.max)}.</p><p><code>Range = maximum − minimum</code></p><strong>Range = ${display(stats.range)}</strong>`;
  if (key === 'outlier') body = `<ol><li>Lower fence: ${display(stats.q1)} − 1.5 × ${display(stats.iqr)} = <strong>${display(stats.lowerFence)}</strong>.</li><li>Upper fence: ${display(stats.q3)} + 1.5 × ${display(stats.iqr)} = <strong>${display(stats.upperFence)}</strong>.</li><li>Values strictly outside these fences are outliers.</li></ol><strong>${stats.outliers.length ? `Outliers: ${stats.outliers.map(display).join(', ')}` : 'No outliers.'}</strong>`;
  if (key === 'sd') {
    const distances = stats.sorted.map((value) => `${display(value)} − ${display(stats.mean)} = ${display(value - stats.mean)}`).join('<br>');
    body = `<ol><li>Mean: ${display(stats.mean)}.</li><li>Subtract the mean from each value:<br>${distances}</li><li>Square the differences, add them, and divide by ${stats.n}; then take the square root.</li></ol><strong>Population standard deviation = ${display(stats.sd)}</strong>`;
  }
  if (key === 'skew') body = `<p>Compare the distance from Q1 to the median and from the median to Q3. Classify from the box plot.</p><strong>${stats.skew.charAt(0).toUpperCase() + stats.skew.slice(1)}</strong>`;
  $('#exampleTitle').textContent = titles[key];
  $('#exampleBody').innerHTML = body;
  $('#workedExample').showModal();
}

function startPractice() {
  const contexts = [
    ['Library visits', 'number of visits made by students in one month'],
    ['Bike distances', 'kilometres travelled by bike riders'],
    ['Screen time', 'daily screen time in minutes'],
    ['Plant heights', 'heights in centimetres from a class experiment'],
    ['Basketball scores', 'points scored across several matches']
  ];
  const [title, prompt] = contexts[Math.floor(Math.random() * contexts.length)];
  const n = 7 + Math.floor(Math.random() * 12);
  let values = randomData(n);
  while (calculate(values).q1 === calculate(values).q3) values = randomData(n);
  practiceData = values;
  practiceQuestionRecorded = false;
  renderPracticeScore();
  $('#practiceContext').textContent = title;
  $('#practicePrompt').textContent = `Calculate the statistics for these ${n} recorded ${prompt}. Use the same values to build your graphs, then check your answers.`;
  $('#practiceDataValues').textContent = values.map(display).join(', ');
  $('#practiceForm').reset();
  $('#feedback').classList.add('hidden');
  $('#feedback').innerHTML = '';
  ['practiceMin', 'practiceQ1', 'practiceMedian', 'practiceQ3', 'practiceMax'].forEach((id) => $('#' + id).value = '');
  updatePracticeGraph();
}

function updatePracticeGraph() {
  const read = (id) => {
    const value = $('#' + id).value.trim();
    return value === '' ? null : Number(value);
  };
  const min = read('practiceMin'), q1 = read('practiceQ1'), med = read('practiceMedian');
  const q3 = read('practiceQ3'), max = read('practiceMax');
  const values = [min, q1, med, q3, max];
  if (values.some((value) => value !== null && (!Number.isFinite(value) || value < 0))) return;
  const complete = values.every(Number.isFinite);
  const ordered = !complete || values.every((value, index) => index === 0 || values[index - 1] <= value);
  const boxContainer = $('#practiceBoxPlot').parentElement;
  let graphError = boxContainer.querySelector('.graph-error');
  if (!graphError) {
    graphError = document.createElement('p');
    graphError.className = 'graph-error';
    boxContainer.append(graphError);
  }
  graphError.textContent = complete && !ordered ? 'Enter values in order: minimum ≤ Q1 ≤ median ≤ Q3 ≤ maximum.' : '';
  const graphValues = complete && ordered
    ? { min, q1, median: med, q3, max, n: practiceData.length, iqr: q3 - q1 }
    : { min: null, q1: null, median: null, q3: null, max: null, n: practiceData.length };
  renderBoxPlot('practiceBoxPlot', graphValues, true);
  renderOgive('practiceOgivePlot', graphValues, true);
}

function sameNumber(input, correct) {
  if (input.trim() === '') return false;
  const value = Number(input);
  return Number.isFinite(value) && round2(value) === round2(correct);
}
function parseOutliers(input) {
  const text = input.trim();
  if (!text) return null;
  if (/^none$/i.test(text)) return [];
  const values = text.split(',').map((part) => part.trim());
  if (values.some((part) => part === '' || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(part))) return null;
  return values.map(Number).sort((a, b) => a - b);
}
function renderPracticeScore() {
  $('#practiceScoreValue').textContent = String(practiceScore);
  $('#practiceQuestionCount').textContent = String(practiceScores.length);
}
function restorePracticeScores() {
  try {
    const stored = window.localStorage.getItem(PRACTICE_SCORE_STORAGE_KEY);
    if (stored === null) return;
    const payload = JSON.parse(stored);
    if (payload?.version !== 1 || !Array.isArray(payload.scores) ||
        payload.scores.some((score) => !Number.isInteger(score) || score < 0 || score > 8)) {
      throw new Error('Saved practice score history has an unsupported format.');
    }
    practiceScores.push(...payload.scores);
    practiceScore = practiceScores.reduce((total, score) => total + score, 0);
  } catch (error) {
    practiceScoreStorageReady = false;
    $('#practiceScoreNotice').textContent = 'Saved scores could not be loaded. Use the reset button to clear the saved history.';
    console.error('Unable to load practice score history:', error);
  }
}
function savePracticeScores() {
  if (!practiceScoreStorageReady) return;
  try {
    window.localStorage.setItem(PRACTICE_SCORE_STORAGE_KEY, JSON.stringify({
      version: 1,
      scores: practiceScores
    }));
    $('#practiceScoreNotice').textContent = '';
  } catch (error) {
    practiceScoreStorageReady = false;
    $('#practiceScoreNotice').textContent = 'Scores are currently in memory only; browser storage could not save them.';
    console.error('Unable to save practice score history:', error);
  }
}
function resetPracticeScore() {
  try {
    window.localStorage.removeItem(PRACTICE_SCORE_STORAGE_KEY);
    practiceScoreStorageReady = true;
    $('#practiceScoreNotice').textContent = '';
  } catch (error) {
    practiceScoreStorageReady = false;
    $('#practiceScoreNotice').textContent = 'The score was reset for this page, but saved history could not be cleared.';
    console.error('Unable to clear practice score history:', error);
  }
  practiceScores.length = 0;
  practiceScore = 0;
  practiceQuestionRecorded = false;
  renderPracticeScore();
  updateMeta();
  $('#feedback').classList.add('hidden');
  $('#feedback').innerHTML = '';
}
function submitPractice(event) {
  event.preventDefault();
  const stats = calculate(practiceData);
  const form = new FormData(event.currentTarget);
  const mean = form.get('mean');
  const medianAnswer = form.get('median');
  const modeAnswer = form.get('mode');
  const iqr = form.get('iqr');
  const rangeAnswer = form.get('range');
  const sd = form.get('sd');
  const outlierAnswer = parseOutliers(form.get('outliers'));
  const modeValues = parseOutliers(modeAnswer);
  const skewAnswer = form.get('skew');
  const outlierCorrect = stats.outliers.map(Number).sort((a, b) => a - b);
  const outliersMatch = outlierAnswer !== null &&
    outlierAnswer.length === outlierCorrect.length &&
    outlierAnswer.every((value, index) => round2(value) === round2(outlierCorrect[index]));
  const modeCorrect = stats.modes.map(Number).sort((a, b) => a - b);
  const modeMatches = modeValues !== null &&
    modeValues.length === modeCorrect.length &&
    modeValues.every((value, index) => round2(value) === round2(modeCorrect[index]));
  const frequencies = new Map();
  stats.sorted.forEach((value) => frequencies.set(value, (frequencies.get(value) || 0) + 1));
  const frequencySummary = [...frequencies.entries()].map(([value, count]) => `${display(value)} occurs ${count} time${count === 1 ? '' : 's'}`).join('; ');
  const skewKey = stats.skew === 'approximately symmetric' ? 'symmetric' : stats.skew.includes('positive') ? 'positive' : 'negative';
  const rows = [
    ['Mean', mean, stats.mean, sameNumber(mean, stats.mean)],
    ['Median', medianAnswer, stats.median, sameNumber(medianAnswer, stats.median)],
    ['Mode', modeAnswer, stats.modes.length ? stats.modes.map(display).join(', ') : 'None', modeMatches],
    ['IQR', iqr, stats.iqr, sameNumber(iqr, stats.iqr)],
    ['Range', rangeAnswer, stats.range, sameNumber(rangeAnswer, stats.range)],
    ['Population SD', sd, stats.sd, sameNumber(sd, stats.sd)],
    ['Outliers', form.get('outliers'), stats.outliers.length ? stats.outliers.map(display).join(', ') : 'None', outliersMatch],
    ['Skew', skewAnswer ? skewAnswer : 'Blank', skewKey === 'symmetric' ? 'Approximately symmetric' : `${skewKey.charAt(0).toUpperCase()}${skewKey.slice(1)} skew`, skewAnswer === skewKey]
  ];
  const questionScore = rows.filter(([, , , correct]) => correct).length;
  if (practiceQuestionRecorded && practiceScores.length) {
    practiceScores[practiceScores.length - 1] = questionScore;
  } else {
    practiceScores.push(questionScore);
    practiceQuestionRecorded = true;
  }
  practiceScore = practiceScores.reduce((total, score) => total + score, 0);
  savePracticeScores();
  renderPracticeScore();
  updateMeta();
  const feedback = $('#feedback');
  feedback.innerHTML = `
    <p class="score-result"><strong>This question: ${questionScore} / 8 points</strong> · Cumulative score: ${practiceScore} points across ${practiceScores.length} questions</p>
    <table><thead><tr><th>Answer</th><th>Your entry</th><th>Correct</th><th>Result</th></tr></thead>
    <tbody>${rows.map(([label, your, correct, ok]) => `<tr><td>${label}</td><td>${String(your) || 'Blank'}</td><td>${typeof correct === 'number' ? display(correct) : correct}</td><td class="${ok ? 'correct' : 'incorrect'}">${ok ? 'Correct' : 'Incorrect'}</td></tr>`).join('')}</tbody></table>
    <div class="solution"><strong>Worked solution</strong><br>
      Ordered data: <code>${stats.sorted.join(', ')}</code><br>
      Mean: ${stats.sum} ÷ ${stats.n} = <strong>${display(stats.mean)}</strong>.<br>
      Mode: ${frequencySummary}. ${stats.modes.length ? `The most frequent value(s) are <strong>${stats.modes.map(display).join(', ')}</strong>.` : 'Every value occurs once, so there is no mode.'}<br>
      Median: <strong>${display(stats.median)}</strong>; Q1 = ${display(stats.q1)}; Q3 = ${display(stats.q3)}; IQR = ${display(stats.iqr)}.<br>
      Range: ${display(stats.max)} − ${display(stats.min)} = <strong>${display(stats.range)}</strong>.<br>
      Population standard deviation: <strong>${display(stats.sd)}</strong>.<br>
      Outlier fences: ${display(stats.lowerFence)} and ${display(stats.upperFence)}. ${stats.outliers.length ? `Outliers: ${stats.outliers.map(display).join(', ')}.` : 'There are no outliers.'}<br>
      Skew: <strong>${stats.skew}</strong>, based on the shape of the box plot.
    </div>`;
  feedback.classList.remove('hidden');
}

function updateMeta() {
  $('#metaTotalScore').textContent = String(practiceScore);
  $('#metaQuestionCount').textContent = String(practiceScores.length);
  $('#metaDataValues').textContent = practiceScores.length ? practiceScores.map(display).join(', ') : 'No completed questions yet.';
  $('#metaPrompt').textContent = practiceScores.length
    ? 'Each value is the score earned on one submitted Practice Mode question. The graphs and indicators update when you submit another question.'
    : 'Complete and submit a Practice Mode question to start your score data set.';
  if ($('#metaSection').classList.contains('hidden')) return;
  if (!practiceScores.length) {
    $('#metaStatsGrid').innerHTML = '<p class="hint">Your statistics will appear here after your first submitted question.</p>';
    renderPrompt('metaBoxPlot', 'Complete a Practice Mode question to plot your score data.');
    renderPrompt('metaOgivePlot', 'Complete a Practice Mode question to plot your score data.');
    $('#metaStemPlot').innerHTML = '<p class="hint">Your stem-and-leaf plot will appear after your first submitted question.</p>';
    $('#metaDistributionLegend').replaceChildren();
    renderPrompt('metaDistributionPlot', 'Complete a Practice Mode question to plot your score data.');
    $('#metaDistributionNote').textContent = '';
    return;
  }
  const stats = calculate(practiceScores);
  renderStats(stats, 'metaStatsGrid', practiceScores);
  renderBoxPlot('metaBoxPlot', stats, false, false);
  renderOgive('metaOgivePlot', stats, false, false);
  renderStem(stats, 'metaStemPlot', 'metaStemKey', 'Key: 0 | 5 = 5 points');
  renderDistribution('metaDistributionPlot', stats, 'metaDistributionLegend', 'metaDistributionNote', false);
}

function switchMode(mode) {
  const learning = mode === 'learning';
  const practice = mode === 'practice';
  $('#learningSection').classList.toggle('hidden', !learning);
  $('#practiceSection').classList.toggle('hidden', !practice);
  $('#metaSection').classList.toggle('hidden', mode !== 'meta');
  $('#learningMode').classList.toggle('active', learning);
  $('#practiceMode').classList.toggle('active', practice);
  $('#metaMode').classList.toggle('active', mode === 'meta');
  if (learning) setTimeout(updateLearning, 20);
  else if (practice) setTimeout(() => {
    if (!practiceData.length) startPractice();
    else updatePracticeGraph();
  }, 20);
  else setTimeout(updateMeta, 20);
}

$('#learningMode').addEventListener('click', () => switchMode('learning'));
$('#practiceMode').addEventListener('click', () => switchMode('practice'));
$('#metaMode').addEventListener('click', () => switchMode('meta'));
$('#randomData').addEventListener('click', () => { $('#dataInput').value = randomData(12).join(', '); updateLearning(); });
$('#dataInput').addEventListener('input', updateLearning);
$('#closeExample').addEventListener('click', () => $('#workedExample').close());
$('#workedExample').addEventListener('click', (event) => {
  if (event.target === $('#workedExample')) $('#workedExample').close();
});
$('#newQuestion').addEventListener('click', startPractice);
$('#resetPracticeScore').addEventListener('click', resetPracticeScore);
$('#practiceForm').addEventListener('submit', submitPractice);
const practiceDefinitions = {
  minimum: ['Minimum', 'Order the data from smallest to largest. The minimum is the first value and forms the left end of the whisker.'],
  q1: ['Q1 (lower quartile)', 'Order the data. If there is an odd number of values, leave out the overall median. Q1 is the median of the lower half and forms the left edge of the box.'],
  median: ['Median (Q2)', 'Order the data. Use the middle value, or average the two middle values when there is an even number. The median is the line inside the box.'],
  q3: ['Q3 (upper quartile)', 'Order the data. If there is an odd number of values, leave out the overall median. Q3 is the median of the upper half and forms the right edge of the box.'],
  maximum: ['Maximum', 'Order the data from smallest to largest. The maximum is the last value and forms the right end of the whisker.']
};
document.querySelectorAll('[data-definition]').forEach((button) => {
  button.addEventListener('click', () => {
    const [title, description] = practiceDefinitions[button.dataset.definition];
    $('#exampleTitle').textContent = title;
    $('#exampleBody').textContent = description;
    $('#workedExample').showModal();
  });
});
const medianAnswerInput = $('#practiceForm [name="median"]');
medianAnswerInput.addEventListener('input', () => {
  $('#practiceMedian').value = medianAnswerInput.value;
  updatePracticeGraph();
});
['practiceMin', 'practiceQ1', 'practiceQ3', 'practiceMax'].forEach((id) => $('#' + id).addEventListener('input', updatePracticeGraph));
$('#practiceMedian').addEventListener('input', () => {
  medianAnswerInput.value = $('#practiceMedian').value;
  updatePracticeGraph();
});
window.addEventListener('resize', () => {
  if (!$('#learningSection').classList.contains('hidden')) updateLearning();
  else if (!$('#practiceSection').classList.contains('hidden')) updatePracticeGraph();
  else updateMeta();
});

restorePracticeScores();
renderPracticeScore();
updateMeta();
$('#dataInput').value = randomData(12).join(', ');
updateLearning();
