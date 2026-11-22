/* Player profiles for the whole Shaitan-Tau app (camera, collection, reserve game).
   The phone remembers who plays: profiles live in this browser's localStorage, several children can share one phone.
   Every page asks Profile.ensure(cb): a remembered player goes straight on, otherwise the sign-in screen appears.
   Per-player data uses Profile.key(base). The first player inherits progress saved before profiles existed. */
(function () {
  const KEY = 'shaitantau.profiles.v1';
  const LEGACY = ['shaitantau.collection.v1', 'zapovednik.save.v2'];
  const AVATARS = ['🦉', '🐹', '🐻', '🐱', '🦅', '🦊', '🦔', '🐺'];
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { current: null, list: [] }; } catch (e) { return { current: null, list: [] }; } };
  const write = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* storage blocked: works for this visit only */ } };
  let mem = read();

  const Profile = {
    AVATARS,
    current() { return mem.list.find((p) => p.id === mem.current) || null; },
    list() { return mem.list.slice(); },
    key(base) { const p = Profile.current(); return p ? base + '@' + p.id : base; },
    create(name, avatar) {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const first = mem.list.length === 0;
      mem.list.push({ id, name, avatar, created: new Date().toISOString() });
      mem.current = id; write(mem);
      if (first) for (const b of LEGACY) {                     // progress from before sign-in belongs to the first player
        try { const v = localStorage.getItem(b); if (v != null && localStorage.getItem(b + '@' + id) == null) localStorage.setItem(b + '@' + id, v); } catch (e) { /* ignore */ }
      }
      return Profile.current();
    },
    use(id) { if (mem.list.some((p) => p.id === id)) { mem.current = id; write(mem); } return Profile.current(); },
    signOut() { mem.current = null; write(mem); },
    ensure(cb) {
      const p = Profile.current();
      if (p) { cb(p); return; }
      showSignIn(cb);
    },
    showSwitcher(cb) { showSignIn(cb, true); }
  };
  window.Profile = Profile;

  const CSS = `
.pf-wrap{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:calc(env(safe-area-inset-top) + 16px) max(16px,env(safe-area-inset-right)) calc(env(safe-area-inset-bottom) + 16px) max(16px,env(safe-area-inset-left));
  background:radial-gradient(120% 80% at 50% 0%,#2f4a39 0%,#16211b 60%,#0f1713 100%);color:#efe5d2;font-family:"Nunito","Segoe UI",system-ui,sans-serif;overflow-y:auto}
.pf-card{width:min(420px,100%);display:flex;flex-direction:column;gap:16px}
.pf-eyebrow{font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#f0a43a}
.pf-card h1{font-family:"Unbounded","Arial Black",system-ui,sans-serif;font-size:clamp(26px,8vw,34px);line-height:1.08;margin:0}
.pf-card p{margin:0;color:#b9c3b7;line-height:1.45}
.pf-label{font-size:13px;font-weight:800;color:#b9c3b7;margin-bottom:-8px}
.pf-input{font:700 19px "Nunito",system-ui,sans-serif;color:#efe5d2;background:#0f1713;border:1px solid #34463c;border-radius:16px;padding:15px 16px;width:100%;box-sizing:border-box}
.pf-input:focus{outline:2px solid #f0a43a;border-color:transparent}
.pf-avatars{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.pf-av{font-size:30px;line-height:1;aspect-ratio:1;border-radius:16px;border:2px solid #34463c;background:#1b2821;cursor:pointer;display:grid;place-items:center}
.pf-av[aria-pressed="true"]{border-color:#f0a43a;background:#3a3420}
.pf-btn{font:800 18px/1 "Nunito",system-ui,sans-serif;color:#1b140a;background:#f0a43a;border:0;border-radius:16px;padding:17px 20px;cursor:pointer;width:100%}
.pf-btn[disabled]{opacity:.45;cursor:default}
.pf-btn.ghost{background:transparent;color:#efe5d2;border:1px solid #34463c}
.pf-list{display:flex;flex-direction:column;gap:8px}
.pf-who{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;border:1px solid #34463c;background:#1b2821;color:#efe5d2;font:800 18px "Nunito",system-ui,sans-serif;cursor:pointer;text-align:left}
.pf-who span{font-size:30px}
.pf-note{font-size:13px;color:#8d998c}
.pf-btn:focus-visible,.pf-av:focus-visible,.pf-who:focus-visible{outline:3px solid #efe5d2;outline-offset:2px}`;

  function showSignIn(cb, switching) {
    if (!document.getElementById('pf-css')) { const st = document.createElement('style'); st.id = 'pf-css'; st.textContent = CSS; document.head.appendChild(st); }
    const wrap = document.createElement('div'); wrap.className = 'pf-wrap'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true');
    document.body.appendChild(wrap);
    const done = (p) => { wrap.remove(); cb(p); };
    const others = mem.list;
    const renderNew = () => {
      let avatar = AVATARS[0];
      wrap.innerHTML = `<form class="pf-card" autocomplete="off">
        <div class="pf-eyebrow">Заповедник Шайтан-Тау</div>
        <h1>${others.length ? 'Новый игрок' : 'Привет! Давай познакомимся'}</h1>
        <p>Как тебя зовут? Телефон запомнит тебя, и в следующий раз входить не придётся.</p>
        <div class="pf-label">Твоё имя</div>
        <input class="pf-input" id="pf-name" maxlength="20" placeholder="Например, Маша" enterkeyhint="done" required>
        <div class="pf-label">Выбери значок</div>
        <div class="pf-avatars">${AVATARS.map((a, i) => `<button type="button" class="pf-av" data-av="${a}" aria-pressed="${i === 0}" aria-label="Значок ${i + 1}">${a}</button>`).join('')}</div>
        <button class="pf-btn" type="submit" id="pf-go" disabled>Войти</button>
        ${others.length ? '<button class="pf-btn ghost" type="button" id="pf-back">Назад</button>' : ''}
        <p class="pf-note">Имя и прогресс хранятся только на этом телефоне.</p>
      </form>`;
      const name = wrap.querySelector('#pf-name'), go = wrap.querySelector('#pf-go');
      name.addEventListener('input', () => { go.disabled = !name.value.trim(); });
      wrap.querySelectorAll('.pf-av').forEach((b) => b.addEventListener('click', () => {
        avatar = b.dataset.av; wrap.querySelectorAll('.pf-av').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      }));
      wrap.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const n = name.value.trim(); if (n) done(Profile.create(n, avatar)); });
      const back = wrap.querySelector('#pf-back'); if (back) back.addEventListener('click', renderList);
      setTimeout(() => name.focus(), 50);
    };
    const renderList = () => {
      wrap.innerHTML = `<div class="pf-card">
        <div class="pf-eyebrow">Заповедник Шайтан-Тау</div>
        <h1>Кто играет?</h1>
        <div class="pf-list">${others.map((p) => `<button type="button" class="pf-who" data-id="${p.id}"><span aria-hidden="true">${p.avatar}</span>${esc(p.name)}</button>`).join('')}</div>
        <button class="pf-btn ghost" type="button" id="pf-new">+ Новый игрок</button>
      </div>`;
      wrap.querySelectorAll('.pf-who').forEach((b) => b.addEventListener('click', () => done(Profile.use(b.dataset.id))));
      wrap.querySelector('#pf-new').addEventListener('click', renderNew);
    };
    if (others.length) renderList(); else renderNew();
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
})();

