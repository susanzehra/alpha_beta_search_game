"use strict";

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
let playerName = "";

function feedback(id, message, type = "") {
  const el = $(id); el.textContent = message; el.className = `feedback ${type}`.trim();
}
function showQuestion(n) {
  $$(".question").forEach((q, i) => q.hidden = i !== n - 1);
  $("#progressText").textContent = `Question ${n} of 5`;
  $("#progressBar").style.width = `${n * 20}%`;
  window.scrollTo({ top: $("#game").offsetTop - 10, behavior: "smooth" });
  if (n === 3) renderTrace();
  if (n === 4) renderOrdering();
  if (n === 5 && !arena.board.length) startArenaLevel(0);
}

$("#nameForm").addEventListener("submit", e => {
  e.preventDefault();
  playerName = $("#studentName").value.trim().replace(/\s+/g, " ");
  if (playerName.length < 2) { $("#nameError").textContent = "Please enter your name."; return; }
  $("#nameError").textContent = ""; $("#welcome").hidden = true; $("#game").hidden = false;
  $("#playerGreeting").textContent = `Player: ${playerName}`; showQuestion(1);
});

// Question 1: terms and definitions
let selectedToken = null;
function placeToken(slot, token) {
  if (!token) return;
  const old = $(".drag-token", slot);
  if (old) $("[data-bank='q1']").append(old);
  const existingSlot = token.closest(".drop-slot");
  if (existingSlot) { existingSlot.textContent = "Drop label"; existingSlot.classList.remove("filled"); }
  slot.textContent = ""; slot.append(token); slot.classList.add("filled");
  token.classList.remove("selected"); selectedToken = null;
}
function wireTokens() {
  $$(".drag-token").forEach(t => {
    t.addEventListener("dragstart", e => e.dataTransfer.setData("text/plain", t.dataset.value));
    t.addEventListener("click", () => { $$(".drag-token").forEach(x => x.classList.remove("selected")); selectedToken = t; t.classList.add("selected"); });
  });
  $$(".drop-slot").forEach(s => {
    s.tabIndex = 0; s.addEventListener("dragover", e => e.preventDefault());
    s.addEventListener("drop", e => { e.preventDefault(); placeToken(s, $(`.drag-token[data-value='${e.dataTransfer.getData("text/plain")}']`)); });
    s.addEventListener("click", () => placeToken(s, selectedToken));
  });
}
wireTokens();
function resetQ1() {
  $$(".drag-token").forEach(t => $("[data-bank='q1']").append(t));
  $$(".drop-slot").forEach(s => { s.textContent = "Drop label"; s.className = "drop-slot"; });
  feedback("#feedback1", "Drag each label to its description. You can also click a label and then click a slot.");
}
$(".reset[data-question='1']").addEventListener("click", resetQ1);
$("#checkQ1").addEventListener("click", () => {
  let filled = true, all = true;
  $$(".drop-slot").forEach(s => { const t = $(".drag-token", s); if (!t) { filled = false; return; } const ok = t.dataset.value === s.dataset.answer; s.classList.toggle("correct", ok); s.classList.toggle("wrong", !ok); all &&= ok; });
  if (!filled) feedback("#feedback1", "Place all four labels before checking.", "bad");
  else if (!all) feedback("#feedback1", "A few labels are misplaced. Remember: alpha belongs to MAX; beta belongs to MIN.", "bad");
  else { feedback("#feedback1", "Correct! Alpha tracks MAX’s lower bound, while beta tracks MIN’s upper bound.", "good"); setTimeout(() => showQuestion(2), 900); }
});

// Question 2: cutoff rule
$$(".cutoff-card button").forEach(b => b.addEventListener("click", () => { const card = b.closest(".cutoff-card"); $$("button", card).forEach(x => x.classList.remove("selected")); b.classList.add("selected"); card.dataset.choice = b.dataset.choice; }));
$("#resetQ2").addEventListener("click", () => { $$(".cutoff-card").forEach(c => { delete c.dataset.choice; c.classList.remove("correct", "wrong"); $$("button", c).forEach(b => b.classList.remove("selected")); }); feedback("#feedback2", "Make one decision for each situation."); });
$("#checkQ2").addEventListener("click", () => {
  const cards = $$(".cutoff-card"); if (cards.some(c => !c.dataset.choice)) return feedback("#feedback2", "Choose Continue or Prune for all four situations.", "bad");
  let all = true; cards.forEach(c => { const ok = c.dataset.choice === c.dataset.answer; c.classList.toggle("correct", ok); c.classList.toggle("wrong", !ok); all &&= ok; });
  if (!all) feedback("#feedback2", "Check the cutoff rule carefully: prune when alpha is greater than or equal to beta.", "bad");
  else { feedback("#feedback2", "Exactly right. Equality also causes a cutoff: α ≥ β.", "good"); setTimeout(() => showQuestion(3), 900); }
});

