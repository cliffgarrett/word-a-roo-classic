import { SoundManager } from '../../../scripts/sound.js';
import { mountStage } from '../../../scripts/main.js';

/* ---------------- CONFIG ---------------- */
const WORDS = ['BIRD','BUG','CLOUD','DRAGON','KITE','EMIT'];
const BAG = "EEEEEEEEEEEEEEEAAAAAAAIIIIIIIOOOOOONNNNRRRRRSSSSTTTTTDLLLLUGGBBCCMMPPFFHHVVWWYKJXQZ";
const ROWS = 7, COLS = 6;

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

let S = { grid:[], placed:[], found:new Set(), dragging:false, selPath:[] };
S.allowSnake = false; // initially off
S.round = 1;
S.puzzlePieces = 0;

/* ---------------- HELPERS ---------------- */
const idx = (r,c)=>r*COLS+c;
const rcOf = id=>[(id/COLS)|0, id%COLS];
const inb = (r,c)=>r>=0 && c>=0 && r<ROWS && c<COLS;
const lettersOf = p=>p.map(i=>S.grid[i]).join('');
const R = n=>Math.floor(Math.random()*n);

/* ---------------- BUILD ---------------- */
function buildGrid(){
  S.grid = Array(ROWS*COLS).fill('');
  S.placed = [];
  S.found.clear();

  for(const w of WORDS) placeWord(w);
  for(let i=0;i<S.grid.length;i++)
    if(!S.grid[i]) S.grid[i]=BAG[R(BAG.length)];
}

function placeWord(word){
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  const W = [...word];
  for(let t=0;t<200;t++){
    const [dr,dc] = dirs[R(8)];
    const r0 = R(ROWS), c0 = R(COLS);
    const r1=r0+dr*(W.length-1), c1=c0+dc*(W.length-1);
    if(!inb(r1,c1)) continue;
    let ok=true, path=[];
    for(let k=0;k<W.length;k++){
      const r=r0+dr*k, c=c0+dc*k, id=idx(r,c);
      const ch=S.grid[id];
      if(ch && ch!==W[k]){ok=false;break;}
      path.push(id);
    }
    if(!ok) continue;
    for(let k=0;k<W.length;k++)S.grid[path[k]]=W[k];
    S.placed.push({text:word,path});
    return;
  }
}

/* ---------------- RENDER ---------------- */
export function start(){
  console.log("Starting Classic Mode...");
  SoundManager.stopAll();
  SoundManager.load('classic','./modes/classic/assets/audio/classic.mp3');
  SoundManager.play('classic',true);

  buildGrid();

  mountStage(`
    <section id="classicBoard">
      <canvas id="lava"></canvas>
      <div id="hud">
        <h2>Word-a-Roo Classic</h2>
        <div id="lvl">Level 1</div>
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
    </section>
  `);

  const gridEl = document.getElementById('grid');
  const wordList = document.getElementById('wordList');

  WORDS.forEach(w=>{
    const el=document.createElement('span');
    el.textContent=w;
    wordList.appendChild(el);
  });

  S.grid.forEach((ch,i)=>{
    const d=document.createElement('div');
    d.className='cell';
    d.textContent=ch;
    d.dataset.idx=i;
    gridEl.appendChild(d);
  });

  hookInput(gridEl);
  animateLava();
  resizePillsToGrid();
  window.addEventListener('resize', resizePillsToGrid);
}

