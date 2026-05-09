// ── Firebase Configuration ────────────────────────────────────────────────────
// TODO: Replace these values with your own Firebase project config
// See SETUP-GUIDE.md Step 2 for instructions

const firebaseConfig = {
  apiKey: "AIzaSyC1yxA7MHWPPEd-6W6eLv7sjorI4EiG6XU",
  authDomain: "trictrac-83142.firebaseapp.com",
  databaseURL: "https://trictrac-83142-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "trictrac-83142",
  storageBucket: "trictrac-83142.firebasestorage.app",
  messagingSenderId: "1057759161292",
  appId: "1:1057759161292:web:cfe36e139985e4cb774b69",
  measurementId: "G-P259G8QMPM"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let roomRef = null;
let roomCode = null;
let isHost = false;
let stateListener = null;

// ── Room creation ─────────────────────────────────────────────────────────────

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

async function createOnlineRoom() {
  const code = generateCode();
  roomCode = code;
  isHost = true;
  G.myColor = 'white';

  roomRef = db.ref('rooms/' + code);
  await roomRef.set({
    host: 'white',
    guest: null,
    status: 'waiting',
    startRolls: { white: null, black: null },
    state: null,
    created: Date.now()
  });

  document.getElementById('room-code-display').textContent = code;
  document.getElementById('create-status').textContent = 'Deel deze code met je tegenstander';
  document.getElementById('btn-share-code').style.display = '';
  document.getElementById('waiting-text').style.display = '';

  // Listen for guest joining
  roomRef.child('guest').on('value', snap => {
    if (snap.val() === 'black') {
      document.getElementById('waiting-text').textContent = 'Tegenstander gevonden! Spel start...';
      roomRef.child('guest').off();
      roomRef.update({ status: 'startroll' });
      initGame('online', 'white');
      listenToRoom();
      showStartRoll();
    }
  });

  // Clean up old rooms after 1 hour
  setTimeout(() => { if (roomRef) roomRef.remove(); }, 3600000);
}

async function joinRoom() {
  const code = document.getElementById('join-input').value.trim().toUpperCase();
  const errEl = document.getElementById('join-error');
  errEl.textContent = '';

  if (code.length < 6) { errEl.textContent = 'Voer een geldige code in.'; return; }

  const snap = await db.ref('rooms/' + code).once('value');
  const room = snap.val();

  if (!room) { errEl.textContent = 'Spelcode niet gevonden.'; return; }
  if (room.status !== 'waiting') { errEl.textContent = 'Dit spel is al begonnen of vol.'; return; }

  roomCode = code;
  isHost = false;
  G.myColor = 'black';
  roomRef = db.ref('rooms/' + code);

  await roomRef.update({ guest: 'black', status: 'startroll' });
  initGame('online', 'black');
  listenToRoom();
  showStartRoll();
}

// ── Sharing ───────────────────────────────────────────────────────────────────

function shareCode() {
  const text = `Speel TricTrac met mij! Spelcode: ${roomCode}`;
  if (navigator.share) {
    navigator.share({ title: 'TricTrac', text });
  } else {
    navigator.clipboard.writeText(roomCode).then(() => {
      document.getElementById('btn-share-code').textContent = 'Gekopieerd!';
      setTimeout(() => document.getElementById('btn-share-code').textContent = 'Deel code', 2000);
    });
  }
}

// ── Room listener ─────────────────────────────────────────────────────────────

function listenToRoom() {
  if (stateListener) roomRef.off('value', stateListener);
  stateListener = roomRef.on('value', snap => {
    const data = snap.val();
    if (!data) { handleDisconnect(); return; }

    // Start roll sync
    if (data.startRolls) {
      const opColor = G.myColor === 'white' ? 'black' : 'white';
      const opRoll = data.startRolls[opColor];
      if (opRoll !== null && opRoll !== undefined && G.startRolls[opColor] === null) {
        G.startRolls[opColor] = opRoll;
        const dieEl = document.getElementById(`sp-die-${opColor}`);
        if (dieEl) { dieEl.textContent = opRoll; dieEl.classList.add('rolled'); }
        if (G.startRolls.white !== null && G.startRolls.black !== null) {
          setTimeout(resolveStartRoll, 600);
        }
      }
    }

    // Game state sync
    if (data.state && data.status === 'playing') {
      const st = data.state;
      const isMyAction = st.lastActor !== G.myColor;
      if (!isMyAction) return; // ignore echoes of our own pushes

      G.board = st.board;
      G.bar = st.bar;
      G.borne = st.borne;
      G.turn = st.turn;
      G.dice = st.dice || [];
      G.rolled = st.rolled || false;
      G.selected = null;

      renderBoard(); renderDice(); updateHeader();

      if (st.winner) { showWinner(st.winner); return; }

      if (G.turn === G.myColor) {
        if (G.rolled) {
          setMsg('Maak jouw zet.');
          document.getElementById('btn-pass').disabled = false;
          if (!hasAnyMove(G.turn)) {
            setMsg('Geen zetten mogelijk — beurt gaat over.');
            setTimeout(endTurnLogic, 800);
          }
        } else {
          setMsg('Jouw beurt! Gooi de dobbelstenen.');
          enableRoll();
          document.getElementById('btn-pass').disabled = true;
        }
      } else {
        disableRoll();
        document.getElementById('btn-pass').disabled = true;
        setMsg('Wachten op tegenstander...');
      }
    }
  });

  // Handle disconnect
  roomRef.child('.info/connected');
  db.ref('.info/connected').on('value', snap => {
    if (!snap.val()) setMsg('Verbinding verbroken...');
  });
}

// ── State push ────────────────────────────────────────────────────────────────

function pushState(extras) {
  if (!roomRef) return;
  const state = {
    board: G.board,
    bar: G.bar,
    borne: G.borne,
    turn: G.turn,
    dice: G.dice,
    rolled: G.rolled,
    lastActor: G.myColor,
    winner: extras.winner || null,
    ts: Date.now()
  };
  roomRef.update({ state, status: 'playing' });
}

function pushStartRoll(color, val) {
  if (!roomRef) return;
  roomRef.child('startRolls').update({ [color]: val });
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

function leaveRoom() {
  if (stateListener && roomRef) roomRef.off('value', stateListener);
  stateListener = null;
  if (roomRef && isHost) roomRef.remove();
  roomRef = null; roomCode = null; isHost = false;
}

function handleDisconnect() {
  setMsg('Tegenstander heeft het spel verlaten.');
  disableRoll();
}
