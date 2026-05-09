// ── TricTrac Game Logic ──────────────────────────────────────────────────────

let G = {
  board: [],
  bar: { white: 0, black: 0 },
  borne: { white: 0, black: 0 },
  turn: 'white',
  dice: [],
  selected: null,
  traySelected: null,  // color of stone picked from tray
  rolled: false,
  mode: null,          // 'local' | 'ai' | 'online'
  difficulty: 'medium',
  myColor: null,       // for online: 'white' or 'black'
  startRolls: { white: null, black: null },
  startPhase: true,
};

function initGame(mode, color) {
  G.board = Array.from({ length: 24 }, () => ({ color: null, count: 0 }));
  G.bar = { white: 0, black: 0 };
  G.borne = { white: 0, black: 0 };
  G.turn = 'white';
  G.dice = [];
  G.selected = null;
  G.traySelected = null;
  G.rolled = false;
  G.mode = mode;
  G.myColor = color || null;
  G.startRolls = { white: null, black: null };
  G.startPhase = true;
}

// ── Phase detection ──────────────────────────────────────────────────────────

function playerPhase(color) {
  const q1 = color === 'white' ? [0,1,2,3,4,5] : [12,13,14,15,16,17];
  const q4 = color === 'white' ? [18,19,20,21,22,23] : [6,7,8,9,10,11];
  const placed = G.board.reduce((s, p) => p.color === color ? s + p.count : s, 0) + G.bar[color];
  if (placed < 15) return 'enter';
  const notInQ4 = G.board.reduce((s, p, i) => {
    if (p.color !== color) return s;
    if (q4.includes(i)) return s;
    return s + p.count;
  }, 0) + G.bar[color];
  if (notInQ4 === 0) return 'bearoff';
  return 'move';
}

// ── Dice ─────────────────────────────────────────────────────────────────────

function generateDiceSequence(d1, d2) {
  const lo = Math.min(d1, d2), hi = Math.max(d1, d2);
  if (d1 === d2) { const op = 7 - d1; return [d1, d1, op, op]; }
  if (lo === 1 && hi === 2) return [1, 1, 2, 2, 5, 5, 6, 6];
  return [lo, lo, hi, hi];
}

function rollRandom() {
  return Math.ceil(Math.random() * 6);
}

// ── Valid moves ───────────────────────────────────────────────────────────────

function getEnterPoint(color, dv) {
  return color === 'white' ? dv - 1 : 24 - dv;
}

function canLand(idx, color) {
  if (idx < 0 || idx >= 24) return false;
  const p = G.board[idx];
  if (!p.color || p.count === 0) return true;
  if (p.color === color) return p.count < 5;
  return p.count === 1;
}

function getValidMoves(color, dv) {
  const moves = [];
  const ph = playerPhase(color);
  const q4 = color === 'white' ? [18,19,20,21,22,23] : [6,7,8,9,10,11];

  if (ph === 'enter') {
    const target = getEnterPoint(color, dv);
    if (canLand(target, color)) moves.push({ from: 'bar', to: target });
    return moves;
  }

  if (ph === 'bearoff') {
    q4.forEach(i => {
      if (G.board[i].color !== color || G.board[i].count === 0) return;
      const pv = color === 'white' ? 24 - i : i + 1;
      if (pv === dv) { moves.push({ from: i, to: 'out' }); return; }
      if (dv > pv) {
        const higher = q4.filter(j => G.board[j].color === color && G.board[j].count > 0 && (color === 'white' ? 24 - j : j + 1) > pv);
        if (higher.length === 0) moves.push({ from: i, to: 'out' });
      }
    });
    return moves;
  }

  if (G.bar[color] > 0) {
    const target = getEnterPoint(color, dv);
    if (canLand(target, color)) moves.push({ from: 'bar', to: target });
    return moves;
  }

  G.board.forEach((p, i) => {
    if (p.color !== color || p.count === 0) return;
    const target = color === 'white' ? i + dv : i - dv;
    if (target < 0 || target >= 24) return;
    if (canLand(target, color)) moves.push({ from: i, to: target });
  });

  return moves;
}

function hasAnyMove(color) {
  return G.dice.filter(d => !d.used).some(d => getValidMoves(color, d.val).length > 0);
}

// ── Apply move ────────────────────────────────────────────────────────────────

function applyMove(move, color) {
  const opp = color === 'white' ? 'black' : 'white';
  if (move.from === 'bar') G.bar[color]--;
  else { G.board[move.from].count--; if (G.board[move.from].count === 0) G.board[move.from].color = null; }
  if (move.to === 'out') {
    G.borne[color]++;
  } else {
    if (G.board[move.to].color === opp && G.board[move.to].count === 1) {
      G.board[move.to].count = 0; G.board[move.to].color = null; G.bar[opp]++;
    }
    G.board[move.to].color = color;
    G.board[move.to].count++;
  }
}

