/* 歐式 21 點（ENHC, European No Hole Card）練習引擎
 * 純邏輯，不碰 DOM。
 */
(function (global) {
  'use strict';

  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  // 練習用的固定規則（對應策略表）
  const RULES = Object.freeze({
    h17: false,       // 莊家軟 17 停牌
    das: true,        // 分牌後可加倍
    maxHands: 2,      // 只能分牌一次
    surrender: true,  // 可投降（只限開局兩張）
  });

  function cardValue(rank) {
    if (rank === 'A') return 1;
    if (rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') return 10;
    return Number(rank);
  }

  function makeCard(rank, suit) {
    return { r: rank, s: suit || SUITS[Math.floor(Math.random() * 4)], v: cardValue(rank) };
  }

  function randomCard() {
    return makeCard(RANKS[Math.floor(Math.random() * 13)]);
  }

  // 每張牌獨立隨機（等同無限副牌）；queue 可預先指定前幾張
  class Deck {
    constructor(queue) { this.queue = queue ? queue.slice() : []; }
    draw() { return this.queue.length ? this.queue.shift() : randomCard(); }
  }

  function handValue(cards) {
    let total = 0, ace = false;
    for (const c of cards) {
      total += c.v;
      if (c.v === 1) ace = true;
    }
    if (ace && total + 10 <= 21) return { total: total + 10, soft: true };
    return { total, soft: false };
  }

  function isBlackjack(cards) {
    return cards.length === 2 && handValue(cards).total === 21;
  }

  function dealerShouldHit(cards) {
    const { total, soft } = handValue(cards);
    return total < 17 || (total === 17 && soft && RULES.h17);
  }

  function newHand(cards) {
    return { cards, split: false, splitAces: false, doubled: false, surrendered: false, done: false };
  }

  /* 結算：莊家 BJ 時，加倍 / 分牌的手全部算輸（歐式無底牌） */
  function settle(hands, dealer) {
    const dealerBJ = isBlackjack(dealer);
    const dv = handValue(dealer).total;
    const naturalPossible = hands.length === 1 && !hands[0].split;
    return hands.map(h => {
      const pv = handValue(h.cards).total;
      const playerBJ = naturalPossible && isBlackjack(h.cards);
      if (h.surrendered) return 'surrender';
      if (pv > 21) return 'bust';
      if (dealerBJ) return playerBJ ? 'push' : 'dealerBJ';
      if (playerBJ) return 'blackjack';
      if (dv > 21 || pv > dv) return 'win';
      if (pv < dv) return 'lose';
      return 'push';
    });
  }

  /* 一局牌。發牌：玩家、莊家、玩家 —— 莊家沒有底牌，等玩家行動完才補牌。 */
  class Round {
    constructor(deck) {
      this.deck = deck;
      const p1 = deck.draw(), up = deck.draw(), p2 = deck.draw();
      this.dealer = [up];
      this.hands = [newHand([p1, p2])];
      this.active = 0;
      this.finished = false;
      this.results = null;
      if (isBlackjack(this.hands[0].cards)) this.hands[0].done = true;
      this._advance();
    }

    get hand() { return this.hands[this.active]; }
    get dealerUp() { const v = this.dealer[0].v; return v === 1 ? 11 : v; }

    canDouble() {
      if (this.finished) return false;
      const h = this.hand;
      if (h.cards.length !== 2 || h.splitAces) return false;
      return !h.split || RULES.das;
    }

    canSplit() {
      if (this.finished) return false;
      const h = this.hand;
      return h.cards.length === 2 && h.cards[0].v === h.cards[1].v && this.hands.length < RULES.maxHands;
    }

    canSurrender() {
      if (this.finished || !RULES.surrender) return false;
      return this.hands.length === 1 && this.hand.cards.length === 2;
    }

    can(a) {
      if (a === 'H' || a === 'S') return !this.finished;
      if (a === 'D') return this.canDouble();
      if (a === 'P') return this.canSplit();
      if (a === 'R') return this.canSurrender();
      return false;
    }

    act(a) {
      const h = this.hand;
      if (a === 'H') {
        h.cards.push(this.deck.draw());
        if (handValue(h.cards).total >= 21) h.done = true;
      } else if (a === 'S') {
        h.done = true;
      } else if (a === 'D') {
        h.doubled = true;
        h.cards.push(this.deck.draw());
        h.done = true;
      } else if (a === 'R') {
        h.surrendered = true;
        h.done = true;
      } else if (a === 'P') {
        const second = h.cards.pop();
        const aces = h.cards[0].v === 1;
        const nh = newHand([second]);
        h.split = nh.split = true;
        h.splitAces = nh.splitAces = aces;
        this.hands.splice(this.active + 1, 0, nh);
        h.cards.push(this.deck.draw());
        this._autoDone(h);
      }
      this._advance();
    }

    _autoDone(h) {
      // 分 A 只發一張；21 點自動停牌
      if (h.splitAces || handValue(h.cards).total >= 21) h.done = true;
    }

    _advance() {
      while (this.active < this.hands.length && this.hands[this.active].done) {
        this.active++;
        const next = this.hands[this.active];
        if (next && next.cards.length === 1) {
          next.cards.push(this.deck.draw());
          this._autoDone(next);
        }
      }
      if (this.active >= this.hands.length) this._finish();
    }

    _finish() {
      const live = this.hands.filter(h => !h.surrendered && handValue(h.cards).total <= 21);
      const natural = this.hands.length === 1 && !this.hands[0].split && isBlackjack(this.hands[0].cards);
      if (live.length === 0) {
        // 全部爆牌或投降，莊家不用補牌
      } else if (natural) {
        if (this.dealer[0].v === 1 || this.dealer[0].v === 10) this.dealer.push(this.deck.draw());
      } else {
        while (dealerShouldHit(this.dealer)) this.dealer.push(this.deck.draw());
      }
      this.results = settle(this.hands, this.dealer);
      this.finished = true;
      this.active = -1;
    }
  }

  /* ---------- 策略表（依照自製圖表） ----------
   * 欄：莊家 2 3 4 5 6 7 8 9 10 A
   * H 要牌、S 停牌、D 加倍（不能加倍就要牌）、Ds 加倍（不能加倍就停牌）、
   * P 分牌、X 投降（不能投降就要牌，圖上的 X/H）
   */
  const row = (s) => s.split(' ');
  const HARD = {
    8: row('H H H H H H H H H H'),
    9: row('H D D D D H H H H H'),
    10: row('D D D D D D D D H H'),
    11: row('D D D D D D D D H H'),
    12: row('H H S S S H H H H H'),
    13: row('S S S S S H H H H H'),
    14: row('S S S S S H H H X H'),
    15: row('S S S S S H H H X H'),
    16: row('S S S S S H H X X H'),
    17: row('S S S S S S S S S S'),
  };
  const SOFT = {
    13: row('H H H D D H H H H H'),   // A,2
    14: row('H H H D D H H H H H'),   // A,3
    15: row('H H D D D H H H H H'),   // A,4
    16: row('H H D D D H H H H H'),   // A,5
    17: row('H D D D D H H H H H'),   // A,6
    18: row('S Ds Ds Ds Ds S S H H H'), // A,7
    19: row('S S S S S S S S S S'),   // A,8+
  };
  const PAIRS = {
    2: row('P P P P P P H H H H'),
    3: row('P P P P P P H H H H'),
    4: row('H H H P P H H H H H'),
    5: row('D D D D D D D D H H'),
    6: row('P P P P P H H H H H'),
    7: row('P P P P P P H H X H'),
    8: row('P P P P P P P P X H'),
    9: row('P P P P P S P P S S'),
    10: row('S S S S S S S S S S'),
    1: row('P P P P P P P P P H'),
  };
  const CODE_TEXT = { H: 'H', S: 'S', D: 'D', Ds: 'Ds', P: 'SP', X: 'X/H' };

  function upLabel(up) { return up === 11 ? 'A' : String(up); }

  /* 回傳 { action, code, label }：action 是此刻依圖表該按的動作 */
  function chartAdvice(round) {
    const h = round.hand;
    const up = round.dealerUp;
    const col = up === 11 ? 9 : up - 2;
    let code, label;

    if (round.canSplit()) {
      const p = h.cards[0].v;
      code = PAIRS[p][col];
      label = p === 1 ? 'A,A' : `${p},${p}`;
    } else {
      const { total, soft } = handValue(h.cards);
      if (soft && total >= 13) {
        const t = Math.min(total, 19);
        code = SOFT[t][col];
        label = t === 19 ? 'A,8+' : `A,${t - 11}（軟 ${total}）`;
      } else if (soft) {
        code = 'H';
        label = `軟 ${total}`;
      } else {
        const t = Math.max(8, Math.min(total, 17));
        code = HARD[t][col];
        label = total <= 8 ? `硬 ${total}（8-）` : total >= 17 ? `硬 ${total}（17+）` : `硬 ${total}`;
      }
    }

    let action = code;
    if (code === 'D') action = round.canDouble() ? 'D' : 'H';
    else if (code === 'Ds') action = round.canDouble() ? 'D' : 'S';
    else if (code === 'X') action = round.canSurrender() ? 'R' : 'H';
    return { action, code: CODE_TEXT[code], label: `${label} 對莊家 ${upLabel(up)}` };
  }

  /* ---------- 練習題型 ---------- */

  const NON_ACE = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // 依題型產生開局三張牌（玩家、莊家、玩家）
  function dealFor(kind) {
    const up = randomCard();
    if (kind === 'pair') {
      const r = pick(RANKS);
      const c1 = makeCard(r);
      const c2 = c1.v === 10 ? makeCard(pick(['10', 'J', 'Q', 'K'])) : makeCard(r);
      return new Deck([c1, up, c2]);
    }
    if (kind === 'soft') {
      const other = makeCard(pick(['2', '3', '4', '5', '6', '7', '8', '9']));
      const cards = Math.random() < 0.5 ? [makeCard('A'), other] : [other, makeCard('A')];
      return new Deck([cards[0], up, cards[1]]);
    }
    if (kind === 'hard') {
      let a, b;
      do { a = makeCard(pick(NON_ACE)); b = makeCard(pick(NON_ACE)); } while (a.v === b.v);
      return new Deck([a, up, b]);
    }
    return new Deck();
  }

  global.BJ = { RULES, Deck, Round, handValue, isBlackjack, chartAdvice, dealFor };
})(typeof window !== 'undefined' ? window : globalThis);
