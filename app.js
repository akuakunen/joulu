const SUPABASE_URL = 'VAIHDA_TÄHÄN_SUPABASE_URL';
const SUPABASE_KEY = 'VAIHDA_TÄHÄN_SUPABASE_ANON_KEY';
const TEST_MODE_UNLOCK_ALL = true;

const sb = SUPABASE_URL.startsWith('http') ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
let currentPlayer = localStorage.getItem('sorvaamo_player') || '';
document.getElementById('playerName').value = currentPlayer;
let allScores = [];

const DOORS = [
  { day:1, type:'wordle', word:'SORVI', hint:'Pajan sydän (5 kirjainta)' },
  { day:2, type:'measure', target:42.5, unit:'mm', title:'Tönäri-silmä: Aseta 42.5 mm' },
  { day:3, type:'memory', title:'Keittiö-neukkarin muistipeli' },
  { day:4, type:'slide', title:'Liu’uta joulutorttu palaveripöydän päähän!' },
  { day:5, type:'code', title:'Neukkarin ovikoodi jumissa! Murra koodi' },
  { day:6, type:'wordle', word:'KAHVI', hint:'Ilman tätä ei pyöri mikään (5 kirjainta)' },
  { day:7, type:'measure', target:68.0, unit:'%', title:'Leikkaa kinkusta 68.0 % siivu' },
  { day:8, type:'memory', title:'Etsi kadonneet suojalasit & glögit' },
  { day:9, type:'slide', title:'Glögimukin liu’utus kahvitauolla' },
  { day:10, type:'code', title:'Avaa taukotilan lukko' },
  { day:11, type:'wordle', word:'LASTU', hint:'Lentää kun terä puree (5 kirjainta)' },
  { day:12, type:'measure', target:19.5, unit:'mm', title:'Toleranssitesti: 19.5 mm' },
  { day:13, type:'memory', title:'Lucian päivän muistihaaste' },
  { day:14, type:'slide', title:'Työnnä eväsrasia mikron viereen' },
  { day:15, type:'code', title:'Pomon salainen kahvikaappi' },
  { day:16, type:'wordle', word:'PUURO', hint:'Höyryää kattilassa, jos neukkari on vapaa' },
  { day:17, type:'measure', target:84.0, unit:'mm', title:'Hienosäätö: 84.0 mm' },
  { day:18, type:'memory', title:'Pikkujoulujen jälkipyykki' },
  { day:19, type:'slide', title:'Torttutarjottimen tarkkuusheitto' },
  { day:20, type:'code', title:'Viimeisen viikon ovikoodi' },
  { day:21, type:'wordle', word:'TERÄS', hint:'Kovaa tavaraa (5 kirjainta)' },
  { day:22, type:'measure', target:50.0, unit:'mm', title:'Puolivälin tarkkuus: 50.0 mm' },
  { day:23, type:'slide', title:'Aatonaaton kahvikuppi-curling' },
  { day:24, type:'wordle', word:'JOULU', hint:'Nyt neukkari on vihdoin tyhjä!' }
];

function saveName() {
  const val = document.getElementById('playerName').value.trim();
  if (!val) return alert('Kirjoita ensin nimesi!');
  currentPlayer = val;
  localStorage.setItem('sorvaamo_player', val);
  renderCalendar();
}

async function loadScores() {
  if (!sb) {
    document.getElementById('leaderboard').innerHTML = '<tr><td colspan="4">Lisää Supabase URL & Key koodiin.</td></tr>';
    renderCalendar();
    return;
  }
  const { data } = await sb.from('sorvaamo_kalenteri').select('*');
  allScores = data || [];
  renderLeaderboard();
  renderCalendar();
}

async function submitScore(day, newScore) {
  if (!currentPlayer) return alert('Syötä nimesi yläpalkkiin!');
  const existing = allScores.find(s => s.player_name === currentPlayer && s.day === day);
  const bestScore = existing ? Math.max(existing.score, newScore) : newScore;
  if (!sb) {
    alert(`Sait ${newScore} p! (Yhdistä Supabase tallentaaksesi listalle)`);
    closeModal();
    return;
  }
  await sb.from('sorvaamo_kalenteri').upsert({ player_name: currentPlayer, day, score: bestScore }, { onConflict: 'player_name,day' });
  await loadScores();
  closeModal();
}

function renderLeaderboard() {
  const totals = {};
  allScores.forEach(r => {
    if (!totals[r.player_name]) totals[r.player_name] = { points: 0, days: 0 };
    totals[r.player_name].points += r.score;
    totals[r.player_name].days += 1;
  });
  const sorted = Object.entries(totals).sort((a, b) => b.points - a.points).slice(0, 15);
  const tbody = document.getElementById('leaderboard');
  tbody.innerHTML = sorted.length
    ? sorted.map(([n, s], i) => `<tr><td>${i+1}.</td><td><strong>${esc(n)}</strong></td><td>${s.days}/24</td><td><strong>${s.points} p</strong></td></tr>`).join('')
    : '<tr><td colspan="4">Ei vielä tuloksia!</td></tr>';
}

