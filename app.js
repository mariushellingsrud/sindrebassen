(function () {
  'use strict';

  // Public (publishable) Supabase settings. Writes are protected by the shared Sindre-kode,
  // which is checked inside the database and never stored in this repo.
  const SUPABASE_URL = 'https://xqlcqtruisntqxodjfjx.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbGNxdHJ1aXNudHF4b2RqZmp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4NTQzNDksImV4cCI6MjExMDQzMDM0OX0.soYRdSyk1jo7t1WD1x_oEq_OKoqvExpZ0TNsjxKjB0w';

  const $ = (s) => document.querySelector(s);
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.2s-7.6-4.6-10.1-9.4C.3 8.6 2.1 4.6 6 4.2c2.3-.2 4.3 1 6 3.1 1.7-2.1 3.7-3.3 6-3.1 3.9.4 5.7 4.4 4.1 7.6-2.5 4.8-10.1 9.4-10.1 9.4z"/></svg>';
  const EMO = { leah: '💕', kompis: '🍻' };
  const ACTS = ['Date 🍝', 'Kos 🛋️', 'Film 🍿', 'Gaming 🎮', 'Pils 🍻', 'Trening 💪', 'Tur 🌲', 'Middag 🍕', 'Annet ✨'];
  const DEF_ACT = { leah: 'Date 🍝', kompis: 'Gaming 🎮' };
  const DEF_NAME = { leah: 'Leah', kompis: 'Kompisen' };
  const NO_DMG = 'Ingen skade ✨';
  const KINDS = [NO_DMG, 'Bakrus 🍺', 'Gangsperr 🦵', 'Sliten 😴', 'Sur 😤', 'Matkoma 🍕', 'Sårt ego 🤕', 'Tom lommebok 💸', 'Hjertesorg 💔', 'Annet 🤷'];
  const LEVELS = ['', 'Riper i lakken', 'Lett bulk', 'Trenger pizza og hvile', 'Må på verksted', 'Totalvrak 🚑'];

  // ---------- Small helpers ----------
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) {} };

  const state = {
    bookings: [], names: { ...DEF_NAME }, me: null, mode: 'past',
    loaded: false, code: lsGet('sindre.code') || null,
  };
  { const m = lsGet('sindre.me'); if (m === 'leah' || m === 'kompis') state.me = m; }
  { const m = lsGet('sindre.mode'); if (m === 'past' || m === 'all') state.mode = m; }
  let sb = null;

  const nm = (w) => state.names[w] || DEF_NAME[w];
  const other = (w) => (w === 'leah' ? 'kompis' : 'leah');
  const pad = (n) => String(n).padStart(2, '0');
  const fmtT = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const dKey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const num1 = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
  function dayLabel(ms) {
    const diff = Math.round((startOfDay(ms) - startOfDay(Date.now())) / 864e5);
    if (diff === 0) return 'I dag';
    if (diff === 1) return 'I morgen';
    if (diff === -1) return 'I går';
    const s = new Date(ms).toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'short' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function fmtH(h) {
    if (h <= 0) return '0 t';
    if (h < 1) return Math.round(h * 60) + ' min';
    return num1(h) + ' t';
  }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function heart(cls) { const s = el('span', cls); s.innerHTML = HEART; return s; }
  const checkedVal = (name) => { const r = document.querySelector(`input[name="${name}"]:checked`); return r ? r.value : null; };

  document.querySelectorAll('.ph, .ih').forEach((p) => { p.innerHTML = HEART; });

  function radios(root, name, values, cls, render) {
    values.forEach((v, i) => {
      const l = el('label', cls);
      const r = document.createElement('input');
      r.type = 'radio'; r.name = name; r.value = String(v); r.id = name + i;
      const span = el('span');
      render(span, v);
      l.append(r, span);
      root.append(l);
    });
  }
  radios($('#fActs'), 'act', ACTS, 'chip', (s, v) => { s.textContent = v; });
  radios($('#dKinds'), 'dkind', KINDS, 'chip', (s, v) => { s.textContent = v; });
  radios($('#dLevels'), 'dlevel', [1, 2, 3, 4, 5], 'lvl', (s, v) => { s.textContent = String(v); s.append(el('small', null, '🩹'.repeat(Math.min(v, 3)))); });

  // ---------- Banner + toast + hearts ----------
  function setBanner(text, kind) {
    const b = $('#banner');
    if (!text) { b.hidden = true; b.textContent = ''; b.dataset.kind = ''; return; }
    b.textContent = text; b.dataset.kind = kind || 'info'; b.hidden = false;
  }
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3600);
  }
  function showWarn(sel, msg) { const w = $(sel); w.textContent = msg || ''; w.hidden = !msg; }
  function burst(who) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = $('#burst');
    for (let i = 0; i < 24; i++) {
      const h = heart('fly ' + (Math.random() < 0.75 ? who : other(who)));
      const size = 14 + Math.random() * 24;
      h.style.left = (Math.random() * 100) + '%';
      h.style.width = size + 'px'; h.style.height = size + 'px';
      box.append(h);
      const dx = (Math.random() - 0.5) * 90;
      const rise = 55 + Math.random() * 35;
      const anim = h.animate([
        { transform: 'translate(0,0) rotate(0deg) scale(.6)', opacity: 0 },
        { opacity: 1, offset: 0.15 },
        { transform: `translate(${dx}px,-${rise}vh) rotate(${(Math.random() - 0.5) * 70}deg) scale(1)`, opacity: 0 },
      ], { duration: 1500 + Math.random() * 1000, easing: 'cubic-bezier(.2,.7,.3,1)', delay: Math.random() * 300, fill: 'both' });
      anim.onfinish = () => h.remove();
    }
  }

  // ---------- Code ----------
  function renderCodeState() {
    const s = $('#codeState');
    s.textContent = state.code ? '✓ lagret' : 'mangler';
    s.classList.toggle('missing', !state.code);
  }
  function saveCode(c) { state.code = c; lsSet('sindre.code', c); renderCodeState(); }
  function forgetCode() { state.code = null; lsDel('sindre.code'); renderCodeState(); }
  const isBadCode = (e) => !!e && (e.code === '28P01' || /feil_kode/.test(e.message || ''));
  const isClash = (e) => !!e && (e.code === '23P01' || /no_double_booking/.test(e.message || ''));
  async function rpc(fn, args) {
    const { data, error } = await sb.rpc(fn, args);
    if (error) throw error;
    return data;
  }

  // ---------- Render ----------
  function renderWho() {
    $('#whoBtn').textContent = state.me ? `${nm(state.me)} ${EMO[state.me]}` : 'Hvem er du?';
    $('#whoCard').hidden = !!state.me;
    document.querySelectorAll('[data-name]').forEach((n) => { n.textContent = nm(n.dataset.name); });
  }

  function renderNow() {
    const now = Date.now();
    const dot = $('#nowDot'), main = $('#nowMain'), sub = $('#nowSub'), cond = $('#nowCond');
    if (!state.loaded) { dot.dataset.s = 'idle'; main.textContent = 'Sjekker…'; sub.textContent = ''; cond.hidden = true; return; }
    const cur = state.bookings.find((b) => b.start <= now && b.end > now);
    if (cur) {
      dot.dataset.s = cur.who;
      main.textContent = `Opptatt med ${nm(cur.who)} ${EMO[cur.who]}`;
      const tail = state.me && cur.who !== state.me ? ' Du får vente.' : state.me ? ' Kos dere!' : '';
      sub.textContent = `${cur.activity || 'Hemmelig'} · til kl. ${fmtT(cur.end)}.${tail}`;
    } else {
      dot.dataset.s = 'free';
      main.textContent = 'Ledig';
      const next = state.bookings.find((b) => b.start > now);
      sub.textContent = next
        ? `Neste: ${nm(next.who)}, ${dayLabel(next.start).toLowerCase()} kl. ${fmtT(next.start)}`
        : 'Helt ledig. Kast deg over ham før noen andre gjør det.';
    }
    // Condition from the latest damage report in the last 48 hours
    const recent = state.bookings
      .filter((b) => b.dmg && b.end <= now && b.end > now - 48 * 36e5)
      .sort((a, b) => b.end - a.end)[0];
    if (recent) {
      const d = recent.dmg;
      cond.textContent = d.level > 0
        ? `Tilstand: ${d.kind} (${d.level}/5) etter ${nm(recent.who)} 🩹`
        : `Tilstand: som ny etter ${nm(recent.who)} ✨`;
      cond.classList.toggle('fine-cond', !(d.level > 0));
      cond.hidden = false;
    } else cond.hidden = true;
  }

  function renderInspect() {
    const box = $('#inspect');
    if (!state.loaded || !sb) { box.hidden = true; return; }
    const now = Date.now();
    const b = state.bookings
      .filter((x) => !x.dmg && x.end <= now && x.end > now - 3 * 864e5)
      .sort((a, c) => c.end - a.end)[0];
    if (!b) { box.hidden = true; return; }
    $('#inspectText').textContent = `${nm(b.who)} leverte Sindre tilbake ${dayLabel(b.end).toLowerCase()} kl. ${fmtT(b.end)} etter «${b.activity || 'Hemmelig'}». Noen skader?`;
    $('#inspectDmg').dataset.id = b.id;
    $('#inspectOk').dataset.id = b.id;
    box.hidden = false;
  }

  function verdict(pl, pk, tot) {
    if (!state.loaded) return 'Teller timer…';
    if (!tot) {
      return state.mode === 'past'
        ? 'Ingen har hatt Sindre ennå. Han bare sitter der. Ledig. 🥺'
        : 'Ingen har booket Sindre ennå. Først til mølla. 🏁';
    }
    if (Math.abs(pl - pk) <= 4) return 'Dødt løp. Sindre er rettferdig delt i to (ikke bokstavelig). ⚖️';
    const w = pl > pk ? 'leah' : 'kompis';
    const wp = Math.max(pl, pk);
    if (wp >= 80) return `${nm(w)} har ${wp} % av Sindre. Dette er ikke deling lenger, det er monopol. 🚨`;
    if (w === 'kompis' && wp >= 60) return `${nm('kompis')} har mer Sindre enn kjæresten. Det er lov å stille spørsmål. 👀💔`;
    if (w === 'leah' && wp >= 60) return `${nm('leah')} leder. ${nm('kompis')}, Sindre har visst kjæreste. Skjerp deg. 💅`;
    return `${nm(w)} leder knepent. Alt kan skje. 👀`;
  }

  function renderDuel() {
    const now = Date.now();
    const h = { leah: 0, kompis: 0 };
    for (const b of state.bookings) {
      let s = b.start, e = b.end;
      if (state.mode === 'past') { if (s > now) continue; e = Math.min(e, now); }
      h[b.who] += Math.max(0, e - s) / 36e5;
    }
    const tot = h.leah + h.kompis;
    const pl = tot ? Math.round((h.leah / tot) * 100) : 50;
    const pk = 100 - pl;
    $('#pctLeah').textContent = pl + '%';
    $('#pctKompis').textContent = pk + '%';
    $('#hrsLeah').textContent = fmtH(h.leah) + (state.mode === 'past' ? ' med Sindre' : ' booket');
    $('#hrsKompis').textContent = fmtH(h.kompis) + (state.mode === 'past' ? ' med Sindre' : ' booket');
    $('#barFill').style.width = pl + '%';
    $('#knot').style.left = Math.min(95, Math.max(5, pl)) + '%';
    $('#bar').classList.toggle('empty', !tot);
    $('#bar').setAttribute('aria-label', `${nm('leah')} ${pl} prosent, ${nm('kompis')} ${pk} prosent`);
    $('#verdict').textContent = verdict(pl, pk, tot);
    document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
    renderDamageStats();
  }

  function renderDamageStats() {
    const row = $('#dmgStats'), v = $('#dmgVerdict');
    row.textContent = ''; v.textContent = '';
    const s = { leah: { n: 0, sum: 0 }, kompis: { n: 0, sum: 0 } };
    for (const b of state.bookings) if (b.dmg && b.dmg.level > 0) { s[b.who].n++; s[b.who].sum += b.dmg.level; }
    if (!s.leah.n && !s.kompis.n) { row.textContent = 'Ingen skader meldt ennå. Sindre er i mint condition. ✨'; return; }
    ['leah', 'kompis'].forEach((w) => {
      const span = el('span');
      span.append(el('i', 'sw ' + w), document.createTextNode(nm(w) + ': '), el('b', null, String(s[w].n)),
        document.createTextNode(s[w].n === 1 ? ' skade' : ' skader'));
      if (s[w].n) span.append(document.createTextNode(', snitt '), el('b', null, num1(s[w].sum / s[w].n)), document.createTextNode('/5'));
      row.append(span);
    });
    const score = (w) => s[w].sum;
    if (score('leah') === score('kompis')) { v.textContent = 'Like farlige begge to. Stakkars Sindre. 🩹'; return; }
    const worst = score('leah') > score('kompis') ? 'leah' : 'kompis';
    const avg = s[worst].sum / s[worst].n;
    v.textContent = avg >= 4
      ? `${nm(worst)} leverer ham tilbake i fillebiter. Forsikringen dekker ikke dette. 🚑`
      : `${nm(worst)} er offisielt farligst for Sindre. 🩹`;
  }

  function renderWeek() {
    const wrap = $('#days');
    wrap.textContent = '';
    const t0 = startOfDay(Date.now());
    for (let i = 0; i < 7; i++) {
      const d = new Date(t0); d.setDate(d.getDate() + i);
      const s = d.getTime();
      const e = new Date(d); e.setDate(e.getDate() + 1);
      const whos = new Set(state.bookings.filter((b) => b.start < e.getTime() && b.end > s).map((b) => b.who));
      const btn = el('button', 'day' + (i === 0 ? ' today' : ''));
      btn.type = 'button'; btn.dataset.date = dKey(d);
      btn.append(
        el('span', 'wd', d.toLocaleDateString('nb-NO', { weekday: 'short' }).replace('.', '')),
        el('span', 'dn', String(d.getDate())),
      );
      const hs = el('span', 'hs');
      ['leah', 'kompis'].forEach((w) => { if (whos.has(w)) hs.append(heart('mini ' + w)); });
      if (!whos.size) hs.append(el('span', 'free-dot'));
      btn.append(hs);
      btn.setAttribute('aria-label', `${dayLabel(s)}: ${whos.size ? [...whos].map(nm).join(' og ') + ' har booket' : 'ledig'}. Trykk for å booke.`);
      wrap.append(btn);
    }
  }

  function item(b, kind) {
    const now = Date.now();
    const li = el('li', 'item ' + b.who);
    const badge = el('span', 'badge ' + b.who); badge.innerHTML = HEART;
    const mid = el('div', 'mid');
    const top = el('div', 't');
    top.append(el('span', 'time', `${fmtT(b.start)}–${fmtT(b.end)}`), el('span', 'act', ' · ' + (b.activity || 'Hemmelig')));
    mid.append(top, el('div', 'meta', `${nm(b.who)} ${EMO[b.who]}`));
    if (b.note) mid.append(el('div', 'note', `«${b.note}»`));
    if (b.dmg) {
      const d = b.dmg;
      mid.append(el('div', 'dmg' + (d.level > 0 ? '' : ' none'),
        d.level > 0 ? `🩹 ${d.kind} · ${d.level}/5` : `${NO_DMG} levert som ny`));
      if (d.note) mid.append(el('div', 'note', `Skade: «${d.note}»${d.by ? ' (meldt av ' + nm(d.by) + ')' : ''}`));
    }
    li.append(badge, mid);
    const acts = el('div', 'item-actions');
    if (kind === 'up' && state.me === b.who && sb && b.start > now) {
      const x = el('button', 'del', 'Avbestill');
      x.type = 'button'; x.dataset.id = b.id;
      acts.append(x);
    }
    if (sb && b.end <= now) {
      const x = el('button', 'dmg-btn', b.dmg ? 'Endre' : 'Meld skade');
      x.type = 'button'; x.dataset.dmg = b.id;
      acts.append(x);
    }
    if (acts.childElementCount) li.append(acts);
    return li;
  }
  function group(list, root, kind) {
    let last = '', ul = null;
    for (const b of list) {
      const lab = dayLabel(b.start);
      if (lab !== last) { last = lab; root.append(el('h3', 'dh', lab)); ul = el('ul', 'items'); root.append(ul); }
      ul.append(item(b, kind));
    }
  }
  function renderLists() {
    const now = Date.now();
    const up = $('#upcoming'), past = $('#past');
    up.textContent = ''; past.textContent = '';
    if (!state.loaded) { up.append(el('p', 'empty', 'Henter Sindres kalender…')); return; }
    const ups = state.bookings.filter((b) => b.end > now);
    const allPast = state.bookings.filter((b) => b.end <= now).sort((a, b) => b.start - a.start);
    $('#pastCount').textContent = String(allPast.length);
    if (!ups.length) up.append(el('p', 'empty', 'Ingenting booket. Sindre sitter hjemme og venter på at noen skal ville ha ham. 🥺'));
    else group(ups, up, 'up');
    if (!allPast.length) past.append(el('p', 'empty', 'Ingen historikk ennå. Bli den første i loggen.'));
    else group(allPast.slice(0, 60), past, 'past');
  }

  function renderAll() { renderWho(); renderNow(); renderInspect(); renderDuel(); renderWeek(); renderLists(); renderCodeState(); }

  // ---------- Sheets ----------
  function openSheet(id) { $(id).hidden = false; document.body.style.overflow = 'hidden'; }
  function closeSheets() { document.querySelectorAll('.sheet-wrap').forEach((s) => { s.hidden = true; }); document.body.style.overflow = ''; }

  function openWho(showCode) {
    $('#nLeah').value = nm('leah');
    $('#nKompis').value = nm('kompis');
    $('#nCode').value = '';
    if (showCode) $('#codeBox').open = true;
    openSheet('#whoSheet');
  }
  function needServer() {
    if (sb) return false;
    toast('Får ikke kontakt med Sindre-serveren. Sjekk nettet.');
    return true;
  }

  // Booking form
  function range() {
    const d = $('#fDate').value, s = $('#fStart').value, e = $('#fEnd').value;
    if (!d || !s || !e) return null;
    const start = new Date(`${d}T${s}`).getTime();
    let end = new Date(`${d}T${e}`).getTime();
    if (isNaN(start) || isNaN(end)) return null;
    if (end <= start) end += 864e5;
    return { start, end };
  }
  function validate() {
    const r = range();
    const dur = $('#fDur');
    let msg = '';
    if (!r) { msg = 'Fyll inn dato og klokkeslett.'; dur.textContent = ''; }
    else {
      const h = (r.end - r.start) / 36e5;
      dur.textContent = `Varighet: ${fmtH(h)}`
        + (r.end > startOfDay(r.start) + 864e5 ? ' · over midnatt 🌙' : '')
        + (h > 8 ? ' · ambisiøst 😮‍💨' : '');
      const clash = state.bookings.find((b) => r.start < b.end && r.end > b.start);
      if (clash) {
        msg = clash.who === state.me
          ? `Du har allerede booket ham ${fmtT(clash.start)}–${fmtT(clash.end)}. Grådig? 😏`
          : `Opptatt! ${nm(clash.who)} har Sindre ${fmtT(clash.start)}–${fmtT(clash.end)}. Finn et annet tidspunkt. 😤`;
      }
    }
    showWarn('#fWarn', msg);
    $('#fSubmit').disabled = !!msg;
    return !msg;
  }
  function openForm(date) {
    if (!state.me) { openWho(); return; }
    if (needServer()) return;
    const now = new Date();
    const d = date || dKey(now);
    let h = 18;
    if (d === dKey(now)) { const n = now.getHours() + 1; h = n >= 8 && n <= 21 ? n : 18; }
    $('#fDate').value = d;
    $('#fStart').value = pad(h) + ':00';
    $('#fEnd').value = pad((h + 3) % 24) + ':00';
    const def = DEF_ACT[state.me];
    document.querySelectorAll('input[name="act"]').forEach((r) => { r.checked = r.value === def; });
    $('#fNote').value = '';
    $('#fCode').value = '';
    $('#codeField').hidden = !!state.code;
    $('#form').dataset.me = state.me;
    $('#formWho').textContent = `Booker som ${nm(state.me)} ${EMO[state.me]}`;
    validate();
    openSheet('#sheet');
  }

  // Damage form
  let dmgTarget = null;
  function syncLevel() {
    const none = checkedVal('dkind') === NO_DMG;
    $('#dLevelSet').hidden = none;
    const lv = Number(checkedVal('dlevel') || 0);
    $('#dLevelLabel').textContent = none || !lv ? '' : `${lv}/5: ${LEVELS[lv]}`;
    $('#dSubmit').textContent = none ? 'Levert som ny ✨' : 'Send skademelding';
  }
  function openDamage(id, preset) {
    const b = state.bookings.find((x) => x.id === id);
    if (!b) return;
    if (!state.me) { openWho(); return; }
    if (needServer()) return;
    dmgTarget = b;
    $('#dmgWho').textContent = `${nm(b.who)} ${EMO[b.who]} · ${dayLabel(b.start)} ${fmtT(b.start)}–${fmtT(b.end)} · ${b.activity || 'Hemmelig'}`;
    const kind = preset || (b.dmg ? b.dmg.kind : KINDS[1]);
    document.querySelectorAll('input[name="dkind"]').forEach((r) => { r.checked = r.value === kind; });
    if (!checkedVal('dkind')) document.querySelector('input[name="dkind"][value="Annet 🤷"]').checked = true;
    const lv = b.dmg && b.dmg.level > 0 ? b.dmg.level : 2;
    document.querySelectorAll('input[name="dlevel"]').forEach((r) => { r.checked = Number(r.value) === lv; });
    $('#dNote').value = b.dmg ? (b.dmg.note || '') : '';
    $('#dCode').value = '';
    $('#dCodeField').hidden = !!state.code;
    $('#dClear').hidden = !b.dmg;
    showWarn('#dWarn', '');
    syncLevel();
    openSheet('#dmgSheet');
  }
  async function sendDamage(b, kind, level, note, code) {
    await rpc('report_damage', { p_code: code, p_id: b.id, p_by: state.me, p_kind: kind, p_level: kind == null ? null : level, p_note: note || '' });
  }
  function damageToast(level) {
    if (level >= 4) return 'Skademelding sendt. Sindre er sendt til verksted. 🚑';
    if (level > 0) return 'Skade registrert. Forsikringsselskapet er varslet (ikke egentlig). 🩹';
    return 'Notert: Sindre levert tilbake som ny. ✨';
  }

  // ---------- Events ----------
  document.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.closest('[data-close]')) { closeSheets(); return; }

    const pick = t.closest('[data-pick]');
    if (pick) {
      state.me = pick.dataset.pick;
      lsSet('sindre.me', state.me);
      closeSheets(); renderAll();
      toast(state.me === 'leah' ? `Hei ${nm('leah')} 💕 Sindre er klar for booking.` : `Hei ${nm('kompis')} 🍻 Lykke til mot kjæresten.`);
      return;
    }

    const mode = t.closest('[data-mode]');
    if (mode) { state.mode = mode.dataset.mode; lsSet('sindre.mode', state.mode); renderDuel(); return; }

    const day = t.closest('.day');
    if (day) { openForm(day.dataset.date); return; }

    const q = t.closest('[data-q]');
    if (q) { const [s, en] = q.dataset.q.split('-'); $('#fStart').value = s; $('#fEnd').value = en; validate(); return; }

    const dmgBtn = t.closest('[data-dmg]');
    if (dmgBtn) { openDamage(dmgBtn.dataset.dmg); return; }

    const del = t.closest('.del');
    if (del) {
      if (!state.code) { toast('Legg inn Sindre-koden først.'); openWho(true); return; }
      if (!del.classList.contains('armed')) {
        del.classList.add('armed'); del.textContent = 'Sikker?';
        setTimeout(() => { if (del.isConnected) { del.classList.remove('armed'); del.textContent = 'Avbestill'; } }, 3000);
        return;
      }
      del.disabled = true;
      try {
        await rpc('delete_booking', { p_code: state.code, p_id: del.dataset.id });
        toast('Avbestilt. Sindre er ledig igjen (han vet det ikke ennå).');
        refresh();
      } catch (err) {
        del.disabled = false;
        if (isBadCode(err)) { forgetCode(); toast('Feil Sindre-kode. 🙅 Legg inn riktig kode.'); openWho(true); }
        else toast('Fikk ikke avbestilt. Sjekk nettet og prøv igjen.');
      }
    }
  });

  $('#whoBtn').addEventListener('click', () => openWho(!state.code));
  $('#bookBtn').addEventListener('click', () => openForm());
  ['#fDate', '#fStart', '#fEnd'].forEach((s) => $(s).addEventListener('input', validate));
  $('#dmgForm').addEventListener('change', syncLevel);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheets(); });

  $('#inspectDmg').addEventListener('click', (e) => openDamage(e.currentTarget.dataset.id));
  $('#inspectOk').addEventListener('click', async (e) => {
    const b = state.bookings.find((x) => x.id === e.currentTarget.dataset.id);
    if (!b) return;
    if (!state.me) { openWho(); return; }
    if (!state.code) { openDamage(b.id, NO_DMG); return; }
    try { await sendDamage(b, NO_DMG, 0, '', state.code); toast(damageToast(0)); refresh(); }
    catch (err) {
      if (isBadCode(err)) { forgetCode(); openDamage(b.id, NO_DMG); showWarn('#dWarn', 'Feil Sindre-kode. 🙅 Skriv inn riktig kode.'); }
      else toast('Fikk ikke lagret. Sjekk nettet og prøv igjen.');
    }
  });

  let saving = false;
  $('#form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saving || !sb || !state.me || !validate()) return;
    const code = state.code || $('#fCode').value.trim();
    if (!code) { $('#codeField').hidden = false; showWarn('#fWarn', 'Skriv inn Sindre-koden for å booke.'); $('#fCode').focus(); return; }
    const r = range();
    saving = true; $('#fSubmit').disabled = true;
    try {
      await rpc('add_booking', {
        p_code: code, p_who: state.me,
        p_start: new Date(r.start).toISOString(), p_end: new Date(r.end).toISOString(),
        p_activity: checkedVal('act') || 'Annet ✨', p_note: $('#fNote').value.trim().slice(0, 80),
      });
      saveCode(code);
      closeSheets();
      burst(state.me);
      toast(`Booket! Sindre er din ${dayLabel(r.start).toLowerCase()} kl. ${fmtT(r.start)} 🔒💘`);
      refresh();
    } catch (err) {
      if (isBadCode(err)) { forgetCode(); $('#codeField').hidden = false; $('#fCode').value = ''; showWarn('#fWarn', 'Feil Sindre-kode. 🙅 Spør den andre.'); }
      else if (isClash(err)) { showWarn('#fWarn', 'Noen rakk å booke ham akkurat da. 😤 Velg et annet tidspunkt.'); refresh(); }
      else showWarn('#fWarn', 'Fikk ikke lagret. Sjekk nettet og prøv igjen.');
    } finally { saving = false; $('#fSubmit').disabled = false; }
  });

  $('#dmgForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saving || !sb || !dmgTarget) return;
    const code = state.code || $('#dCode').value.trim();
    if (!code) { $('#dCodeField').hidden = false; showWarn('#dWarn', 'Skriv inn Sindre-koden for å melde skade.'); $('#dCode').focus(); return; }
    const kind = checkedVal('dkind') || 'Annet 🤷';
    const level = kind === NO_DMG ? 0 : Number(checkedVal('dlevel') || 2);
    saving = true; $('#dSubmit').disabled = true;
    try {
      await sendDamage(dmgTarget, kind, level, $('#dNote').value.trim().slice(0, 120), code);
      saveCode(code);
      closeSheets();
      toast(damageToast(level));
      refresh();
    } catch (err) {
      if (isBadCode(err)) { forgetCode(); $('#dCodeField').hidden = false; $('#dCode').value = ''; showWarn('#dWarn', 'Feil Sindre-kode. 🙅 Spør den andre.'); }
      else showWarn('#dWarn', 'Fikk ikke lagret. Sjekk nettet og prøv igjen.');
    } finally { saving = false; $('#dSubmit').disabled = false; }
  });

  $('#dClear').addEventListener('click', async () => {
    if (!dmgTarget || !state.code) { showWarn('#dWarn', 'Skriv inn Sindre-koden og send på nytt.'); $('#dCodeField').hidden = false; return; }
    try { await sendDamage(dmgTarget, null, null, '', state.code); closeSheets(); toast('Skademeldingen er trukket tilbake.'); refresh(); }
    catch (err) {
      if (isBadCode(err)) { forgetCode(); $('#dCodeField').hidden = false; showWarn('#dWarn', 'Feil Sindre-kode. 🙅'); }
      else showWarn('#dWarn', 'Fikk ikke lagret. Sjekk nettet og prøv igjen.');
    }
  });

  $('#saveCode').addEventListener('click', async () => {
    const c = $('#nCode').value.trim();
    if (!c) { toast('Skriv inn koden først.'); return; }
    if (needServer()) return;
    try {
      const ok = await rpc('verify_code', { p_code: c });
      if (ok) { saveCode(c); $('#nCode').value = ''; toast('Kode lagret på denne telefonen. ✓'); }
      else toast('Feil kode. 🙅 Sindre er skuffet.');
    } catch (err) { toast('Fikk ikke sjekket koden. Prøv igjen.'); }
  });

  $('#saveNames').addEventListener('click', async () => {
    const l = $('#nLeah').value.trim().slice(0, 20) || DEF_NAME.leah;
    const k = $('#nKompis').value.trim().slice(0, 20) || DEF_NAME.kompis;
    if (needServer()) return;
    if (!state.code) { toast('Legg inn Sindre-koden først.'); $('#codeBox').open = true; return; }
    if (l === nm('leah') && k === nm('kompis')) { toast('Ingen endring.'); return; }
    try { await rpc('set_names', { p_code: state.code, p_leah: l, p_kompis: k }); toast('Navn lagret for begge. ✍️'); refresh(); }
    catch (err) {
      if (isBadCode(err)) { forgetCode(); toast('Feil Sindre-kode. 🙅'); $('#codeBox').open = true; }
      else toast('Fikk ikke lagret. Prøv igjen.');
    }
  });

  // Install tip (only in the browser, not when already installed)
  (function installTip() {
    const standalone = matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (standalone || lsGet('sindre.installTip') === 'hidden') return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    $('#installText').textContent = ios
      ? 'Tips: trykk på Del-knappen og velg «Legg til på Hjem-skjerm», så blir Sindre en app.'
      : 'Tips: åpne nettlesermenyen ⋮ og velg «Installer app» eller «Legg til på startsiden».';
    $('#installTip').hidden = false;
    $('#installX').addEventListener('click', () => { $('#installTip').hidden = true; lsSet('sindre.installTip', 'hidden'); });
  })();

  // ---------- Data ----------
  const valid = (b) => b && (b.who === 'leah' || b.who === 'kompis') && Number.isFinite(b.start) && Number.isFinite(b.end) && b.end > b.start;
  function fromRow(r) {
    return {
      id: r.id, who: r.who, start: Date.parse(r.start_at), end: Date.parse(r.end_at),
      activity: r.activity, note: r.note || '',
      dmg: r.damage_kind ? { kind: r.damage_kind, level: r.damage_level || 0, note: r.damage_note || '', by: r.damage_by || null } : null,
    };
  }

  // Show the last known calendar immediately (offline-friendly), then refresh from the server
  try {
    const c = JSON.parse(lsGet('sindre.cache') || 'null');
    if (c && Array.isArray(c.bookings)) {
      state.bookings = c.bookings.filter(valid);
      if (c.names) state.names = { leah: c.names.leah || DEF_NAME.leah, kompis: c.names.kompis || DEF_NAME.kompis };
      state.loaded = true;
    }
  } catch (e) {}

  let refreshing = null, again = false;
  async function refresh() {
    if (!sb) return;
    if (refreshing) { again = true; return refreshing; }
    refreshing = (async () => {
      try {
        const [bk, st] = await Promise.all([
          sb.from('bookings').select('id,who,start_at,end_at,activity,note,damage_kind,damage_level,damage_note,damage_by').order('start_at'),
          sb.from('settings').select('leah_name,kompis_name').eq('id', 1).maybeSingle(),
        ]);
        if (bk.error) throw bk.error;
        state.bookings = (bk.data || []).map(fromRow).filter(valid);
        if (st.data) state.names = { leah: st.data.leah_name || DEF_NAME.leah, kompis: st.data.kompis_name || DEF_NAME.kompis };
        state.loaded = true;
        if ($('#banner').dataset.kind === 'warn') setBanner('');
        lsSet('sindre.cache', JSON.stringify({ bookings: state.bookings, names: state.names }));
      } catch (err) {
        state.loaded = true;
        setBanner('Får ikke kontakt med Sindre-serveren. Viser det som var lagret sist.', 'warn');
      }
      renderAll();
      if (!$('#sheet').hidden) validate();
    })();
    try { await refreshing; } finally {
      refreshing = null;
      if (again) { again = false; refresh(); }
    }
  }

  let debounce;
  const scheduleRefresh = () => { clearTimeout(debounce); debounce = setTimeout(refresh, 250); };

  function boot() {
    renderAll();
    if (!window.supabase || !window.supabase.createClient) {
      state.loaded = true;
      setBanner('Fikk ikke lastet appen helt. Sjekk nettet og last inn siden på nytt.', 'warn');
      renderAll();
      return;
    }
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    refresh();
    try {
      sb.channel('sindre-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, scheduleRefresh)
        .subscribe();
    } catch (e) {}
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
    setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 60000);
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
  boot();
})();
