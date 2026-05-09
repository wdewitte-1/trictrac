// ── UI ────────────────────────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function setMsg(t) { document.getElementById('msg-area').textContent = t; }
function showAiThinking(v) { document.getElementById('ai-thinking').classList.toggle('hidden', !v); }

function enableRoll() {
  const btn = document.getElementById('btn-roll');
  btn.disabled = false;
  btn.classList.add('primary');
}
function disableRoll() {
  const btn = document.getElementById('btn-roll');
  btn.disabled = true;
  btn.classList.remove('primary');
}

function setDiceNote(d1, d2, isTT, isDbl) {
  let note = `Gegooid: ${d1} & ${d2}`;
  if (isTT) note += ' — TricTrac!';
  else if (isDbl) note += ' — Dubbel!';
  if (isDbl || isTT) note += ' Nogmaals gooien!';
  document.getElementById('dice-note').textContent = note;
}

// ── Lobby flow ────────────────────────────────────────────────────────────────

function showAiSetup() {
  hideAllPanels();
  document.getElementById('ai-setup').classList.remove('hidden');
}
function showCreateRoom() {
  hideAllPanels();
  document.getElementById('create-room').classList.remove('hidden');
  createOnlineRoom();
}
function showJoinRoom() {
  hideAllPanels();
  document.getElementById('join-room').classList.remove('hidden');
  document.getElementById('join-input').focus();
}
function hideAllPanels() {
  ['ai-setup','create-room','join-room'].forEach(id => document.getElementById(id).classList.add('hidden'));
}

function setDiff(btn) {
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  G.difficulty = btn.dataset.diff;
}

function startLocal() {
  hideAllPanels();
  initGame('local', null);
  showStartRoll();
}
function startAi() {
  initGame('ai', 'white');
  showStartRoll();
}

function goLobby() {
  leaveRoom();
  showScreen('screen-lobby');
  hideAllPanels();
}
function restartGame() {
  if (G.mode === 'online') { goLobby(); return; }
  initGame(G.mode, G.myColor);
  showStartRoll();
}
function confirmLeave() {
  if (confirm('Spel verlaten?')) goLobby();
}

// ── Starting roll screen ──────────────────────────────────────────────────────

function showStartRoll() {
  G.startRolls = { white: null, black: null };
  G.startPhase = true;
  document.getElementById('sp-die-white').textContent = '?';
  document.getElementById('sp-die-black').textContent = '?';
  document.getElementById('sp-die-white').classList.remove('rolled');
  document.getElementById('sp-die-black').classList.remove('rolled');
  document.getElementById('btn-roll-white').disabled = false;
  document.getElementById('btn-roll-black').disabled = false;
  document.getElementById('sr-result').textContent = '';
  showScreen('screen-startroll');

  // In AI mode, auto-roll for black
  if (G.mode === 'ai') {
    document.getElementById('btn-roll-black').style.display = 'none';
  } else {
    document.getElementById('btn-roll-black').style.display = '';
  }
  // In online mode, the opponent rolls on their device
  if (G.mode === 'online') {
    const isWhite = G.myColor === 'white';
    document.getElementById('btn-roll-white').style.display = isWhite ? '' : 'none';
    document.getElementById('btn-roll-black').style.display = isWhite ? 'none' : '';
  }
}

function doStartRoll(color) {
  if (G.startRolls[color] !== null) return;
  const val = rollRandom();
  G.startRolls[color] = val;
  const dieEl = document.getElementById(`sp-die-${color}`);
  dieEl.textContent = val;
  dieEl.classList.add('rolled');
  document.getElementById(`btn-roll-${color}`).disabled = true;

  if (G.mode === 'ai' && color === 'white') {
    setTimeout(() => {
      const aiVal = rollRandom();
      G.startRolls.black = aiVal;
      const aiDie = document.getElementById('sp-die-black');
      aiDie.textContent = aiVal;
      aiDie.classList.add('rolled');
    }, 400);
    setTimeout(resolveStartRoll, 900);
    return;
  }

  if (G.mode === 'online') {
    pushStartRoll(color, val);
    return;
  }

  if (G.startRolls.white !== null && G.startRolls.black !== null) {
    setTimeout(resolveStartRoll, 600);
  }
}

