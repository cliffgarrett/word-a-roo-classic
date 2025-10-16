/* =========================================
   Word-a-Roo v1.0 Classic
   Core Game Logic
   ========================================= */

import { Sound } from "./sound.js";

/* -----------------
   DOM References
----------------- */
const splash = document.getElementById("splash");
const startBtn = document.getElementById("btnStart");
const gameWrap = document.getElementById("gameWrap");
const gridEl = document.getElementById("grid");
const wordListEl = document.getElementById("wordList");
const scoreEl = document.getElementById("score");
const modal = document.getElementById("modal");
const statsEl = document.getElementById("stats");
const nextBtn = document.getElementById("nextBtn");
const hintBtn = document.getElementById("hintBtn");
const superHintBtn = document.getElementById("superHintBtn");

let timer = 0;          // internal stopwatch
let running = false;
let lastTick = 0;
let idle = 0;
let hintsLeft = 3;
let superHintUnlocked = false;
let level = 1;
let totalScore = 0;
let grid = [];
let placed = [];
let found = new Set();

/* -----------------
   Game Data
----------------- */
const PUZZLES = [
  {
    words: ["APPLE", "RADIO", "SCALE", "CANDY", "SKIRT", "ICING"],
    answer: "PICNIC"
  },
  {
    words: ["HOUSE", "STOVE", "TABLE", "CHAIR", "SPOON", "PLATE"],
    answer: "DINNER"
  },
  {
    words: ["TRAIN", "TRACK", "BRIDGE", "CROSS", "LIGHT", "TICKET"],
    answer: "JOURNEY"
  }
];
const LETTERS = "EEEEEEEEEEEEAAAIIIIIOOOOONNNNRRRRSSSSTTTDLLUGGBBCCMMPPFFHHVVWWYKJXQZ";

/* -----------------
   Helpers
----------------- */
const $ = (s) => document.querySelector(s);
const rand = (n) => Math.floor(Math.random() * n);
const idx = (r, c, cols) => r * cols + c;
const rcFromIdx = (id, cols) => [Math.floor(id / cols), id % cols];
const buzz = (pat) => ("vibrate" in navigator) && navigator.vibrate(pat);

/* -----------------
   Splash Screen
----------------- */
startBtn.onclick = async () => {
  Sound.unlock();
  Sound.play("classic");
  splash.classList.add("hide");
  gameWrap.classList.remove("hide");
  startLevel(1);
};

/* -----------------
   Build Grid
----------------- */
function startLevel(n) {
  level = n;
  const puzzle = PUZZLES[n - 1];
  gridEl.innerHTML = "";
  wordListEl.innerHTML = "";
  placed = [];
  found.clear();
  running = true;
  timer = 0;
  idle = 0;
  hintsLeft = Math.min(3 + (level - 1), 5);
  superHintUnlocked = false;
  superHintBtn.classList.add("hide");
  updateScore(0);

  const rows = 12;
  const cols = 12;
  grid = Array(rows * cols).fill("");

  const dirs = [
    [0, 1], [1, 0], [1, 1], [1, -1]
  ];

  // place words
  for (const word of puzzle.words) tryPlace(word, rows, cols, dirs);

  // fill randoms
  for (let i = 0; i < grid.length; i++)
    if (!grid[i]) grid[i] = LETTERS[rand(LETTERS.length)];

  // render grid
  gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.forEach((ch, i) => {
    const d = document.createElement("div");
    d.className = "cell";
    d.textContent = ch;
    d.dataset.idx = i;
    gridEl.appendChild(d);
  });

  // word list
  puzzle.words.forEach((w) => {
    const span = document.createElement("span");
    span.textContent = w;
    wordListEl.appendChild(span);
  });

  attachGridEvents(rows, cols);
  lastTick = performance.now();
  requestAnimationFrame(tick);
}

function tryPlace(word, rows, cols, dirs) {
  const W = word.toUpperCase();
  for (let tries = 0; tries < 200; tries++) {
    const dir = dirs[rand(dirs.length)];
    const r0 = rand(rows);
    const c0 = rand(cols);
    const r1 = r0 + dir[0] * (W.length - 1);
    const c1 = c0 + dir[1] * (W.length - 1);
    if (r1 < 0 || c1 < 0 || r1 >= rows || c1 >= cols) continue;
    let ok = true, path = [];
    for (let k = 0; k < W.length; k++) {
      const r = r0 + dir[0] * k, c = c0 + dir[1] * k;
      const id = idx(r, c, cols);
      if (grid[id] && grid[id] !== W[k]) { ok = false; break; }
      path.push(id);
    }
    if (!ok) continue;
    for (let k = 0; k < W.length; k++) grid[path[k]] = W[k];
    placed.push({ text: W, path });
    return true;
  }
}

/* -----------------
   Grid Interaction
----------------- */
let dragging = false, startIdx = null, selPath = [];

