// ── Screen nav ────────────────────────────────────────────────────────────────
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function showTutorial(){
  tutCurrentSlide=0;buildTutDots();goToSlide(0);showScreen('s-tutorial');
}

// ── Lobby ─────────────────────────────────────────────────────────────────────
function showPanel(id){
  document.querySelectorAll('.sub-panel').forEach(p=>p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  if(id==='create-panel')createOnlineRoom();
}
function hidePanel(){document.querySelectorAll('.sub-panel').forEach(p=>p.classList.add('hidden'));}
function setDiff(btn){
  document.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');G.difficulty=btn.dataset.diff;
}
function startLocal(){hidePanel();initGame('local',null);showStartRoll();}
function startAi(){initGame('ai','w');showStartRoll();}
function goLobby(){leaveRoom();showScreen('s-lobby');hidePanel();}
function restartGame(){if(G.mode==='online'){goLobby();return;}initGame(G.mode,G.myColor);showStartRoll();}
function confirmLeave(){if(confirm('Spel verlaten?'))goLobby();}
function shareCode(){
  const code=document.getElementById('room-code-display').textContent;
  if(navigator.share)navigator.share({title:'TricTrac',text:`Speel TricTrac! Code: ${code}`});
  else{navigator.clipboard.writeText(code);document.getElementById('btn-share-code').textContent='✓ Gekopieerd!';}
}

// ── Tutorial nav ──────────────────────────────────────────────────────────────
let tutCurrentSlide=0;
const SLIDE_COUNT=6;
function buildTutDots(){
  const dc=document.getElementById('tut-dots');
  dc.innerHTML='';
  for(let i=0;i<SLIDE_COUNT;i++){
    const d=document.createElement('div');
    d.className='tut-dot'+(i===0?' active':'');
    d.onclick=()=>goToSlide(i);
    dc.appendChild(d);
  }
}
function goToSlide(n){
  document.querySelectorAll('.tut-slide').forEach((s,i)=>{
    s.classList.toggle('active',i===n);
  });
  document.querySelectorAll('.tut-dot').forEach((d,i)=>d.classList.toggle('active',i===n));
  tutCurrentSlide=n;
  document.getElementById('tut-prev').disabled=n===0;
  document.getElementById('tut-next').disabled=n===SLIDE_COUNT-1;
  const pb=document.getElementById('tut-play-btn');
  if(pb)pb.style.display=n===SLIDE_COUNT-1?'':'none';
}
function tutNav(dir){
  const next=Math.max(0,Math.min(SLIDE_COUNT-1,tutCurrentSlide+dir));
  goToSlide(next);
}

// ── Start roll ────────────────────────────────────────────────────────────────
function showStartRoll(){
  G.startRolls={w:null,r:null};
  drawBlankDie(document.getElementById('sr-cv-white'),'w');
  drawBlankDie(document.getElementById('sr-cv-black'),'r');
  document.getElementById('sr-btn-white').disabled=false;
  document.getElementById('sr-btn-black').disabled=false;
  document.getElementById('sr-result').textContent='';
  // Name labels
  document.getElementById('srn-white').textContent= G.mode==='ai'?'Jij (Wit)':'Speler 1';
  document.getElementById('srn-black').textContent= G.mode==='ai'?'AI (Rood)':'Speler 2';
  if(G.mode==='ai')document.getElementById('sr-btn-black').style.display='none';
  else document.getElementById('sr-btn-black').style.display='';
  if(G.mode==='online'){
    document.getElementById('sr-btn-white').style.display=G.myColor==='w'?'':'none';
    document.getElementById('sr-btn-black').style.display=G.myColor==='r'?'':'none';
  }
  showScreen('s-startroll');
}
function doStartRoll(colorKey){
  const c=colorKey==='white'?'w':'r';
  if(G.startRolls[c]!==null)return;
  const val=rollRandom();G.startRolls[c]=val;
  const cvId=c==='w'?'sr-cv-white':'sr-cv-black';
  animateCanvasDie(document.getElementById(cvId),val,c,()=>{});
  const btnId=c==='w'?'sr-btn-white':'sr-btn-black';
  document.getElementById(btnId).disabled=true;
  if(G.mode==='ai'&&c==='w'){
    setTimeout(()=>{const av=rollRandom();G.startRolls.r=av;animateCanvasDie(document.getElementById('sr-cv-black'),av,'r',()=>{});},450);
    setTimeout(resolveStartRoll,1100);return;
  }
  if(G.mode==='online'){pushStartRoll(c,val);return;}
  if(G.startRolls.w!==null&&G.startRolls.r!==null)setTimeout(resolveStartRoll,700);
}
function resolveStartRoll(){
  const w=G.startRolls.w,r=G.startRolls.r;
  if(w===r){
    document.getElementById('sr-result').textContent='Gelijkspel — gooi opnieuw!';
    setTimeout(()=>{
      G.startRolls={w:null,r:null};
      drawBlankDie(document.getElementById('sr-cv-white'),'w');
      drawBlankDie(document.getElementById('sr-cv-black'),'r');
      document.getElementById('sr-btn-white').disabled=false;
      if(G.mode!=='ai')document.getElementById('sr-btn-black').disabled=false;
      if(G.mode==='online'){
        document.getElementById('sr-btn-white').style.display=G.myColor==='w'?'':'none';
        document.getElementById('sr-btn-black').style.display=G.myColor==='r'?'':'none';
      }
      document.getElementById('sr-result').textContent='';
    },1200);return;
  }
  G.turn=w>r?'w':'r';
  document.getElementById('sr-result').textContent=(w>r?'Speler 1 (Wit)':'Speler 2 (Rood)')+' begint!';
  setTimeout(startMainGame,1100);
}
function startMainGame(){
  showScreen('s-game');
  document.getElementById('board-winner').classList.add('hidden');
  setMsg(`${colorName(G.turn)} is aan de beurt. Gooi de dobbelstenen!`);
  disableRoll();document.getElementById('btn-pass').disabled=true;
  buildPointLabels();renderAll();
  if(G.mode==='online'){if(G.turn===G.myColor)enableRoll();else setMsg('Wachten op tegenstander…');}
  else if(G.mode==='ai'&&G.turn==='r'){setTimeout(aiPlayTurn,400);}
  else{enableRoll();}
}

// ── Roll (human) ──────────────────────────────────────────────────────────────
function rollDice(){
  if(G.mode==='online'&&G.turn!==G.myColor)return;
  const d1=rollRandom(),d2=rollRandom();
  G.dice=generateDiceSequence(d1,d2).map(v=>({val:v,used:false}));
  G.rolled=true;G.selected=null;
  disableRoll();document.getElementById('btn-pass').disabled=false;
  const isTT=Math.min(d1,d2)===1&&Math.max(d1,d2)===2,isDbl=d1===d2;
  setDiceNote(d1,d2,isTT,isDbl);
  setMsg(`${colorName(G.turn)} aan zet.`);
  animateDice(()=>{renderDice();});
  if(G.mode==='online')pushState({});
  renderBoard();updateSidebars();
  if(!checkCanMove())return;
}
function passTurn(){G.selected=null;endTurnLogic();if(G.mode==='online')pushState({passed:true});}

// ── Click handling ────────────────────────────────────────────────────────────
function ptClick(idx){
  if(G.mode==='online'&&G.turn!==G.myColor)return;
  if(G.mode==='ai'&&G.turn==='r')return;
  if(!G.rolled)return;
  const rem=G.dice.filter(d=>!d.used);if(!rem.length)return;
  if(G.selected){
    if(G.selected.validTargets&&G.selected.validTargets.includes(idx)){
      applyMove({from:G.selected.from,to:idx},G.turn);
      G.dice[G.selected.dieIdx].used=true;G.selected=null;
      afterMove();return;
    }
    G.selected=null;renderBoard();
    if(G.board[idx]?.color===G.turn&&G.board[idx].count>0)ptClick(idx);
    return;
  }
  if(G.bar[G.turn]>0){
    for(let di=0;di<G.dice.length;di++){
      if(G.dice[di].used)continue;
      const mvs=getValidMoves(G.turn,G.dice[di].val).filter(m=>m.from==='bar'&&m.to===idx);
      if(mvs.length){applyMove({from:'bar',to:idx},G.turn);G.dice[di].used=true;G.selected=null;afterMove();return;}
    }
    return;
  }
  if(G.board[idx]?.color===G.turn&&G.board[idx].count>0){
    for(let di=0;di<G.dice.length;di++){
      if(G.dice[di].used)continue;
      const mvs=getValidMoves(G.turn,G.dice[di].val).filter(m=>m.from===idx);
      if(mvs.length){G.selected={from:idx,dieIdx:di,validTargets:mvs.map(m=>m.to)};renderBoard();return;}
    }
    setMsg('Geen zetten mogelijk van dit stuk.');
  }
}
function barClick(){
  if(G.mode==='online'&&G.turn!==G.myColor)return;
  if(G.mode==='ai'&&G.turn==='r')return;
  if(!G.rolled||!G.bar[G.turn])return;
  for(let di=0;di<G.dice.length;di++){
    if(G.dice[di].used)continue;
    const mvs=getValidMoves(G.turn,G.dice[di].val).filter(m=>m.from==='bar');
    if(mvs.length){G.selected={from:'bar',dieIdx:di,validTargets:mvs.map(m=>m.to)};renderBoard();return;}
  }
  setMsg('Kan niet inzetten!');
}
function afterMove(){
  if(G.borne[G.turn]>=15){if(G.mode==='online')pushState({winner:G.turn});showWinner(G.turn);return;}
  renderAll();
  if(G.mode==='online')pushState({});
  checkCanMove();
}

// ── Winner ────────────────────────────────────────────────────────────────────
function showWinner(c){
  const isMe=G.mode==='online'&&c===G.myColor;
  const lbl=G.mode==='ai'&&c==='r'?'AI Wint! 🤖':
    G.mode==='online'?(isMe?'Jij Wint! 🎉':'Tegenstander Wint!'):
    c==='w'?'Speler 1 (Wit) Wint!':'Speler 2 (Rood) Wint!';
  document.getElementById('bw-title').textContent=lbl;
  document.getElementById('board-winner').classList.remove('hidden');
  showAiThinking(false);
}

// ── Render all ────────────────────────────────────────────────────────────────
function renderAll(){renderBoard();renderDice();updateSidebars();}

// ── Point labels ──────────────────────────────────────────────────────────────
function buildPointLabels(){
  // Top row shows points 24..13 (indices 23..12) left to right
  // Bot row shows points 1..12  (indices 0..11)  left to right
  const top=document.getElementById('pt-top');
  const bot=document.getElementById('pt-bot');
  top.innerHTML='';bot.innerHTML='';
  for(let i=0;i<13;i++){
    const t=document.createElement('span');
    const b=document.createElement('span');
    if(i===6){t.textContent='';b.textContent='';}
    else{
      const ti=i<6?24-i:13+6-i; // 24,23,22,21,20,19, ,18,17,16,15,14,13
      const bi=i<6?i+1:i;       // 1,2,3,4,5,6, ,7,8,9,10,11,12
      t.textContent=i<6?24-i:25-(i);
      b.textContent=i<6?i+1:i;
    }
    top.appendChild(t);bot.appendChild(b);
  }
}

// ── Board render ──────────────────────────────────────────────────────────────
function renderBoard(){
  const tRow=document.getElementById('brow-top');
  const bRow=document.getElementById('brow-bot');
  const barMid=document.getElementById('bar-mid');
  tRow.innerHTML='';bRow.innerHTML='';barMid.innerHTML='';
  const vt=G.selected?G.selected.validTargets||[]:[];
  const fi=G.selected?G.selected.from:null;
  const canAct=G.rolled&&(G.mode!=='online'||G.turn===G.myColor)&&(G.mode!=='ai'||G.turn!=='r');

  // Top row: points 23 down to 12 (left side: 23-18, bar, right: 17-12)
  // Visually left col = high indices for white (they move left→right)
  // Top row point layout: col0=idx23, col1=idx22,... col5=idx18, [bar], col6=idx17,...col11=idx12
  for(let col=0;col<13;col++){
    if(col===6){tRow.appendChild(makeBarSlot('top',canAct));bRow.appendChild(makeBarSlot('bot',canAct));continue;}
    const tIdx=col<6?23-col:17-( col-7);
    const bIdx=col<6?col:col-1;
    tRow.appendChild(makePt('top',tIdx,vt,fi,canAct));
    bRow.appendChild(makePt('bot',bIdx,vt,fi,canAct));
  }

  // Bar pieces (pieces hit and waiting to re-enter)
  ['w','r'].forEach(c=>{
    for(let i=0;i<Math.min(G.bar[c],4);i++){
      const p=makePieceEl(c,canAct&&c===G.turn);
      if(canAct&&c===G.turn)p.addEventListener('click',e=>{e.stopPropagation();barClick();});
      barMid.appendChild(p);
    }
    if(G.bar[c]>4){
      const lbl=document.createElement('div');
      lbl.style.cssText='font-size:9px;color:#FFD700;font-weight:700;text-align:center';
      lbl.textContent=`+${G.bar[c]-4}`;barMid.appendChild(lbl);
    }
  });
}

function makeBarSlot(side,canAct){
  const s=document.createElement('div');
  s.className='bar-slot';
  if(canAct)s.addEventListener('click',()=>barClick());
  return s;
}

function makePt(side,idx,vt,fi,canAct){
  const pt=document.createElement('div');
  pt.className=`pt pt-${side==='top'?'top':'bot'}`;
  const isLight=(idx%2===0);
  const tri=document.createElement('div');
  tri.className=`tri ${isLight?'tri-b':'tri-a'}`;
  pt.appendChild(tri);
  if(vt.includes(idx))pt.classList.add('valid-target');
  const pd=G.board[idx];
  if(pd&&pd.color&&pd.count>0){
    const isSel=fi===idx;
    const show=Math.min(pd.count,5);
    for(let i=0;i<show;i++){
      const p=makePieceEl(pd.color,canAct&&pd.color===G.turn);
      if(isSel&&i===0)p.classList.add('sel');
      p.addEventListener('click',e=>{e.stopPropagation();if(canAct)ptClick(idx);});
      if(side==='top')pt.insertBefore(p,pt.firstChild);
      else pt.appendChild(p);
    }
    if(pd.count>5){
      const lbl=document.createElement('div');
      lbl.className='piece-stack-label';lbl.textContent='×'+pd.count;pt.appendChild(lbl);
    }
  }
  pt.addEventListener('click',()=>{if(canAct||vt.includes(idx))ptClick(idx);});
  return pt;
}

function makePieceEl(c,clickable){
  const p=document.createElement('div');
  p.className=`piece piece-${c==='w'?'w':'r'}`;
  if(!clickable)p.style.cursor='default';
  return p;
}

// ── Render sidebars ───────────────────────────────────────────────────────────
function updateSidebars(){
  // Turn dots
  document.getElementById('dot-white').classList.toggle('active',G.turn==='w');
  document.getElementById('dot-black').classList.toggle('active',G.turn==='r');
  // Score
  document.getElementById('sb-score-white').textContent=G.borne.w;
  document.getElementById('sb-score-black').textContent=G.borne.r;
  // Phase
  const phases={enter:'inzetten',move:'doorlopen',bearoff:'uithalen'};
  document.getElementById('sb-phase-white').textContent=phases[playerPhase('w')]||'';
  document.getElementById('sb-phase-black').textContent=phases[playerPhase('r')]||'';
  // Bar pieces indicator
  renderMiniPieces('bar-white',G.bar.w,'w');
  renderMiniPieces('bar-black',G.bar.r,'r');
  renderMiniPieces('borne-white',G.borne.w,'w');
  renderMiniPieces('borne-black',G.borne.r,'r');
}
function renderMiniPieces(elId,count,c){
  const el=document.getElementById(elId);if(!el)return;
  el.innerHTML='';
  const show=Math.min(count,8);
  for(let i=0;i<show;i++){
    const p=document.createElement('div');
    p.className=`mini-piece mini-${c==='w'?'white':'red'}`;
    el.appendChild(p);
  }
  if(count>8){const l=document.createElement('div');l.style.cssText='font-size:8px;color:#FFD700';l.textContent=`+${count-8}`;el.appendChild(l);}
}
function showAiThinking(v){document.getElementById('ai-thinking').classList.toggle('hidden',!v);}
function enableRoll(){const b=document.getElementById('btn-roll');b.disabled=false;}
function disableRoll(){document.getElementById('btn-roll').disabled=true;}
function setMsg(t){document.getElementById('msg-box').textContent=t;}
function setDiceNote(d1,d2,isTT,isDbl){
  let n=`${d1} & ${d2}`;
  if(isTT)n+=' — TricTrac!';else if(isDbl)n+=' — Dubbel!';
  if(isDbl||isTT)n+=' +Opnieuw!';
  document.getElementById('dice-note').textContent=n;
}

// ── SVG Dice rendering ────────────────────────────────────────────────────────
const DOTS={
  1:[[50,50]],
  2:[[25,25],[75,75]],
  3:[[25,25],[50,50],[75,75]],
  4:[[25,25],[75,25],[25,75],[75,75]],
  5:[[25,25],[75,25],[50,50],[25,75],[75,75]],
  6:[[25,22],[75,22],[25,50],[75,50],[25,78],[75,78]]
};

function makeDieSVG(val,c,used,size){
  size=size||46;
  const isW=c==='w';
  const bg=isW?'#f0f0f0':'#7a0a0a';
  const stroke=isW?'#bbb':'#c0392b';
  const dotFill=isW?'#1a1a1a':'#ffffff';
  const r=Math.round(size*0.17);
  const dotR=Math.round(size*0.1);
  const positions=(DOTS[val]||[]).map(([px,py])=>{
    const cx=Math.round(px*size/100);
    const cy=Math.round(py*size/100);
    return `<circle cx="${cx}" cy="${cy}" r="${dotR}" fill="${dotFill}"/>`;
  }).join('');
  const cls=`die-svg${used?' die-used':''}`;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="${size-4}" height="${size-4}" rx="${r}" fill="${bg}" stroke="${stroke}" stroke-width="2"/>
    ${positions}
  </svg>`;
}

function renderDice(){
  const area=document.getElementById('dice-display');
  area.innerHTML='';
  if(!G.dice.length){area.innerHTML='<span style="color:rgba(255,255,255,.2);font-size:12px">—</span>';return;}
  G.dice.forEach(d=>{
    const wrap=document.createElement('div');
    wrap.innerHTML=makeDieSVG(d.val,G.turn,d.used,44);
    area.appendChild(wrap);
  });
}

function animateDice(cb){
  const area=document.getElementById('dice-display');
  area.innerHTML='';
  const temp=G.dice.map(d=>({...d,used:false}));
  temp.forEach(d=>{
    const wrap=document.createElement('div');
    wrap.innerHTML=makeDieSVG(d.val,G.turn,false,44);
    wrap.querySelector('svg').classList.add('die-rolling');
    area.appendChild(wrap);
  });
  setTimeout(cb,380);
}

// ── Canvas die for start roll screen ─────────────────────────────────────────
function drawBlankDie(cv,c){
  const ctx=cv.getContext('2d');
  const w=cv.width,h=cv.height,r=14;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle=c==='w'?'#2a2a2a':'#3a0505';
  roundRectPath(ctx,2,2,w-4,h-4,r);ctx.fill();
  ctx.strokeStyle=c==='w'?'rgba(255,255,255,.2)':'rgba(192,57,43,.4)';
  ctx.lineWidth=2;roundRectPath(ctx,2,2,w-4,h-4,r);ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.2)';
  ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('?',w/2,h/2);
}
function drawDie(cv,val,c){
  const ctx=cv.getContext('2d');
  const w=cv.width,h=cv.height,r=14;
  ctx.clearRect(0,0,w,h);
  const isW=c==='w';
  // Shadow
  ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=8;ctx.shadowOffsetY=3;
  // Background gradient
  const grad=ctx.createRadialGradient(w*.35,h*.3,0,w*.5,h*.5,w*.7);
  if(isW){grad.addColorStop(0,'#ffffff');grad.addColorStop(.5,'#e8e8e8');grad.addColorStop(1,'#c0c0c0');}
  else{grad.addColorStop(0,'#c0392b');grad.addColorStop(.5,'#8B1A1A');grad.addColorStop(1,'#4a0808');}
  ctx.fillStyle=grad;roundRectPath(ctx,2,2,w-4,h-4,r);ctx.fill();
  ctx.shadowColor='transparent';
  // Border
  ctx.strokeStyle=isW?'rgba(0,0,0,.15)':'rgba(255,100,80,.4)';ctx.lineWidth=2;
  roundRectPath(ctx,2,2,w-4,h-4,r);ctx.stroke();
  // Dots
  const dotFill=isW?'#1a1a1a':'rgba(255,255,255,.95)';
  const dotR=w*0.1;
  (DOTS[val]||[]).forEach(([px,py])=>{
    const cx=px*w/100,cy=py*h/100;
    ctx.beginPath();ctx.arc(cx,cy,dotR,0,Math.PI*2);
    ctx.fillStyle=dotFill;ctx.fill();
  });
}
function animateCanvasDie(cv,finalVal,c,cb){
  let frames=0;const total=12;
  const anim=()=>{
    drawDie(cv,Math.ceil(Math.random()*6),c);
    frames++;
    if(frames<total)requestAnimationFrame(anim);
    else{drawDie(cv,finalVal,c);cb&&cb();}
  };
  requestAnimationFrame(anim);
}
function roundRectPath(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}
