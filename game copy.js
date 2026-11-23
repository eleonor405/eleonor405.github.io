import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const size = 4;
const palettes = [
  { bg1: "#fbf9ed", bg2: "#dcebb8", grid: "#c4d59e", cell: "#edf2dc", accent: "#f5dda0", deep: "#5f7d54", name: "Meadow Morning" },
  { bg1: "#fff4e8", bg2: "#edcfb9", grid: "#d8bda9", cell: "#f7e6d7", accent: "#f2c9a1", deep: "#9a7968", name: "Peach Patch" },
  { bg1: "#eff8f4", bg2: "#bddbd3", grid: "#a9cbbf", cell: "#e3f0eb", accent: "#f1dfab", deep: "#668f80", name: "Mint Garden" },
  { bg1: "#f8eff8", bg2: "#dcbfd6", grid: "#c9a9c1", cell: "#eee1ec", accent: "#c9dba2", deep: "#80697a", name: "Lavender Hay" },
  { bg1: "#eef4fb", bg2: "#bacde5", grid: "#9fb5d2", cell: "#dde8f4", accent: "#efd6b2", deep: "#657d9e", name: "Cloudy Clover" }
];

const tierColors = ["#efb68c", "#d99a72", "#b97f5d", "#9f7357", "#7f9d72", "#d3a7c4", "#f2d48b", "#9ebad2", "#c39ab7", "#99a67c", "#e58f7e"];

let board = Array.from({ length: size }, () => Array(size).fill(0));
let level = 1;
let levelPoints = 0;
let spinach = 0;
let joy = 0;
let soundOn = true;
let busy = false;
let levelComplete = false;

try {
  const saved = JSON.parse(localStorage.getItem("guineaMergeSave"));
  if (saved) {
    level = saved.level || 1;
    spinach = saved.spinach || 0;
    joy = saved.joy || 0;
  }
} catch (_) {}

const $ = (selector) => document.querySelector(selector);
const sceneHost = $("#scene");
const levelModal = $("#levelModal");
const shopModal = $("#shopModal");
const gameOverModal = $("#gameOverModal");
const boardStatus = $("#boardStatus");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
sceneHost.appendChild(renderer.domElement);

const threeScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 7.2, 8.2);
camera.lookAt(0, 0, 0);

threeScene.add(new THREE.HemisphereLight(0xfff8dc, 0x7d9169, 2.4));
const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(-4, 8, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
threeScene.add(sun);

const boardGroup = new THREE.Group();
threeScene.add(boardGroup);
const tileGroups = new Map();

function palette() {
  return palettes[(level - 1) % palettes.length];
}

function setPalette() {
  const p = palette();
  document.documentElement.style.setProperty("--cream", p.bg1);
  document.documentElement.style.setProperty("--meadow", p.bg2);
  document.documentElement.style.setProperty("--grid", p.grid);
  document.documentElement.style.setProperty("--cell", p.cell);
  document.documentElement.style.setProperty("--yellow", p.accent);
  document.documentElement.style.setProperty("--deep-green", p.deep);
  document.body.style.background = `radial-gradient(circle at 12% 8%, rgba(255,255,255,.9) 0 3%, transparent 3.2%), linear-gradient(135deg, ${p.bg1}, ${p.bg2})`;
  $("#levelName").textContent = p.name;
}

function goalForLevel() {
  return level * 50;
}

function save() {
  localStorage.setItem("guineaMergeSave", JSON.stringify({ level, spinach, joy }));
}

function roundedBoxGeometry(width, height, depth, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2, y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .08, bevelThickness: .08, bevelSegments: 3 });
  geometry.center();
  return geometry;
}

