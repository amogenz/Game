// ══════════════════════════
// 1. DINAMIS ASYNC DATABASE (GITHUB CDN VIA JS_DELIVR)
// ══════════════════════════
let currentMode = 'lv1'; // Default mode. Bisa diubah menjadi 'tajwid' lewat UI tombol pilihan
let dbCache = {};
let DB = []; // Akan diisi setelah fetch berhasil

// Fungsi mengambil URL dari repositori GitHub secara dinamis berdasarkan value select
function getDbUrl(mode) {
  return `https://cdn.jsdelivr.net/gh/amogenz/Amogenz/db/amogenzdb-${mode}.js`;
}

// Fungsi mengunduh file .js secara async dan mengekstrak array data di dalamnya
async function loadGameDatabase(mode) {
  if (dbCache[mode]) return dbCache[mode];

  const url = getDbUrl(mode);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Gagal mengunduh database mode: ${mode}`);
  
  const text = await response.text();
  
  // Regex ini akan mencocokkan export const AMOGENZ_DB_ANYTHING = [...]
  const match = text.match(/export\s+const\s+AMOGENZ_DB_[A-Z0-9_]+\s*=\s*([\s\S]*?);?\s*$/);
  if (!match) throw new Error(`Format data di dalam file amogenzdb-${mode}.js tidak valid.`);

  let rawData = match[1].trim();
  const parsedData = new Function(`return ${rawData}`)();
  
  dbCache[mode] = parsedData;
  return parsedData;
}

// Splash Screen Timer Bawaan Kamu
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('splash-screen').classList.add('hide');
  }, 1700);
});

// ══════════════════════════════════════════════════════════
// CARD THEMES — 9 themes with unique visuals
// ══════════════════════════════════════════════════════════
const THEMES = [
  { th:'hearts',   sym:'♥', ranks:['A','2','3','4','5','6','7','8','9','10','J','Q','K'] },
  { th:'diamonds', sym:'♦', ranks:['A','2','3','4','5','6','7','8','9','10','J','Q','K'] },
  { th:'spades',   sym:'♠', ranks:['A','2','3','4','5','6','7','8','9','10','J','Q','K'] },
  { th:'clubs',    sym:'♣', ranks:['A','2','3','4','5','6','7','8','9','10','J','Q','K'] },
  { th:'joker',    sym:'🃏', ranks:['JOKER','☆ JOKER','★ WILD','✦ JOKER'] },
  { th:'gold',     sym:'✦', ranks:['A','ACE','I','II','III'] },
  { th:'navy',     sym:'⚓', ranks:['A','K','Q','J','10','9','8'] },
  { th:'emerald',  sym:'🍀', ranks:['A','K','Q','J','10','9'] },
  { th:'crimson',  sym:'🔴', ranks:['A','K','Q','J','10','9'] },
];

let themeOrder = [];
function newThemeOrder() {
  themeOrder = [...THEMES].sort(()=>Math.random()-.5);
}

function cardDef(idx) {
  const t = themeOrder[idx % themeOrder.length];
  return {
    th:   t.th,
    sym:  t.sym,
    rank: t.ranks[Math.floor(Math.random()*t.ranks.length)]
  };
}


// ═══════════════════════════
// AUDIO LOGIC — Web Audio API Synthesizer (Pure & Anti-Lag)
// ══════════════════════════
const ac = new (window.AudioContext || window.webkitAudioContext)();

function beep(type) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.connect(g); 
  g.connect(ac.destination);
  const t = ac.currentTime;

  if (type === 'correct') {
    // Nada Mumtaz 🎉 (Sine Wave - Naik Cepat & Clean)
    o.type = 'sine';
    o.frequency.setValueAtTime(523, t);
    o.frequency.exponentialRampToValueAtTime(1047, t + .18);
    g.gain.setValueAtTime(.07, t); 
    g.gain.linearRampToValueAtTime(0, t + .35);
    o.start(t); 
    o.stop(t + .35);
  } else if (type === 'wrong') {
    // Nada Syiddah ❌ (Sawtooth Wave - Serak & Menurun)
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(70, t + .22);
    g.gain.setValueAtTime(.05, t); 
    g.gain.linearRampToValueAtTime(0, t + .28);
    o.start(t); 
    o.stop(t + .28);
  } else {
    // Nada Swipe/Default 🃏 (Sine Wave Short - Halus)
    o.type = 'sine';
    o.frequency.setValueAtTime(320, t);
    o.frequency.exponentialRampToValueAtTime(200, t + .09);
    g.gain.setValueAtTime(.03, t); 
    g.gain.linearRampToValueAtTime(0, t + .12);
    o.start(t); 
    o.stop(t + .12);
  }
}


// ══════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════
function shuffle(a){ return [...a].sort(()=>Math.random()-.5); }

let queue=[],kIdx=0,lIdx=0,sIdx=1;
let options=[],optIdx=0,scoreTracker={};
let busy=false;

// drag object
const D={ on:false, sx:0, sy:0, lx:0, ly:0, vx:0, vy:0, el:null };

// ══════════════════════════════════════════════════════════
// 2. INIT GAME — Diubah jadi ASYNC agar bisa nunggu download DB
// ══════════════════════════════════════════════════════════
async function init(){
  const qTextEl = document.getElementById('qtext');
  
  try {
    // Jalankan download database dari GitHub secara real-time berdasarkan mode aktif
    if (!DB.length || queue.length === 0) {
      qTextEl.textContent = 'Bismillah, memuat soal...';
      DB = await loadGameDatabase(currentMode);
      if (!DB?.length) {
        qTextEl.textContent = 'Database kosong!';
        return;
      }
      queue = shuffle([...DB]);
    }

    const sent = queue[kIdx % queue.length];
    const laf  = sent.analysis[lIdx];
    if(!laf){ nextSentence(); return; }
    const step = laf.steps[sIdx];
    if(!step){ nextLafadz(); return; }

    document.getElementById('sentence').textContent = sent.teks_kalimat;
    qTextEl.textContent                             = step.question;
    document.getElementById('lbl-word').textContent = laf.word;
    document.getElementById('lbl-cnt').textContent  = `${(kIdx%queue.length)+1}/${queue.length}`;

    options = shuffle([...step.options]);
    optIdx  = 0;
    newThemeOrder(); 

    const total = Object.keys(laf.steps).length;
    updateDots(total);
    buildDeck();

    // Jalankan tutorial jika user baru pertama kali main
    runTutorial();

  } catch (error) {
    console.error("Gagal inisialisasi game kartu bray:", error);
    qTextEl.textContent = 'Gagal download data soal dari GitHub!';
  }
}

// Fungsi ganti mode game dari luar (Bisa kamu panggil dari button HTML)
// Contoh di HTML: <button onclick="changeGameMode('tajwid')">Mode Tajwid</button>
window.changeGameMode = (mode) => {
  if (busy) return;
  currentMode = mode;
  DB = []; 
  queue = [];
  kIdx = 0; lIdx = 0; sIdx = 1;
  scoreTracker = {};
  init();
};

function updateDots(total){
  document.getElementById('prog-fill').style.width=`${(sIdx/total)*100}%`;
  const area=document.getElementById('dots');
  area.innerHTML='';
  for(let i=1;i<=total;i++){
    const d=document.createElement('div');
    d.className='dot'+(i===sIdx?' now':'')+(scoreTracker[i]===true?' ok':'')+(scoreTracker[i]===false?' bad':'');
    area.appendChild(d);
  }
}

// ══════════════════════════════════════════════════════════
// BUILD DECK
// ══════════════════════════════════════════════════════════
function buildDeck(){
  const deck=document.getElementById('deck');
  deck.innerHTML='';
  options.forEach((opt,i)=>{
    const def=cardDef(i);
    const el=createCard(opt,def,i);
    applyPos(el,i,false);
    deck.appendChild(el);
  });
}

function createCard(text,def,i){
  const el=document.createElement('div');
  el.className='card';
  el.dataset.i=i;
  const isJoker=def.th==='joker';
  el.innerHTML=`
    <div class="cs1 th-${def.th}"></div>
    <div class="cs2 th-${def.th}"></div>
    <div class="cf th-${def.th}">
      ${isJoker?'<div class="jbg"></div>':''}
      <div class="corner tl">
        <div class="c-rank">${def.rank}</div>
        <div class="c-sym">${def.sym}</div>
      </div>
      <div class="cmid">
        <div class="csym-big">${def.sym}</div>
        <div class="ctext">${text}</div>
      </div>
      <div class="corner br">
        <div class="c-rank">${def.rank}</div>
        <div class="c-sym">${def.sym}</div>
      </div>
    </div>`;
  return el;
}

// ══════════════════════════════════════════════════════════
// POSITIONING
// ══════════════════════════════════════════════════════════
const POSLIST=['p-active','p-right','p-left','p-far-right','p-far-left','p-gone'];

function applyPos(el,cardIdx,animated){
  POSLIST.forEach(p=>el.classList.remove(p));
  el.style.cssText=''; 
  if(animated) el.classList.add('anim');
  else         el.classList.remove('anim');

  const n=options.length;
  const d=((cardIdx-optIdx)%n+n)%n;
  const m=d>n/2?d-n:d;

  if     (m===0)  el.classList.add('p-active');
  else if(m===1)  el.classList.add('p-right');
  else if(m===-1) el.classList.add('p-left');
  else if(m===2)  el.classList.add('p-far-right');
  else if(m===-2) el.classList.add('p-far-left');
  else            el.classList.add('p-gone');
}

function reposition(animated){
  document.querySelectorAll('.card').forEach(el=>applyPos(el,+el.dataset.i,animated));
}

// ══════════════════════════════════════════════════════════
// TOUCH — Drag with velocity
// ══════════════════════════════════════════════════════════
const stage=document.getElementById('stage');
const dz=document.getElementById('dropzone');

stage.addEventListener('touchstart',e=>{
  if(busy)return;
  ac.resume();
  const t=e.touches[0];
  D.on=true; D.sx=D.lx=t.clientX; D.sy=D.ly=t.clientY; D.vx=D.vy=0;
  D.el=document.querySelector('.p-active');
  if(D.el){ D.el.classList.remove('anim'); D.el.style.transition='none'; }
},{passive:true});

stage.addEventListener('touchmove',e=>{
  if(!D.on||!D.el)return;
  e.preventDefault();
  const t=e.touches[0];
  const dx=t.clientX-D.sx, dy=t.clientY-D.sy;
  D.vx=t.clientX-D.lx; D.vy=t.clientY-D.ly;
  D.lx=t.clientX; D.ly=t.clientY;

  const rot_y =  dx*0.065;
  const rot_x = -dy*0.040 + 5;
  const scale  = 1 + Math.abs(dy)*0.0006;

  D.el.style.transform=`translate3d(${dx}px,${dy-12}px,28px) rotateY(${rot_y}deg) rotateX(${rot_x}deg) scale(${scale})`;
  D.el.style.filter=`drop-shadow(0 ${Math.max(8,18-dy*.1)}px ${Math.max(10,22-dy*.12)}px rgba(0,0,0,.7))`;
  D.el.style.opacity='1';

  const goUp = dy<-50 && Math.abs(dy)>Math.abs(dx)*.8;
  dz.classList.toggle('hover',goUp);
},{passive:false});

stage.addEventListener('touchend',e=>{
  if(!D.on)return;
  D.on=false;
  dz.classList.remove('hover');

  const dx=D.lx-D.sx, dy=D.ly-D.sy;
  const flickUp  = (dy<-65||D.vy<-7) && Math.abs(dx)<Math.abs(dy)*1.7;
  const swipeR   = dx> 50 && Math.abs(dx)>Math.abs(dy)*1.1;
  const swipeL   = dx<-50 && Math.abs(dx)>Math.abs(dy)*1.1;

  if(flickUp){
    doAnswer();
  } else if(swipeR||swipeL){
    if(D.el){
      D.el.style.transition='transform .22s ease-out, opacity .18s';
      D.el.style.transform=`translate3d(${swipeR?-260:260}px,-12px,0) rotateY(${swipeR?35:-35}deg) scale(.65)`;
      D.el.style.opacity='0';
    }
    beep('swipe');
    optIdx=swipeR?(optIdx-1+options.length)%options.length:(optIdx+1)%options.length;
    setTimeout(()=>reposition(true),100);
  } else {
    if(D.el){ D.el.classList.add('anim'); applyPos(D.el,+D.el.dataset.i,false); }
  }
  D.el=null;
});

// ══════════════════════════════════════════════════════════
// ANSWER
// ══════════════════════════════════════════════════════════
function doAnswer(){
  if(busy)return;
  busy=true;

  const sent  = queue[kIdx%queue.length];
  const laf   = sent.analysis[lIdx];
  const step  = laf.steps[sIdx];
  const ok    = options[optIdx]===step.correct;

  scoreTracker[sIdx]=ok;

  const activeEl = D.el||document.querySelector('.p-active');

  if(activeEl){
    const dzR  = dz.getBoundingClientRect();
    const dkR  = document.getElementById('deck').getBoundingClientRect();
    const tx   = (dzR.left+dzR.width/2)  - (dkR.left+dkR.width/2);
    const ty   = (dzR.top +dzR.height/2) - (dkR.top +dkR.height/2);

    activeEl.style.transition='transform .3s cubic-bezier(.4,0,.2,1), opacity .28s';
    activeEl.style.transform =`translate3d(${tx}px,${ty}px,60px) rotateX(25deg) scale(.5)`;
    activeEl.style.opacity   ='0';
  }

  setTimeout(()=>{
    beep(ok?'correct':'wrong');
    if(ok) doSparkle();
    if(!ok && navigator.vibrate) navigator.vibrate([80,40,80]);

    const def=cardDef(optIdx);
    document.getElementById('m-suit').textContent  = def.sym;
    document.getElementById('m-title').textContent = ok?'MUMTAZ! 🎉':'SYIDDAH! ❌';
    document.getElementById('m-title').style.color = ok?'var(--success)':'var(--danger)';
    document.getElementById('m-desc').textContent  = step.explanation;
    document.getElementById('modal').style.display ='flex';
  },310);
}

// ══════════════════════════════════════════════════════════
// FLOW
// ══════════════════════════════════════════════════════════
window.closeModal=()=>{
  document.getElementById('modal').style.display='none';
  busy=false; sIdx++;
  const laf=queue[kIdx%queue.length].analysis[lIdx];
  const total=Object.keys(laf.steps).length;
  if(sIdx>total) nextLafadz();
  else init();
};

function nextLafadz(){
  lIdx++;
  const sent=queue[kIdx%queue.length];
  if(lIdx<sent.analysis.length){ sIdx=1; scoreTracker={}; init(); }
  else nextSentence();
}

function nextSentence(){
  const el=document.getElementById('rdone');
  el.style.display='flex';
  setTimeout(()=>{
    el.style.display='none';
    kIdx=(kIdx+1)%queue.length;
    lIdx=0; sIdx=1; scoreTracker={};
    if(kIdx===0) queue=shuffle([...DB]);
    init();
  },1500);
}

// ══════════════════════════════════════════════════════════
// SPARKLE
// ══════════════════════════════════════════════════════════
function doSparkle(){
  const em=['✨','⭐','🌟','💫','🎊','🎉'];
  for(let i=0;i<7;i++){
    setTimeout(()=>{
      const s=document.createElement('div');
      s.className='sparkle';
      s.textContent=em[Math.floor(Math.random()*em.length)];
      s.style.left=(15+Math.random()*70)+'vw';
      s.style.top =(15+Math.random()*55)+'vh';
      document.body.appendChild(s);
      setTimeout(()=>s.remove(),900);
    },i*65);
  }
}

// ══════════════════════════════════════════════════════════
// SURRENDER & SHARING SYSTEM
// ══════════════════════════════════════════════════════════
window.surrender = () => {
  if (busy) return;
  
  const modal = document.getElementById('modal');
  const title = document.getElementById('m-title');
  const desc = document.getElementById('m-desc');
  const suit = document.getElementById('m-suit');
  const mBox = document.querySelector('.mbox');
  const btnOk = document.querySelector('.btn-ok');

  suit.textContent = '🏳️';
  title.textContent = 'MENYERAH?';
  title.style.color = 'var(--danger)';
  desc.textContent = 'Tak patutt bray, dikit lagi jago nih! 👶';
  btnOk.textContent = 'YA, REFRESH 🔄';

  let btnCancel = document.getElementById('btn-cancel');
  if (!btnCancel) {
    btnCancel = document.createElement('button');
    btnCancel.id = 'btn-cancel';
    btnCancel.className = 'btn-batal'; 
    btnCancel.textContent = 'KAGAK JADI, LANJUT! 🔥';
    mBox.appendChild(btnCancel);
  }
  btnCancel.style.display = 'block';

  btnOk.onclick = () => window.location.reload();
  
  btnCancel.onclick = () => {
    modal.style.display = 'none';
    btnCancel.style.display = 'none'; 
  };

  modal.style.display = 'flex';
};

const originalCloseModal = window.closeModal;
window.closeModal = () => {
  const btnCancel = document.getElementById('btn-cancel');
  if (btnCancel) btnCancel.style.display = 'none';
  originalCloseModal();
};

window.shareGame = async () => {
  const shareTitle = 'Nahwu Card Master - Game Belajar I\'rob';
  const shareText = 'Aplikasi belajar Nahwu Shorof bertenaga AI. Analisa I\'rob otomatis dengan game kartu interaktif. Gratis untuk santri! Coba sekarang:';
  const shareUrl = 'https://game-nahwu.amogenz.xyz';
  const fullMessage = `${shareText} ${shareUrl}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      });
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(fullMessage)}`;
      window.open(waUrl, '_blank');
    }
  } catch (err) {
    console.log('Berbagi dibatalkan atau terjadi kesalahan');
  }
};

function runTutorial() {
  const isDone = localStorage.getItem('amogenz_tutorial_done');
  if (isDone) return; 

  const overlay = document.getElementById('demo-overlay');
  const hand = document.getElementById('hand');
  const txt = document.getElementById('demo-text');
  
  if (!overlay) return;

  overlay.style.display = 'flex';
  overlay.style.pointerEvents = 'all'; 
  overlay.onclick = null; 

  hand.style.animation = 'demoSwipe 2.5s infinite';
  
  setTimeout(() => {
    if(txt) txt.textContent = "Flick kartu ke atas untuk menjawab!";
    hand.style.animation = 'demoFlick 2s infinite';
  }, 5000);

  setTimeout(() => {
    if(txt) {
      txt.innerHTML += "<br><br><span style='font-size:0.6rem; color:white; background:rgba(255,255,255,0.2); padding:4px 10px; border-radius:10px;'>Paham, Mulai Main!</span>";
    }
    
    const closeNow = () => {
      overlay.style.display = 'none';
      localStorage.setItem('amogenz_tutorial_done', 'true');
    };

    overlay.onclick = closeNow;
    overlay.ontouchstart = closeNow;
  }, 8000);
}

// Jalankan inisialisasi awal saat pertama kali web dibuka
init();