function resolveStartRoll() {
  const w = G.startRolls.white, b = G.startRolls.black;
  if (w === b) {
    document.getElementById('sr-result').textContent = 'Gelijkspel! Gooi opnieuw.';
    setTimeout(() => {
      G.startRolls = { white: null, black: null };
      document.getElementById('sp-die-white').textContent = '?';
      document.getElementById('sp-die-black').textContent = '?';
      document.getElementById('sp-die-white').classList.remove('rolled');
      document.getElementById('sp-die-black').classList.remove('rolled');
      document.getElementById('btn-roll-white').disabled = false;
      document.getElementById('btn-roll-black').disabled = false;
      if (G.mode === 'ai') document.getElementById('btn-roll-black').style.display = 'none';
      document.getElementById('sr-result').textContent = '';
    }, 1200);
    return;
  }
  G.turn = w > b ? 'white' : 'black';
  const winner = w > b ? 'Wit' : 'Zwart';
  document.getElementById('sr-result').textContent = `${winner} begint!`;
  G.startPhase = false;
  setTimeout(startMainGame, 1000);
}

function startMainGame() {
  showScreen('screen-game');
  setMsg(`${cap(G.turn)} is aan de beurt. Gooi de dobbelstenen!`);
  disableRoll();
  renderBoard();
  renderDice();
  updateHeader();

  if (G.mode === 'online') {
    const myTurn = G.turn === G.myColor;
    if (myTurn) enableRoll();
    else { disableRoll(); setMsg('Wachten op tegenstander...'); }
  } else if (G.mode === 'ai' && G.turn === 'black') {
    setTimeout(aiPlayTurn, 400);
  } else {
    enableRoll();
  }
}

// ── Roll & move (human) ───────────────────────────────────────────────────────

function rollDice() {
  if (G.mode === 'online' && G.turn !== G.myColor) return;
  const d1 = rollRandom(), d2 = rollRandom();
  G.dice = generateDiceSequence(d1, d2).map(v => ({ val: v, used: false }));
  G.rolled = true;
  G.selected = null;
  disableRoll();
  document.getElementById('btn-pass').disabled = false;
  const isTT = Math.min(d1,d2)===1&&Math.max(d1,d2)===2, isDbl = d1===d2;
  setDiceNote(d1, d2, isTT, isDbl);
  setMsg(`${cap(G.turn)} aan zet.`);
  if (G.mode === 'online') pushState({});
  renderDice(); renderBoard();
  if (!checkCanMove()) return;
}

function passTurn() {
  G.selected = null;
  endTurnLogic();
  if (G.mode === 'online') pushState({ passed: true });
}

// ── Point / piece interaction ─────────────────────────────────────────────────

