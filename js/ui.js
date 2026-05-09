// ── UI helpers ────────────────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function setMsg(t) { document.getElementById('msg-area').textContent = t; }
function showAiThinking(v) { document.getElementById('ai-thinking').classList.toggle('hidden', !v); }
function enableRoll() {
  const b = document.getElementById('btn-roll');
  b.disabled = false; b.classList.add('primary');
}
function disableRoll() {
  const b = document.getElementById('btn-roll');
  b.disabled = true; b.classList.remove('primary');
}
function setDiceNote(d1, d2, isTT, isDbl) {
  let note = `${d1} & ${d2}`;
  if (isTT) note += ' · TricTrac!';
  else if (isDbl) note += ' · Dubbel!';
  document.getElementById('dice-note').textContent = note;
}

// ── Lobby helpers ─────────────────────────────────────────────────────────────

function showAiSetup()   { hideAllPanels(); document.getElementById('ai-setup').classList.remove('hidden'); }
function showCreateRoom(){ hideAllPanels(); document.getElementById('create-room').classList.remove('hidden'); createOnlineRoom(); }
function showJoinRoom()  { hideAllPanels(); document.getElementById('join-room').classList.remove('hidden'); document.getElementById('join-input').focus(); }
function hideAllPanels() { ['ai-setup','create-room','join-room'].forEach(id => document.getElementById(id).classList.add('hidden')); }
function setDiff(btn) {
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  G.difficulty = btn.dataset.diff;
}
function startLocal() { hideAllPanels(); initGame('local', null); showStartRoll(); }
function startAi()    { initGame('ai','white'); showStartRoll(); }
function goLobby()    { leaveRoom(); showScreen('screen-lobby'); hideAllPanels(); }
function restartGame(){ if (G.mode === 'online') { goLobby(); return; } initGame(G.mode, G.myColor); showStartRoll(); }
function confirmLeave(){ if (confirm('Spel verlaten?')) goLobby(); }

// ── Starting roll ─────────────────────────────────────────────────────────────

function showStartRoll() {
  G.startRolls = { white: null, black: null };
  G.startPhase = true;
  document.getElementById('sp-val-white').textContent = '?';
  document.getElementById('sp-val-black').textContent = '?';
  ['white','black'].forEach(c => {
    document.getElementById(`sp-die-${c}`).classList.remove('shake');
    document.getElementById(`btn-roll-${c}`).disabled = false;
  });
  document.getElementById('sr-result').textContent = '';
  showScreen('screen-startroll');
  if (G.mode === 'ai')     document.getElementById('btn-roll-black').style.display = 'none';
  else                      document.getElementById('btn-roll-black').style.display = '';
  if (G.mode === 'online') {
    document.getElementById('btn-roll-white').style.display = G.myColor === 'white' ? '' : 'none';
    document.getElementById('btn-roll-black').style.display = G.myColor === 'black' ? '' : 'none';
  }
}

function doStartRoll(color) {
  if (G.startRolls[color] !== null) return;
  const val = rollRandom();
  G.startRolls[color] = val;
  const die = document.getElementById(`sp-die-${color}`);
  const valEl = document.getElementById(`sp-val-${color}`);
  die.classList.remove('shake');
  void die.offsetWidth;
  die.classList.add('shake');
  setTimeout(() => { valEl.textContent = val; }, 180);
  document.getElementById(`btn-roll-${color}`).disabled = true;
  if (G.mode === 'ai' && color === 'white') {
    setTimeout(() => {
      const av = rollRandom(); G.startRolls.black = av;
      const bd = document.getElementById('sp-die-black');
      bd.classList.remove('shake'); void bd.offsetWidth; bd.classList.add('shake');
      setTimeout(() => { document.getElementById('sp-val-black').textContent = av; }, 180);
    }, 450);
    setTimeout(resolveStartRoll, 1100);
    return;
  }
  if (G.mode === 'online') { pushStartRoll(color, val); return; }
  if (G.startRolls.white !== null && G.startRolls.black !== null) setTimeout(resolveStartRoll, 700);
}

function resolveStartRoll() {
  const w = G.startRolls.white, b = G.startRolls.black;
  if (w === b) {
    document.getElementById('sr-result').textContent = 'Gelijkspel! Gooi opnieuw.';
    setTimeout(() => {
      G.startRolls = { white: null, black: null };
      document.getElementById('sp-val-white').textContent = '?';
      document.getElementById('sp-val-black').textContent = '?';
      document.getElementById('btn-roll-white').disabled = false;
      document.getElementById('btn-roll-black').disabled = false;
      if (G.mode === 'ai') document.getElementById('btn-roll-black').style.display = 'none';
      document.getElementById('sr-result').textContent = '';
    }, 1300);
    return;
  }
  G.turn = w > b ? 'white' : 'black';
  document.getElementById('sr-result').textContent = (w > b ? 'Speler 1 (Wit)' : 'Speler 2 (Rood)') + ' begint!';
  G.startPhase = false;
  setTimeout(startMainGame, 1100);
}