function buildBoard() {
  boardGroup.clear();
  tileGroups.clear();
  const p = palette();

  const base = new THREE.Mesh(
    roundedBoxGeometry(7.15, 7.15, .32, .38),
    new THREE.MeshStandardMaterial({ color: p.grid, roughness: .82 })
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = -.18;
  base.receiveShadow = true;
  boardGroup.add(base);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = new THREE.Mesh(
        roundedBoxGeometry(1.48, 1.48, .18, .22),
        new THREE.MeshStandardMaterial({ color: p.cell, roughness: .9 })
      );
      cell.rotation.x = -Math.PI / 2;
      cell.position.set(c * 1.68 - 2.52, -.03, r * 1.68 - 2.52);
      cell.receiveShadow = true;
      boardGroup.add(cell);
    }
  }
}

function createPig(tier) {
  const group = new THREE.Group();
  const color = tierColors[(tier - 1) % tierColors.length];
  const scale = 1 + Math.min(tier - 1, 8) * .035;
  group.scale.setScalar(scale);

  const fur = new THREE.MeshStandardMaterial({ color, roughness: .88 });
  const dark = new THREE.MeshStandardMaterial({ color: "#704d42", roughness: 1 });
  const pink = new THREE.MeshStandardMaterial({ color: "#efaaa2", roughness: .85 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(.52, 24, 16), fur);
  body.scale.set(1, .72, .78);
  body.position.y = .45;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(.38, 24, 16), fur);
  head.position.set(.05, .58, -.42);
  head.scale.set(1.05, .92, .9);
  head.castShadow = true;
  group.add(head);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 12), pink);
  nose.position.set(.05, .52, -.76);
  nose.scale.set(1.3, .8, .55);
  group.add(nose);

  for (const x of [-.22, .32]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 12), fur);
    ear.position.set(x, .94, -.35);
    ear.scale.set(.85, 1.12, .55);
    ear.castShadow = true;
    group.add(ear);
  }

  for (const x of [-.28, .28]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.025, 10, 8), dark);
    eye.position.set(x, .67, -.715);
    group.add(eye);
  }

  for (const x of [-.36, .36]) {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 8), dark);
    foot.position.set(x, .12, -.12);
    foot.scale.set(1, .55, 1.25);
    foot.castShadow = true;
    group.add(foot);
  }

  if (tier >= 4) {
    const hat = new THREE.Mesh(
      new THREE.CylinderGeometry(.22, .27, .18, 16),
      new THREE.MeshStandardMaterial({ color: tier >= 7 ? "#7e9e73" : "#f1d273", roughness: .7 })
    );
    hat.position.set(.02, 1.02, -.28);
    hat.castShadow = true;
    group.add(hat);
  }
  if (tier >= 7) {
    const bow = new THREE.Mesh(
      new THREE.TorusGeometry(.12, .035, 8, 16),
      new THREE.MeshStandardMaterial({ color: "#e8a5a5", roughness: .7 })
    );
    bow.position.set(.38, .92, -.42);
    bow.rotation.z = .5;
    group.add(bow);
  }
  return group;
}

function renderTiles(animated = false) {
  const existing = new Set();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const tier = board[r][c];
      if (!tier) continue;
      const key = `${r}-${c}`;
      existing.add(key);
      let group = tileGroups.get(key);
      if (!group) {
        group = createPig(tier);
        group.position.set(c * 1.68 - 2.52, 0, r * 1.68 - 2.52);
        boardGroup.add(group);
        tileGroups.set(key, group);
      } else if (group.userData.tier !== tier) {
        boardGroup.remove(group);
        group = createPig(tier);
        group.position.set(c * 1.68 - 2.52, 0, r * 1.68 - 2.52);
        boardGroup.add(group);
        tileGroups.set(key, group);
      }
      group.userData.tier = tier;
      if (animated) {
        group.scale.multiplyScalar(.82);
        group.userData.targetScale = 1 + Math.min(tier - 1, 8) * .035;
      }
    }
  }
  for (const [key, group] of tileGroups) {
    if (!existing.has(key)) {
      boardGroup.remove(group);
      tileGroups.delete(key);
    }
  }
}

