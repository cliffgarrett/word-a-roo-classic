import { SoundManager } from '../../../scripts/sound.js';
import { mountStage } from '../../../scripts/main.js';
import { transitionToUnscramble } from "./transition-unscramble.js";

/* ---------------- CONFIG ---------------- */
const WORDS = ['BIRD', 'BUGGED', 'CLOUD', 'DRAGON', 'KITE', 'EMIT'];
const BAG = "EEEEEEEEEEEEEEEAAAAAAAIIIIIIIOOOOOONNNNRRRRRSSSSTTTTTDLLLLUGGBBCCMMPPFFHHVVWWYKJXQZ";
const ROWS = 8, COLS = 8;

const PRAISES = [
  "Nice!",
  "Excellent!",
  "Awesome!",
  "Great find!",
  "You rock!",
  "Well done!",
  "Fantastic!",
  "Brilliant!",
  "Superb!",
  "Amazing!"
];

const ENCOURAGEMENTS = [
  "Not a word...",
  "Try again!",
  "Whoops!",
  "Hmm... no match.",
  "Keep going!",
  "Almost!",
  "Close, but not quite.",
  "Give it another go!"
];

let S = { grid: [], placed: [], found: new Set(), dragging: false, selPath: [] };
S.allowSnake = false; // initially off
S.round = 1;
S.puzzlePieces = 0;

/* ---------------- HELPERS ---------------- */
const idx = (r, c) => r * COLS + c;
const rcOf = id => [(id / COLS) | 0, id % COLS];
const inb = (r, c) => r >= 0 && c >= 0 && r < ROWS && c < COLS;
const lettersOf = p => p.map(i => S.grid[i]).join('');
const R = n => Math.floor(Math.random() * n);

function wireHintButton() {
  const btnHint = document.getElementById('btnHintBottom');
  if (!btnHint) return;

  btnHint.addEventListener('click', () => {
    if (!S.words || S.words.length === 0) return;

    // pick a random unfound word
    const remaining = S.words.filter(w =>
      ![...S.found].some(foundIndex => S.words[foundIndex] === w)
    );
    if (remaining.length === 0) {
      msgCloud("All found!", true);
      return;
    }

    const word = remaining[Math.floor(Math.random() * remaining.length)];
    const placed = S.placed.find(p => p.text === word);
    if (!placed) {
      msgCloud("No hint available", false);
      return;
    }

    // briefly highlight the cells
    placed.path.forEach(id => {
      const cell = document.querySelector(`.cell[data-idx="${id}"]`);
      if (!cell) return;
      cell.classList.add('hint'); function wireHintButton() {
        const btnHint = document.getElementById('btnHintBottom');
        if (!btnHint) return;

        btnHint.addEventListener('click', () => {
          if (!S.words || S.words.length === 0) return;

          // pick a random unfound word
          const remaining = S.words.filter(w =>
            ![...S.found].some(foundIndex => S.words[foundIndex] === w)
          );
          if (remaining.length === 0) {
            msgCloud("All found!", true);
            return;
          }

          const word = remaining[Math.floor(Math.random() * remaining.length)];
          const placed = S.placed.find(p => p.text === word);
          if (!placed) {
            msgCloud("No hint available", false);
            return;
          }

          // briefly highlight the cells
          placed.path.forEach(id => {
            const cell = document.querySelector(`.cell[data-idx="${id}"]`);
            if (!cell) return;
            cell.classList.add('hint');
            cell.animate([
              { backgroundColor: 'rgba(255, 230, 120, 0.8)', transform: 'translateX(0)' },
              { transform: 'translateX(4px)' },
              { transform: 'translateX(-4px)' },
              { transform: 'translateX(0)', backgroundColor: 'transparent' }
            ], { duration: 600, easing: 'ease-in-out' });
            setTimeout(() => cell.classList.remove('hint'), 650);
          });

          msgCloud(`Hint: ${word}`, true);
        });
      }

      cell.animate([
        { backgroundColor: 'rgba(255, 230, 120, 0.8)', transform: 'translateX(0)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(0)', backgroundColor: 'transparent' }
      ], { duration: 600, easing: 'ease-in-out' });
      setTimeout(() => cell.classList.remove('hint'), 650);
    });

    msgCloud(`Hint: ${word}`, true);
  });
}

