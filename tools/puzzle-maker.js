function byId(id){return document.getElementById(id);}

const lvlNum=byId('lvlNum'), theme=byId('theme'),
  author=byId('author'), themeColor=byId('themeColor'),
  tickets=byId('tickets'), pieces=byId('pieces'),
  diff=byId('difficulty'), music=byId('music'),
  snakeMode=byId('snakeMode'), output=byId('output'),
  langList=byId('langList');

byId('btnGen').onclick = generate;
byId('btnDL').onclick  = download;
byId('btnAddLang').onclick = addLanguage;

const SUPPORTED = [
  {code:'es',name:'Español'}, {code:'fr',name:'Français'},
  {code:'de',name:'Deutsch'}, {code:'pt',name:'Português'},
  {code:'nl',name:'Nederlands'}, {code:'it',name:'Italiano'}
];

// ---- UI helpers ----
function addLanguage(){
  const used = Array.from(langList.querySelectorAll('.langBlock')).map(b=>b.dataset.lang);
  const avail = SUPPORTED.find(l=>!used.includes(l.code));
  if(!avail){alert('All preset languages added');return;}
  const block=document.createElement('div');
  block.className='langBlock'; block.dataset.lang=avail.code;
  block.innerHTML=`
    <h3>${avail.name} (${avail.code})</h3>
    <label>Title <input class="title" data-lang="${avail.code}" placeholder="Translated title"></label>
    <label>Words (max 6)</label>
    <div class="wordInputs" data-lang="${avail.code}">
      ${Array.from({length:6}).map(()=>'<input class="word" placeholder="WORD">').join('')}
    </div>
    <label>Unscramble / Jumble Word <input class="jumbleWord" data-lang="${avail.code}" placeholder="Final word"></label>
  `;
  langList.appendChild(block);
}

// ---- Collect data from inputs ----
function collectLanguages(){
  const data={};
  langList.querySelectorAll('.langBlock').forEach(block=>{
    const lang=block.dataset.lang;
    const title=block.querySelector('.title').value.trim();
    const words=Array.from(block.querySelectorAll('.word')).map(i=>i.value.trim().toUpperCase()).filter(Boolean);
    const jumble=block.querySelector('.jumbleWord').value.trim().toUpperCase();
    if(title||words.length||jumble){
      data[lang]={title,words,jumble};
    }
  });
  return data;
}

// ---- Validation ----
function validate(langs){
  const errors=[];
  if(!langs.en){errors.push('English section is required.'); return errors;}

  for(const [lang,val] of Object.entries(langs)){
    if(!val.words?.length){errors.push(`${lang.toUpperCase()}: must have at least one word.`);}
    if(!val.jumble){errors.push(`${lang.toUpperCase()}: missing jumble word.`);}
    if(val.words?.length && val.jumble){
      const letters=val.jumble.split('');
      const allLetters=val.words.join('').toUpperCase();
      const missing=letters.filter(ch=>!allLetters.includes(ch));
      if(missing.length){
        errors.push(`${lang.toUpperCase()}: jumble contains letters not found in word list (${missing.join(', ')}).`);
      }
    }
  }
  return errors;
}

// ---- Main generation ----
function generate(){
  const langs=collectLanguages();
  const errs=validate(langs);
  const msgEl=document.getElementById('msg')||createMsg();
  if(errs.length){
    msgEl.textContent='⚠️ '+errs.join(' ');
    msgEl.style.color='#ff6b6b';
    output.value='';
    return;
  }

  const id=Number(lvlNum.value)||1;
  const wordsObj={}, titles={}, jumbles={};
  for(const [lang,val] of Object.entries(langs)){
    if(val.words.length) wordsObj[lang]=val.words;
    if(val.title) titles[lang]=val.title;
    if(val.jumble) jumbles[lang]=val.jumble;
  }

  const jumbleEn=jumbles.en||'';
  const sourceLetters=jumbleEn.split('');

  const data={
    id,
    locale:'en',
    title:titles,
    author:author.value||'',
    themeColor:themeColor.value||'#ffffff',
    reward:{tickets:Number(tickets.value)||0,pieces:Number(pieces.value)||0},
    transitions:{victorySound:'victory.mp3',nextLevelDelay:2000},
    progress:{foundWords:[],completed:false},
    rows:6,cols:6,
    fillChars:"ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    orientation:["H","V","D"],
    difficulty:diff.value,
    music:music.value,
    snakeMode:snakeMode.checked,
    words:wordsObj,
    jumble:{
      word:jumbles,
      sourceLetters,
      transition:{fade:true,dimWordList:true,highlightLetters:true,fallEffect:true}
    },
    meta:{version:'1.0',created:new Date().toISOString().split('T')[0]}
  };

  output.value=JSON.stringify(data,null,2);
  msgEl.textContent='✅ JSON generated successfully.';
  msgEl.style.color='#87f59f';
}

// ---- Utility for status messages ----
function createMsg(){
  const el=document.createElement('div');
  el.id='msg';
  el.style.marginTop='.5rem';
  el.style.fontWeight='700';
  document.querySelector('.buttons').after(el);
  return el;
}

// ---- Download handler ----
function download(){
  if(!output.value) generate();
  if(!output.value) return;
  const num=String(lvlNum.value).padStart(4,'0');
  const themePart=theme.value?`-${theme.value.toLowerCase()}`:'';
  const fname=`lvl-${num}${themePart}.json`;
  const blob=new Blob([output.value],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=fname;
  a.click();
  URL.revokeObjectURL(a.href);
}