function renderCalendar() {
  const now = new Date();
  const isDec = now.getMonth() === 11;
  const today = isDec ? now.getDate() : 0;
  document.getElementById('calendar').innerHTML = DOORS.map(d => {
    const unlocked = TEST_MODE_UNLOCK_ALL || (isDec && d.day <= today);
    const my = allScores.find(s => s.player_name === currentPlayer && s.day === d.day);
    return `<div class="door ${unlocked ? '' : 'locked'} ${my ? 'done' : ''}" onclick="${unlocked ? `openDoor(${d.day})` : `alert('Palaveri kesken! Aukeaa ${d.day}.12.')`}">
      <div class="door-num">${d.day}</div>
      <div class="door-score">${my ? my.score + ' p' : (unlocked ? 'Pelaa' : '🔒')}</div>
    </div>`;
  }).join('');
}

function openDoor(day) {
  if (!currentPlayer) return alert('Kirjoita ensin nimesi yläpalkkiin ja paina Tallenna nimi!');
  const door = DOORS.find(d => d.day === day);
  const modal = document.getElementById('modalContent');
  document.getElementById('modalBg').style.display = 'flex';
  if (door.type === 'wordle') startWordle(door, modal);
  if (door.type === 'measure') startMeasure(door, modal);
  if (door.type === 'memory') startMemory(door, modal);
  if (door.type === 'slide') startSlide(door, modal);
  if (door.type === 'code') startCode(door, modal);
}

function closeModal() { document.getElementById('modalBg').style.display = 'none'; }
function startWordle(door, el) {
  let guesses = [];
  const target = door.word.toUpperCase();
  function render() {
    let rows = '';
    for (let r = 0; r < 6; r++) {
      const g = guesses[r] || '';
      rows += '<div class="word-row">';
      for (let c = 0; c < 5; c++) {
        const ch = g[c] || '';
        const cls = !g ? '' : (ch === target[c] ? 'correct' : (target.includes(ch) ? 'present' : 'absent'));
        rows += `<div class="tile ${cls}">${ch}</div>`;
      }
      rows += '</div>';
    }
    const won = guesses.includes(target);
    const lost = !won && guesses.length >= 6;
    el.innerHTML = `<h3>Luukku ${door.day}: Sanapeli</h3><p class="subtitle">${door.hint}</p>${rows}
      ${won ? `<p>🎉 Oikein! (${110 - guesses.length * 10} p)</p><button onclick="submitScore(${door.day}, ${110 - guesses.length * 10})">Tallenna</button>` :
        lost ? `<p>Sana oli <strong>${target}</strong> (20 p)</p><button onclick="submitScore(${door.day}, 20)">Tallenna</button>` :
        `<div style="margin-top:10px"><input id="wIn" maxlength="5" placeholder="5 kirjainta" style="width:140px;text-transform:uppercase" /> <button id="wBtn">Arvaa</button></div>`}
      <br><button class="secondary" style="margin-top:10px" onclick="closeModal()">Sulje</button>`;
    if (!won && !lost) {
      const inp = document.getElementById('wIn');
      inp.focus();
      document.getElementById('wBtn').onclick = () => {
        const v = inp.value.trim().toUpperCase();
        if (v.length === 5) { guesses.push(v); render(); }
      };
    }
  }
  render();
}

function startMeasure(door, el) {
  el.innerHTML = `<h3>Luukku ${door.day}: ${door.title}</h3>
    <p class="subtitle">Vedä säädin sokkona kohdalleen (0–100 ${door.unit}):</p>
    <input type="range" id="mRange" min="0" max="100" step="0.5" value="10" style="width:100%;margin:16px 0" />
    <button id="mCheck">Lukitse mitta!</button>
    <br><button class="secondary" style="margin-top:10px" onclick="closeModal()">Sulje</button>`;
  document.getElementById('mCheck').onclick = () => {
    const val = parseFloat(document.getElementById('mRange').value);
    const diff = Math.abs(val - door.target);
    const score = Math.max(10, Math.round(100 - diff * 4));
    el.innerHTML = `<h3>Mitta: ${val} ${door.unit}</h3>
      <p>Tavoite oli <strong>${door.target} ${door.unit}</strong> (heitto ${diff.toFixed(1)} ${door.unit})</p>
      <p style="font-size:1.3rem;color:var(--gold)">Pisteet: ${score} / 100</p>
      <button onclick="submitScore(${door.day}, ${score})">Tallenna</button>`;
  };
}