function resizePillsToGrid(){
  const grid = document.getElementById('grid');
  const svg  = document.getElementById('pills');
  if (!grid || !svg) return;
  const r = grid.getBoundingClientRect();

  // size
  svg.style.width  = r.width  + 'px';
  svg.style.height = r.height + 'px';
  svg.setAttribute('width',  r.width);
  svg.setAttribute('height', r.height);

  // position inside boardWrap (so it stays glued to the grid)
  svg.style.left = grid.offsetLeft + 'px';
  svg.style.top  = grid.offsetTop  + 'px';
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

function hookInput(gridEl){
  console.log("hookInput active");

  const cellElById = id => gridEl.querySelector(`.cell[data-idx="${id}"]`);
  const updateSel = () => {
    gridEl.querySelectorAll(".cell.sel").forEach(c => c.classList.remove("sel"));
    for (const id of S.selPath) cellElById(id)?.classList.add("sel");
  };

  // ensure colors are initialized
  if (!S.activeColor) S.activeColor = nextPillColor();
  if (!S.nextColor)   S.nextColor   = S.activeColor;

  let activePointer = null;
  let dir = null;             // direction vector for straight-only mode, e.g. [dr, dc]

  // helpers
  const secondLast = () => S.selPath[S.selPath.length - 2];
  const last       = () => S.selPath[S.selPath.length - 1];
  const sameCell   = (a,b) => a === b;

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

  function acceptMove(nextId){
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
        const [r1,c1] = rcOf(S.selPath[0]);
        const [r2,c2] = rcOf(nextId);
        dir = [Math.sign(r2 - r1), Math.sign(c2 - c1)];
      } else if (S.selPath.length >= 2) {
        const [pr,pc] = rcOf(last());
        const [nr,nc] = rcOf(nextId);
        const step = [Math.sign(nr - pr), Math.sign(nc - pc)];
        // must match the original direction
        if (!dir || step[0] !== dir[0] || step[1] !== dir[1]) return;
      }
    }

    // 4) Accept
    S.selPath.push(nextId);
    updateSel();
    liveMsg(lettersOf(S.selPath));
    redrawTempPill();
  }

  function handlePointerUp(pointerId){
    if (pointerId !== activePointer) return;
    try { gridEl.releasePointerCapture(activePointer); } catch {}
    activePointer = null;

    if (!S.dragging) return;
    S.dragging = false;

    const w = lettersOf(S.selPath);
    const i = WORDS.indexOf(w);

    if (i >= 0 && !S.found.has(i)) {
      // ✅ Correct
      S.found.add(i);
      document.querySelectorAll("#wordList span")[i].classList.add("done");
      drawFinalPill(S.selPath, S.activeColor); // keep color
      msgCloud(null, true);
      S.nextColor = nextPillColor();           // advance for NEXT selection
      if (S.found.size === WORDS.length) victory();
    } else {
      // ❌ Wrong — clear immediately
      msgCloud(null, false);
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
    S.selPath  = [+el.dataset.idx];
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
  window.addEventListener('pointerup',   e => handlePointerUp(e.pointerId), { capture: true });
  window.addEventListener('pointercancel', e => handlePointerUp(e.pointerId), { capture: true });
}
/* ---------------- VISUALS ---------------- */


function cellRectInGrid(id){
  const el = document.querySelector(`.cell[data-idx="${id}"]`);
  if (!el) return null;
  const grid = document.getElementById('grid');
  const rEl   = el.getBoundingClientRect();
  const rGrid = grid.getBoundingClientRect();
  return {
    cx: rEl.left - rGrid.left + rEl.width/2,
    cy: rEl.top  - rGrid.top  + rEl.height/2,
    w: rEl.width, h: rEl.height
  };
}

function drawPillSegment(aId, bId, color, isTemp=false){
  const A = cellRectInGrid(aId), B = cellRectInGrid(bId);
  if(!A || !B) return;
  const svg = document.getElementById('pills');
  const g = document.createElementNS('http://www.w3.org/2000/svg','g');
  g.classList.add(isTemp ? 'pill-temp' : 'pill-final');

  // thickness tuned to cell size; extra “padding” to look like a rounded capsule
  const thickness = Math.min(A.w, A.h) * 0.70;

  // BACK stroke = subtle border halo
  // const back = document.createElementNS('http://www.w3.org/2000/svg','line');
  // back.setAttribute('x1', A.cx); back.setAttribute('y1', A.cy);
  // back.setAttribute('x2', B.cx); back.setAttribute('y2', B.cy);
  // back.setAttribute('stroke', 'rgba(0,0,0,.12)');
  // back.setAttribute('stroke-width', thickness + 4);
  // back.setAttribute('stroke-linecap','round');

  // FRONT stroke = actual pill color
  const front = document.createElementNS('http://www.w3.org/2000/svg','line');
  front.setAttribute('x1', A.cx); front.setAttribute('y1', A.cy);
  front.setAttribute('x2', B.cx); front.setAttribute('y2', B.cy);
  front.setAttribute('stroke', color);
  front.setAttribute('stroke-width', thickness);
  front.setAttribute('stroke-linecap','round');

  if (isTemp) front.classList.add('temp');
  // g.appendChild(back);
  g.appendChild(front);
  svg.appendChild(g);
}



// function redrawPill(path, color){
//   const svg = document.getElementById('pills');
//   // clear only the temporary preview
//   svg.querySelectorAll('.pill-temp').forEach(n => n.remove());
//   for (let i=0; i<path.length-1; i++){
//     drawPillSegment(path[i], path[i+1], color, /*isTemp*/ true);
//   }
// }

function drawFinalPill(path, color){
  const svg = document.getElementById('pills');
  for (let i=0; i<path.length-1; i++){
    drawPillSegment(path[i], path[i+1], color, /*isTemp*/ false);
  }
  // clean preview after finalizing
  svg.querySelectorAll('.pill-temp').forEach(n => n.remove());
}


/* ---------------- LAVA BACKGROUND ---------------- */
function animateLava(){
  const canvas=document.getElementById('lava');
  const ctx=canvas.getContext('2d');
  resize();
  window.addEventListener('resize',resize);
  let t=0;
  function resize(){ canvas.width=innerWidth; canvas.height=innerHeight; }
  function frame(){
    t+=0.02;
    const w=canvas.width, h=canvas.height;
    const grd=ctx.createLinearGradient(0,0,w,h);
    grd.addColorStop(0,`hsl(${(t*20)%360},80%,12%)`);
    grd.addColorStop(1,`hsl(${(t*20+60)%360},80%,8%)`);
    ctx.fillStyle=grd;
    ctx.fillRect(0,0,w,h);
    requestAnimationFrame(frame);
  }
  frame();
}

/* ---------------- UI ---------------- */
const PRAISE = ["Nice!", "Great!", "Awesome!", "Well done!", "Sweet!", "Fantastic!"];
const MISS = ["Not a word...", "Try again!", "Nope!", "Hmm..."];

function rand(arr){ return arr[(Math.random()*arr.length)|0]; }

function msgCloud(text, isPraise = true) {
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
  cloud.style.color      = isPraise ? 'goldenrod' : '#333';

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

function victory() {
  console.log("Victory reached!");

  // Stop background music and play win tone
  SoundManager.stopAll();
  SoundManager.play('victory');

  // Award puzzle pieces
  S.puzzlePieces += 3;
  const msgColor = S.activeColor || "#9fff9f";
  msg(`🧩 +3 pieces (${S.puzzlePieces}/9)`, msgColor);

  // Check if puzzle complete (9 pieces)
  if (S.puzzlePieces >= 9) {
    msgCloud("Puzzle Complete!", true); // specific message
    //msg("🎉 Puzzle complete! Unlocking new zoo element!", "#9fff9f");
    setTimeout(() => nextLocationExpansion(), 1500);
  } else {
    msgCloud("Round complete!", null);
    setTimeout(() => nextRound(), 1800);
  }

  // Handle snake unlock
  if (S.round === 2) {
    S.round++;
    S.allowSnake = true;
    setTimeout(() => {
      msgCloud("🐍 New trick unlocked: Snake paths!", null);
      demoSnakeSelection(); // Run demo
    }, 2500);
  } else {
    S.round++;
  }
}

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