function addRandomTile() {
  const empty = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) if (!board[r][c]) empty.push([r, c]);
  }
  if (!empty.length) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  board[r][c] = Math.random() < .9 ? 1 : 2;
  renderTiles(true);
}

function mergeLine(line) {
  const compact = line.filter(Boolean);
  const merged = [];
  let gained = 0;
  for (let i = 0; i < compact.length; i++) {
    if (compact[i] === compact[i + 1]) {
      const next = compact[i] + 1;
      merged.push(next);
      gained += next * 2;
      i++;
    } else {
      merged.push(compact[i]);
    }
  }
  while (merged.length < size) merged.push(0);
  return { line: merged, gained };
}

function move(direction) {
  if (busy || levelComplete) return;
  const before = JSON.stringify(board);
  let gained = 0;
  const next = Array.from({ length: size }, () => Array(size).fill(0));

  if (direction === "left" || direction === "right") {
    for (let r = 0; r < size; r++) {
      let line = [...board[r]];
      if (direction === "right") line.reverse();
      const result = mergeLine(line);
      line = result.line;
      gained += result.gained;
      if (direction === "right") line.reverse();
      next[r] = line;
    }
  } else {
    for (let c = 0; c < size; c++) {
      let line = [];
      for (let r = 0; r < size; r++) line.push(board[r][c]);
      if (direction === "down") line.reverse();
      const result = mergeLine(line);
      line = result.line;
      gained += result.gained;
      if (direction === "down") line.reverse();
      for (let r = 0; r < size; r++) next[r][c] = line[r];
    }
  }

  if (JSON.stringify(next) === before) {
    if (!hasMoves()) showGameOver();
    return;
  }

  busy = true;
  board = next;
  levelPoints += gained;
  if (gained) playTone(gained >= 16 ? "mergeLarge" : "merge");
  renderTiles(true);
  updateStats();

  setTimeout(() => {
    addRandomTile();
    busy = false;
    if (levelPoints >= goalForLevel()) completeLevel();
    else if (!hasMoves()) showGameOver();
  }, 130);
}