function showLevelScreen(level) {
  const scr = document.getElementById('levelScreen');
  if (!scr) return;

  const title = scr.querySelector('#levelTitle');
  const msg = scr.querySelector('#levelMsg');

  title.textContent = `Level ${level}`;
  msg.textContent = (level === 2)
    ? "Nice work! New puzzle loading..."
    : (level === 3)
      ? "🐍 New trick unlocked! Try snake paths next!"
      : "Get ready for the next round!";

  scr.classList.remove('hide');
  requestAnimationFrame(() => scr.classList.add('show'));

  // brief display then hide
  setTimeout(() => {
    scr.classList.remove('show');
    setTimeout(() => scr.classList.add('hide'), 400);
  }, 1800);
}
/* ---------------- HTML BUILDER ---------------- */
function makeGameHTML() {
  return `
  <section id="classicBoard">
    <canvas id="lava"></canvas>
    <div id="hud">
      <div class="hud-left">
        <button id="btnSettings" class="hud-btn">⚙️</button>
        <button id="btnMusic" class="hud-btn">🔈</button>
      </div>
      <div class="hud-center">
        <span id="lvl" class="hud-pill">Lv ${S.level ?? 1}</span>
        <span id="ticketWrap" class="hud-pill">
          🎟️ <span id="ticketCount">${S.tickets ?? 0}</span>
        </span>
      </div>
      <div class="hud-right">
        <button id="btnHint" class="hud-btn hint-btn" title="Get a hint!">💡</button>
      </div>
    </div>

    <div id="gameCard">
      <div id="wordBar">
        <div id="wordList" class="words"></div>
      </div>
      <div id="msg">&nbsp;</div>
      <div class="boardWrap">
        <svg id="pills" class="pills"></svg>
        <div id="grid" class="grid"></div>
      </div>
    </div>
    <!-- Hint Button -->
    <div id="hintWrap">
      <button id="btnHintBottom" class="hint-btn">💡</button>
    </div>
    <div id="hintZone">
      <button id="btnHintBottom" class="hud-btn hint-btn">💡 Hint</button>
    </div>
    <div id="hintWrap">
      <button id="btnHintBottom" class="hint-btn">💡</button>
    </div>
  </section>
  `;
}

function loadPlayerData() {
  S.tickets = parseInt(localStorage.getItem('roo_tickets')) || 0;
  S.level = parseInt(localStorage.getItem('roo_level')) || 1;
  S.musicOn = localStorage.getItem('roo_musicOn') !== 'false';
}

function savePlayerData() {
  localStorage.setItem('roo_tickets', S.tickets);
  localStorage.setItem('roo_level', S.level);
  localStorage.setItem('roo_musicOn', S.musicOn);
}

export async function loadPuzzle(level = 1) {
  const padded = String(level).padStart(4, "0");
  const base =
    import.meta.url.includes("/modes/classic/")
      ? "./modes/classic/puzzles/"
      : "../modes/classic/puzzles/";
  const url = `${base}lvl-${padded}.json`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log("✅ Puzzle loaded:", url);
    return data; // ✅ return only
  } catch (err) {
    console.error("❌ loadPuzzle failed:", url, err);
    msgCloud("Failed to load puzzle file", false);
    return null;
  }
}

// export async function loadPuzzle(level) {
//   const path = `./modes/classic/puzzles/lvl-${String(level).padStart(4, '0')}.json`;
//   try {
//     const res = await fetch(path);
//     if (!res.ok) throw new Error(`HTTP ${res.status}`);
//     const json = await res.json();
//     if (!json || !json.words) throw new Error("Invalid puzzle schema");
//     console.log(`✅ Loaded puzzle: ${json.title || path}`);
// alert(path);
//     return json;
//   } catch (e) {
//     console.warn(`⚠️ Failed to load ${path}`, e);
//     return null; // explicit, predictable
//   }
// }

/* ---------------- BUILD ---------------- */
function buildGrid() {
  const rows = S.rows || 6;
  const cols = S.cols || 6;
  const words = S.words || [];
  const fillChars = S.fillChars || "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const grid = Array(rows * cols).fill("");
  S.grid = grid;
  S.placed = [];
  S.found = new Set();

  // Try to place all words
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  for (const word of words) {
    const W = word.split("");
    let placed = false;
    for (let tries = 0; tries < 400 && !placed; tries++) {
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const r0 = Math.floor(Math.random() * rows);
      const c0 = Math.floor(Math.random() * cols);
      const r1 = r0 + dir[0] * (W.length - 1);
      const c1 = c0 + dir[1] * (W.length - 1);
      if (r1 < 0 || c1 < 0 || r1 >= rows || c1 >= cols) continue;

      let ok = true;
      const path = [];
      for (let k = 0; k < W.length; k++) {
        const r = r0 + dir[0] * k;
        const c = c0 + dir[1] * k;
        const id = r * cols + c;
        if (grid[id] && grid[id] !== W[k]) { ok = false; break; }
        path.push(id);
      }
      if (!ok) continue;

      for (let k = 0; k < W.length; k++) grid[path[k]] = W[k];
      S.placed.push({ text: word, path });
      placed = true;
    }
  }

  // Fill remaining cells
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i]) {
      grid[i] = fillChars[Math.floor(Math.random() * fillChars.length)];
    }
  }

  // Render grid
  const gridEl = document.getElementById("grid");
  gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gridEl.innerHTML = "";
  grid.forEach((ch, i) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.idx = i;
    cell.textContent = ch;
    gridEl.appendChild(cell);
  });
}