// Question 3: guided trace
const traceSteps = [
  {q:"Which terminal value is examined first?", options:[["3","3"],["5","5"],["2","2"]], a:"3", log:"Visit 3. The left MIN node sets β = 3."},
  {q:"Which terminal value is examined next?", options:[["5","5"],["2","2"],["9","9"]], a:"5", log:"Visit 5. Left MIN keeps min(3, 5) = 3."},
  {q:"What value does the left MIN branch return?", options:[["3","3"],["5","5"],["8","8"]], a:"3", log:"Left MIN returns 3 to the MAX root."},
  {q:"What is the root’s new alpha value?", options:[["3","3"],["5","5"],["−∞","inf"]], a:"3", log:"MAX records α = 3, its best guaranteed value so far."},
  {q:"Which value is visited first in the right MIN branch?", options:[["2","2"],["9","9"],["5","5"]], a:"2", log:"Visit 2. The right MIN node sets β = 2."},
  {q:"Now α = 3 and β = 2. What should the search do?", options:[["Prune the leaf 9","prune"],["Visit the leaf 9","visit"],["Restart the tree","restart"]], a:"prune", log:"Because α ≥ β, prune the leaf 9. It cannot change MAX’s choice."},
  {q:"What final value does MAX return?", options:[["2","2"],["3","3"],["9","9"]], a:"3", log:"MAX chooses max(3, 2) = 3."}
];
let traceIndex = 0, traceLog = [];
function renderTrace() {
  const s = traceSteps[traceIndex]; $("#traceStep").textContent = `${traceIndex + 1} of ${traceSteps.length}`; $("#tracePrompt").textContent = s.q; $("#traceChoices").innerHTML = "";
  s.options.forEach(([label,value]) => { const b=document.createElement("button"); b.textContent=label; b.addEventListener("click",()=>answerTrace(value)); $("#traceChoices").append(b); });
  $("#traceLog").innerHTML = traceLog.length ? traceLog.map(x=>`<li>${x}</li>`).join("") : "<li>Search has not started.</li>";
}
function answerTrace(value) {
  const s=traceSteps[traceIndex]; if(value!==s.a) return feedback("#feedback3","Not quite. Follow the tree from left to right and update the current bound.","bad");
  traceLog.push(s.log); feedback("#feedback3",s.log,"good"); traceIndex++;
  if(traceIndex===traceSteps.length){ $("#traceStep").textContent="Complete"; $("#tracePrompt").textContent="Trace complete — one leaf was safely pruned."; $("#traceChoices").innerHTML=""; $("#traceLog").innerHTML=traceLog.map(x=>`<li>${x}</li>`).join(""); setTimeout(()=>showQuestion(4),1100); }
  else renderTrace();
}
$("#restartTrace").addEventListener("click",()=>{traceIndex=0;traceLog=[];feedback("#feedback3","Choose the correct action at each step.");renderTrace();});