function pointClick(idx) {
  if (!G.rolled) return;
  if (G.mode === 'online' && G.turn !== G.myColor) return;
  if (G.mode === 'ai' && G.turn === 'black') return;

  const rem = G.dice.filter(d => !d.used);
  if (rem.length === 0) return;

  // Deselect or confirm move
  if (G.selected !== null) {
    if (G.selected.validTargets && G.selected.validTargets.includes(idx)) {
      applyMove({ from: G.selected.from, to: idx }, G.turn);
      G.dice[G.selected.dieIdx].used = true;
      G.selected = null;
      if (G.borne[G.turn] >= 15) {
        if (G.mode === 'online') pushState({ winner: G.turn });
        showWinner(G.turn); return;
      }
      renderBoard(); renderDice(); updateHeader();
      if (G.mode === 'online') pushState({});
      checkCanMove(); return;
    }
    G.selected = null; renderBoard();
    if (G.board[idx].color === G.turn && G.board[idx].count > 0) { pointClick(idx); return; }
    return;
  }

  // Bar has pieces — must enter first
  if (G.bar[G.turn] > 0) {
    for (let di = 0; di < G.dice.length; di++) {
      if (G.dice[di].used) continue;
      const mvs = getValidMoves(G.turn, G.dice[di].val).filter(m => m.from === 'bar' && m.to === idx);
      if (mvs.length > 0) {
        applyMove({ from: 'bar', to: idx }, G.turn);
        G.dice[di].used = true;
        G.selected = null;
        if (G.borne[G.turn] >= 15) { showWinner(G.turn); return; }
        renderBoard(); renderDice(); updateHeader();
        if (G.mode === 'online') pushState({});
        checkCanMove(); return;
      }
    }
    return;
  }

  // Select a piece
  if (G.board[idx].color === G.turn && G.board[idx].count > 0) {
    for (let di = 0; di < G.dice.length; di++) {
      if (G.dice[di].used) continue;
      const mvs = getValidMoves(G.turn, G.dice[di].val).filter(m => m.from === idx);
      if (mvs.length > 0) {
        G.selected = { from: idx, dieIdx: di, validTargets: mvs.map(m => m.to) };
        renderBoard(); return;
      }
    }
    setMsg('Geen geldige zetten van dit stuk.');
  }
}

function barClick() {
  if (!G.rolled || G.bar[G.turn] === 0) return;
  if (G.mode === 'online' && G.turn !== G.myColor) return;
  if (G.mode === 'ai' && G.turn === 'black') return;
  for (let di = 0; di < G.dice.length; di++) {
    if (G.dice[di].used) continue;
    const mvs = getValidMoves(G.turn, G.dice[di].val).filter(m => m.from === 'bar');
    if (mvs.length > 0) {
      G.selected = { from: 'bar', dieIdx: di, validTargets: mvs.map(m => m.to) };
      renderBoard(); return;
    }
  }
  setMsg('Kan niet inzetten!');
}

// ── Win ───────────────────────────────────────────────────────────────────────

function showWinner(color) {
  const isMe = G.mode === 'online' && color === G.myColor;
  const label = G.mode === 'ai' && color === 'black' ? 'AI wint!' :
    G.mode === 'online' ? (isMe ? 'Jij wint!' : 'Tegenstander wint!') :
    color === 'white' ? 'Wit wint!' : 'Zwart wint!';
  document.getElementById('winner-text').textContent = label;
  document.getElementById('winner-overlay').classList.remove('hidden');
  showAiThinking(false);
}

// ── Render board ──────────────────────────────────────────────────────────────

function renderBoard() {
  const topRow = document.getElementById('top-row');
  const botRow = document.getElementById('bot-row');
  const barArea = document.getElementById('bar-area');
  const midL = document.getElementById('mid-label-left');
  const midR = document.getElementById('mid-label-right');
  topRow.innerHTML = ''; botRow.innerHTML = ''; barArea.innerHTML = '';
  midL.innerHTML = ''; midR.innerHTML = '';

  const validTargets = G.selected ? G.selected.validTargets || [] : [];
  const fromIdx = G.selected ? G.selected.from : null;
  const canInteract = G.rolled && (G.mode !== 'online' || G.turn === G.myColor) && (G.mode !== 'ai' || G.turn !== 'black');

  for (let col = 0; col < 13; col++) {
    if (col === 6) {
      topRow.appendChild(makeBorneCol('white'));
      botRow.appendChild(makeBorneCol('black'));
      continue;
    }
    const tIdx = col < 6 ? 23 - col : 22 - (col - 7);
    const bIdx = col < 6 ? col : (col - 7);

    const tp = makePointEl('top', tIdx, validTargets, fromIdx, canInteract);
    const bp = makePointEl('bot', bIdx, validTargets, fromIdx, canInteract);
    topRow.appendChild(tp);
    botRow.appendChild(bp);
  }

  // Bar pieces
  ['white', 'black'].forEach(c => {
    for (let i = 0; i < G.bar[c]; i++) {
      const p = makePieceEl(c, canInteract && c === G.turn);
      if (canInteract && c === G.turn) p.addEventListener('click', barClick);
      barArea.appendChild(p);
    }
  });

  midL.textContent = '← wit';
  midR.textContent = 'zwart →';
}