function buildGridFromJSON(data) {
  if (!data || typeof data !== "object") {
    console.error("buildGridFromJSON: invalid data", data);
    msgCloud("Puzzle load failed", false);
    return;
  }

  // Core puzzle properties (with defaults)
  S.rows = data.rows || 6;
  S.cols = data.cols || 6;
  S.words = Array.isArray(data.words) ? data.words : [];
  S.fillChars = data.fillChars || "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  S.jumble = data.jumble || null;

  // Clear and rebuild stage
  const stage = document.getElementById("stage");
  if (!stage) {
    console.error("Missing #stage container");
    return;
  }

  stage.innerHTML = `
    <section id="classicBoard">
      <canvas id="lava"></canvas>
      ${renderHUD()}
      <div id="gameCard">
        <div id="wordBar">
          <div id="wordList" class="words"></div>
        </div>
        <div id="msg">&nbsp;</div>
        <div class="boardWrap">
          <svg id="pills" class="pills"></svg>
          <div id="grid" class="grid"></div>
        </div>
        <!-- Monster Transition Layer -->
        <div id="monsterTransition">
          <div id="monsterEyes">
            <div class="eye left"></div>
            <div class="eye right"></div>
          </div>
<div class="monster-teeth">
          <div id="monsterTeethTop">
            <img src="modes/classic/assets/img/monster-top.svg" id="teethTop" class="monster-teeth">
          </div>
          <div id="monsterTeethBottom">
            <img src="modes/classic/assets/img/monster-bottom.svg" id="teethBottom" class="monster-teeth">
          </div>
</div>
          <div id="monsterBanner">
            <h2 id="rooTitle" class="scramble">O-A-ERNAG</h2>
            <div id="bonusTimer">30</div>
          </div>
        </div>
      </div>
      <!-- Hint Button -->
      <div id="hintWrap">
        <button id="btnHintBottom" class="hint-btn">💡</button>
      </div>
      <div id="hintZone">
        <button id="btnHintBottom" class="hud-btn hint-btn">💡 Hint</button>
      </div>
    </section>
    <div id="confetti"></div>
  `;

  // --- Populate word list ---
  const wordList = document.getElementById("wordList");
  S.words.forEach(word => {
    const el = document.createElement("span");
    el.textContent = word;
    wordList.appendChild(el);
  });

  // --- Build letter grid ---
  buildGrid();

  // --- Wire controls and visuals ---
  wireHUD();
  updateHUD();
  hookInput(document.getElementById("grid"));
  wireHintButton();
  animateLava();
  resizePillsToGrid();

  console.log(`✅ Loaded puzzle: "${data.title}" (${S.rows}x${S.cols}, ${S.words.length} words)`);
}

function renderHUD() {
  return `
  <div id="hud">
    <div class="hud-left">
      <button id="btnSettings" class="hud-btn">⚙️</button>
      <button id="btnMusic" class="hud-btn">🔈</button>
    </div>
    <div class="hud-center">
    <!--
      <button id="btnHint" class="hud-btn hint-btn" title="Get a hint!">💡</button>
    -->
      </div>
    <div class="hud-right">
      <span id="lvl" class="hud-pill">Lv ${S.level}</span>
      <span id="ticketWrap" class="hud-pill">🎟️ <span id="ticketCount">${S.tickets}</span></span>
    </div>
  </div>`;
}

function placeWord(word) {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  const W = [...word];
  for (let t = 0; t < 200; t++) {
    const [dr, dc] = dirs[R(8)];
    const r0 = R(ROWS), c0 = R(COLS);
    const r1 = r0 + dr * (W.length - 1), c1 = c0 + dc * (W.length - 1);
    if (!inb(r1, c1)) continue;
    let ok = true, path = [];
    for (let k = 0; k < W.length; k++) {
      const r = r0 + dr * k, c = c0 + dc * k, id = idx(r, c);
      const ch = S.grid[id];
      if (ch && ch !== W[k]) { ok = false; break; }
      path.push(id);
    }
    if (!ok) continue;
    for (let k = 0; k < W.length; k++)S.grid[path[k]] = W[k];
    S.placed.push({ text: word, path });
    return;
  }
}

function wireHUD() {
  const btnSettings = document.getElementById('btnSettings');
  const btnMusic = document.getElementById('btnMusic');
  const btnHintTop = document.getElementById('btnHint');
  const btnHintBottom = document.getElementById('btnHintBottom');

  btnSettings.addEventListener('click', () => openSettings());
  btnMusic.addEventListener('click', () => toggleMusic());
  [btnHintTop, btnHintBottom].forEach(b => b?.addEventListener('click', revealHint));
}
function updateHUD() {
  const ticketEl = document.getElementById('ticketCount');
  const lvlEl = document.getElementById('lvl');
  const musicEl = document.getElementById('btnMusic');

  // bail out early if elements aren't ready yet
  if (!ticketEl || !lvlEl || !musicEl) {
    console.warn("HUD elements not yet mounted — skipping updateHUD");
    return;
  }

  ticketEl.textContent = S.tickets ?? 0;
  lvlEl.textContent = `Lv ${S.level ?? 1}`;
  musicEl.textContent = S.musicOn ? '🔈' : '🔇';
}

function toggleMusic() {
  S.musicOn = !S.musicOn;
  updateHUD();
  if (S.musicOn) SoundManager.play('classic', true);
  else SoundManager.stopAll();
  savePlayerData();
}

