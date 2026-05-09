// ── State ─────────────────────────────────────────────────────────────────────
let G = {
  board:[],           // 24 points: {color:null|'w'|'r', count:0}
  bar:{w:0,r:0},      // pieces on bar
  borne:{w:0,r:0},    // pieces borne off
  turn:'w',           // 'w' or 'r'
  dice:[],            // [{val,used}]
  selected:null,      // {from, dieIdx, validTargets}
  rolled:false,
  mode:null,          // 'local'|'ai'|'online'
  difficulty:'medium',
  myColor:null,
  startRolls:{w:null,r:null},
};

function initGame(mode,color){
  G.board = Array.from({length:24},()=>({color:null,count:0}));
  G.bar={w:0,r:0}; G.borne={w:0,r:0};
  G.turn='w'; G.dice=[]; G.selected=null; G.rolled=false;
  G.mode=mode; G.myColor=color||null;
  G.startRolls={w:null,r:null};
}

// ── Phase ─────────────────────────────────────────────────────────────────────
// w moves 0→23 (left to right), r moves 23→0 (right to left)
// q1 = entry quad, q4 = home quad
function Q1(c){return c==='w'?[0,1,2,3,4,5]:[18,19,20,21,22,23]}
function Q4(c){return c==='w'?[18,19,20,21,22,23]:[0,1,2,3,4,5]}

function playerPhase(c){
  const onBoard = G.board.reduce((s,p)=>p.color===c?s+p.count:s,0)+G.bar[c];
  if(onBoard<15) return 'enter';
  const q4=Q4(c);
  const notHome=G.board.reduce((s,p,i)=>{
    if(p.color!==c)return s;
    if(q4.includes(i))return s;
    return s+p.count;
  },0)+G.bar[c];
  if(notHome===0) return 'bearoff';
  return 'move';
}

// ── Dice ─────────────────────────────────────────────────────────────────────
function rollRandom(){return Math.ceil(Math.random()*6)}
function generateDiceSequence(d1,d2){
  const lo=Math.min(d1,d2),hi=Math.max(d1,d2);
  if(d1===d2){const op=7-d1;return[d1,d1,op,op];}
  if(lo===1&&hi===2)return[1,1,2,2,5,5,6,6];
  return[lo,lo,hi,hi];
}

// ── Valid moves ───────────────────────────────────────────────────────────────
function enterPoint(c,dv){return c==='w'?dv-1:24-dv}
function canLand(idx,c){
  if(idx<0||idx>=24)return false;
  const p=G.board[idx];
  if(!p.color||p.count===0)return true;
  if(p.color===c)return p.count<5;
  return p.count===1;
}
function getValidMoves(c,dv){
  const moves=[];
  const ph=playerPhase(c);
  const q4=Q4(c);
  if(ph==='enter'){
    const t=enterPoint(c,dv);
    if(canLand(t,c))moves.push({from:'bar',to:t});
    return moves;
  }
  if(ph==='bearoff'){
    q4.forEach(i=>{
      if(G.board[i].color!==c||G.board[i].count===0)return;
      const pv=c==='w'?24-i:i+1;
      if(pv===dv){moves.push({from:i,to:'out'});return;}
      if(dv>pv){
        const higher=q4.filter(j=>G.board[j].color===c&&G.board[j].count>0&&(c==='w'?24-j:j+1)>pv);
        if(higher.length===0)moves.push({from:i,to:'out'});
      }
    });
    return moves;
  }
  if(G.bar[c]>0){
    const t=enterPoint(c,dv);
    if(canLand(t,c))moves.push({from:'bar',to:t});
    return moves;
  }
  G.board.forEach((p,i)=>{
    if(p.color!==c||p.count===0)return;
    const t=c==='w'?i+dv:i-dv;
    if(t<0||t>=24)return;
    if(canLand(t,c))moves.push({from:i,to:t});
  });
  return moves;
}
function hasAnyMove(c){
  return G.dice.filter(d=>!d.used).some(d=>getValidMoves(c,d.val).length>0);
}