function startMemory(door, el) {
  const icons = ['☕','🥐','🎅','⚙️','📏','🎄'];
  let cards = [...icons, ...icons].sort(() => Math.random() - 0.5).map((icon, idx) => ({ idx, icon, open:false, matched:false }));
  let flipped = [], moves = 0;
  function render() {
    el.innerHTML = `<h3>Luukku ${door.day}: ${door.title}</h3><p class="subtitle">Käännöt: ${moves}</p>
      <div class="mem-grid">${cards.map(c => `<div class="mem-card ${c.open||c.matched?'open':''}" onclick="flipCard(${c.idx})">${c.open||c.matched?c.icon:'❓'}</div>`).join('')}</div>
      <button class="secondary" onclick="closeModal()">Sulje</button>`;
  }
  window.flipCard = idx => {
    const c = cards[idx];
    if (c.open || c.matched || flipped.length === 2) return;
    c.open = true; flipped.push(c); render();
    if (flipped.length === 2) {
      moves++;
      if (flipped.icon === flipped.icon) {
        flipped.matched = flipped.matched = true;
        flipped = [];
        if (cards.every(x => x.matched)) {
          const score = Math.max(20, 120 - moves * 5);
          el.innerHTML = `<h3>Valmis ${moves} käännöllä!</h3><p style="font-size:1.3rem;color:var(--gold)">Pisteet: ${score} p</p><button onclick="submitScore(${door.day}, ${score})">Tallenna</button>`;
        } else render();
      } else {
        setTimeout(() => { flipped.forEach(x => x.open = false); flipped = []; render(); }, 600);
      }
    }
  };
  render();
}

function startSlide(door, el) {
  el.innerHTML = `<h3>Luukku ${door.day}: ${door.title}</h3>
    <p class="subtitle">Säädä voima ja liu’uta torttu vihreälle alueelle!</p>
    <canvas id="c" width="360" height="110"></canvas>
    <input type="range" id="sPow" min="2" max="15" step="0.2" value="8" style="width:100%;margin:12px 0" />
    <button id="sGo">Työnnä!</button>
    <br><button class="secondary" style="margin-top:10px" onclick="closeModal()">Sulje</button>`;
  const ctx = document.getElementById('c').getContext('2d');
  let x = 30, vx = 0, launched = false;
  function draw() {
    ctx.clearRect(0, 0, 360, 110);
    ctx.fillStyle = '#065f46'; ctx.fillRect(250, 10, 60, 90);
    ctx.fillStyle = '#10b981'; ctx.fillRect(272, 10, 16, 90);
    ctx.font = '28px serif'; ctx.fillText('🥐', x - 14, 65);
    if (launched) {
      x += vx; vx *= 0.96;
      if (Math.abs(vx) < 0.1) {
        launched = false;
        const score = x > 350 ? 10 : Math.max(15, Math.round(100 - Math.abs(x - 280) * 0.8));
        setTimeout(() => {
          el.innerHTML = `<h3>Pysähtyi!</h3><p style="font-size:1.3rem;color:var(--gold)">Pisteet: ${score} / 100</p><button onclick="submitScore(${door.day}, ${score})">Tallenna</button>`;
        }, 350);
        return;
      }
      requestAnimationFrame(draw);
    }
  }
  draw();
  document.getElementById('sGo').onclick = () => { if (!launched) { vx = parseFloat(document.getElementById('sPow').value); launched = true; draw(); } };
}

function startCode(door, el) {
  const syms = ['☕', '🥐', '🎅', '⚙️'];
  const secret =.map(() => syms[Math.floor(Math.random() * 4)]);
  let attempts = [];
  function render() {
    el.innerHTML = `<h3>Luukku ${door.day}: ${door.title}</h3>
      <p class="subtitle">🟩 = oikea paikka, 🟨 = mukana koodissa</p>
      <div style="margin:10px 0">${.map(i => `<select id="sel${i}">${syms.map(s => `<option value="${s}">${s}</option>`).join('')}</select>`).join(' ')}</div>
      <button id="cTry">Kokeile</button>
      <div style="margin-top:10px;text-align:left;max-height:130px;overflow:auto">${attempts.map(a => `<div>${a.guess.join(' ')} — 🟩 ${a.exact} | 🟨 ${a.near}</div>`).join('')}</div>
      <button class="secondary" style="margin-top:10px" onclick="closeModal()">Sulje</button>`;
    document.getElementById('cTry').onclick = () => {
      const guess =.map(i => document.getElementById('sel' + i).value);
      let exact = 0, near = 0;
      const sC = [...secret], gC = [...guess];
      for (let i = 0; i < 4; i++) if (gC[i] === sC[i]) { exact++; sC[i] = gC[i] = null; }
      for (let i = 0; i < 4; i++) if (gC[i] && sC.includes(gC[i])) { near++; sC[sC.indexOf(gC[i])] = null; }
      attempts.push({ guess, exact, near });
      if (exact === 4) {
        const score = Math.max(25, 115 - attempts.length * 15);
        el.innerHTML = `<h3>🔓 Ovi aukesi (${attempts.length} yritystä)!</h3><p style="font-size:1.3rem;color:var(--gold)">Pisteet: ${score} p</p><button onclick="submitScore(${door.day}, ${score})">Tallenna</button>`;
      } else render();
    };
  }
  render();
}

function esc(s) { return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
loadScores();