// Question 4: move ordering
const branchData={A:[2,9],B:[6,7],C:[4,8],D:[5,1]}; let order=["A","C","D","B"]; let draggedBranch=null;
function renderOrdering(){ const lane=$("#orderingLane"); lane.innerHTML=""; order.forEach((id,i)=>{ const c=document.createElement("article");c.className="branch-card";c.draggable=true;c.dataset.id=id;c.innerHTML=`<h3>Branch ${id}</h3><div class="values">${branchData[id][0]} · ${branchData[id][1]}</div><small>MIN branch</small><div class="move-buttons"><button aria-label="Move left" data-dir="-1">←</button><button aria-label="Move right" data-dir="1">→</button></div>`;c.addEventListener("dragstart",()=>{draggedBranch=id;c.classList.add("dragging")});c.addEventListener("dragend",()=>c.classList.remove("dragging"));c.addEventListener("dragover",e=>e.preventDefault());c.addEventListener("drop",e=>{e.preventDefault();const to=order.indexOf(id),from=order.indexOf(draggedBranch);order.splice(to,0,order.splice(from,1)[0]);renderOrdering()});$$("button",c).forEach(b=>b.addEventListener("click",()=>{const ni=i+Number(b.dataset.dir);if(ni<0||ni>=order.length)return;[order[i],order[ni]]=[order[ni],order[i]];renderOrdering()}));lane.append(c);});}
function simulateOrdering(){let alpha=-Infinity,visited=0,pruned=0;const details=[];for(const id of order){let beta=Infinity,min=Infinity;const values=branchData[id];for(let i=0;i<values.length;i++){visited++;min=Math.min(min,values[i]);beta=Math.min(beta,min);if(beta<=alpha&&i<values.length-1){pruned+=values.length-i-1;details.push(`${id}: cutoff after ${values[i]}`);break;}}alpha=Math.max(alpha,min);}return{visited,pruned,details};}
$("#runOrdering").addEventListener("click",()=>{const r=simulateOrdering();$("#orderedVisited").textContent=r.visited;$("#orderedPruned").textContent=r.pruned;$("#orderedPercent").textContent=`${Math.round(r.pruned/8*100)}%`;if(r.pruned>=3){feedback("#feedback4",`Excellent ordering! ${r.details.join("; ")}. You pruned ${r.pruned} leaves.`,"good");setTimeout(()=>showQuestion(5),1200);}else feedback("#feedback4",`This order pruned ${r.pruned} leaf/leaves. Try placing the branch with the strongest MIN value first.`,"bad");});
$("#resetOrdering").addEventListener("click",()=>{order=["A","C","D","B"];renderOrdering();$("#orderedVisited").textContent=$("#orderedPruned").textContent=$("#orderedPercent").textContent="—";feedback("#feedback4","Put the branches in an order that produces at least three cutoffs.");});

