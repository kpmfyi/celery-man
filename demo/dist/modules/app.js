import { DanceStage } from './stage.js';
import { RoomView } from './room-view.js';
import { CincoAudio } from './audio.js';
import { ComputerEffects } from './computer-fx.js';
import { Entrance } from './entrance.js';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const names = {celery:'CELERY MAN', oyster:'OYSTER', tayne:'TAYNE'};
const state = {started:false, playing:false, muted:false, sequence:'celery', motion:'dance', dimensions:false, smiling:false, intensity:.6, touring:false, tourTimers:[], loadToken:0, pending:null};
const audio = new CincoAudio();
$('#computer-screen').append($('#modal'),$('#call'));
let room, stage, entrance, toastTimer, captionTimer, loadTimer, motionTimer, callTimer, voice, startup;
let intent = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reducedMotion) document.body.classList.add('reduced-motion');
const effects = new ComputerEffects($('#computer-screen'), $('#response'), reducedMotion);
audio.setSeated?.(false);
const history = [];
let historyCursor = 0;
let lastReadout = -1;
try {
  $('#portrait-scene').width=660; $('#portrait-scene').height=375;
  stage = new DanceStage($('#scene'), $('#portrait-scene'), (time) => {
    updateWindows(time);
    const tick = Math.floor(time * 10);
    if (tick === lastReadout) return;
    lastReadout = tick;
    const minutes = Math.floor(time/60), seconds = Math.floor(time%60), frames = Math.floor((time%1)*30);
    $('#timecode').textContent = [minutes,seconds,frames].map(x=>String(x).padStart(2,'0')).join(':');
    $('#timeline-fill').style.width = `${time%8/8*100}%`;
  });
} catch(error) {
  console.warn('The video display could not initialize.',error);
  $('#fallback').hidden = false;
  $('#render-mode').textContent = 'DISPLAY OFFLINE';
}
try {
  room = new RoomView($('#room-canvas'),$('#computer-screen'),{
    onApproach:async()=>{if(!await audio.start()){state.muted=true;audio.setMuted(true);}},
    onSit:()=>{
      audio.setSeated?.(true);audio.fx('boot');effects.cue('boot',750);
      $('#stand-button').hidden=false;stage?.setActive(true);stage?.setPlaying(state.playing);audio.setPlaying(state.playing);
      if(state.motion==='flarhgunnstow')$('#tiny-tayne').hidden=false;
      if(!state.started)say('Good morning, Paul. The identity generator is ready.');
      syncSound();
    },
    onStand:()=>{
      ++intent; ++state.loadToken;clearTimeout(loadTimer);clearTimeout(motionTimer);$('#stage').classList.remove('loading');
      stopCall();effects.clear();clearDesktopPerformance();audio.setSeated?.(false);
      $('#stand-button').hidden=true;stopTour();stage?.setActive(false);audio.setPlaying(false);audio.stopSpeech();voice?.abort();
      $('#modal').close();document.activeElement?.blur();
    }
  });
} catch(error) {
  console.warn('The room could not initialize.',error);$('#webgl-fallback').hidden=false;
}
$('#room-loading').hidden=true;
if(room)entrance=new Entrance(room,()=>audio.start());
$('#sit-button').onclick=()=>room?.sit();
$('#stand-button').onclick=()=>room?.stand();
function toast(text) { clearTimeout(toastTimer); $('#toast').textContent=text; $('#toast').classList.add('visible'); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3200); }
function say(text, spoken=true) { effects.respond(text); restoreWindow('terminal-window',false); if(spoken && room?.seated) audio.speak(text); }
function cue(kind,duration){effects.cue(kind,duration);audio.fx(kind);stage?.cue?.(kind);}
function caption(text, duration=0) { clearTimeout(captionTimer); $('#stage-caption').textContent=text; if(duration) captionTimer=setTimeout(()=>$('#stage-caption').textContent='IDENTITY VERIFIED / DANCE IN PROGRESS',duration); }
function syncSound() {
  const enabled=!!audio.context && !state.muted;
  $('#sound').classList.toggle('enabled',enabled);
  $('#sound').setAttribute('aria-label',enabled?'Mute sound':'Enable sound');
  $('#sound').setAttribute('aria-pressed',String(enabled));
  $('#sound').innerHTML=enabled?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6m0-6-5 6"/></svg>';
}
async function start() {
  if(startup) return startup;
  if(state.started) return;
  state.started=true;
  $('#boot').hidden=true;
  $('#computer-status').textContent='PROCESSING';
  const startIntent=intent;
  startup=(async()=>{
  const hasAudio = await audio.start();
  if(!hasAudio) { state.muted=true;audio.setMuted(true);toast('Audio is unavailable. The dancing will continue.'); }
  if(startIntent===intent)setPlaying(true); syncSound();
  audio.setSequence(state.sequence); audio.setIntensity(state.intensity);
  caption('');
  $('#computer-status').textContent='LISTENING';
  })();
  try { await startup; } finally { startup=null; }
}
function setPlaying(value) {
  state.playing=value; stage?.setPlaying(value); audio.setPlaying(value&&!!room?.seated);
  document.body.classList.toggle('paused',!value);
  $('#play').innerHTML=`<span class="program-symbol" aria-hidden="true">${value?'Ⅱ':'▶'}</span><span>${value?'Pause':'Play'}</span>`;
  $('#play').setAttribute('aria-label',value?'Pause sequence':'Play sequence');
  caption(value?'':'SEQUENCE PAUSED');
}
function stopTour(announce=false) {
  state.tourTimers.forEach(clearTimeout); state.tourTimers=[]; state.touring=false;
  $('#tour').classList.remove('active');
  $('#tour').innerHTML='<span class="program-symbol" aria-hidden="true">▶</span><span>Run sketch</span>';
  if(announce) say('Manual control restored. Your work is very important.',false);
}
function manual(){ intent++; if(state.touring) stopTour(); }
async function loadSequence(name, announce=true) {
  if(!names[name]) return;
  const token=++state.loadToken,loadIntent=intent;
  await start();
  if(token!==state.loadToken||loadIntent!==intent||!room?.seated)return;
  state.sequence=name; state.motion='dance';state.smiling=false;stage?.setSmile?.(false);clearDesktopPerformance();restoreWindow('portrait-window'); restoreWindow('dance-window');
  $('#portrait-name').textContent={celery:'Celery Man',oyster:'Oyster',tayne:'Tayne'}[name];
  $('#portrait-scene').setAttribute('aria-label',`A portrait of ${names[name]}`);
  clearTimeout(motionTimer);
  audio.setSequence(name); cue('load',650);
  $('#stage').classList.add('loading');
  clearTimeout(loadTimer);
  loadTimer=setTimeout(()=>{ stage?.setSequence(name);stage?.cue?.('load');$('#stage').classList.remove('loading');if(name==='tayne')announceTayne(); },reducedMotion?0:350);
  $$('.sequence').forEach(b=>{const active=b.dataset.sequence===name;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
  $$('.motion-button').forEach(b=>b.classList.remove('active'));
  $('#stage-sequence').textContent=names[name]; $('#stage-action').textContent=name==='tayne'?'BETA SEQUENCE / UNRELEASED':'DEFAULT SEQUENCE';
  if(!state.playing)setPlaying(true);
  if(announce)say({celery:'Celery Man loaded. Beginning your first sequence.',oyster:'Oyster loaded. Portrait and movement are ready.',tayne:'New sequence available: Tayne. This is a beta preview.'}[name]);
}
async function dimensions(value=!state.dimensions, announce=true) {
  const dimensionIntent=intent;
  await start();if(dimensionIntent!==intent||!room?.seated)return;state.dimensions=value; stage?.setDimensions(value);
  $('#dimensions').setAttribute('aria-pressed',String(value)); $('#dimension-value').textContent=value?'ON':'OFF';
  $('.display-panel').classList.toggle('four-d',value); $('#four-d-label').hidden=!value;
  $('#render-mode').textContent=value?'4D3D3D3 / ENHANCED':'CINCO / VIDEO SEQUENCE';
  $('#four-d-windows').hidden=!value;
  if(value)$$('.extra-window').forEach(w=>w.hidden=false);
  cue(value?'dimensions':'confirm',800);
  if(announce)say(value?'4D3D3D3 enabled. Additional sequences are running.':'Standard dimensions restored.');
}
async function motion(name,{confirm=true,announce=true}={}) {
  const motionIntent=intent;
  await start();
  if(motionIntent!==intent||!room?.seated)return;
  if(name==='nude'&&confirm){
    state.pending='nude';cue('preview');
    openModal('<span class="eyebrow">TAYNE / BETA SEQUENCE</span><h2>Are you sure, Paul?</h2><p>Preview the experimental version of Tayne?</p><p class="preview-note">The preview uses a censor bar.</p><div class="modal-actions"><button id="confirm-nude">Yes — nude Tayne.</button><button class="secondary" id="cancel-nude">Cancel</button></div>');
    $('#confirm-nude').onclick=()=>{manual();state.pending=null;$('#modal').close();audio.fx('confirm');motion('nude',{confirm:false});};
    $('#cancel-nude').onclick=()=>{manual();audio.fx('dismiss');$('#modal').close();say('Keeping the current sequence.');};
    say('Tayne is an experimental sequence. Confirm the preview.');return;
  }
  if(state.sequence!=='tayne') await loadSequence('tayne',false);
  if(motionIntent!==intent)return;
  clearDesktopPerformance();restoreWindow('dance-window');restoreWindow('portrait-window');
  state.motion=name; clearTimeout(motionTimer);
  const token=state.loadToken;
  const apply=()=>{if(token!==state.loadToken)return;stage?.setMotion(name);stage?.cue?.(name);};
  if(name==='nude'){showWarning();motionTimer=setTimeout(apply,reducedMotion?0:1650);}
  else {apply();motionTimer=setTimeout(apply,380);}
  setPlaying(true); cue(name,850);
  if(name==='hat')cascadeWindows();
  if(name==='flarhgunnstow'){$('#tiny-tayne').hidden=false;$('#dance-window').hidden=true;$('#portrait-window').hidden=true;}
  $$('.motion-button').forEach(b=>b.classList.toggle('active',b.dataset.motion===name));
  $('#stage-action').textContent={hat:'MOTION_02 / HAT WOBBLE',flarhgunnstow:'MOTION_03 / FLARHGUNNSTOW',nude:'EXPERIMENTAL / MODESTY FILTER ON'}[name];
  if(announce)say({hat:'Tayne: hat wobble.',flarhgunnstow:'Flarhgunnstow sequence selected.',nude:'Generating the experimental Tayne preview.'}[name]);
  caption('');
}
function openModal(html){ $('#modal-content').innerHTML=html; $('#modal').setAttribute('aria-modal','true'); if(!$('#modal').open)$('#modal').show(); $('#computer-screen').classList.add('dialog-open'); $('#mobile-command-form').inert=true; $('#modal').querySelector('button')?.focus({preventScroll:true}); }
$('#modal').addEventListener('close',()=>{if(state.pending&&state.touring)manual();state.pending=null;$('#computer-screen').classList.remove('dialog-open');$('#mobile-command-form').inert=false;});
$('.modal-close').onclick=()=>$('#modal').close();
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#modal').close();}});
async function smileOyster({announce=true}={}) {
  const smileIntent=intent;
  await loadSequence('oyster',false);
  if(smileIntent!==intent)return;
  clearTimeout(loadTimer);$('#stage').classList.remove('loading');stage?.setSequence('oyster');
  state.smiling=true;stage?.setSmile?.(true);cue('affirmative');
  $('#stage-action').textContent='OYSTER / SMILING';
  if(announce)say('Oyster is smiling. The portrait is ready to print.');
}
async function printOyster({announce=true}={}) {
  const printIntent=intent;
  await start();
  if(printIntent!==intent||!room?.seated)return;
  cue('print',1450);
  if(!stage){toast('The display adapter is needed to print Oyster.');return;}
  if(!await stage.readyForPrint()){if(printIntent===intent)toast('Oyster’s portrait could not load. Try reloading the computer.');return;}
  if(printIntent!==intent||!room?.seated)return;
  state.pending=null;
  const image=stage.printOyster();
  openModal('<span class="eyebrow">CINCO PRINT MANAGER / JOB 0001</span><h2>Your printout is ready.</h2><div class="receipt feeding"><img id="oyster-print" alt="Oyster’s fuzzy video portrait wearing his red cap"/><h3>OYSTER SMILING</h3><p>GENERATED FOR PAUL</p></div><div class="modal-actions"><a id="download-print" class="download-print" download="oyster-smiling.png">Save printout ↓</a></div>');
  $('#oyster-print').src=image; $('#download-print').href=image;
  if(announce)say('Printing Oyster’s portrait.');
}
function stopCall(){clearTimeout(callTimer);audio.stopRinging?.();$('#call').hidden=true;$('#computer-screen').classList.remove('phone-ringing');}
function showCall(){
  if(!room?.seated)return;
  stopCall();$('#call').hidden=false;$('#computer-screen').classList.add('phone-ringing');
  const ring=()=>{if($('#call').hidden||!room?.seated||document.hidden)return;audio.fx('ring');callTimer=setTimeout(ring,3600);};
  ring();say('An incoming call from your wife. She says it is urgent.');
}
function dismissCall(){stopCall();audio.fx('dismiss');say('Call dismissed. Resuming the sequence.');}
$('#dismiss-call').onclick=()=>{manual();dismissCall();};
async function tour(){
  if(state.touring){stopTour(true);return;}
  const tourIntent=++intent;
  await start(); $('#modal').close(); stopCall();
  if(tourIntent!==intent)return;
  stopTour();state.touring=true;
  $('#tour').classList.add('active');$('#tour').innerHTML='<span class="program-symbol" aria-hidden="true">■</span><span>Stop sketch</span>';
  const schedule=(delay,fn)=>state.tourTimers.push(setTimeout(()=>{if(state.touring)fn();},delay));
  const request=(text,fn)=>{effects.input(text);fn();};
  resetWindows();request('load Celery Man',()=>loadSequence('celery'));dimensions(false,false);
  schedule(8000,()=>request('4D3D3D3',()=>dimensions(true)));
  schedule(22000,()=>request('load Oyster',()=>loadSequence('oyster')));
  schedule(26000,()=>request('Oyster: smile',()=>smileOyster()));
  schedule(28000,()=>request('print portrait',()=>printOyster()));
  schedule(32000,()=>{$('#modal').close();say('A new beta identity is available. Loading Tayne.');cue('seek');});
  schedule(38000,()=>request('preview Tayne',()=>loadSequence('tayne')));
  schedule(48000,()=>request('hat wobble',()=>motion('hat')));
  schedule(56000,()=>request('Flarhgunnstow',()=>motion('flarhgunnstow')));
  schedule(63000,()=>request('nude Tayne',()=>motion('nude')));
  schedule(66000,()=>{state.pending=null;$('#modal').close();request('confirm preview',()=>motion('nude',{confirm:false}));});
  schedule(74000,()=>showCall());
  schedule(79000,()=>request('dismiss call',()=>dismissCall()));
  schedule(84000,()=>request('more Celery Man',()=>finale()));
  schedule(89500,()=>{stopTour();say('The computer is ready for your next request.');});
}
async function command(text) {
  const cmd=text.toLowerCase().trim().replace(/[.,!?]/g,'');
  if(!cmd||!room?.seated||document.hidden)return;
  manual();effects.input(text.trim());audio.fx('confirm');
  const commandIntent=intent;
  if(history.at(-1)!==text.trim()){history.push(text.trim());if(history.length>30)history.shift();}historyCursor=history.length;
  if(state.pending==='nude'&&/^(yes|ok|okay|confirm|do it|proceed)\b/.test(cmd)){$('#modal').close();return motion('nude',{confirm:false});}
  if(state.pending&&/^(no|cancel|never mind)\b/.test(cmd)){$('#modal').close();return say('Keeping the current sequence.');}
  if(/(dismiss|ignore|decline|hang up|working|important work)/.test(cmd)&&!$('#call').hidden)return dismissCall();
  if(/(nude|naked|undress)/.test(cmd))return motion('nude');
  if(/(4d|dimensions|kick.*up)/.test(cmd))return dimensions(!/(off|disable|normal)/.test(cmd));
  if(/(print|picture|portrait)/.test(cmd))return printOyster();
  if(/smil/.test(cmd))return smileOyster();
  if(/\b(wobble|hat)\b/.test(cmd))return motion('hat');
  if(/(flar|flur|spin)/.test(cmd))return motion('flarhgunnstow');
  if(/(more celery|all.*celery|overload|everything)/.test(cmd))return finale();
  if(/\b(tayne|tane|new|beta)\b/.test(cmd)||/what else/.test(cmd))return loadSequence('tayne');
  if(/oyster/.test(cmd))return loadSequence('oyster');
  if(/celery/.test(cmd))return loadSequence('celery');
  if(/(run.*sketch|demo|tour)/.test(cmd))return tour();
  if(/(wife|call)/.test(cmd)){await start();showCall();return;}
  if(/(unmute|sound on)/.test(cmd)){await start();if(commandIntent!==intent)return;if(!await audio.start())return toast('Audio is unavailable in this browser.');if(commandIntent!==intent)return;state.muted=false;audio.setMuted(false);syncSound();return say('Audio restored.');}
  if(/(mute|quiet|sound off)/.test(cmd)){state.muted=true;audio.setMuted(true);syncSound();return say('Audio muted.',false);}
  if(/(pause|stop)/.test(cmd)){setPlaying(false);return say('Holding this extremely important pose.');}
  if(/(resume|play|dance|continue)/.test(cmd)){await start();if(commandIntent!==intent)return;setPlaying(true);return say('Continuing the sequence.');}
  if(/(reset|reboot)/.test(cmd)){stopCall();clearDesktopPerformance();dimensions(false,false);await loadSequence('celery');resetWindows();cue('boot');return;}
  if(/(help|command)/.test(cmd))return help();
  if(/(thank|good job)/.test(cmd)){audio.fx('affirmative');return say('You’re welcome, Paul.');}
  if(/^(computer|hello|good morning)$/.test(cmd))return say('Good morning, Paul. Select a sequence.');
  await start();if(commandIntent!==intent)return;cue('error');say('I did not recognize that request. Try a sequence, a smile, or a hat wobble.');
}
function help(){openModal('<span class="eyebrow">OPERATOR’S MANUAL / PAGE 1 OF 1</span><h2>Talk to the computer.</h2><p>Type a request in the terminal. Drag title bars, or select a sequence to reopen its windows. Escape stands you up.</p><ul class="shortcut-list"><li>Celery Man / Oyster / Tayne <kbd>1 / 2 / 3</kbd></li><li>4D3D3D3 / Hat wobble / Flarhgunnstow <kbd>D / H / F</kbd></li><li>Oyster smile / Print portrait <kbd>S / P</kbd></li><li>Pause / Mute <kbd>SPACE / M</kbd></li><li>Focus command / Recall requests <kbd>/ · ↑ / ↓</kbd></li></ul><p>Try “new sequence”, “nude Tayne”, “wife”, “more Celery Man”, or “run the sketch” for the complete sequence.</p>');}
$('#help').onclick=help;
$('#about').onclick=()=>openModal('<span class="eyebrow">UNOFFICIAL / UNPRODUCTIVE / MADE WITH AFFECTION</span><h2>Thanks, CINCO.</h2><p>A little love letter to <em>Celery Man</em> from <em>Tim and Eric Awesome Show, Great Job!</em>, featuring Paul Rudd.</p><p>Short live-action loops and an entrance excerpt from the sketch, inside an original 3D room. Fuzzy edges, low-resolution video, and entirely unnecessary dimensions.</p><p>The music and computer noises are synthesized; the voice comes from your browser. No accounts or saved data.</p><p><a href="https://www.youtube.com/watch?v=a8K6QUPmv8Q" target="_blank" rel="noopener noreferrer">Watch the original on Adult Swim ↗</a></p><p class="credits">Footage: Adult Swim / Tim &amp; Eric. Clip sources are documented in the download. Independent fan homage; no affiliation.</p>');
$('#start').onclick=()=>{manual();effects.input('load Celery Man');loadSequence('celery');};
$$('.sequence').forEach(button=>button.onclick=()=>{manual();loadSequence(button.dataset.sequence);});
$$('.motion-button').forEach(button=>button.onclick=()=>{manual();motion(button.dataset.motion);});
$('#dimensions').onclick=()=>{manual();dimensions();};
$('#print').onclick=()=>{manual();printOyster();};
$('#tour').onclick=tour;
$('#play').onclick=async()=>{manual();const playIntent=intent,wasStarted=state.started;await start();if(playIntent!==intent)return;if(wasStarted)setPlaying(!state.playing);};
$('#reset-view').onclick=()=>{resetWindows();audio.fx('click');toast('Desktop windows restored.');};
$('#sound').onclick=async()=>{if(!audio.context||state.muted){if(!await audio.start())return toast('Audio is unavailable in this browser.');state.muted=false;}else state.muted=true;audio.setMuted(state.muted);syncSound();};
$('#intensity').oninput=e=>{state.intensity=Number(e.target.value)/100;audio.setIntensity(state.intensity);stage?.setIntensity(state.intensity);$('#intensity-value').textContent=`${e.target.value}%`;e.target.style.background=`linear-gradient(to right,var(--acid) ${(Number(e.target.value)-15)/85*100}%,#4d584b ${(Number(e.target.value)-15)/85*100}%)`;};
$('#command-form').onsubmit=e=>{e.preventDefault();const input=$('#command');const value=input.value;input.value='';command(value);};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Full screen is not available in this browser.');}catch{toast('Full screen is not available in this browser.');}};
window.addEventListener('keydown',e=>{
  if(entrance&&entrance.phase!=='done')return;
  if($('#modal').open){
    if(e.key==='Escape'){e.preventDefault();$('#modal').close();return;}
    if(e.key==='Tab'){const all=[...$('#modal').querySelectorAll('button,a[href],input')];const first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;}
  }
  if(e.key==='Escape'&&!$('#modal').open&&room?.seated){e.preventDefault();room.stand();return;}
  if(!room?.seated){if(e.key==='Enter'&&document.activeElement?.tagName!=='BUTTON'){e.preventDefault();room?.sit();}return;}
  if(e.ctrlKey||e.metaKey||e.altKey||$('#modal').open||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName))return;
  const keys={'1':()=>loadSequence('celery'),'2':()=>loadSequence('oyster'),'3':()=>loadSequence('tayne'),h:()=>motion('hat'),f:()=>motion('flarhgunnstow'),d:()=>dimensions(),s:()=>smileOyster(),p:()=>printOyster(),m:()=>$('#sound').click(),' ':()=>$('#play').click(),'/':()=>{restoreWindow('terminal-window');$('#command').focus();},'?':help};
  const action=keys[e.key.toLowerCase()];if(action){e.preventDefault();manual();action();}
});
let wasPlaying=false;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){++intent;voice?.abort();wasPlaying=state.playing;stage?.setPlaying(false);audio.setPlaying(false);audio.stopSpeech();audio.stopEffects?.();stopCall();effects.clear();if(state.touring)stopTour();}
  else if(wasPlaying&&state.playing&&room?.seated){stage?.setPlaying(true);audio.setPlaying(true);}
});
setInterval(()=>{$('#clock').textContent=new Date().toLocaleTimeString('en-GB',{hour12:false,hour:'2-digit',minute:'2-digit'});},1000);
window.addEventListener('pagehide',()=>{++intent;voice?.abort();audio.setPlaying(false);audio.stopEffects?.();stopCall();effects.clear();clearDesktopPerformance();state.tourTimers.forEach(clearTimeout);});
window.addEventListener('pageshow',()=>{if(state.started&&room?.seated){if(state.playing)audio.setPlaying(true);if(state.motion==='flarhgunnstow')$('#tiny-tayne').hidden=false;}});
// Keep the extra windows within the monitor, just like the sketch’s piling-up desktop.
$('#four-d-windows').innerHTML='<section class="desktop-window extra-window" style="left:360px;top:118px;width:200px;height:290px"><div class="window-title"><span class="window-name">CINCO ID 02</span><button data-extra-close aria-label="Close extra dancer">×</button></div><canvas width="190" height="240"></canvas></section><section class="desktop-window extra-window" style="left:745px;top:352px;width:220px;height:290px"><div class="window-title"><span class="window-name">CINCO ID 03</span><button data-extra-close aria-label="Close extra dancer">×</button></div><canvas width="210" height="240"></canvas></section>';
let lastWindowFrame=-1;
let performanceTimers=[];
$('#computer-screen').insertAdjacentHTML('beforeend','<div id="reference-windows" aria-label="Additional sequence windows"></div><canvas id="tiny-tayne" width="160" height="210" aria-label="Tiny Tayne dancing on the command window" hidden></canvas><div id="tayne-card" aria-hidden="true" hidden><span>TAYNE</span><small>NEW SEQUENCE</small></div><div id="preview-warning" role="status" hidden><strong>WARNING</strong><span>NSFW</span></div>');
function laterPerformance(delay,fn){performanceTimers.push(setTimeout(fn,reducedMotion?0:delay));}
function clearDesktopPerformance(){
  performanceTimers.forEach(clearTimeout);performanceTimers=[];
  $('#reference-windows')?.replaceChildren();
  for(const id of ['tiny-tayne','tayne-card','preview-warning']){const el=document.getElementById(id);if(el)el.hidden=true;}
  $('#computer-screen').classList.remove('desktop-overload');
}
function announceTayne(){
  if(state.motion!=='dance')return;
  $('#tayne-card').hidden=false;audio.fx('affirmative');
  laterPerformance(2400,()=>$('#tayne-card').hidden=true);
}
function showWarning(){
  $('#preview-warning').hidden=false;
  laterPerformance(1800,()=>$('#preview-warning').hidden=true);
}
function referenceWindow({x,y,width,height,portrait=false,index=0}){
  const w=document.createElement('section');w.className='desktop-window reference-window';
  Object.assign(w.style,{left:x+'px',top:y+'px',width:width+'px',height:height+'px',zIndex:40+index});
  w.setAttribute('aria-label',portrait?'Additional portrait':'Additional dancer');
  w.innerHTML='<div class="window-title"><span class="window-name">CINCO ID</span><button class="window-close" type="button" aria-label="Close extra sequence">Close</button></div><canvas></canvas>';
  const c=w.querySelector('canvas');c.width=portrait?320:200;c.height=portrait?200:300;c.dataset.source=portrait?'portrait':'body';
  w.querySelector('button').onclick=()=>{w.remove();audio.fx('click');};
  $('#reference-windows').append(w);bindWindow(w);return w;
}
function cascadeWindows(){
  for(let i=0;i<6;i++)laterPerformance(i*115,()=>referenceWindow({x:315+i*27,y:65+i*18,width:255,height:380,index:i}));
  laterPerformance(1200,()=>{
    $('#reference-windows').replaceChildren();
    for(let i=5;i>=0;i--){
      const w=referenceWindow({x:205+i*47,y:105+i*14,width:310-i*14,height:220-i*8,portrait:true,index:8-i});
      w.classList.add('wobble-copy');
    }
  });
}
async function finale(){
  const finaleIntent=intent;
  await loadSequence('celery',false);if(finaleIntent!==intent)return;
  $('#computer-screen').classList.add('desktop-overload');
  for(let i=0;i<13;i++)laterPerformance(450+i*150,()=>{
    const portrait=i%3===0;
    referenceWindow({x:28+(i*139)%660,y:45+(i*73)%330,width:portrait?330:235,height:portrait?230:350,portrait,index:i});
    if(i%4===0)audio.fx('seek');
  });
  cue('dimensions',1300);say('Celery Man. Additional windows are opening.');
}
function updateWindows(time){
  const now=performance.now();if(now-lastWindowFrame<90)return;lastWindowFrame=now;
  if(state.dimensions)$$('#four-d-windows canvas').forEach(c=>{const ctx=c.getContext('2d');ctx.drawImage($('#scene'),0,0,c.width,c.height);});
  $$('#reference-windows canvas').forEach(c=>c.getContext('2d').drawImage(c.dataset.source==='portrait'?$('#portrait-scene'):$('#scene'),0,0,c.width,c.height));
  const tiny=$('#tiny-tayne');
  if(tiny&&!tiny.hidden){const terminal=$('#terminal-window');tiny.style.left=(terminal.offsetLeft+terminal.offsetWidth*.5-80)+'px';tiny.style.top=(terminal.offsetTop-183)+'px';stage?.drawMini?.(tiny);}
}
let topWindow=30;
function focusWindow(el){if(!el)return;$$('.desktop-window').forEach(w=>w.classList.remove('is-active'));el.classList.add('is-active');el.style.zIndex=++topWindow;}
function restoreWindow(id,focus=true){const el=document.getElementById(id);if(!el)return;el.hidden=false;el.classList.remove('is-minimized');if(focus)focusWindow(el);}
function resetWindows(){
  [['portrait-window',55,72,465,350],['dance-window',570,42,390,545],['terminal-window',55,445,500,215]].forEach(([id,x,y,w,h])=>{const el=document.getElementById(id);el.style.left=x+'px';el.style.top=y+'px';el.style.width=w+'px';el.style.height=h+'px';el.dataset.maximized='';el.hidden=false;el.classList.remove('is-minimized');});
}
function bindWindow(el){
  el.addEventListener('pointerdown',()=>focusWindow(el));
  const title=el.querySelector('.window-title');let drag=null;
  title.addEventListener('pointerdown',e=>{if(e.target.closest('button')||!room?.seated)return;e.preventDefault();const p=room.desktopPoint(e.clientX,e.clientY);drag={x:p.x,y:p.y,left:el.offsetLeft,top:el.offsetTop};title.setPointerCapture(e.pointerId);});
  title.addEventListener('pointermove',e=>{if(!drag)return;const p=room.desktopPoint(e.clientX,e.clientY);el.style.left=Math.max(0,Math.min(1024-el.offsetWidth,drag.left+p.x-drag.x))+'px';el.style.top=Math.max(31,Math.min(645,drag.top+p.y-drag.y))+'px';if(!state.playing)updateWindows();});
  const end=()=>drag=null;title.addEventListener('pointerup',end);title.addEventListener('pointercancel',end);title.addEventListener('lostpointercapture',end);
}
$$('.desktop-window').forEach(bindWindow);
$$('[data-close-window]').forEach(b=>b.onclick=()=>{document.getElementById(b.dataset.closeWindow).hidden=true;audio.fx('click');if(b.dataset.closeWindow==='terminal-window')toast('Press / to reopen the terminal.');});
$$('[data-minimize-window]').forEach(b=>b.onclick=()=>{document.getElementById(b.dataset.minimizeWindow).classList.toggle('is-minimized');audio.fx('click');});
$$('[data-maximize-window]').forEach(b=>b.onclick=()=>{const w=document.getElementById(b.dataset.maximizeWindow);w.classList.remove('is-minimized');if(w.dataset.maximized){Object.assign(w.style,JSON.parse(w.dataset.restore));w.dataset.maximized='';}else{w.dataset.restore=JSON.stringify({left:w.style.left||w.offsetLeft+'px',top:w.style.top||w.offsetTop+'px',width:w.offsetWidth+'px',height:w.offsetHeight+'px'});Object.assign(w.style,{left:'12px',top:'40px',width:'1000px',height:'620px'});w.dataset.maximized='true';}focusWindow(w);});
$$('[data-extra-close]').forEach(b=>b.onclick=()=>{b.closest('.extra-window').hidden=true;});
$('#mobile-command-form').onsubmit=e=>{e.preventDefault();const input=$('#mobile-command');command(input.value);input.value='';input.blur();};
for(const input of [$('#command'),$('#mobile-command')]){
  input.addEventListener('keydown',e=>{
    if(e.key==='ArrowUp'||e.key==='ArrowDown'){
      e.preventDefault();historyCursor=Math.max(0,Math.min(history.length,historyCursor+(e.key==='ArrowUp'?-1:1)));
      input.value=history[historyCursor]||'';input.setSelectionRange(input.value.length,input.value.length);audio.fx('keyboard');
    }else if(e.key.length===1||e.key==='Backspace')audio.fx('keyboard');
  });
}
$('#computer-screen').addEventListener('pointerdown',e=>{if(e.target.closest('button'))audio.fx('click');});
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(Recognition){
  const mic=document.createElement('button');mic.type='button';mic.id='mic';mic.setAttribute('aria-label','Speak a command');mic.title='Speak a command (microphone permission required)';mic.textContent='MIC';$('#command-form').insertBefore(mic,$('#command-form button'));
  let listening=false;
  mic.onclick=async()=>{manual();const micIntent=intent;await start();if(micIntent!==intent||!room?.seated||document.hidden)return;if(listening){voice?.stop();return;}audio.stopSpeech();voice=new Recognition();voice.lang='en-US';voice.interimResults=false;voice.maxAlternatives=1;
    voice.onstart=()=>{listening=true;mic.textContent='STOP';mic.classList.add('listening');$('#computer-status').textContent='HEARING YOU';};
    voice.onresult=e=>{const text=e.results[0][0].transcript;$('#command').value=text;command(text);};
    voice.onerror=e=>{toast(e.error==='not-allowed'?'Microphone unavailable. You can type the same commands.':'I did not catch that. Try again or type a command.');};
    voice.onend=()=>{listening=false;mic.textContent='MIC';mic.classList.remove('listening');$('#computer-status').textContent='LISTENING';};
    try{voice.start();}catch{toast('The microphone is busy. Try typing your command.');}
  };
}
syncSound();