function revealHint() {
  // pick one random unfound word
  const remaining = WORDS.filter(w => !S.found.has(WORDS.indexOf(w)));
  if (remaining.length === 0) {
    msgCloud("All found!", true);
    return;
  }

  const target = remaining[Math.floor(Math.random() * remaining.length)];
  const wordObj = S.placed.find(p => p.text === target);
  if (!wordObj) return;

  // pick one random letter from that word’s path
  const randomId = wordObj.path[Math.floor(Math.random() * wordObj.path.length)];
  const cell = document.querySelector(`.cell[data-idx="${randomId}"]`);
  if (!cell) return;

  // highlight + shake
  cell.animate(
    [
      { backgroundColor: '#fff9b0', transform: 'translateX(0)' },
      { backgroundColor: '#fff79a', transform: 'translateX(-4px)' },
      { backgroundColor: '#fff79a', transform: 'translateX(4px)' },
      { backgroundColor: '#fff9b0', transform: 'translateX(0)' }
    ],
    { duration: 600, easing: 'ease-in-out' }
  );

  // brief glow border
  cell.style.boxShadow = '0 0 8px 2px rgba(255,230,0,0.6)';
  setTimeout(() => cell.style.boxShadow = '', 700);

  SoundManager.play('hint', false);
}

/* ---------------- PUZZLE LOADING ---------------- */

// async function loadPuzzle(level) {
//   try {
//     const padded = String(level).padStart(4, '0');
//     const url = `./modes/classic/puzzles/lvl-${padded}-school.json`;
//     console.log(`Loading puzzle: ${url}`);

//     const res = await fetch(url);
//     if (!res.ok) throw new Error(`Failed to load puzzle file: ${res.status}`);
//     const data = await res.json();

//     applyPuzzleData(data);
//     return data;

//   } catch (err) {
//     console.error("loadPuzzle() failed:", err);
//     msgCloud("Couldn't load puzzle", false);
//   }
// }

/**
 * Apply puzzle properties to game state (S)
 */
function applyPuzzleData(data) {
  S.id = data.id;
  S.title = data.title;
  S.words = data.words;
  S.rows = data.rows;
  S.cols = data.cols;
  S.fillChars = data.fillChars;
  S.allowedDirs = data.orientation || ["H", "V", "D"];
  S.difficulty = data.difficulty || "easy";
  S.musicFile = data.music || "classic.mp3";
  S.snakeMode = data.snakeMode || false;
  S.jumble = data.jumble || null;

  // reset runtime stuff
  S.found = new Set();
  S.grid = [];
  S.placed = [];
  S.selPath = [];
  S.dragging = false;

  console.log(`Puzzle ${S.id}: "${S.title}" loaded with ${S.words.length} words`);
}

// function animateLettersToUnscramble(jumble) {
//   const { sourceLetters, word } = jumble;
//   const wordList = document.getElementById('wordList');
//   const stage = document.getElementById('classicBoard');
//   if (!wordList || !stage) return;

//   // blur + dim the grid
//   const grid = document.getElementById('grid');
//   grid.style.transition = 'filter 0.8s ease, opacity 0.8s ease';
//   grid.style.filter = 'blur(6px)';
//   grid.style.opacity = 0.5;

//   // pick letters visually from the word list
//   const spans = [...wordList.querySelectorAll('span')];
//   const activeLetters = [];

//   sourceLetters.forEach((ch, i) => {
//     const src = spans[i % spans.length];
//     if (!src) return;
//     const rect = src.getBoundingClientRect();
//     const letter = document.createElement('div');
//     letter.textContent = ch;
//     letter.className = 'fall-letter';
//     document.body.appendChild(letter);

//     // position above the stage
//     Object.assign(letter.style, {
//       position: 'absolute',
//       left: `${rect.left + rect.width / 2}px`,
//       top: `${rect.top}px`,
//       transform: 'translate(-50%, 0)',
//     });
//     activeLetters.push(letter);
//   });

//   // drop each letter toward center
//   const target = document.body.getBoundingClientRect();
//   activeLetters.forEach((el, i) => {
//     el.animate(
//       [
//         { transform: 'translate(-50%, 0)', opacity: 1 },
//         {
//           transform: `translate(${(Math.random() - 0.5) * 60}px, ${
//             target.height / 2 - 100
//           }px) rotate(${(Math.random() - 0.5) * 80}deg)`,
//           opacity: 0.9,
//         },
//       ],
//       {
//         duration: 900 + Math.random() * 400,
//         easing: 'ease-in',
//         fill: 'forwards',
//         delay: i * 100,
//       }
//     ).onfinish = () => el.remove();
//   });

//   // after delay, launch unscramble
//   setTimeout(() => {
//     startUnscrambleRound(jumble);
//   }, 1800);
// }

