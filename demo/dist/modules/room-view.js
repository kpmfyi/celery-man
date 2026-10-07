import * as THREE from '../vendor/three.module.min.js';
import { createBlueRoom } from './room-model.js';

export class RoomView {
  constructor(canvas, screenElement, {onSit=()=>{}, onStand=()=>{}, onApproach=()=>{}}={}) {
    this.canvas=canvas; this.screenElement=screenElement;this.onSit=onSit;this.onStand=onStand;this.onApproach=onApproach;
    this.seated=false;this.transition=null;this.hovered=false;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#066cbd');this.scene.fog=new THREE.FogExp2('#0783d3',.018);
    this.camera=new THREE.PerspectiveCamera(44,1,.08,120);
    this.scene.add(new THREE.HemisphereLight('#bdeaff','#114493',2.3));
    const key=new THREE.DirectionalLight('#eefbff',4.1);key.position.set(-4,9,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
    Object.assign(key.shadow.camera,{left:-7,right:7,top:8,bottom:-7,near:.1,far:30});key.shadow.bias=-.001;this.scene.add(key);
    const rim=new THREE.DirectionalLight('#a2e9ff',3.2);rim.position.set(5,7,-7);this.scene.add(rim);
    const fill=new THREE.PointLight('#5cccff',60,30,2);fill.position.set(-5,4,0);this.scene.add(fill);
    const monitorGlow=new THREE.PointLight('#65e3e1',3,4,2);monitorGlow.position.set(0,2.2,1.3);this.scene.add(monitorGlow);
    this.addEnvironment();
    this.model=createBlueRoom(THREE);this.scene.add(this.model.group);
    this.overview=new THREE.Vector3(6.8,4.8,10.5);this.overviewTarget=new THREE.Vector3(0,1.05,.7);
    this.position=this.overview.clone();this.target=this.overviewTarget.clone();this.pointer=new THREE.Vector2();this.raycaster=new THREE.Raycaster();
    this.camera.position.copy(this.position);this.camera.lookAt(this.target);
    this.onResize=()=>this.resize();window.addEventListener('resize',this.onResize);this.resize();
    this.bindInteraction();
    this.last=performance.now();this.time=0;
    this.tick=this.tick.bind(this);this.frame=requestAnimationFrame(this.tick);
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.screenElement.style.visibility='hidden';document.querySelector('#webgl-fallback').hidden=false;});
    canvas.addEventListener('webglcontextrestored',()=>location.reload());
  }
  addEnvironment() {
    const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');
    const g=ctx.createLinearGradient(0,0,0,256);g.addColorStop(0,'#8dcced');g.addColorStop(.42,'#245682');g.addColorStop(.52,'#588db0');g.addColorStop(.58,'#182945');g.addColorStop(1,'#071421');ctx.fillStyle=g;ctx.fillRect(0,0,512,256);
    ctx.fillStyle='#ddf1ff';ctx.fillRect(40,45,10,110);ctx.fillRect(350,30,27,90);ctx.fillStyle='#77bddd';ctx.fillRect(170,10,100,8);ctx.fillRect(100,180,240,4);
    const texture=new THREE.CanvasTexture(c);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;
    const pmrem=new THREE.PMREMGenerator(this.renderer);this.envTarget=pmrem.fromEquirectangular(texture);this.scene.environment=this.envTarget.texture;this.scene.environmentIntensity=.85;pmrem.dispose();texture.dispose();
  }
  resize() {
    this.width=innerWidth;this.height=innerHeight;this.renderer.setSize(this.width,this.height,false);this.camera.aspect=this.width/this.height;this.camera.fov=this.camera.aspect<.8?65:44;this.camera.updateProjectionMatrix();
    const tan=Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2));
    const distance=Math.max(2.78/(2*tan),3.4/(2*tan*this.camera.aspect));
    this.seatPosition=new THREE.Vector3(0,2.55,.62+distance);
    this.seatTarget=new THREE.Vector3(0,2.20,.62);
    if(this.camera.aspect<.8){this.overview.set(5.8,5.2,11.2);this.seatPosition.y=2.6;}
    else this.overview.set(6.8,4.8,10.5);
    if(this.seated&&!this.transition){this.position.copy(this.seatPosition);this.target.copy(this.seatTarget);}
  }
  bindInteraction() {
    let down=null;
    this.canvas.addEventListener('pointermove',e=>{
      this.pointer.set(e.clientX/this.width*2-1,-e.clientY/this.height*2+1);
      if(this.seated||this.transition)return;
      this.raycaster.setFromCamera(this.pointer,this.camera);
      const hover=this.raycaster.intersectObjects(this.model.computerTargets,true).length>0;
      if(hover!==this.hovered){this.hovered=hover;this.canvas.style.cursor=hover?'pointer':'default';document.body.classList.toggle('computer-hover',hover);}
    });
    this.canvas.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});
    this.canvas.addEventListener('pointerup',e=>{
      if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>8)return;down=null;
      if(this.seated||this.transition)return;
      this.pointer.set(e.clientX/this.width*2-1,-e.clientY/this.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
      if(this.raycaster.intersectObjects(this.model.computerTargets,true).length)this.sit();
    });
  }
  sit(){if(this.seated||this.transition)return;this.move(true);}
  stand(){if(!this.seated||this.transition)return;this.move(false);}
  enterComputer({quick=false}={}){
    if(this.transition)return;
    if(this.seated)this.resetForEntrance();
    // Match the film's side of the desk, then arc around its front toward the display.
    this.position.set(4.4,3.35,6.1);this.target.set(-.3,1.8,.35);
    this.camera.position.copy(this.position);this.camera.lookAt(this.target);
    this.move(true);
    this.transition.duration=this.reduced?30:quick?800:2900;
    const middle=new THREE.Vector3(2.15,2.75,Math.max(4.1,this.seatPosition.z));
    this.transition.path=new THREE.QuadraticBezierCurve3(this.position.clone(),middle,this.seatPosition.clone());
    document.querySelector('#room-status').textContent='Taking a seat at Paul’s computer…';
  }
  resetForEntrance(){
    this.transition=null;
    if(this.seated)this.onStand();
    this.seated=false;document.body.classList.remove('seated','moving');
    this.screenElement.inert=true;this.screenElement.setAttribute('aria-hidden','true');
    this.position.copy(this.overview);this.target.copy(this.overviewTarget);
  }
  move(seating){
    if(seating)this.onApproach();
    this.screenElement.inert=true;this.screenElement.setAttribute('aria-hidden','true');
    if(!seating){document.body.classList.remove('seated');this.onStand();}
    document.body.classList.add('moving');
    this.transition={start:performance.now(),duration:this.reduced?30:1900,seating,from:this.position.clone(),look:this.target.clone(),to:(seating?this.seatPosition:this.overview).clone(),toLook:(seating?this.seatTarget:this.overviewTarget).clone()};
    document.querySelector('#room-status').textContent=seating?'Sitting at the computer…':'Returning to the blue room…';
    this.canvas.style.cursor='default';
  }
  projectScreen(){
    this.camera.updateMatrixWorld();const vp=new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);
    const {screenCenter:p,screenWidth:w,screenHeight:h}=this.model;
    const c=new THREE.Vector4(p.x-w/2,p.y+h/2,p.z+.002,1).applyMatrix4(vp);
    const a=new THREE.Vector4(w/1024,0,0,0).applyMatrix4(vp),b=new THREE.Vector4(0,-h/768,0,0).applyMatrix4(vp);
    if(c.w<=0){this.screenElement.style.visibility='hidden';return;}
    const x=this.width/2,y=this.height/2,q=1/c.w;
    const m=[x*(a.x+a.w)*q,y*(a.w-a.y)*q,0,a.w*q,x*(b.x+b.w)*q,y*(b.w-b.y)*q,0,b.w*q,0,0,1,0,x*(c.x+c.w)*q,y*(c.w-c.y)*q,0,1];
    this.screenElement.style.transform=`matrix3d(${m.join(',')})`;
    const progress=this.transition?Math.min(1,(performance.now()-this.transition.start)/this.transition.duration):1;
    const show=this.seated&&!this.transition||this.transition?.seating&&progress>.78;
    this.screenElement.style.opacity=this.transition?.seating?String(Math.min(1,(progress-.78)/.22)):'1';
    this.screenElement.style.visibility=show?'visible':'hidden';
  }
  desktopPoint(clientX,clientY){const m=new DOMMatrix(getComputedStyle(this.screenElement).transform).inverse();const p=new DOMPoint(clientX,clientY,0,1).matrixTransform(m);return{x:p.x/p.w,y:p.y/p.w};}
  tick(now){
    this.frame=requestAnimationFrame(this.tick);const dt=Math.min((now-this.last)/1000,.05);this.last=now;if(document.hidden)return;this.time+=dt;
    if(this.transition){
      const t=this.transition,r=Math.min(1,(now-t.start)/t.duration),e=r<.5?4*r*r*r:1-Math.pow(-2*r+2,3)/2;
      if(t.path)this.position.copy(t.path.getPoint(e));else this.position.lerpVectors(t.from,t.to,e);
      this.target.lerpVectors(t.look,t.toLook,e);
      if(!this.reduced)this.position.y+=Math.sin(r*Math.PI)*.18;
      if(r===1){this.seated=t.seating;this.transition=null;document.body.classList.remove('moving');document.body.classList.toggle('seated',this.seated);
        this.screenElement.inert=!this.seated;this.screenElement.setAttribute('aria-hidden',String(!this.seated));
        document.querySelector('#room-status').textContent=this.seated?'Seated at the computer. Press Escape to stand up.':'Click the computer to sit down.';
        if(this.seated)this.onSit();else document.querySelector('#sit-button')?.focus({preventScroll:true});
      }
    }else if(!this.seated){
      const desired=this.overview.clone();if(!this.reduced){desired.x+=this.pointer.x*.28;desired.y+=this.pointer.y*.14;}
      this.position.lerp(desired,.035);this.target.lerp(this.overviewTarget,.035);
    }
    const chairProgress=this.transition?(now-this.transition.start)/this.transition.duration:0;
    this.model.chair.visible=this.transition?(this.transition.seating?chairProgress<.8:chairProgress>.25):!this.seated;
    this.model.animate?.(this.time);this.camera.position.copy(this.position);this.camera.lookAt(this.target);this.renderer.render(this.scene,this.camera);this.projectScreen();
  }
  destroy(){cancelAnimationFrame(this.frame);window.removeEventListener('resize',this.onResize);this.envTarget.dispose();this.scene.traverse(o=>o.geometry?.dispose());this.renderer.dispose();}
}
