/* 歐式 21 點練習 — 畫面與互動 */
(function () {
  'use strict';

  const { Round, handValue, isBlackjack, chartAdvice, dealFor } = window.BJ;

  const STORAGE_KEY = 'euro-bj-practice-v1';
  const ACTION_NAMES = { H: '要牌', S: '停牌', D: '加倍', P: '分牌', R: '投降' };
  const OUTCOME = {
    bust: { text: '爆牌', cls: 'lose' },
    dealerBJ: { text: '莊家 BJ', cls: 'lose' },
    surrender: { text: '投降', cls: 'push' },
    blackjack: { text: 'Blackjack!', cls: 'win' },
    win: { text: '贏', cls: 'win' },
    lose: { text: '輸', cls: 'lose' },
    push: { text: '和局', cls: 'push' },
  };

  const $ = (id) => document.getElementById(id);

  const state = {
    kind: 'any',
    stats: { total: 0, correct: 0, streak: 0, best: 0 },
    round: null,
    feedback: [],   // 本手每一次決策的對錯
  };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved) return;
      if (saved.kind) state.kind = saved.kind;
      Object.assign(state.stats, saved.stats || {});
    } catch (e) { /* 讀不到就用預設值 */ }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ kind: state.kind, stats: state.stats }));
    } catch (e) { /* 私密模式等情況忽略 */ }
  }

  /* ---------- 牌面 ---------- */

  let renderedCounts = {};

  function cardHTML(card, animate) {
    const red = card.s === '♥' || card.s === '♦';
    return `<div class="card${red ? ' red' : ''}${animate ? ' deal-in' : ''}" aria-label="${card.s}${card.r}">` +
      `<div class="corner"><span>${card.r}</span><span class="s">${card.s}</span></div>` +
      `<div class="pip">${card.s}</div></div>`;
  }

  function cardsHTML(key, cards) {
    const prev = renderedCounts[key] || 0;
    renderedCounts[key] = cards.length;
    return cards.map((c, i) => cardHTML(c, i >= prev)).join('');
  }

  function totalText(cards) {
    if (!cards.length) return '';
    if (isBlackjack(cards)) return 'BJ';
    const { total, soft } = handValue(cards);
    if (total > 21) return `${total} 爆`;
    return soft ? `${total - 10} / ${total}` : String(total);
  }

  function render() {
    const round = state.round;
    const inPlay = !round.finished;

    let dealerHTML = cardsHTML('d', round.dealer);
    if (inPlay) dealerHTML += '<div class="card slot">無底牌<br>No Hole</div>';
    $('dealer-cards').innerHTML = dealerHTML;
    $('dealer-total').textContent = totalText(round.dealer);

    const multi = round.hands.length > 1;
    $('player-hands').innerHTML = round.hands.map((h, i) => {
      const active = inPlay && i === round.active;
      const res = round.finished ? OUTCOME[round.results[i]] : null;
      return `<div class="hand${active ? ' active' : ''}">` +
        `<div class="cards">${cardsHTML('p' + i, h.cards)}</div>` +
        `<div class="hand-meta">${multi ? `第 ${i + 1} 手` : ''}<span class="total">${totalText(h.cards)}</span>` +
        `${h.doubled ? '<span>加倍</span>' : ''}` +
        `${res ? `<span class="result ${res.cls}">${res.text}</span>` : ''}</div></div>`;
    }).join('');

    $('action-controls').hidden = !inPlay;
    $('next-controls').hidden = inPlay;
    if (inPlay) {
      document.querySelectorAll('[data-act]').forEach(b => { b.disabled = !round.can(b.dataset.act); });
    }

    $('feedback').innerHTML = state.feedback.map(f =>
      `<li class="${f.ok ? 'good' : 'bad'}">${f.ok ? '✓' : '✗'} ${f.label}：圖表 <b>${f.code}</b>` +
      (f.ok ? `，${ACTION_NAMES[f.chosen]}正確` : `，應該<b>${ACTION_NAMES[f.answer]}</b>，你選了${ACTION_NAMES[f.chosen]}`) +
      '</li>').join('');

    const st = state.stats;
    $('st-total').textContent = st.total;
    $('st-acc').textContent = st.total ? `${Math.round(st.correct / st.total * 100)}%` : '—';
    $('st-streak').textContent = st.streak;
    $('st-best').textContent = st.best;
  }

  function setMessage(text) { $('message').textContent = text; }

  /* ---------- 流程 ---------- */

  function nextHand() {
    renderedCounts = {};
    state.feedback = [];
    state.round = new Round(dealFor(state.kind));
    if (state.round.finished) {
      setMessage('Blackjack！這手不用決策，按「下一手」');
    } else {
      setMessage('你要怎麼打？');
    }
    render();
    if (state.round.finished) showResult();
  }

  function act(a) {
    const round = state.round;
    if (!round || round.finished || !round.can(a)) return;

    const advice = chartAdvice(round);
    const ok = advice.action === a;
    const st = state.stats;
    st.total++;
    if (ok) {
      st.correct++;
      st.streak++;
      st.best = Math.max(st.best, st.streak);
    } else {
      st.streak = 0;
    }
    state.feedback.push({ ok, label: advice.label, code: advice.code, answer: advice.action, chosen: a });

    round.act(a);
    if (round.finished) showResult();
    else setMessage(round.hands.length > 1 ? `第 ${round.active + 1} 手` : '你要怎麼打？');
    save();
    render();
  }

  function showResult() {
    const round = state.round;
    const dealerTotal = handValue(round.dealer).total;
    let msg;
    if (isBlackjack(round.dealer)) msg = '莊家 Blackjack';
    else if (round.dealer.length === 1) msg = '本手結束';
    else if (dealerTotal > 21) msg = `莊家 ${dealerTotal} 點爆牌`;
    else msg = `莊家 ${dealerTotal} 點`;
    setMessage(msg);
    setTimeout(() => $('btn-next').focus({ preventScroll: true }), 0);
  }

  function resetStats() {
    state.stats = { total: 0, correct: 0, streak: 0, best: 0 };
    save();
    render();
  }

  /* ---------- 分頁與策略表 ---------- */

  function showTab(name) {
    document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    document.querySelectorAll('.panel').forEach(p => { p.hidden = p.id !== 'tab-' + name; });
  }

  // 策略表圖片載入失敗時顯示說明，而不是一片空白
  function watchChartImages() {
    document.querySelectorAll('.chart-img').forEach(img => {
      const fail = () => {
        const note = document.createElement('p');
        note.className = 'chart-error';
        note.textContent = '策略表圖片載入失敗。請先連上網路開啟一次，之後離線就能看。';
        img.replaceWith(note);
      };
      if (img.complete && img.naturalWidth === 0) fail();
      else img.addEventListener('error', fail);
    });
  }

  function openChart() {
    const dlg = $('chart-dialog');
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else showTab('chart');
  }

  /* ---------- 離線 ---------- */

  function registerSW() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => {
      $('sw-status').textContent = ' ✓ 已可離線使用';
    }).catch(() => { /* 不支援就算了 */ });
  }

  /* ---------- 初始化 ---------- */

  function init() {
    load();

    document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => act(b.dataset.act)));
    $('btn-next').addEventListener('click', nextHand);
    $('btn-reset').addEventListener('click', resetStats);
    $('btn-peek').addEventListener('click', openChart);
    $('chart-dialog').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
    document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

    const kindSel = $('opt-kind');
    kindSel.value = state.kind;
    kindSel.addEventListener('change', () => {
      state.kind = kindSel.value;
      save();
      nextHand();
    });

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest('input, select, textarea')) return;
      if ($('tab-play').hidden || $('chart-dialog').open) return;
      const k = e.key.toLowerCase();
      const map = { h: 'H', s: 'S', d: 'D', p: 'P', r: 'R' };
      if (map[k]) { act(map[k]); e.preventDefault(); }
      else if ((k === 'enter' || k === ' ') && state.round.finished) { nextHand(); e.preventDefault(); }
    });

    watchChartImages();
    registerSW();
    nextHand();
  }

  init();
})();