/* ---------------- RENDER ---------------- */
export async function start() {
  console.log("Starting Classic Mode...");

  // 1️⃣ Load saved player state
  loadPlayerData();
  //updateHUD();

  mountStage(`
  <section id="classicBoard">
    <canvas id="lava"></canvas>

    <!-- HUD -->
    <!--
    <div id="hud">
      <button id="btnSettings" class="hud-btn">⚙️</button>
      <button id="btnMusic" class="hud-btn">🔈</button>
      <div id="ticketWrap">
        <span id="ticketIcon">🎟️</span>
        <span id="ticketCount">12</span>
      </div>
      <div id="lvl">Lv 1</div>
    </div>
    -->
  <div id="hud">
    <div class="hud-left">
      <button id="btnSettings" class="hud-btn">⚙️</button>
      <button id="btnMusic" class="hud-btn">🔈</button>
    </div>

    <div class="hud-center">
<!--      <button id="btnHint" class="hud-btn hint-btn" title="Get a hint!">💡</button> -->
    </div>

    <div class="hud-right">
      <span id="lvl" class="hud-pill">Lv 1</span>
      <span id="ticketWrap" class="hud-pill">🎟️ <span id="ticketCount">0</span></span>
    </div>
  </div>

    <!-- Game Card -->
    <div id="gameCard">
      <div id="wordBar">
        <div id="wordList" class="words"></div>
      </div>
      <div id="msg">&nbsp;</div>

      <div class="boardWrap">
        <svg id="pills" class="pills"></svg>
        <div id="grid" class="grid"></div>
      </div>
    </div>

    <!-- Hint Button -->
    <div id="hintWrap">
      <button id="btnHintBottom" class="hint-btn">💡</button>
    </div>
    <div id="hintZone">
      <button id="btnHintBottom" class="hud-btn hint-btn">💡 Hint</button>
    </div>
  </section>
  `);

  wireHUD();
  updateHUD();

  // 2️⃣ Fetch the current level’s puzzle JSON
  const data = await loadPuzzle(S.level || 1);
  if (!data) {
    msgCloud("Puzzle not found", false);
    return; // Stop gracefully, no fallback
  }

  // S.musicFile = data.music || "classic.mp3";
  // buildGridFromJSON(data);

  S.musicFile = data.music || 'classic.mp3';

  // 3️⃣ Prep music
  SoundManager.stopAll();
  SoundManager.load('classic', `./modes/classic/assets/audio/${S.musicFile}`);
  if (S.musicOn) SoundManager.play('classic', true);

  // 4️⃣ Build the game UI
  buildGridFromJSON(data);

  // const gridEl = document.getElementById('grid');
  // const wordList = document.getElementById('wordList');

  // WORDS.forEach(w=>{
  //   const el=document.createElement('span');
  //   el.textContent=w;
  //   wordList.appendChild(el);
  // });

  // S.grid.forEach((ch,i)=>{
  //   const d=document.createElement('div');
  //   d.className='cell';
  //   d.textContent=ch;
  //   d.dataset.idx=i;
  //   gridEl.appendChild(d);
  // });

  // hookInput(gridEl);
  // animateLava();
  // resizePillsToGrid();
  // window.addEventListener('resize', resizePillsToGrid);

  // --- DEBUG: manual win trigger ---
if (!document.getElementById("btnTestVictory")) {
  const btn = document.createElement("button");
  btn.id = "btnTestVictory";
  btn.textContent = "🧩 Test Victory";
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "1rem",
    right: "1rem",
    zIndex: 9999,
    background: "#4CAF50",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 16px",
    fontSize: "1rem",
    boxShadow: "0 3px 6px rgba(0,0,0,0.3)",
    cursor: "pointer",
    zIndex:99999
  });
  btn.onclick = victory;
  document.body.appendChild(btn);
}

}

function resizePillsToGrid() {
  const grid = document.getElementById('grid');
  const svg = document.getElementById('pills');
  if (!grid || !svg) return;
  const r = grid.getBoundingClientRect();

  // size
  svg.style.width = r.width + 'px';
  svg.style.height = r.height + 'px';
  svg.setAttribute('width', r.width);
  svg.setAttribute('height', r.height);

  // position inside boardWrap (so it stays glued to the grid)
  svg.style.left = grid.offsetLeft + 'px';
  svg.style.top = grid.offsetTop + 'px';
}
window.addEventListener('resize', resizePillsToGrid);
// call once after you populate #grid:
requestAnimationFrame(resizePillsToGrid);

/* ---------------- INPUT ---------------- */
const COLORS = [
  '#9adafe', // blue
  '#ffc85b', // yellow
  '#9fff9f', // green
  '#ff9fe5', // pink
  '#a29fff', // violet
];

let nextColorIndex = 0;

function nextPillColor() {
  const color = COLORS[nextColorIndex];
  nextColorIndex = (nextColorIndex + 1) % COLORS.length;
  return color;
}

function demoSnakePath() {
  const wordObj = S.placed.find(w => w.text === "DRAGON") || S.placed[0];
  if (!wordObj) return;

  const path = wordObj.path;
  const svg = document.getElementById("pills");
  let step = 0;
  const color = "#ff9fe5";

  msgCloud("Watch this new move!", nulll);

  function drawNext() {
    if (step < path.length - 1) {
      drawPillSegment(path[step], path[step + 1], color);
      const el = document.querySelector(`.cell[data-idx="${path[step]}"]`);
      if (el) el.classList.add("sel");
      step++;
      setTimeout(drawNext, 200);
    } else {
      msgCloud("Now you try snaking paths!", null);
    }
  }

  setTimeout(drawNext, 800);
}