// ── Apply move ────────────────────────────────────────────────────────────────
function applyMove(move,c){
  const opp=c==='w'?'r':'w';
  if(move.from==='bar')G.bar[c]--;
  else{G.board[move.from].count--;if(G.board[move.from].count===0)G.board[move.from].color=null;}
  if(move.to==='out'){G.borne[c]++;}
  else{
    if(G.board[move.to].color===opp&&G.board[move.to].count===1){
      G.board[move.to].count=0;G.board[move.to].color=null;G.bar[opp]++;
    }
    G.board[move.to].color=c;G.board[move.to].count++;
  }
}

// ── AI ────────────────────────────────────────────────────────────────────────
function aiPlayTurn(){
  showAiThinking(true);
  setTimeout(()=>{
    const d1=rollRandom(),d2=rollRandom();
    G.dice=generateDiceSequence(d1,d2).map(v=>({val:v,used:false}));
    G.rolled=true;
    const isTT=Math.min(d1,d2)===1&&Math.max(d1,d2)===2,isDbl=d1===d2;
    setDiceNote(d1,d2,isTT,isDbl);
    animateDice(()=>{ renderDice(); setTimeout(()=>aiExecute(),400); });
  },600);
}
function aiExecute(){
  const rem=G.dice.filter(d=>!d.used);
  if(rem.length===0){showAiThinking(false);endTurnLogic();return;}
  let best=null,bi=-1;
  for(let di=0;di<G.dice.length;di++){
    if(G.dice[di].used)continue;
    const mvs=getValidMoves('r',G.dice[di].val);
    if(mvs.length){best=pickMove(mvs);bi=di;break;}
  }
  if(!best){showAiThinking(false);setMsg('AI heeft geen zetten.');setTimeout(endTurnLogic,600);return;}
  applyMove(best,'r');G.dice[bi].used=true;
  if(G.borne.r>=15){showAiThinking(false);showWinner('r');return;}
  renderAll();
  setTimeout(aiExecute,420);
}
function pickMove(moves){
  if(G.difficulty==='easy')return moves[Math.floor(Math.random()*moves.length)];
  const sc=moves.map(m=>({m,s:scoreMove(m,'r')})).sort((a,b)=>b.s-a.s);
  if(G.difficulty==='medium'){
    const top=sc.slice(0,Math.max(1,Math.ceil(sc.length/2)));
    return top[Math.floor(Math.random()*top.length)].m;
  }
  return sc[0].m;
}
function scoreMove(m,c){
  let s=0;const opp=c==='w'?'r':'w';
  if(m.to==='out')return 100;
  if(m.from==='bar')s+=10;
  if(typeof m.to==='number'){
    if(G.board[m.to].color===opp&&G.board[m.to].count===1)s+=20;
    if(Q4(c).includes(m.to))s+=5;
    if(G.board[m.to].color===c)s+=3;
  }
  if(typeof m.from==='number'&&G.board[m.from].count===1)s-=4;
  return s;
}

// ── Turn flow ─────────────────────────────────────────────────────────────────
function endTurnLogic(){
  G.selected=null;
  if(G.borne[G.turn]>=15){showWinner(G.turn);return;}
  const allUsed=G.dice.every(d=>d.used);
  const reroll=allUsed&&(G.dice.length===4||G.dice.length===8);
  if(reroll){
    setMsg(`${colorName(G.turn)} gooit opnieuw!`);
    setTimeout(()=>{
      G.rolled=false;G.dice=[];
      document.getElementById('dice-note').textContent='';
      renderDice();renderBoard();
      if(G.mode==='online'){pushState({});}
      else if(G.mode==='ai'&&G.turn==='r'){aiPlayTurn();}
      else{enableRoll();}
    },500);
    return;
  }
  G.turn=G.turn==='w'?'r':'w';
  G.rolled=false;G.dice=[];
  document.getElementById('dice-note').textContent='';
  setMsg(`${colorName(G.turn)} is aan de beurt.`);
  renderDice();renderBoard();updateSidebars();
  disableRoll();document.getElementById('btn-pass').disabled=true;
  if(G.mode==='online'){pushState({});}
  else if(G.mode==='ai'&&G.turn==='r'){setTimeout(aiPlayTurn,400);}
  else{enableRoll();}
}
function checkCanMove(){
  if(!hasAnyMove(G.turn)){
    setMsg('Geen zetten mogelijk — beurt over.');
    setTimeout(endTurnLogic,800);return false;
  }
  return true;
}
function colorName(c){return c==='w'?'Speler 1 (Wit)':'Speler 2 (Rood)';}
