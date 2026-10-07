const mediaURL = src => globalThis.__CELERY_MEDIA__?.[src] || new URL(src, document.baseURI).href;

// A short live-action cold open cuts into the real-time room camera.
export class Entrance {
  constructor(room, unlockSound = () => {}) {
    this.room=room;this.unlockSound=unlockSound;this.phase='ready';this.token=0;
    this.element=document.getElementById('entrance');
    this.video=document.getElementById('entrance-film');
    this.playButton=document.getElementById('entrance-play');
    this.skipButton=document.getElementById('entrance-skip');
    this.replayButton=document.getElementById('entrance-replay');
    this.video.poster=mediaURL('media/paul-entrance.webp');
    this.video.src=mediaURL('media/paul-entrance.mp4');
    this.video.muted=true;this.video.playsInline=true;this.video.preload='auto';
    this.playButton.onclick=()=>this.play();
    this.skipButton.onclick=()=>this.finish(true);
    this.replayButton.onclick=()=>this.replay();
    this.video.onended=()=>this.finish(false);
    this.video.onerror=()=>{this.playButton.textContent='Enter the computer';this.playButton.onclick=()=>this.finish(true);};
    this.keyHandler=e=>{
      if(this.phase==='done')return;
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.finish(true);}
    };
    window.addEventListener('keydown',this.keyHandler,true);
    this.visibilityHandler=()=>{
      if(document.hidden){if(this.phase==='playing')this.video.pause();}
      else if(this.phase==='playing'){const token=this.token;this.video.play().catch(()=>{if(token===this.token)this.showPlay();});}
    };
    document.addEventListener('visibilitychange',this.visibilityHandler);
    document.body.classList.add('entrance-active');
    this.element.hidden=false;
    // Motion-sensitive visitors go straight to the stationary room.
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)this.dismiss();
  }
  showPlay(){if(this.phase!=='playing')return;this.phase='ready';this.element.classList.remove('is-playing');this.playButton.hidden=false;}
  play(){
    if(this.phase==='playing'||this.phase==='done')return;
    this.unlockSound();this.phase='playing';this.playButton.hidden=true;this.element.classList.add('is-playing');
    const token=++this.token;
    this.video.play().catch(()=>{if(token===this.token)this.showPlay();});
  }
  finish(skipped=false){
    if(this.phase==='done')return;
    if(skipped)this.unlockSound();
    this.phase='done';this.video.pause();
    this.element.classList.add('is-leaving');
    this.room.enterComputer({quick:skipped});
    const token=++this.token;
    this.fadeTimer=setTimeout(()=>{
      if(token!==this.token)return;
      this.element.hidden=true;document.body.classList.remove('entrance-active');
    },skipped?80:420);
  }
  dismiss(){this.phase='done';this.video.pause();this.element.hidden=true;document.body.classList.remove('entrance-active');}
  replay(){
    if(this.room.transition)return;
    this.token++;clearTimeout(this.fadeTimer);
    this.room.resetForEntrance();
    this.phase='ready';this.video.currentTime=0;this.element.hidden=false;
    this.element.classList.remove('is-playing','is-leaving');this.playButton.hidden=false;
    this.playButton.textContent='Enter the blue room';
    document.body.classList.add('entrance-active');this.play();
  }
  destroy(){this.token++;clearTimeout(this.fadeTimer);this.video.pause();this.video.removeAttribute('src');this.video.load();window.removeEventListener('keydown',this.keyHandler,true);document.removeEventListener('visibilitychange',this.visibilityHandler);}
}