function hookInput(gridEl) {
  console.log("hookInput active");
  // 🎧 Small audio blip generator (increasing pitch)
  let toneCtx = null;
  let tonePitch = 400;

  function playTone() {
    try {
      if (!toneCtx) toneCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = toneCtx.createOscillator();
      const gain = toneCtx.createGain();

      osc.type = "sine";
      osc.frequency.value = tonePitch;
      tonePitch += 35;              // each letter = slightly higher pitch
      if (tonePitch > 900) tonePitch = 400; // reset to base

      gain.gain.setValueAtTime(0.25, toneCtx.currentTime); // gentle volume
      gain.gain.exponentialRampToValueAtTime(0.001, toneCtx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(toneCtx.destination);
      osc.start();
      osc.stop(toneCtx.currentTime + 0.12);
    } catch (err) {
      console.warn("Tone play failed:", err);
    }
  }

  const cellElById = id => gridEl.querySelector(`.cell[data-idx="${id}"]`);
  const updateSel = () => {
    gridEl.querySelectorAll(".cell.sel").forEach(c => c.classList.remove("sel"));
    for (const id of S.selPath) cellElById(id)?.classList.add("sel");
  };

  // ensure colors are initialized
  if (!S.activeColor) S.activeColor = nextPillColor();
  if (!S.nextColor) S.nextColor = S.activeColor;

  let activePointer = null;
  let dir = null;             // direction vector for straight-only mode, e.g. [dr, dc]

  // helpers
  const secondLast = () => S.selPath[S.selPath.length - 2];
  const last = () => S.selPath[S.selPath.length - 1];
  const sameCell = (a, b) => a === b;

  function clearTempPill() {
    const svg = document.getElementById('pills');
    svg?.querySelectorAll('.temp').forEach(el => el.remove());
  }

  function redrawTempPill() {
    const svg = document.getElementById('pills');
    if (!svg) return;
    clearTempPill();
    const path = S.selPath;
    for (let i = 0; i < path.length - 1; i++) {
      // draw temp segments with active color
      drawPillSegment(path[i], path[i + 1], S.activeColor, /*isTemp=*/true);
    }
  }

  function acceptMove(nextId) {
    // 1) Backtrack one step?
    if (S.selPath.length >= 2 && sameCell(nextId, secondLast())) {
      // pop last and redraw
      S.selPath.pop();
      updateSel();
      liveMsg(lettersOf(S.selPath));
      redrawTempPill();
      // If after pop there are only 1 cell, reset dir in straight-only
      if (!S.allowSnake && S.selPath.length <= 1) dir = null;
      return;
    }

    // 2) Already in path somewhere (no revisits)
    if (S.selPath.includes(nextId)) return;

    // 3) Straight-only enforcement
    if (!S.allowSnake) {
      if (S.selPath.length === 1) {
        // define direction using the first two cells chosen
        const [r1, c1] = rcOf(S.selPath[0]);
        const [r2, c2] = rcOf(nextId);
        dir = [Math.sign(r2 - r1), Math.sign(c2 - c1)];
      } else if (S.selPath.length >= 2) {
        const [pr, pc] = rcOf(last());
        const [nr, nc] = rcOf(nextId);
        const step = [Math.sign(nr - pr), Math.sign(nc - pc)];
        // must match the original direction
        if (!dir || step[0] !== dir[0] || step[1] !== dir[1]) return;
      }
    }

    // 4) Accept
    // 4) Accept
    S.selPath.push(nextId);

    // 🔊 Audio + haptic feedback combo
    playTone();
    if (navigator.vibrate) navigator.vibrate(15);

    updateSel();
    liveMsg(lettersOf(S.selPath));
    redrawTempPill();
  }

  function handlePointerUp(pointerId) {
    if (pointerId !== activePointer) return;
    try { gridEl.releasePointerCapture(activePointer); } catch { }
    activePointer = null;

    if (!S.dragging) return;
    S.dragging = false;

    const w = lettersOf(S.selPath).toUpperCase();
    const i = S.words.findIndex(word => word.toUpperCase() === w);

    if (i >= 0 && !S.found.has(i)) {
      // ✅ Correct word found
      S.found.add(i);
      const wordSpan = document.querySelectorAll("#wordList span")[i];
      if (wordSpan) wordSpan.classList.add("done");

      drawFinalPill(S.selPath, S.activeColor);
      msgCloud(null, true);

      // advance color
      S.nextColor = nextPillColor();

      // if all words found, win round
      if (S.found.size === S.words.length) victory();

    } else {
      // ❌ Incorrect word
      msgCloud(null, false);

      // optional: clear temporary lines immediately
      const svg = document.getElementById("pills");
      svg?.querySelectorAll(".temp").forEach(el => el.remove());
      clearTempPill();
    }

    // Reset selection immediately (for both success & failure)
    S.selPath = [];
    dir = null;
    updateSel();
  }

  gridEl.addEventListener('pointerdown', e => {
    const el = e.target.closest('.cell'); if (!el) return;
    activePointer = e.pointerId;
    gridEl.setPointerCapture(e.pointerId);

    S.dragging = true;
    S.selPath = [+el.dataset.idx];
    dir = null;

    // use the queued color for THIS drag
    S.activeColor = S.nextColor;

    liveMsg(el.textContent.trim());
    updateSel();
    redrawTempPill();
  });

  gridEl.addEventListener('pointermove', e => {
    if (!S.dragging || e.pointerId !== activePointer) return;

    // find the cell under pointer (works even if you drift off the grid)
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cell');
    if (!el) return;

    const id = +el.dataset.idx;
    if (sameCell(id, last())) return;
    acceptMove(id);
  });

  // Use window-level handlers so pointerup fires even if the pointer ends outside the grid.
  window.addEventListener('pointerup', e => handlePointerUp(e.pointerId), { capture: true });
  window.addEventListener('pointercancel', e => handlePointerUp(e.pointerId), { capture: true });
}
/* ---------------- VISUALS ---------------- */


function cellRectInGrid(id) {
  const el = document.querySelector(`.cell[data-idx="${id}"]`);
  if (!el) return null;
  const grid = document.getElementById('grid');
  const rEl = el.getBoundingClientRect();
  const rGrid = grid.getBoundingClientRect();
  return {
    cx: rEl.left - rGrid.left + rEl.width / 2,
    cy: rEl.top - rGrid.top + rEl.height / 2,
    w: rEl.width, h: rEl.height
  };
}

function cellRect(id) {
  const el = document.querySelector(`.cell[data-idx="${id}"]`);
  const r = el.getBoundingClientRect();
  const host = document.querySelector('.boardWrap').getBoundingClientRect();
  //const pad = 6; // 🟡 adjust for pill spacing
  return {
    x: r.left - host.left + r.width / 4.5,
    y: r.top - host.top + r.height / 4.2,
    //rx: r.width / 2 - pad,
    //ry: r.height / 2 - pad
  };
}

function drawPillSegment(a, b, color, isTemp = false) {
  const A = cellRect(a), B = cellRect(b);
  if (!A || !B) return;
  const svg = document.getElementById("pills");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", A.x);
  line.setAttribute("y1", A.y);
  line.setAttribute("x2", B.x);
  line.setAttribute("y2", B.y);
  line.setAttribute("stroke", color);
  line.setAttribute("stroke-width", "28"); // slightly thicker for cleaner curves
  line.setAttribute("stroke-linecap", "round");
  line.classList.toggle("temp", isTemp);
  svg.appendChild(line);
}


// function drawPillSegment(aId, bId, color, isTemp=false){
//   const A = cellRectInGrid(aId), B = cellRectInGrid(bId);
//   if(!A || !B) return;
//   const svg = document.getElementById('pills');
//   const g = document.createElementNS('http://www.w3.org/2000/svg','g');
//   g.classList.add(isTemp ? 'pill-temp' : 'pill-final');

//   // thickness tuned to cell size; extra “padding” to look like a rounded capsule
//   const thickness = Math.min(A.w, A.h) * 0.70;

//   // BACK stroke = subtle border halo
//   // const back = document.createElementNS('http://www.w3.org/2000/svg','line');
//   // back.setAttribute('x1', A.cx); back.setAttribute('y1', A.cy);
//   // back.setAttribute('x2', B.cx); back.setAttribute('y2', B.cy);
//   // back.setAttribute('stroke', 'rgba(0,0,0,.12)');
//   // back.setAttribute('stroke-width', thickness + 4);
//   // back.setAttribute('stroke-linecap','round');

//   // FRONT stroke = actual pill color
//   const front = document.createElementNS('http://www.w3.org/2000/svg','line');
//   front.setAttribute('x1', A.cx); front.setAttribute('y1', A.cy);
//   front.setAttribute('x2', B.cx); front.setAttribute('y2', B.cy);
//   front.setAttribute('stroke', color);
//   front.setAttribute('stroke-width', thickness);
//   front.setAttribute('stroke-linecap','round');

//   if (isTemp) front.classList.add('temp');
//   // g.appendChild(back);
//   g.appendChild(front);
//   svg.appendChild(g);
// }



// function redrawPill(path, color){
//   const svg = document.getElementById('pills');
//   // clear only the temporary preview
//   svg.querySelectorAll('.pill-temp').forEach(n => n.remove());
//   for (let i=0; i<path.length-1; i++){
//     drawPillSegment(path[i], path[i+1], color, /*isTemp*/ true);
//   }
// }

function drawFinalPill(path, color) {
  const svg = document.getElementById('pills');
  for (let i = 0; i < path.length - 1; i++) {
    drawPillSegment(path[i], path[i + 1], color, /*isTemp*/ false);
  }
  // clean preview after finalizing
  svg.querySelectorAll('.pill-temp').forEach(n => n.remove());
}

document.getElementById('btnHint')?.addEventListener('click', () => {
  if (!S.hintUsed) {
    SoundManager.play('hint');
    revealHint();
    S.hintUsed = true;
    document.getElementById('btnHint').disabled = true;
  } else {
    msgCloud("Hint used!", false);
  }
});

// function revealHint() {
//   const remaining = WORDS.filter(w => !S.found.has(WORDS.indexOf(w)));
//   if (remaining.length === 0) return;

//   const target = remaining[Math.floor(Math.random() * remaining.length)];
//   const wordObj = S.placed.find(p => p.text === target);
//   if (!wordObj) return;

//   // flash the first letter cell
//   const id = wordObj.path[0];
//   const cell = document.querySelector(`.cell[data-idx="${id}"]`);
//   if (!cell) return;

//   cell.animate([
//     { background: '#fff' },
//     { background: '#ff0' },
//     { background: '#fff' }
//   ], {
//     duration: 1200,
//     iterations: 3
//   });
// }

/* ---------------- LAVA BACKGROUND ---------------- */
function animateLava() {
  const canvas = document.getElementById('lava');
  const ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  let t = 0;
  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  function frame() {
    t += 0.02;
    const w = canvas.width, h = canvas.height;
    const grd = ctx.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, `hsl(${(t * 20) % 360},80%,12%)`);
    grd.addColorStop(1, `hsl(${(t * 20 + 60) % 360},80%,8%)`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    requestAnimationFrame(frame);
  }
  frame();
}

/* ---------------- UI ---------------- */
const PRAISE = ["Nice!", "Great!", "Awesome!", "Well done!", "Sweet!", "Fantastic!"];
const MISS = ["Not a word...", "Try again!", "Nope!", "Hmm..."];

function rand(arr) { return arr[(Math.random() * arr.length) | 0]; }

export function msgCloud(text, isPraise = true) {
  const msgEl = document.getElementById('msg');
  if (!msgEl) return;

  const phrase = text || (isPraise ? rand(PRAISES) : rand(ENCOURAGEMENTS));

  // remove any prior cloud
  msgEl.innerHTML = '';

  const cloud = document.createElement('div');
  cloud.className = 'msg-cloud';
  cloud.textContent = phrase;

  // color accent optional
  cloud.style.background = isPraise ? '#fff8dc' : '#eceff1';
  cloud.style.color = isPraise ? 'goldenrod' : '#333';

  msgEl.appendChild(cloud);

  // 🔧 Force reflow so the browser commits the hidden state
  // (any of these works; pick one)
  // cloud.getBoundingClientRect();
  // or: void cloud.offsetWidth;
  window.getComputedStyle(cloud).opacity;

  // now trigger the entering transition
  cloud.classList.add('show');

  // schedule exit (optional)
  setTimeout(() => {
    cloud.classList.remove('show');    // end the transition state
    cloud.classList.add('fade');       // optional keyframed exit
    cloud.addEventListener('animationend', () => cloud.remove(), { once: true });
  }, 1300);
}

function liveMsg(text, color = "#000") {
  const m = document.getElementById('msg');
  if (!m) return;
  m.textContent = text;
  m.style.color = color;
  m.classList.add('show');
}

async function victory() {
  console.log("Victory reached!");
  confetti();

  SoundManager.stopAll();
  SoundManager.load('victory', `./modes/classic/assets/audio/victory.mp3`);
  SoundManager.play('victory');
  S.tickets += 3;
  msgCloud("🧩 Puzzle Complete!", true);

  if (S.jumble) {
    setTimeout(() => {
      import('./transition-unscramble.js').then(mod => mod.transitionToUnscramble());
    }, 1200);
  }
  return;
}

/* ---------- Win / Confetti ---------- */
function confetti() {
  let host = document.getElementById('confetti');
  if (!host) {
    host = document.createElement('div');
    host.id = 'confetti';
    Object.assign(host.style, {
      position: 'fixed',
      left: 0,
      top: 0,
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 9999
    });
    document.body.appendChild(host);
  }
  host.innerHTML = '';

  const colors = ['#FF6B6B', '#FFD166', '#4ECDC4', '#C7F464', '#C8B6FF', '#9ADAFE', '#FFB07C'];

  for (let i = 0; i < 90; i++) {
    const piece = document.createElement('i');
    piece.style.position = 'absolute';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.top = -10 - Math.random() * 30 + 'vh';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.width = piece.style.height = 6 + Math.random() * 8 + 'px';
    piece.style.borderRadius = '2px';
    piece.style.opacity = 0.9;
    piece.style.animation = `fall ${800 + Math.random() * 700}ms linear forwards`;
    host.appendChild(piece);
  }

  // simple keyframes
  const styleId = 'confetti-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes fall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // auto-clear
  setTimeout(() => host.innerHTML = '', 1600);
}

// setTimeout(() => {
//   S.level++;
//   savePlayerData();
//   updateHUD();
//   loadPuzzle(S.level).then(buildGridFromJSON);
// }, 2000);

//}

function demoSnakeSelection() {
  const example = S.placed.find(w => w.text === "DRAGON") || S.placed[0];
  if (!example) return;

  const path = example.path;
  const color = "#ffb347";
  const svg = document.getElementById("pills");
  if (!svg) return;

  let step = 0;
  const interval = setInterval(() => {
    if (step >= path.length - 1) {
      clearInterval(interval);
      drawFinalPill(path, color);
      msgCloud(null, true);
      return;
    }
    drawPillSegment(path[step], path[step + 1], color);
    step++;
  }, 200);
}

function showLoadError() {
  const stage = document.getElementById('stage');
  if (!stage) return;

  stage.innerHTML = `
    <div class="load-error">
      <h2>🦘 Oops!</h2>
      <p>That puzzle couldn't be found.</p>
      <button id="btnRetry">Try Again</button>
    </div>
  `;

  const btn = document.getElementById('btnRetry');
  btn.onclick = () => {
    console.log("Retrying last valid level…");
    start(); // safely restart from current S.level
  };
}