/* Code words from the crossword. Only hashes are stored in the pages, so the answers can't be read from the source.
   Opened codes are remembered per player: the same animal never asks twice. */
(function () {
  const norm = (s) => String(s).toUpperCase().replace(/Ё/g, 'Е').replace(/[^А-ЯA-Z]/g, '');
  const cyrb53 = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  };
  const hash = (code) => cyrb53('shaitantau:' + norm(code)).toString(36);
  const KEY = 'shaitantau.codes.v1';
  const storeKey = () => (window.Profile ? Profile.key(KEY) : KEY);
  const read = () => { try { return JSON.parse(localStorage.getItem(storeKey())) || {}; } catch (e) { return {}; } };
  window.ShaitanCode = {
    norm, hash,
    // id -> hash of its code word (same words as in the crossword book)
    HASHES: { filin: 'iqgdbwayng', baibak: 'bm2he994vk', medved: '1y2kfzh8e4a', rys: '1ee0pq853vj', sapsan: 'gtz7hx1dui' },
    DEV: '1fwr7mkm4vw',
    check(id, word) { return hash(word) === this.HASHES[id]; },
    find(word) { const h = hash(word); return Object.keys(this.HASHES).find((k) => this.HASHES[k] === h) || (h === this.DEV ? '*' : null); },
    isOpen(id) { return !!read()[id]; },
    open(id) { const d = read(); d[id] = new Date().toISOString(); try { localStorage.setItem(storeKey(), JSON.stringify(d)); } catch (e) { /* ignore */ } }
  };
})();