// Question 5: two-level connection game
const levels=[{name:"Training Arena",rows:4,cols:4,connect:3,depth:6},{name:"Orbital Arena",rows:4,cols:5,connect:4,depth:7}];
const arena={level:0,board:[],busy:false,over:false,stats:{nodes:0,prunes:0}};
function startArenaLevel(level){arena.level=level;const cfg=levels[level];arena.board=Array.from({length:cfg.rows},()=>Array(cfg.cols).fill(0));arena.busy=false;arena.over=false;$("#arenaLevelLabel").textContent=cfg.name;$("#arenaDepth").textContent=cfg.depth;$("#arenaTurn").textContent="Your turn · MAX";$("#searchNodes").textContent="0";$("#searchPrunes").textContent="0";$("#searchScore").textContent="—";$("#arenaLevelOne").classList.toggle("active",level===0);$("#arenaLevelTwo").classList.toggle("active",level===1);feedback("#feedback5",`You move first. Connect ${cfg.connect}, or force a draw, to clear this level.`);renderBoard();}
function renderBoard(winCells=[]){const cfg=levels[arena.level],buttons=$("#columnButtons"),board=$("#connectBoard");buttons.innerHTML="";board.innerHTML="";buttons.style.gridTemplateColumns=`repeat(${cfg.cols},1fr)`;board.style.gridTemplateColumns=`repeat(${cfg.cols},1fr)`;for(let c=0;c<cfg.cols;c++){const b=document.createElement("button");b.textContent=`↓ ${c+1}`;b.disabled=arena.busy||arena.over||arena.board[0][c]!==0;b.addEventListener("click",()=>playerMove(c));buttons.append(b);}for(let r=0;r<cfg.rows;r++)for(let c=0;c<cfg.cols;c++){const cell=document.createElement("div");cell.className=`cell ${arena.board[r][c]===1?"player":arena.board[r][c]===-1?"ai":""}`;if(winCells.some(([wr,wc])=>wr===r&&wc===c))cell.classList.add("winner");board.append(cell);}}
function drop(board,col,who){for(let r=board.length-1;r>=0;r--)if(board[r][col]===0){board[r][col]=who;return r;}return-1;}
function validCols(board){return board[0].map((v,i)=>v===0?i:-1).filter(i=>i>=0);}
function winningLine(board,who,need){const rows=board.length,cols=board[0].length,dirs=[[0,1],[1,0],[1,1],[1,-1]];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(board[r][c]===who)for(const[dr,dc]of dirs){const cells=[];for(let k=0;k<need;k++){const rr=r+dr*k,cc=c+dc*k;if(rr<0||rr>=rows||cc<0||cc>=cols||board[rr][cc]!==who)break;cells.push([rr,cc]);}if(cells.length===need)return cells;}return null;}
function terminal(board,cfg){if(winningLine(board,1,cfg.connect))return 1;if(winningLine(board,-1,cfg.connect))return-1;if(!validCols(board).length)return 0;return null;}
function windows(board,len){const out=[],R=board.length,C=board[0].length,D=[[0,1],[1,0],[1,1],[1,-1]];for(let r=0;r<R;r++)for(let c=0;c<C;c++)for(const[dr,dc]of D){const w=[];for(let k=0;k<len;k++){const rr=r+dr*k,cc=c+dc*k;if(rr<0||rr>=R||cc<0||cc>=C){w.length=0;break;}w.push(board[rr][cc]);}if(w.length)out.push(w);}return out;}
function heuristic(board,cfg){let score=0;for(const w of windows(board,cfg.connect)){const p=w.filter(x=>x===1).length,a=w.filter(x=>x===-1).length;if(p&&!a)score+=Math.pow(6,p);if(a&&!p)score-=Math.pow(6,a);}const center=(cfg.cols-1)/2;for(let r=0;r<cfg.rows;r++)for(let c=0;c<cfg.cols;c++)score+=board[r][c]*(cfg.cols-Math.abs(c-center));return score;}
function orderedCols(board){const center=(board[0].length-1)/2;return validCols(board).sort((a,b)=>Math.abs(a-center)-Math.abs(b-center));}
function alphaBeta(board,depth,alpha,beta,maximizing,cfg){arena.stats.nodes++;const t=terminal(board,cfg);if(t!==null)return t===1?100000+depth:t===-1?-100000-depth:0;if(depth===0)return heuristic(board,cfg);if(maximizing){let value=-Infinity;for(const c of orderedCols(board)){const b=board.map(r=>r.slice());drop(b,c,1);value=Math.max(value,alphaBeta(b,depth-1,alpha,beta,false,cfg));alpha=Math.max(alpha,value);if(alpha>=beta){arena.stats.prunes++;break;}}return value;}let value=Infinity;for(const c of orderedCols(board)){const b=board.map(r=>r.slice());drop(b,c,-1);value=Math.min(value,alphaBeta(b,depth-1,alpha,beta,true,cfg));beta=Math.min(beta,value);if(alpha>=beta){arena.stats.prunes++;break;}}return value;}
function playerMove(col){if(arena.busy||arena.over)return;drop(arena.board,col,1);renderBoard();if(resolveArena(1))return;arena.busy=true;$("#arenaTurn").textContent="Computer thinking · MIN";renderBoard();setTimeout(aiMove,260);}
function aiMove(){const cfg=levels[arena.level];arena.stats={nodes:0,prunes:0};let best=Infinity,bestCol=null;for(const c of orderedCols(arena.board)){const b=arena.board.map(r=>r.slice());drop(b,c,-1);const value=alphaBeta(b,cfg.depth-1,-Infinity,Infinity,true,cfg);if(value<best){best=value;bestCol=c;}}if(bestCol!==null)drop(arena.board,bestCol,-1);$("#searchNodes").textContent=arena.stats.nodes.toLocaleString();$("#searchPrunes").textContent=arena.stats.prunes.toLocaleString();$("#searchScore").textContent=Math.round(best);arena.busy=false;renderBoard();if(!resolveArena(-1))$("#arenaTurn").textContent="Your turn · MAX";}
function resolveArena(last){const cfg=levels[arena.level],line=winningLine(arena.board,last,cfg.connect);if(line){arena.over=true;renderBoard(line);if(last===1){feedback("#feedback5","You built the connection! Level cleared.","good");return completeArenaLevel();}feedback("#feedback5","The alpha-beta opponent connected first. Study its threats and restart this level.","bad");$("#arenaTurn").textContent="Computer wins";return true;}if(!validCols(arena.board).length){arena.over=true;feedback("#feedback5","Draw secured — you successfully denied the opponent. Level cleared!","good");return completeArenaLevel();}return false;}
function completeArenaLevel(){if(arena.level===0){$("#arenaTurn").textContent="Training complete";setTimeout(()=>startArenaLevel(1),1200);}else{$("#arenaTurn").textContent="Challenge complete";setTimeout(showCertificate,900);}return true;}
$("#restartArena").addEventListener("click",()=>startArenaLevel(arena.level));
function showCertificate(){$("#game").hidden=true;$("#success").hidden=false;$("#certificateName").textContent=playerName;$("#certificateDate").textContent=new Intl.DateTimeFormat(undefined,{dateStyle:"long",timeStyle:"short"}).format(new Date());window.scrollTo({top:0,behavior:"smooth"});}
$("#printButton").addEventListener("click",()=>window.print());
$("#playAgain").addEventListener("click",()=>{traceIndex=0;traceLog=[];order=["A","C","D","B"];arena.board=[];$("#success").hidden=true;$("#welcome").hidden=false;$("#game").hidden=true;$("#studentName").value="";resetQ1();window.scrollTo({top:0,behavior:"smooth"});});