function makePointEl(side, idx, validTargets, fromIdx, canInteract) {
  const pt = document.createElement('div');
  pt.className = `point point-${side === 'top' ? 'top' : 'bot'}`;

  const tri = document.createElement('div');
  const isLight = idx % 2 === 0;
  tri.className = `triangle ${isLight ? 'tri-light' : 'tri-dark'}`;
  pt.appendChild(tri);

  if (validTargets.includes(idx)) pt.classList.add('valid-target');

  const ptData = G.board[idx];
  if (ptData.color && ptData.count > 0) {
    const max = Math.min(ptData.count, 5);
    const isSelected = fromIdx === idx;
    for (let i = 0; i < max; i++) {
      const piece = makePieceEl(ptData.color, canInteract && ptData.color === G.turn);
      if (isSelected && i === 0) piece.classList.add('selected');
      piece.addEventListener('click', e => { e.stopPropagation(); if (canInteract) pointClick(idx); });
      if (side === 'top') pt.insertBefore(piece, pt.firstChild);
      else pt.appendChild(piece);
    }
    if (ptData.count > 5) {
      const lbl = document.createElement('div');
      lbl.style.cssText = 'color:rgba(255,255,255,.9);font-size:8px;font-weight:700;';
      lbl.textContent = '×' + ptData.count;
      pt.appendChild(lbl);
    }
  }

  pt.addEventListener('click', () => { if (canInteract) pointClick(idx); });
  return pt;
}

function makeBorneCol(color) {
  const el = document.createElement('div');
  el.className = 'borne-col';
  const n = G.borne[color];
  for (let i = 0; i < Math.min(n, 5); i++) {
    const p = makePieceEl(color, false);
    p.style.width = '80%';
    el.appendChild(p);
  }
  if (n > 5) {
    const l = document.createElement('div');
    l.style.cssText = 'color:rgba(255,255,255,.8);font-size:9px';
    l.textContent = '+' + (n - 5);
    el.appendChild(l);
  }
  return el;
}

function makePieceEl(color, clickable) {
  const p = document.createElement('div');
  p.className = `piece piece-${color}`;
  if (!clickable) p.style.cursor = 'default';
  return p;
}

function renderDice() {
  const area = document.getElementById('dice-area');
  area.innerHTML = '';
  if (G.dice.length === 0) { area.style.color = 'rgba(255,255,255,0.3)'; area.textContent = '—'; return; }
  area.style.color = '';
  G.dice.forEach(d => {
    const el = document.createElement('div');
    el.className = 'die' + (d.used ? ' used' : '');
    el.textContent = d.val;
    area.appendChild(el);
  });
}

function updateHeader() {
  const ph = playerPhase(G.turn);
  const phLabel = ph === 'enter' ? 'inzetten' : ph === 'bearoff' ? 'uithalen' : 'doorlopen';
  const isMyTurn = G.mode !== 'online' || G.turn === G.myColor;
  const turnLabel = G.mode === 'online'
    ? (isMyTurn ? 'Jouw beurt' : 'Tegenstander aan zet')
    : G.mode === 'ai' && G.turn === 'black' ? 'AI aan zet'
    : `${cap(G.turn)} aan zet`;
  document.getElementById('header-turn').textContent = turnLabel;
  document.getElementById('header-phase').textContent = phLabel;
  document.getElementById('score-white').textContent = `W: ${G.borne.white}`;
  document.getElementById('score-black').textContent = `Z: ${G.borne.black}`;
}