function hasMoves() {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!board[r][c]) return true;
      if (c + 1 < size && board[r][c] === board[r][c + 1]) return true;
      if (r + 1 < size && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

function updateStats() {
  $("#spinach").textContent = spinach;
  $("#joy").textContent = joy;
  $("#shopSpinach").textContent = spinach;
  $("#levelNumber").textContent = level;
  $("#levelPoints").textContent = levelPoints;
  $("#goalPoints").textContent = goalForLevel();
  $("#progressBar").style.width = `${Math.min(100, levelPoints / goalForLevel() * 100)}%`;
}

function completeLevel() {
  levelComplete = true;
  spinach++;
  save();
  updateStats();
  playTone("level");
  $("#levelModal").classList.add("open");
  const jumpscare = $("#jumpscare");
  jumpscare.classList.remove("play");
  void jumpscare.offsetWidth;
  jumpscare.classList.add("play");
}

function continueNextLevel() {
  level++;
  levelPoints = 0;
  levelComplete = false;
  save();
  board = Array.from({ length: size }, () => Array(size).fill(0));
  levelModal.classList.remove("open");
  shopModal.classList.remove("open");
  setPalette();
  buildBoard();
  addRandomTile();
  addRandomTile();
  updateStats();
  showStatus(`Level ${level}: ${palette().name}`);
}

function showStatus(text) {
  boardStatus.textContent = text;
  boardStatus.classList.add("show");
  clearTimeout(showStatus.timer);
  showStatus.timer = setTimeout(() => boardStatus.classList.remove("show"), 1400);
}

function showGameOver() {
  gameOverModal.classList.add("open");
  playTone("gameOver");
}

function restartGame() {
  levelPoints = 0;
  levelComplete = false;
  board = Array.from({ length: size }, () => Array(size).fill(0));
  gameOverModal.classList.remove("open");
  buildBoard();
  addRandomTile();
  addRandomTile();
  updateStats();
}

const toys = [
  { name: "Cozy Hidey", icon: "🏠", cost: 1, joy: 10 },
  { name: "Hay Bundle", icon: "🌾", cost: 2, joy: 25 },
  { name: "Toilet Roll", icon: "🧻", cost: 3, joy: 50 },
  { name: "Cardboard Box", icon: "📦", cost: 4, joy: 80 },
  { name: "Paper Bag", icon: "🛍️", cost: 5, joy: 120 },
  { name: "Tiny Hammock", icon: "🛏️", cost: 6, joy: 180 }
];

function renderShop() {
  const grid = $("#toyGrid");
  grid.innerHTML = "";
  toys.forEach((toy) => {
    const card = document.createElement("article");
    card.className = "toy";
    card.innerHTML = `
      <div class="toy-icon">${toy.icon}</div>
      <div class="toy-name">${toy.name}<br>+${toy.joy} Joy</div>
      <button type="button" ${spinach < toy.cost ? "disabled" : ""}>
        ${toy.cost} spinach
      </button>`;
    card.querySelector("button").addEventListener("click", () => {
      if (spinach < toy.cost) return;
      spinach -= toy.cost;
      joy += toy.joy;
      save();
      updateStats();
      renderShop();
      playTone("buy");
      showStatus(`${toy.name} collected!`);
    });
    grid.appendChild(card);
  });
}

let audioContext;
function playTone(type) {
  if (!soundOn) return;
  try {
    audioContext ||= new AudioContext();
    const notes = type === "gameOver" ? [180, 140] :
      type === "level" ? [330, 440, 554] :
      type === "buy" ? [440, 660] :
      type === "mergeLarge" ? [300, 440, 560] : [240, 340];
    notes.forEach((frequency, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(.035, audioContext.currentTime + i * .07);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + i * .07 + .12);
      osc.connect(gain).connect(audioContext.destination);
      osc.start(audioContext.currentTime + i * .07);
      osc.stop(audioContext.currentTime + i * .07 + .13);
    });
  } catch (_) {}
}

$("#openShop").addEventListener("click", () => {
  levelModal.classList.remove("open");
  renderShop();
  shopModal.classList.add("open");
});
$("#closeShop").addEventListener("click", () => {
  shopModal.classList.remove("open");
  continueNextLevel();
});
$("#continueLevel").addEventListener("click", continueNextLevel);
$("#restartGame").addEventListener("click", restartGame);
$("#soundButton").addEventListener("click", () => {
  soundOn = !soundOn;
  $("#soundButton").textContent = soundOn ? "♪" : "×";
});

document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => move(button.dataset.direction));
});

window.addEventListener("keydown", (event) => {
  const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
  if (map[event.key]) {
    event.preventDefault();
    move(map[event.key]);
  }
});

let touchStart = null;
sceneHost.addEventListener("pointerdown", (event) => {
  touchStart = { x: event.clientX, y: event.clientY };
});
sceneHost.addEventListener("pointerup", (event) => {
  if (!touchStart) return;
  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
  else move(dy > 0 ? "down" : "up");
  touchStart = null;
});

function resize() {
  const rect = sceneHost.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);

function animate() {
  requestAnimationFrame(animate);
  for (const group of tileGroups.values()) {
    if (group.userData.targetScale) {
      group.scale.lerp(new THREE.Vector3(group.userData.targetScale, group.userData.targetScale, group.userData.targetScale), .18);
      if (Math.abs(group.scale.x - group.userData.targetScale) < .01) {
        group.userData.targetScale = null;
      }
    }
  }
  renderer.render(threeScene, camera);
}

setPalette();
buildBoard();
addRandomTile();
addRandomTile();
updateStats();
resize();
animate();
