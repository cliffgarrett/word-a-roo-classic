import { SoundManager } from '../../../scripts/sound.js';
import { mountStage } from '../../../scripts/main.js';

/* ---------------- CONFIG ---------------- */
const WORDS = ['BIRD','BUG','CLOUD','DRAGON','KITE','EMIT'];
const BAG = "EEEEEEEEEEEEEEEAAAAAAAIIIIIIIOOOOOONNNNRRRRRSSSSTTTTTDLLLLUGGBBCCMMPPFFHHVVWWYKJXQZ";
const ROWS = 7, COLS = 6;
let S = { grid:[], placed:[], found:new Set(), dragging:false, selPath:[] };

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
        <div id="msg"></div>
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
}

/* ---------------- INPUT ---------------- */
function hookInput(gridEl){
  let activePointer=null;
alert('loaded');
  const cellElById=id=>gridEl.querySelector(`.cell[data-idx="${id}"]`);
  const updateSel=()=>{
    gridEl.querySelectorAll('.cell.sel').forEach(c=>c.classList.remove('sel'));
    for(const id of S.selPath) cellElById(id)?.classList.add('sel');
  };

  gridEl.addEventListener('pointerdown',e=>{
    const el=e.target.closest('.cell'); if(!el) return;
    activePointer=e.pointerId;
    gridEl.setPointerCapture(e.pointerId);
    S.dragging=true;
    S.selPath=[+el.dataset.idx];
    updateSel();
  });

  gridEl.addEventListener('pointermove',e=>{
    if(!S.dragging||e.pointerId!==activePointer)return;
    const el=e.target.closest('.cell'); if(!el)return;
    const id=+el.dataset.idx;
    const last=S.selPath[S.selPath.length-1];
    if(id!==last){ S.selPath.push(id); updateSel(); redrawPill(S.selPath); }
  });

  addEventListener('pointerup',()=>{
    if(!S.dragging)return;
    S.dragging=false; activePointer=null;
    const w=lettersOf(S.selPath);
    const i=WORDS.indexOf(w);
    if(i>=0&&!S.found.has(i)){
      S.found.add(i);
      document.querySelectorAll('#wordList span')[i].classList.add('done');
      msg(`Found ${w}!`);
      drawFinalPill(S.selPath);
      if(S.found.size===WORDS.length) victory();
    }
    S.selPath=[]; updateSel();
  });
}

/* ---------------- VISUALS ---------------- */
function cellRect(id){
  const el=document.querySelector(`.cell[data-idx="${id}"]`);
  const r=el.getBoundingClientRect();
  const host=document.querySelector('.boardWrap').getBoundingClientRect();
  return { x:r.left-host.left+r.width/2, y:r.top-host.top+r.height/2 };
}

function redrawPill(path){
  const svg=document.getElementById('pills');
  svg.innerHTML='';
  if(path.length<2)return;
  for(let i=0;i<path.length-1;i++)drawSegment(svg,path[i],path[i+1],'#9ad7ff80');
}

function drawFinalPill(path){
  const svg=document.getElementById('pills');
  for(let i=0;i<path.length-1;i++)drawSegment(svg,path[i],path[i+1],'#9ad7ff');
}

function drawSegment(svg,a,b,color){
  const A=cellRect(a), B=cellRect(b);
  if(!A||!B)return;
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('x1',A.x); line.setAttribute('y1',A.y);
  line.setAttribute('x2',B.x); line.setAttribute('y2',B.y);
  line.setAttribute('stroke',color);
  line.setAttribute('stroke-width','12');
  line.setAttribute('stroke-linecap','round');
  svg.appendChild(line);
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
function msg(t){
  const m=document.getElementById('msg');
  m.textContent=t; m.classList.add('show');
  setTimeout(()=>m.classList.remove('show'),1500);
}

function victory(){
  msg("Level Complete!");
  SoundManager.stopAll();
  SoundManager.play('classic',false);
  setTimeout(()=>{ msg("🎉 You Win!"); }, 1500);
}