function startMainGame() {
  showScreen('screen-game');
  setMsg(`${G.turn === 'white' ? 'Speler 1 (Wit)' : 'Speler 2 (Rood)'} is aan de beurt. Gooi de dobbelstenen!`);
  disableRoll();
  renderAll();
  if (G.mode === 'online') {
    if (G.turn === G.myColor) enableRoll();
    else setMsg('Wachten op tegenstander…');
  } else if (G.mode === 'ai' && G.turn === 'black') {
    setTimeout(aiPlayTurn, 400);
  } else {
    enableRoll();
  }
}

// ── Roll ──────────────────────────────────────────────────────────────────────

function rollDice() {
  if (G.mode === 'online' && G.turn !== G.myColor) return;
  const d1 = rollRandom(), d2 = rollRandom();
  G.dice = generateDiceSequence(d1, d2).map(v => ({ val: v, used: false }));
  G.rolled = true; G.selected = null;
  disableRoll();
  document.getElementById('btn-pass').disabled = false;
  const isTT = Math.min(d1,d2)===1&&Math.max(d1,d2)===2, isDbl = d1===d2;
  setDiceNote(d1, d2, isTT, isDbl);
  setMsg(`${G.turn === 'white' ? 'Wit' : 'Rood'} aan zet.`);
  if (G.mode === 'online') pushState({});
  renderAll();
  if (!checkCanMove()) return;
}

function passTurn() {
  G.selected = null;
  endTurnLogic();
  if (G.mode === 'online') pushState({ passed: true });
}

// ── Point / piece / tray interaction ─────────────────────────────────────────

// Called when a triangle/point on the board is clicked
function pointClick(idx) {
  if (G.mode === 'online' && G.turn !== G.myColor) return;
  if (G.mode === 'ai' && G.turn === 'black') return;

  // ── Tray-stone mode: a stone from the tray is "held", place it on the point
  if (G.traySelected) {
    const color = G.traySelected;
    // Check if this is a valid target (from the pending tray move)
    if (G.selected && G.selected.from === 'bar' && G.selected.validTargets && G.selected.validTargets.includes(idx)) {
      applyMove({ from: 'bar', to: idx }, color);
      G.dice[G.selected.dieIdx].used = true;
      G.traySelected = null; G.selected = null;
      afterMove(); return;
    }
    // No valid target here, deselect
    G.traySelected = null; G.selected = null;
    renderAll(); return;
  }

  if (!G.rolled) return;
  const rem = G.dice.filter(d => !d.used);
  if (rem.length === 0) return;

  // Confirm pending move
  if (G.selected !== null) {
    if (G.selected.validTargets && G.selected.validTargets.includes(idx)) {
      applyMove({ from: G.selected.from, to: idx }, G.turn);
      G.dice[G.selected.dieIdx].used = true;
      G.selected = null;
      afterMove(); return;
    }
    G.selected = null; renderAll();
    if (G.board[idx].color === G.turn && G.board[idx].count > 0) { pointClick(idx); }
    return;
  }

  // Bar must enter first
  if (G.bar[G.turn] > 0) {
    for (let di = 0; di < G.dice.length; di++) {
      if (G.dice[di].used) continue;
      const mvs = getValidMoves(G.turn, G.dice[di].val).filter(m => m.from === 'bar' && m.to === idx);
      if (mvs.length > 0) {
        applyMove({ from: 'bar', to: idx }, G.turn);
        G.dice[di].used = true; G.selected = null;
        afterMove(); return;
      }
    }
    return;
  }

  // Select own piece
  if (G.board[idx].color === G.turn && G.board[idx].count > 0) {
    for (let di = 0; di < G.dice.length; di++) {
      if (G.dice[di].used) continue;
      const mvs = getValidMoves(G.turn, G.dice[di].val).filter(m => m.from === idx);
      if (mvs.length > 0) {
        G.selected = { from: idx, dieIdx: di, validTargets: mvs.map(m => m.to) };
        renderAll(); return;
      }
    }
    setMsg('Geen geldige zetten van dit stuk.');
    return;
  }

  // Click on a valid target without selecting first (shortcut for bar / direct)
  if (G.selected && G.selected.validTargets && G.selected.validTargets.includes(idx)) {
    applyMove({ from: G.selected.from, to: idx }, G.turn);
    G.dice[G.selected.dieIdx].used = true; G.selected = null;
    afterMove();
  }
}

