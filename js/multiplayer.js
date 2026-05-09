// ── Firebase Multiplayer ──────────────────────────────────────────────────────
// Replace the config values in this block with your own Firebase project config.
// See SETUP-GUIDE.md Step 2 for instructions.

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

try { firebase.initializeApp(firebaseConfig); } catch(e) {}
const db = firebase.database();

let roomRef=null, roomCode=null, isHost=false, stateListener=null;

function generateCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join('');
}

async function createOnlineRoom(){
  const code=generateCode(); roomCode=code; isHost=true; G.myColor='w';
  roomRef=db.ref('rooms/'+code);
  await roomRef.set({host:'w',guest:null,status:'waiting',startRolls:{w:null,r:null},state:null,created:Date.now()});
  document.getElementById('room-code-display').textContent=code;
  document.getElementById('create-status').textContent='Deel deze code met je tegenstander';
  document.getElementById('btn-share-code').style.display='';
  document.getElementById('waiting-text').style.display='';
  roomRef.child('guest').on('value',snap=>{
    if(snap.val()==='r'){
      roomRef.child('guest').off();
      document.getElementById('waiting-text').textContent='Tegenstander gevonden! Start…';
      roomRef.update({status:'startroll'});
      initGame('online','w');listenToRoom();showStartRoll();
    }
  });
  setTimeout(()=>{if(roomRef)roomRef.remove();},3600000);
}

async function joinRoom(){
  const code=document.getElementById('join-input').value.trim().toUpperCase();
  const errEl=document.getElementById('join-error');errEl.textContent='';
  if(code.length<6){errEl.textContent='Ongeldige code.';return;}
  const snap=await db.ref('rooms/'+code).once('value');
  const room=snap.val();
  if(!room){errEl.textContent='Code niet gevonden.';return;}
  if(room.status!=='waiting'){errEl.textContent='Dit spel is al gestart.';return;}
  roomCode=code;isHost=false;G.myColor='r';
  roomRef=db.ref('rooms/'+code);
  await roomRef.update({guest:'r',status:'startroll'});
  initGame('online','r');listenToRoom();showStartRoll();
}

function shareCode(){
  const code=document.getElementById('room-code-display').textContent;
  if(navigator.share)navigator.share({title:'TricTrac',text:`Speel TricTrac met mij! Code: ${code}`});
  else{navigator.clipboard.writeText(code).then(()=>{document.getElementById('btn-share-code').textContent='✓ Gekopieerd!';});}
}

function listenToRoom(){
  if(stateListener)roomRef.off('value',stateListener);
  stateListener=roomRef.on('value',snap=>{
    const data=snap.val();
    if(!data){handleDisconnect();return;}
    // Start roll sync
    if(data.startRolls){
      const opp=G.myColor==='w'?'r':'w';
      const opRoll=data.startRolls[opp];
      if(opRoll!==null&&opRoll!==undefined&&G.startRolls[opp]===null){
        G.startRolls[opp]=opRoll;
        const cvId=opp==='w'?'sr-cv-white':'sr-cv-black';
        const cv=document.getElementById(cvId);
        if(cv)animateCanvasDie(cv,opRoll,opp,()=>{});
        if(G.startRolls.w!==null&&G.startRolls.r!==null)setTimeout(resolveStartRoll,700);
      }
    }
    // Game state sync
    if(data.state&&data.status==='playing'){
      const st=data.state;
      if(st.lastActor===G.myColor)return;
      G.board=st.board;G.bar=st.bar;G.borne=st.borne;
      G.turn=st.turn;G.dice=st.dice||[];G.rolled=st.rolled||false;G.selected=null;
      renderAll();
      if(st.winner){showWinner(st.winner);return;}
      if(G.turn===G.myColor){
        if(G.rolled){setMsg('Maak jouw zet.');document.getElementById('btn-pass').disabled=false;if(!hasAnyMove(G.turn)){setMsg('Geen zetten — beurt over.');setTimeout(endTurnLogic,800);}}
        else{setMsg('Jouw beurt! Gooi de dobbelstenen.');enableRoll();document.getElementById('btn-pass').disabled=true;}
      } else{disableRoll();document.getElementById('btn-pass').disabled=true;setMsg('Wachten op tegenstander…');}
    }
  });
}

function pushState(extras){
  if(!roomRef)return;
  const state={board:G.board,bar:G.bar,borne:G.borne,turn:G.turn,dice:G.dice,rolled:G.rolled,lastActor:G.myColor,winner:extras.winner||null,ts:Date.now()};
  roomRef.update({state,status:'playing'});
}
function pushStartRoll(c,val){
  if(!roomRef)return;
  roomRef.child('startRolls').update({[c]:val});
}
function leaveRoom(){
  if(stateListener&&roomRef)roomRef.off('value',stateListener);
  stateListener=null;if(roomRef&&isHost)roomRef.remove();
  roomRef=null;roomCode=null;isHost=false;
}
function handleDisconnect(){setMsg('Tegenstander heeft het spel verlaten.');disableRoll();}