function attachGridEvents(rows, cols) {
  gridEl.onpointerdown = (e) => {
    const el = e.target.closest(".cell");
    if (!el) return;
    dragging = true;
    startIdx = +el.dataset.idx;
    selPath = [startIdx];
    setSel(true, selPath);
    gridEl.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  gridEl.onpointermove = (e) => {
    if (!dragging) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest(".cell");
    if (!el) return;
    const id = +el.dataset.idx;
    const seq = cellsBetween(startIdx, id, cols);
    if (!seq) return;
    setSel(false, selPath);
    selPath = seq;
    setSel(true, selPath);
  };
  gridEl.onpointerup = () => {
    if (!dragging) return;
    dragging = false;
    handleSelection(selPath);
    setSel(false, selPath);
    selPath = [];
  };
}

function cellsBetween(a, b, cols) {
  const [ar, ac] = rcFromIdx(a, cols);
  const [br, bc] = rcFromIdx(b, cols);
  const dr = Math.sign(br - ar);
  const dc = Math.sign(bc - ac);
  if (dr === 0 && dc === 0) return null;
  if (dr !== 0 && dc !== 0 && Math.abs(br - ar) !== Math.abs(bc - ac)) return null;
  const out = [];
  const len = Math.max(Math.abs(br - ar), Math.abs(bc - ac)) + 1;
  for (let k = 0; k < len; k++) {
    const r = ar + dr * k, c = ac + dc * k;
    if (r < 0 || c < 0 || r >= 12 || c >= 12) break;
    out.push(idx(r, c, cols));
  }
  return out;
}

function setSel(on, list) {
  for (const id of list)
    gridEl.children[id]?.classList.toggle("sel", on);
}

function handleSelection(list) {
  if (!list.length) return;
  const word = wordFrom(list);
  const rev = word.split("").reverse().join("");
  const match = placed.find(p => !found.has(p.text) && (p.text === word || p.text === rev));
  if (match) {
    found.add(match.text);
    for (const id of match.path)
      gridEl.children[id].classList.add("found");
    updateScore(match.text.length * 5);
    buzz(10);
    if (found.size === placed.length) endLevel();
  } else {
    buzz([2, 40, 2]);
  }
}

function wordFrom(list) {
  return list.map(i => grid[i]).join("");
}

/* -----------------
   Hints
----------------- */
hintBtn.onclick = () => {
  if (hintsLeft <= 0) return;
  const pool = placed.filter(p => !found.has(p.text));
  if (!pool.length) return;
  const pick = pool[rand(pool.length)];
  const id = pick.path[rand(pick.path.length)];
  const cell = gridEl.children[id];
  cell.classList.add("hint");
  setTimeout(() => cell.classList.remove("hint"), 1400);
  hintsLeft--;
};

superHintBtn.onclick = () => {
  if (!superHintUnlocked) return;
  const pool = placed.filter(p => !found.has(p.text));
  pool.forEach((p) => {
    p.path.forEach((id) => {
      const cell = gridEl.children[id];
      if (cell) {
        cell.classList.add("hint");
        setTimeout(() => cell.classList.remove("hint"), 600);
      }
    });
  });
  superHintUnlocked = false;
  superHintBtn.classList.add("hide");
};

/* -----------------
   Timer & Idle Hint
----------------- */
function tick(now) {
  if (!running) return;
  const dt = (now - lastTick) / 1000;
  lastTick = now;
  timer += dt;
  idle += dt;

  if (idle >= 60) {        // auto hint after 60s idle
    hintBtn.click();
    idle = 0;
  }
  requestAnimationFrame(tick);
}

["pointerdown", "pointermove", "keydown", "click", "touchstart"].forEach(ev =>
  addEventListener(ev, () => (idle = 0), { passive: true })
);

/* -----------------
   Scoring & Stats
----------------- */
function updateScore(add) {
  totalScore += add;
  scoreEl.textContent = totalScore;
  if (totalScore >= 100 && !superHintUnlocked) {
    superHintUnlocked = true;
    superHintBtn.classList.remove("hide");
  }
}

function endLevel() {
  running = false;
  const puzzle = PUZZLES[level - 1];
  const avg = (timer / puzzle.words.length).toFixed(1);
  statsEl.innerHTML = `
    <p><strong>${puzzle.words.length}</strong> words found in <strong>${timer.toFixed(0)}</strong> seconds.</p>
    <p>Average search: ${avg} s</p>
    <p>Hints used: ${3 + (level - 1) - hintsLeft}</p>
    <p>Score: ${totalScore}</p>
  `;
  modal.classList.remove("hide");
}

nextBtn.onclick = () => {
  modal.classList.add("hide");
  if (level < 3) startLevel(level + 1);
  else showGameEnd();
};

function showGameEnd() {
  statsEl.innerHTML = `
    <h3>All levels complete!</h3>
    <p>Total Score: ${totalScore}</p>
    <p>Thanks for playing Word-a-Roo Classic!</p>
  `;
  nextBtn.textContent = "Play Again";
  nextBtn.onclick = () => location.reload();
  modal.classList.remove("hide");
}