// ── AI ────────────────────────────────────────────────────────────────────────

function aiPlayTurn() {
  showAiThinking(true);
  setTimeout(() => {
    const d1 = rollRandom(), d2 = rollRandom();
    G.dice = generateDiceSequence(d1, d2).map(v => ({ val: v, used: false }));
    G.rolled = true;
    const isTT = Math.min(d1,d2)===1&&Math.max(d1,d2)===2, isDbl = d1===d2;
    setDiceNote(d1, d2, isTT, isDbl);
    // Animate roll then render final values
    animateDiceRoll(G.dice, 'black');
    setTimeout(() => { renderDice(); setTimeout(() => aiExecuteMoves(), 400); }, 420);
  }, 700);
}

function aiExecuteMoves() {
  const rem = G.dice.filter(d => !d.used);
  if (rem.length === 0) { showAiThinking(false); endTurnLogic(); return; }
  let bestMove = null, bestDieIdx = -1;
  for (let di = 0; di < G.dice.length; di++) {
    if (G.dice[di].used) continue;
    const moves = getValidMoves('black', G.dice[di].val);
    if (moves.length === 0) continue;
    bestMove = pickAiMove(moves); bestDieIdx = di; break;
  }
  if (!bestMove) { showAiThinking(false); setMsg('AI kan niet zetten.'); setTimeout(endTurnLogic, 600); return; }
  applyMove(bestMove, 'black');
  G.dice[bestDieIdx].used = true;
  renderBoard(); renderDice(); updateHeader();
  if (G.borne.black >= 15) { showAiThinking(false); showWinner('black'); return; }
  setTimeout(aiExecuteMoves, 450);
}

function pickAiMove(moves) {
  if (G.difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
  const scored = moves.map(m => ({ m, s: scoreMove(m, 'black') })).sort((a, b) => b.s - a.s);
  if (G.difficulty === 'medium') {
    const top = scored.slice(0, Math.max(1, Math.ceil(scored.length / 2)));
    return top[Math.floor(Math.random() * top.length)].m;
  }
  return scored[0].m;
}

function scoreMove(move, color) {
  let s = 0;
  const opp = color === 'white' ? 'black' : 'white';
  if (move.to === 'out') return 100;
  if (move.from === 'bar') s += 10;
  if (typeof move.to === 'number') {
    if (G.board[move.to].color === opp && G.board[move.to].count === 1) s += 20;
    const q4 = color === 'white' ? [18,19,20,21,22,23] : [6,7,8,9,10,11];
    if (q4.includes(move.to)) s += 5;
    if (G.board[move.to].color === color) s += 3;
  }
  if (typeof move.from === 'number' && G.board[move.from].count === 1) s -= 4;
  return s;
}

// ── Turn flow ─────────────────────────────────────────────────────────────────

function endTurnLogic() {
  G.selected = null;
  G.traySelected = null;
  if (G.borne[G.turn] >= 15) { showWinner(G.turn); return; }
  const allUsed = G.dice.every(d => d.used);
  const reroll = allUsed && (G.dice.length === 4 || G.dice.length === 8);

  if (reroll) {
    setMsg(`${cap(G.turn)} gooit opnieuw!`);
    setTimeout(() => {
      G.rolled = false; G.dice = [];
      document.getElementById('dice-note').textContent = '';
      renderDice(); renderBoard();
      if (G.mode === 'online') {
        pushState({ rerolling: true });
      } else if (G.mode === 'ai' && G.turn === 'black') {
        aiPlayTurn();
      } else {
        enableRoll();
      }
    }, 500);
    return;
  }

  G.turn = G.turn === 'white' ? 'black' : 'white';
  G.rolled = false; G.dice = [];
  document.getElementById('dice-note').textContent = '';
  setMsg(`${cap(G.turn)} is aan de beurt.`);
  renderDice(); renderBoard(); updateHeader();
  disableRoll();

  if (G.mode === 'online') {
    pushState({});
  } else if (G.mode === 'ai' && G.turn === 'black') {
    setTimeout(aiPlayTurn, 400);
  } else {
    enableRoll();
  }
}

function checkCanMove() {
  if (!hasAnyMove(G.turn)) {
    setMsg('Geen zetten mogelijk — beurt gaat over.');
    setTimeout(endTurnLogic, 800);
    return false;
  }
  return true;
}