// Called when player taps a stone in the tray
function trayStoneClick(color) {
  if (G.mode === 'online' && G.turn !== G.myColor) return;
  if (G.mode === 'ai' && G.turn === 'black') return;
  if (!G.rolled) return;
  // Only useful if there are stones on the bar (entering phase) or entering phase
  const ph = playerPhase(color);
  if (ph !== 'enter') {
    setMsg('Stenen verplaats je door ze op het bord aan te tikken.');
    return;
  }
  // Find a die that has a valid entry move
  for (let di = 0; di < G.dice.length; di++) {
    if (G.dice[di].used) continue;
    const mvs = getValidMoves(color, G.dice[di].val).filter(m => m.from === 'bar');
    if (mvs.length > 0) {
      G.traySelected = color;
      G.selected = { from: 'bar', dieIdx: di, validTargets: mvs.map(m => m.to) };
      setMsg('Tik nu op een verlichte driehoek om de steen te plaatsen.');
      renderAll(); return;
    }
  }
  setMsg('Geen vrij vakje om in te zetten.');
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
      renderAll(); return;
    }
  }
  setMsg('Kan niet inzetten!');
}

function afterMove() {
  if (G.borne[G.turn] >= 15) {
    if (G.mode === 'online') pushState({ winner: G.turn });
    showWinner(G.turn); return;
  }
  renderAll(); updateHeader();
  if (G.mode === 'online') pushState({});
  checkCanMove();
}

// ── Win ───────────────────────────────────────────────────────────────────────

function showWinner(color) {
  const isMe = G.mode === 'online' && color === G.myColor;
  const label = G.mode === 'ai' && color === 'black' ? 'AI wint!' :
    G.mode === 'online' ? (isMe ? 'Jij wint! 🎉' : 'Tegenstander wint!') :
    color === 'white' ? 'Speler 1 (Wit) wint!' : 'Speler 2 (Rood) wint!';
  document.getElementById('winner-text').textContent = label;
  document.getElementById('winner-overlay').classList.remove('hidden');
  showAiThinking(false);
}

// ── Render all ────────────────────────────────────────────────────────────────

function renderAll() { renderBoard(); renderTray(); renderDice(); updateHeader(); }

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
    topRow.appendChild(makePointEl('top', tIdx, validTargets, fromIdx, canInteract));
    botRow.appendChild(makePointEl('bot', bIdx, validTargets, fromIdx, canInteract));
  }

  // Bar pieces
  ['white','black'].forEach(c => {
    for (let i = 0; i < G.bar[c]; i++) {
      const p = makePieceEl(c, canInteract && c === G.turn);
      if (canInteract && c === G.turn) p.addEventListener('click', e => { e.stopPropagation(); barClick(); });
      barArea.appendChild(p);
    }
  });

  midL.textContent = '← wit';
  midR.textContent = 'rood →';
}

function makePointEl(side, idx, validTargets, fromIdx, canInteract) {
  const pt = document.createElement('div');
  pt.className = `point point-${side === 'top' ? 'top' : 'bot'}`;

  const tri = document.createElement('div');
  tri.className = `triangle ${idx % 2 === 0 ? 'tri-light' : 'tri-dark'}`;
  pt.appendChild(tri);

  if (validTargets.includes(idx)) pt.classList.add('valid-target');

  const ptData = G.board[idx];
  if (ptData.color && ptData.count > 0) {
    const isSelected = fromIdx === idx;
    const max = Math.min(ptData.count, 5);
    for (let i = 0; i < max; i++) {
      const piece = makePieceEl(ptData.color, canInteract && ptData.color === G.turn);
      if (isSelected && i === 0) piece.classList.add('selected');
      piece.addEventListener('click', e => { e.stopPropagation(); if (canInteract || G.traySelected) pointClick(idx); });
      if (side === 'top') pt.insertBefore(piece, pt.firstChild);
      else pt.appendChild(piece);
    }
    if (ptData.count > 5) {
      const lbl = document.createElement('div');
      lbl.style.cssText = 'color:rgba(255,255,255,.9);font-size:8px;font-weight:700;z-index:2';
      lbl.textContent = '×' + ptData.count;
      pt.appendChild(lbl);
    }
  }

  pt.addEventListener('click', () => { if (canInteract || G.traySelected) pointClick(idx); });
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
  // 'black' in game logic = red visually
  p.className = `piece piece-${color === 'black' ? 'red' : 'white'}`;
  if (!clickable) p.style.cursor = 'default';
  return p;
}

// ── Render tray ───────────────────────────────────────────────────────────────

function renderTray() {
  renderStonesFor('white');
  renderStonesFor('black');
  document.getElementById('borne-white-count').textContent = G.borne.white;
  document.getElementById('borne-black-count').textContent = G.borne.black;
}

function renderStonesFor(color) {
  const grid = document.getElementById(`stones-${color}`);
  grid.innerHTML = '';
  const ph = playerPhase(color);
  // Count stones not yet on board (still in tray = 15 - placed - borne)
  const onBoard = G.board.reduce((s,p) => p.color===color ? s+p.count : s, 0) + G.bar[color];
  const inTray = 15 - onBoard - G.borne[color];
  const isMyTurn = G.turn === color && G.rolled;
  const isEntering = ph === 'enter';
  const isTrayActive = G.traySelected === color;

  for (let i = 0; i < 15; i++) {
    const s = document.createElement('div');
    const cls = color === 'black' ? 'tray-stone-red' : 'tray-stone-white';
    s.className = `tray-stone ${cls}`;
    if (i < inTray) {
      // Stone is available in tray
      if (isMyTurn && isEntering && (G.mode !== 'ai' || color !== 'black')) {
        if (isTrayActive && i === 0) s.classList.add('active');
        s.addEventListener('click', () => trayStoneClick(color));
      } else {
        // not interactable right now but visible
      }
    } else {
      s.classList.add('inactive');
    }
    grid.appendChild(s);
  }
}

// ── Render dice (SVG, colored by turn) ───────────────────────────────────────

// Dot positions for each face value
const DOT_POS = {
  1: [[50,50]],
  2: [[25,25],[75,75]],
  3: [[25,25],[50,50],[75,75]],
  4: [[25,25],[75,25],[25,75],[75,75]],
  5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
  6: [[25,22],[75,22],[25,50],[75,50],[25,78],[75,78]]
};

function makeDieSVG(val, color, used, rolling) {
  const isWhite = color === 'white';
  const bgFill   = isWhite ? '#f5f5f5' : '#7a0a0a';
  const stroke   = isWhite ? '#bbb'    : '#c0392b';
  const dotFill  = isWhite ? '#1a1a1a' : '#ffffff';
  const cls = `die-svg${used ? ' used' : ''}${rolling ? ' rolling' : ''}`;
  const dots = (DOT_POS[val] || []).map(([cx,cy]) =>
    `<circle cx="${cx*52/100}" cy="${cy*52/100}" r="${isWhite ? 3.8 : 3.8}" fill="${dotFill}"/>`
  ).join('');
  return `<svg class="${cls}" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="48" height="48" rx="9" fill="${bgFill}" stroke="${stroke}" stroke-width="2"/>
    ${dots}
  </svg>`;
}

function renderDice() {
  const area = document.getElementById('dice-visual-area');
  area.innerHTML = '';
  if (G.dice.length === 0) {
    area.innerHTML = '<div style="color:rgba(255,255,255,.25);font-size:11px;text-align:center;padding:4px">—</div>';
    return;
  }
  // Show dice in rows of 2
  let row;
  G.dice.forEach((d, i) => {
    if (i % 2 === 0) {
      row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:4px;justify-content:center';
      area.appendChild(row);
    }
    const wrap = document.createElement('div');
    wrap.innerHTML = makeDieSVG(d.val, G.turn, d.used, false);
    row.appendChild(wrap);
  });
}

function animateDiceRoll(diceArr, color) {
  const area = document.getElementById('dice-visual-area');
  area.innerHTML = '';
  // Show rolling animation for all dice
  let row;
  diceArr.forEach((d, i) => {
    if (i % 2 === 0) {
      row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:4px;justify-content:center';
      area.appendChild(row);
    }
    const wrap = document.createElement('div');
    wrap.innerHTML = makeDieSVG(d.val, color, false, true);
    row.appendChild(wrap);
  });
}

function updateHeader() {
  const ph = playerPhase(G.turn);
  const phLabel = ph === 'enter' ? 'inzetten' : ph === 'bearoff' ? 'uithalen' : 'doorlopen';
  const isMyTurn = G.mode !== 'online' || G.turn === G.myColor;
  const turnLabel = G.mode === 'online'
    ? (isMyTurn ? 'Jouw beurt' : 'Tegenstander aan zet')
    : (G.mode === 'ai' && G.turn === 'black') ? 'AI aan zet'
    : G.turn === 'white' ? 'Speler 1 (Wit)' : 'Speler 2 (Rood)';
  document.getElementById('header-turn').textContent = turnLabel;
  document.getElementById('header-phase').textContent = phLabel;
  document.getElementById('score-white').textContent = `W: ${G.borne.white}`;
  document.getElementById('score-black').textContent = `R: ${G.borne.black}`;
}
