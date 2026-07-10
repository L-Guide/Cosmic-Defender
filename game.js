(function() {
  'use strict';

  // ========== STATE ==========
  var canvas = document.getElementById('game-canvas');
  var ctx = canvas.getContext('2d');
  var W, H, isMobile = false;
  var state = 'menu';
  var score = 0, bestScore = 0, coins = 0, kills = 0, stars = 0;
  var level = 1, wave = 1, combo = 1, comboTimer = 0;
  var weaponLevel = 1, frameCount = 0;
  var shakeX = 0, shakeY = 0, shakeTimer = 0;
  var lastTime = 0;

  // ========== SHOP ==========
  var shopUpgrades = {hp:0,dmg:0,spd:0,rate:0,coin:0,crit:0,regen:0,start:0};
  var shopData = {
    hp:{maxLv:5,cost:[50,80,120,180,250]},dmg:{maxLv:5,cost:[75,110,160,220,300]},
    spd:{maxLv:5,cost:[40,70,100,150,200]},rate:{maxLv:5,cost:[60,95,140,200,270]},
    coin:{maxLv:3,cost:[100,180,300]},crit:{maxLv:5,cost:[80,130,190,260,350]},
    regen:{maxLv:3,cost:[120,220,380]},start:{maxLv:1,cost:[200]}
  };

  // ========== POWER UPGRADES ==========
  var powerUps = {pierce:0,explode:0,homing:0,aura:0,thorns:0,goldrush:0,laststand:0,bulletrain:0,rapidfire:0,bigbullets:0,dmgboost:0,shieldgen:0};
  var powerData = {
    pierce:{maxLv:3,cost:[200,350,550]},explode:{maxLv:3,cost:[300,500,750]},
    homing:{maxLv:3,cost:[250,420,650]},aura:{maxLv:3,cost:[400,650,950]},
    thorns:{maxLv:3,cost:[250,400,600]},goldrush:{maxLv:3,cost:[200,350,550]},
    laststand:{maxLv:1,cost:[500]},bulletrain:{maxLv:3,cost:[400,650,950]},
    rapidfire:{maxLv:3,cost:[350,550,800]},bigbullets:{maxLv:2,cost:[300,600]},
    dmgboost:{maxLv:3,cost:[500,800,1200]},shieldgen:{maxLv:2,cost:[400,750]}
  };

  // ========== STAR UPGRADES ==========
  var starUps = {revive:0,starshield:0,starweapon:0,stardamage:0,starheal:0,starcombo:0,starcoins:0,starmagnet:0,starlucky:0,starulti:0};
  var starData = {
    revive:{maxLv:3,cost:[10,20,35]},starshield:{maxLv:3,cost:[8,15,25]},
    starweapon:{maxLv:2,cost:[15,30]},stardamage:{maxLv:3,cost:[12,22,35]},
    starheal:{maxLv:3,cost:[10,18,28]},starcombo:{maxLv:3,cost:[8,15,22]},
    starcoins:{maxLv:3,cost:[15,25,40]},starmagnet:{maxLv:3,cost:[10,18,28]},
    starlucky:{maxLv:3,cost:[12,20,32]},starulti:{maxLv:5,cost:[25,40,60,85,120]}
  };
  var starRevivesLeft=0;

  // ========== INVENTORY ==========
  var inventory = {bomb:0,nuke:0,slow:0,dboost:0,heal:0,megaShield:0,rage:0,blackhole:0,coinboost:0,fullheal:0,doublecoin:0,starburst:0};
  var itemDefs = {
    bomb:{name:'Bomb',icon:'💣',color:'#ff4444',cost:50},
    nuke:{name:'Nuke',icon:'☢️',color:'#ff8800',cost:150},
    slow:{name:'Time Slow',icon:'⏳',color:'#44aaff',cost:100},
    dboost:{name:'Dmg Boost',icon:'⚔️',color:'#ff00ff',cost:80},
    heal:{name:'Heal',icon:'❤️‍🩹',color:'#00ff00',cost:60},
    megaShield:{name:'Mega Shield',icon:'🛡️',color:'#00ffff',cost:120},
    rage:{name:'Rage',icon:'😤',color:'#ff2200',cost:180},
    blackhole:{name:'Black Hole',icon:'🌀',color:'#aa00ff',cost:250},
    coinboost:{name:'Coin Boost',icon:'💰',color:'#ffdd00',cost:70},
    fullheal:{name:'Full Heal',icon:'💖',color:'#ff44aa',cost:200},
    doublecoin:{name:'Coin Magnet+',icon:'🪙',color:'#ffaa00',cost:90},
    starburst:{name:'Star Burst',icon:'⭐',color:'#ffff00',cost:150}
  };
  var itemKeys=['bomb','nuke','slow','dboost','heal','megaShield','rage','blackhole','coinboost','fullheal','doublecoin','starburst'];
  var itemCooldowns={bomb:0,nuke:0,slow:0,dboost:0,heal:0,megaShield:0,rage:0,blackhole:0,coinboost:0,fullheal:0,doublecoin:0,starburst:0};
  var activeEffects={slow:0,dboost:0,megaShield:0,rage:0,blackhole:0,coinboost:0,doublecoin:0};

  // ========== AUDIO ==========
  var audioCtx = null, audioOn = true;
  function initAudio() { if (!audioCtx) try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
  function playTone(f,d,t,v) {
    if (!audioCtx||!audioOn) return;
    try {
      if (audioCtx.state==='suspended') audioCtx.resume();
      var o=audioCtx.createOscillator(),g=audioCtx.createGain();
      o.connect(g);g.connect(audioCtx.destination);
      o.frequency.value=f;o.type=t||'square';
      g.gain.setValueAtTime(v||0.06,audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+d);
      o.start();o.stop(audioCtx.currentTime+d);
    } catch(e) {}
  }
  var SFX = {
    shoot:function(){playTone(880,0.05,'square',0.03);},
    hit:function(){playTone(220,0.08,'sawtooth',0.05);},
    explode:function(){playTone(60,0.25,'sawtooth',0.08);},
    bigExplode:function(){playTone(40,0.4,'sawtooth',0.12);},
    coin:function(){playTone(1320,0.04,'sine',0.07);setTimeout(function(){playTone(1760,0.05,'sine',0.07);},40);},
    powerup:function(){playTone(523,0.06,'sine',0.08);setTimeout(function(){playTone(784,0.08,'sine',0.08);},60);},
    gift:function(){[523,659,784,1047].forEach(function(n,i){setTimeout(function(){playTone(n,0.1,'sine',0.08);},i*60);});},
    gameOver:function(){playTone(220,0.35,'sawtooth',0.1);setTimeout(function(){playTone(165,0.4,'sawtooth',0.08);},250);}
  };

  // ========== PLAYER ==========
  var player = {x:0,y:0,w:44,h:48,speed:7,hp:5,maxHp:5,
    shield:false,shieldTime:0,multi:false,multiTime:0,
    speedUp:false,speedTime:0,magnet:false,magnetTime:0,invTime:0};

  // ========== ARRAYS ==========
  var bullets=[],enemies=[],powerups=[],coinsArr=[],gifts=[];
  var particles=[],texts=[],trails=[],starfield=[];

  // ========== SPAWNERS ==========
  var shootCD=0,spawnCD=0,waveDelay=0,enemyCount=0,enemyTotal=0,bossAlive=false;

  // ========== INPUT ==========
  var keys={},touchX=null,touchY=null,touching=false;
  function keyDown(e){
    keys[e.code]=true;
    var k=e.key||'';
    if(k==='ArrowLeft'||k==='a'||k==='A')keys.ArrowLeft=true;
    if(k==='ArrowRight'||k==='d'||k==='D')keys.ArrowRight=true;
    if(k==='ArrowUp'||k==='w'||k==='W')keys.ArrowUp=true;
    if(k==='ArrowDown'||k==='s'||k==='S')keys.ArrowDown=true;
    initAudio();
    if((e.code==='Escape'||e.code==='KeyP'||k==='Escape'||k==='p'||k==='P')&&state==='playing'){state='paused';document.getElementById('pause-overlay').classList.remove('hidden');return;}
      if(state==='playing'){
        for(var ni=0;ni<12;ni++){
          var code='Digit'+(ni+1);
          var keyCheck=''+(ni+1);
          if(ni===9){code='Digit0';keyCheck='0';}
          if(ni===10){code='Minus';keyCheck='-';}
          if(ni===11){code='Equal';keyCheck='=';}
          if(e.code===code||k===keyCheck){useItem(ni);break;}
        }
      }
  }
  function keyUp(e){
    keys[e.code]=false;
    var k=e.key||'';
    if(k==='ArrowLeft'||k==='a'||k==='A')keys.ArrowLeft=false;
    if(k==='ArrowRight'||k==='d'||k==='D')keys.ArrowRight=false;
    if(k==='ArrowUp'||k==='w'||k==='W')keys.ArrowUp=false;
    if(k==='ArrowDown'||k==='s'||k==='S')keys.ArrowDown=false;
  }
  document.addEventListener('keydown',keyDown);
  document.addEventListener('keyup',keyUp);
  function canvasX(cx){var r=canvas.getBoundingClientRect();return(cx-r.left)*(W/r.width);}
  function canvasY(cy){var r=canvas.getBoundingClientRect();return(cy-r.top)*(H/r.height);}
  canvas.addEventListener('mousedown',function(e){touching=true;touchX=canvasX(e.clientX);touchY=canvasY(e.clientY);initAudio();});
  canvas.addEventListener('mousemove',function(e){if(touching){touchX=canvasX(e.clientX);touchY=canvasY(e.clientY);}});
  canvas.addEventListener('mouseup',function(){touching=false;touchX=null;touchY=null;});
  canvas.addEventListener('mouseleave',function(){touching=false;touchX=null;touchY=null;});
  canvas.addEventListener('touchstart',function(e){e.preventDefault();touching=true;touchX=canvasX(e.touches[0].clientX);touchY=canvasY(e.touches[0].clientY);initAudio();},{passive:false});
  canvas.addEventListener('touchmove',function(e){e.preventDefault();touchX=canvasX(e.touches[0].clientX);touchY=canvasY(e.touches[0].clientY);},{passive:false});
  canvas.addEventListener('touchend',function(e){e.preventDefault();touching=false;touchX=null;touchY=null;},{passive:false});
  canvas.addEventListener('contextmenu',function(e){e.preventDefault();});

  // ========== RESIZE ==========
  function resize() {
    W=window.innerWidth;H=window.innerHeight;
    canvas.width=W;canvas.height=H;
    isMobile=W<600;
  }
  window.addEventListener('resize',resize);resize();

  // ========== SDK ==========
  var ytGame=null;
  try{
    if(typeof YT!=='undefined'&&YT.Game){ytGame=new YT.Game();
      ytGame.onAudioEnabledChange(function(on){audioOn=on;});
      ytGame.onPause(function(){if(state==='playing'){state='paused';document.getElementById('pause-overlay').classList.remove('hidden');}});
      ytGame.onResume(function(){if(state==='paused'){state='playing';document.getElementById('pause-overlay').classList.add('hidden');lastTime=performance.now();requestAnimationFrame(loop);}});
    }
  }catch(e){}
  function sdkReady(){try{if(ytGame)ytGame.gameReady();}catch(e){}}
  function sdkScore(s){try{if(ytGame)ytGame.sendScore(s);}catch(e){}}
  function sdkSave(){var d=JSON.stringify({b:bestScore,l:level,w:weaponLevel,c:coins,s:shopUpgrades,p:powerUps,su:starUps,st:stars,inv:inventory});try{if(ytGame)ytGame.saveData(d);else localStorage.setItem('cd_save',d);}catch(e){}}
  function sdkLoad(){
    try{if(ytGame){ytGame.loadData(function(err,d){if(!err&&d){try{var p=JSON.parse(d);bestScore=p.b||0;level=p.l||1;weaponLevel=p.w||1;coins=p.c||0;stars=p.st||0;if(p.s)Object.keys(p.s).forEach(function(k){shopUpgrades[k]=p.s[k]||0;});if(p.p)Object.keys(p.p).forEach(function(k){powerUps[k]=p.p[k]||0;});if(p.su)Object.keys(p.su).forEach(function(k){starUps[k]=p.su[k]||0;});if(p.inv)Object.keys(p.inv).forEach(function(k){inventory[k]=p.inv[k]||0;});}catch(e){}}});return;}}catch(e){}
    try{var s=localStorage.getItem('cd_save');if(s){var p=JSON.parse(s);bestScore=p.b||0;level=p.l||1;weaponLevel=p.w||1;coins=p.c||0;stars=p.st||0;if(p.s)Object.keys(p.s).forEach(function(k){shopUpgrades[k]=p.s[k]||0;});if(p.p)Object.keys(p.p).forEach(function(k){powerUps[k]=p.p[k]||0;});if(p.su)Object.keys(p.su).forEach(function(k){starUps[k]=p.su[k]||0;});if(p.inv)Object.keys(p.inv).forEach(function(k){inventory[k]=p.inv[k]||0;});}}catch(e){}
  }

  // ========== HELPERS ==========
  function rnd(a,b){return Math.random()*(b-a)+a;}
  function hitTest(a,b){return a.x-a.w/2<b.x+b.w/2&&a.x+a.w/2>b.x-b.w/2&&a.y-a.h/2<b.y+b.h/2&&a.y+a.h/2>b.y-b.h/2;}

  function addText(x,y,t,c,s){texts.push({x:x,y:y,t:t,c:c||'#fff',s:s||14,life:1});}
  function earnStars(n){stars+=n;addText(player.x+rnd(-20,20),player.y-40,'+'+n+' STAR'+(n>1?'S':''),'#ffdd00',16);}
  function addParticles(x,y,c,n){
    var max=isMobile?12:30;
    if(particles.length>max)return;
    var cnt=isMobile?Math.ceil(n*0.7):n;
    for(var i=0;i<cnt;i++){var a=rnd(0,6.28),sp=rnd(2,5);particles.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,sz:rnd(2,4),c:c,life:1,dec:rnd(0.03,0.05)});}
  }

  // ========== USE ITEM ==========
  function useItem(slot){
    if(state!=='playing')return;
    var key=itemKeys[slot];
    if(!key||inventory[key]<=0||itemCooldowns[key]>0)return;
    inventory[key]--;
    itemCooldowns[key]=60;
    SFX.powerup();
    switch(key){
      case'bomb':
        var bombKilledBoss=false;
        for(var i=enemies.length-1;i>=0;i--){var e=enemies[i];e.hp-=5+level;addParticles(e.x,e.y,'#ff8800',4);if(e.hp<=0){var pts=e.pts*combo;score+=pts;kills++;combo++;comboTimer=110;addText(e.x,e.y,'+'+pts,'#ffcc00',14);if(e.type==='boss'){bombKilledBoss=true;earnStars(5);bossAlive=false;}shakeTimer=8;SFX.explode();spawnCoins(e.x,e.y,e.type==='boss'?8:2);enemies.splice(i,1);}}
        for(var i=bullets.length-1;i>=0;i--){if(!bullets[i].friendly){addParticles(bullets[i].x,bullets[i].y,'#ff8800',3);bullets.splice(i,1);}}
        shakeTimer=15;addText(W/2,H/2,'💣 BOMB!','#ff4444',24);
        if(bombKilledBoss){wave++;level++;SFX.powerup();state='levelup';
          document.getElementById('game-hud').classList.add('hidden');
          document.getElementById('level-complete').classList.remove('hidden');
          var tb=Math.floor(level*100*combo);document.getElementById('level-score').textContent=score;
          document.getElementById('time-bonus').textContent=tb;document.getElementById('total-score').textContent=score+tb;score+=tb;sdkSave();sdkReady();}
        break;
      case'nuke':
        var nukeKilledBoss=false;
        for(var i=enemies.length-1;i>=0;i--){var e=enemies[i];e.hp-=10+level*2;addParticles(e.x,e.y,'#ff8800',6);
          if(e.hp<=0){var pts=e.pts*combo;score+=pts;kills++;combo++;comboTimer=110;addText(e.x,e.y,'+'+pts,'#ffcc00',14);
            if(e.type==='boss'){nukeKilledBoss=true;earnStars(5);bossAlive=false;}else{shakeTimer=8;}
            SFX.explode();spawnCoins(e.x,e.y,e.type==='boss'?12:3);enemies.splice(i,1);}}
        shakeTimer=12;addText(W/2,H/2,'☢️ NUKE!','#ff8800',28);
        if(nukeKilledBoss){wave++;level++;SFX.powerup();state='levelup';
          document.getElementById('game-hud').classList.add('hidden');
          document.getElementById('level-complete').classList.remove('hidden');
          var tb=Math.floor(level*100*combo);document.getElementById('level-score').textContent=score;
          document.getElementById('time-bonus').textContent=tb;document.getElementById('total-score').textContent=score+tb;score+=tb;sdkSave();sdkReady();}
        break;
      case'slow':
        activeEffects.slow=300;addText(player.x,player.y-50,'⏳ TIME SLOW!','#44aaff',18);break;
      case'dboost':
        activeEffects.dboost=480;addText(player.x,player.y-50,'⚔️ DAMAGE x3!','#ff00ff',18);break;
      case'heal':
        player.hp=Math.min(player.hp+3,player.maxHp);addText(player.x,player.y-50,'❤️ +3 HP','#00ff00',18);break;
      case'megaShield':
        player.shield=true;player.shieldTime=600;activeEffects.megaShield=600;
        addText(player.x,player.y-50,'🛡️ MEGA SHIELD!','#00ffff',18);break;
      case'rage':
        activeEffects.rage=480;player.multi=true;player.multiTime=480;player.speedUp=true;player.speedTime=480;
        addText(player.x,player.y-50,'😤 RAGE MODE!','#ff2200',20);break;
      case'blackhole':
        activeEffects.blackhole=180;shakeTimer=15;
        addText(W/2,H/2,'🌀 BLACK HOLE!','#aa00ff',28);break;
      case'coinboost':
        activeEffects.coinboost=900;addText(player.x,player.y-50,'💰 2x COINS!','#ffdd00',18);break;
      case'fullheal':
        player.hp=player.maxHp;addText(player.x,player.y-50,'💖 FULL HEAL!','#ff44aa',20);break;
      case'doublecoin':
        activeEffects.doublecoin=600;player.magnet=true;player.magnetTime=Math.max(player.magnetTime,600);
        addText(player.x,player.y-50,'🪙 COIN MAGNET+!','#ffaa00',18);break;
      case'starburst':
        stars+=5;addText(player.x,player.y-50,'⭐ +5 STARS!','#ffff00',20);break;
    }
    sdkSave();
  }

  // ========== INIT ==========
  function initGame(){
    player.x=W/2;player.y=H-100;
    player.maxHp=5+shopUpgrades.hp+starUps.starulti;player.hp=player.maxHp;
    player.speed=7+shopUpgrades.spd*0.8+starUps.starulti*0.5;
    if(shopUpgrades.start>=1||starUps.starweapon>=1)weaponLevel=Math.max(weaponLevel,starUps.starweapon>=2?3:2);
    if(starUps.stardamage>0)player.starDmg=starUps.stardamage*2;else player.starDmg=0;
    player.shield=starUps.starshield>0;player.shieldTime=starUps.starshield*200;
    player.multi=false;player.speedUp=false;player.magnet=starUps.starmagnet>0;player.magnetTime=starUps.starmagnet>0?99999:0;
    player.invTime=80;player.lastStandUsed=false;
    starRevivesLeft=starUps.revive;
    bullets=[];enemies=[];powerups=[];coinsArr=[];gifts=[];
    particles=[];texts=[];trails=[];
    bossAlive=false;frameCount=0;enemyCount=0;
    activeEffects={slow:0,dboost:0,megaShield:0,rage:0,blackhole:0,coinboost:0,doublecoin:0};
    Object.keys(itemCooldowns).forEach(function(k){itemCooldowns[k]=0;});
    starfield=[];
    var starCount=isMobile?30:60;
    for(var i=0;i<starCount;i++)starfield.push({x:rnd(0,W),y:rnd(0,H),sz:rnd(0.5,2),sp:rnd(1,2.5)});
    startWave();
  }
  function startWave(){enemyTotal=5+wave*3+level*4;if(isMobile)enemyTotal=Math.min(enemyTotal,25);enemyCount=0;spawnCD=0;waveDelay=0;bossAlive=false;}

  // ========== SHOOT ==========
  function shoot(){
    var py=player.y-player.h/2;
    var baseDmg=1+shopUpgrades.dmg+powerUps.dmgboost*3+player.starDmg;
    if(starUps.starulti>=5)baseDmg=Math.floor(baseDmg*1.5);else if(starUps.starulti>=4)baseDmg=Math.floor(baseDmg*1.4);else if(starUps.starulti>=3)baseDmg=Math.floor(baseDmg*1.3);else if(starUps.starulti>=2)baseDmg=Math.floor(baseDmg*1.2);else if(starUps.starulti>=1)baseDmg=Math.floor(baseDmg*1.1);
    if(activeEffects.dboost>0)baseDmg*=3;
    baseDmg+=powerUps.pierce>0?powerUps.pierce:0;
    if(powerUps.bigbullets>0)baseDmg=Math.floor(baseDmg*(1+powerUps.bigbullets*0.5));
    var isCrit=Math.random()<(shopUpgrades.crit*0.08);
    var dmg=isCrit?baseDmg*2:baseDmg;
    var extraBullets=powerUps.bulletrain;
    var bsz=powerUps.bigbullets>0?4+powerUps.bigbullets*2:4;
    if(player.multi&&weaponLevel>=3){[-16,-8,0,8,16].forEach(function(a){var r=a*0.0175;bullets.push({x:player.x+Math.sin(r)*10,y:py,vx:Math.sin(r)*3,vy:-13,w:bsz,h:12+powerUps.bigbullets*4,dmg:dmg,friendly:true,pierce:powerUps.pierce,explode:powerUps.explode,homing:powerUps.homing});});}
    else if(player.multi){[-9,0,9].forEach(function(o){bullets.push({x:player.x+o,y:py,vx:o*0.1,vy:-12,w:bsz,h:12+powerUps.bigbullets*4,dmg:dmg,friendly:true,pierce:powerUps.pierce,explode:powerUps.explode,homing:powerUps.homing});});extraBullets=0;}
    else{var bc=1+extraBullets;for(var i=0;i<bc;i++){var ox=(i-(bc-1)/2)*14;bullets.push({x:player.x+ox,y:py,vx:0,vy:-13,w:bsz,h:12+powerUps.bigbullets*4,dmg:dmg,friendly:true,pierce:powerUps.pierce,explode:powerUps.explode,homing:powerUps.homing});}
    }
    if(isCrit)addText(player.x+rnd(-10,10),py-15,'CRIT!','#ff4444',12);
    SFX.shoot();
  }

  // ========== ENEMY SPAWN ==========
  function spawnEnemy(){
    var r=Math.random(),e;
    var hpm=1+Math.floor(level/2);var spd=1+level*0.08;
    if(r<0.5)e={x:rnd(35,W-35),y:-30,w:34,h:34,hp:1+hpm,maxHp:1+hpm,sp:rnd(1.5,2.5)*spd,type:'basic',cd:rnd(0,60),pts:100,rate:Math.max(30,65-level*3)};
    else if(r<0.72)e={x:rnd(30,W-30),y:-30,w:24,h:24,hp:1+Math.floor(level/5),maxHp:1+Math.floor(level/5),sp:rnd(3,5)*spd,type:'fast',cd:rnd(0,40),pts:150,rate:Math.max(20,45-level*3)};
    else if(r<0.88)e={x:rnd(45,W-45),y:-35,w:44,h:44,hp:3+level,maxHp:3+level,sp:rnd(0.8,1.3)*spd,type:'tank',cd:rnd(0,80),pts:300,rate:Math.max(40,85-level*4)};
    else e={x:rnd(35,W-35),y:-30,w:30,h:30,hp:2+Math.floor(level/3),maxHp:2+Math.floor(level/3),sp:2.2*spd,type:'sniper',cd:rnd(0,20),pts:200,rate:Math.max(20,50-level*3)};
    enemies.push(e);
  }
  function spawnBoss(){
    bossAlive=true;
    var bhp=25+level*18;var brate=Math.max(5,14-level);
    enemies.push({x:W/2,y:-80,w:100,h:85,hp:bhp,maxHp:bhp,sp:1.3+level*0.05,type:'boss',cd:0,pts:2000+level*500,rate:brate,phase:0,phaseT:0,atk:0,atkT:0});
  }

  // ========== COINS ==========
  function spawnCoins(x,y,n){
    for(var i=0;i<n;i++){var a=(i/n)*6.28+rnd(-0.3,0.3),sp=rnd(2,3.5);coinsArr.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,sz:rnd(14,18),life:450,rot:rnd(0,6),val:Math.random()<0.15?5:1});}
  }
  function spawnCoinsBurst(x,y,n){
    for(var i=0;i<n;i++){var a=(i/n)*6.28;coinsArr.push({x:x,y:y,vx:Math.cos(a)*3.5,vy:Math.sin(a)*3.5-2.5,sz:16,life:500,rot:rnd(0,6),val:Math.random()<0.3?5:1});}
  }

  // ========== GIFT ==========
  function spawnGift(x,y){
    var types=['health','shield','weapon','coins','score','mega'];
    var w=[25,20,15,20,12,8];
    if(starUps.starlucky>=3){w[5]=16;w[4]=24;}else if(starUps.starlucky>=2){w[5]=12;w[4]=18;}else if(starUps.starlucky>=1){w[5]=10;w[4]=15;}
    var r=Math.random()*100,t=types[0];
    for(var i=0;i<types.length;i++){r-=w[i];if(r<=0){t=types[i];break;}}
    gifts.push({x:x,y:y-20,vx:rnd(-2,2),vy:rnd(-3,-1.5),sz:26,life:500,type:t,bob:rnd(0,6)});
  }
  function openGift(g){
    SFX.gift();addParticles(g.x,g.y,'#ff44ff',12);shakeTimer=10;
    switch(g.type){
      case'health':player.hp=Math.min(player.hp+3,player.maxHp);addText(g.x,g.y,'+3 HP','#00ff00',16);break;
      case'shield':player.shield=true;player.shieldTime=400;addText(g.x,g.y,'SHIELD!','#00ffff',16);break;
      case'weapon':weaponLevel=Math.min(weaponLevel+1,3);addText(g.x,g.y,'WEAPON UP!','#ff8800',16);break;
      case'coins':spawnCoinsBurst(g.x,g.y,15);coins+=10;addText(g.x,g.y,'+10 COINS!','#ffdd00',18);break;
      case'score':score+=5000;addText(g.x,g.y,'+5000!','#ff00ff',18);break;
      case'mega':player.hp=player.maxHp;player.shield=true;player.shieldTime=500;player.multi=true;player.multiTime=400;weaponLevel=3;spawnCoinsBurst(g.x,g.y,25);coins+=20;score+=10000;addText(g.x,g.y,'MEGA!','#ff00ff',22);shakeTimer=18;break;
    }
  }

  // ========== POWERUP ==========
  function maybePowerup(x,y){
    var chance=Math.max(0.1,0.22-level*0.012);
    if(starUps.starlucky>=3)chance+=0.15;else if(starUps.starlucky>=2)chance+=0.1;else if(starUps.starlucky>=1)chance+=0.05;
    if(Math.random()>chance)return;
    var types=['shield','speed','multi','health','weapon','magnet'];
    powerups.push({x:x,y:y,w:22,h:22,type:types[Math.floor(Math.random()*6)],life:450});
  }

  // ========== PLAYER HIT ==========
  function playerHit(){
    if(powerUps.laststand>0&&!player.lastStandUsed){player.lastStandUsed=true;player.hp=1;player.invTime=120;shakeTimer=10;addText(player.x,player.y-50,'LAST STAND!','#ff4444',18);SFX.powerup();return;}
    player.hp--;player.invTime=Math.max(30,80-level*3);combo=1;shakeTimer=12;
    addParticles(player.x,player.y,'#ff0000',15);SFX.explode();
    if(player.hp<=0){
      if(starRevivesLeft>0){
        starRevivesLeft--;
        player.hp=player.maxHp;player.invTime=180;
        addParticles(player.x,player.y,'#ffdd00',30);
        addText(player.x,player.y-50,'REVIVE! 💖','#ffdd00',22);
        SFX.powerup();shakeTimer=15;
        return;
      }
      SFX.gameOver();if(score>bestScore)bestScore=score;sdkSave();sdkScore(score);
      document.getElementById('final-score').textContent=score;
      document.getElementById('final-best').textContent=bestScore;
      document.getElementById('final-level').textContent=level;
      document.getElementById('final-kills').textContent=kills;
      document.getElementById('final-coins').textContent=coins;
      document.getElementById('final-stars').textContent=stars;
      state='gameover';document.getElementById('game-hud').classList.add('hidden');
      document.getElementById('game-over').classList.remove('hidden');sdkReady();
    }
  }

  // ========== UPDATE ==========
  function update(dt){
    frameCount++;
    // Player
    var spd=player.speed*(player.speedUp?1.6:1)*dt;
    var dx=0,dy=0;
    if(keys.ArrowLeft||keys.KeyA)dx=-1;if(keys.ArrowRight||keys.KeyD)dx=1;
    if(keys.ArrowUp||keys.KeyW)dy=-1;if(keys.ArrowDown||keys.KeyS)dy=1;
    if(dx||dy){var len=Math.sqrt(dx*dx+dy*dy);player.x+=(dx/len)*spd;player.y+=(dy/len)*spd;}
    if(touching&&touchX!==null&&touchY!==null){
      var dx=touchX-player.x,dy=touchY-player.y,len=Math.sqrt(dx*dx+dy*dy);
      if(len>3){player.x+=(dx/len)*Math.min(spd,len);player.y+=(dy/len)*Math.min(spd,len);}
    }
    player.x=Math.max(player.w/2,Math.min(W-player.w/2,player.x));
    player.y=Math.max(player.h/2,Math.min(H-player.h/2,player.y));
    // Timers
    if(player.shieldTime>0){player.shieldTime-=dt;if(player.shieldTime<=0)player.shield=false;}
    if(player.multiTime>0){player.multiTime-=dt;if(player.multiTime<=0)player.multi=false;}
    if(player.speedTime>0){player.speedTime-=dt;if(player.speedTime<=0)player.speedUp=false;}
    if(player.magnetTime>0){player.magnetTime-=dt;if(player.magnetTime<=0)player.magnet=false;}
    if(player.invTime>0)player.invTime-=dt;
    // Star Heal
    if(starUps.starheal>0){if(!player.healTimer)player.healTimer=0;player.healTimer+=dt;if(player.healTimer>=480){player.healTimer=0;if(player.hp<player.maxHp){player.hp=Math.min(player.maxHp,player.hp+starUps.starheal);addText(player.x,player.y-40,'+'+starUps.starheal+' HP','#00ff88',14);addParticles(player.x,player.y,'#00ff88',5);}}}
    if(shakeTimer>0){shakeTimer-=dt;shakeX=(Math.random()-0.5)*shakeTimer*0.6;shakeY=(Math.random()-0.5)*shakeTimer*0.6;}else{shakeX=0;shakeY=0;}
    // Active effects
    if(activeEffects.slow>0)activeEffects.slow-=dt;
    if(activeEffects.dboost>0)activeEffects.dboost-=dt;
    if(activeEffects.megaShield>0){activeEffects.megaShield-=dt;if(activeEffects.megaShield<=0){player.shield=false;player.shieldTime=0;}}
    if(activeEffects.rage>0){activeEffects.rage-=dt;if(activeEffects.rage<=0){player.multi=false;player.speedUp=false;}}
    if(activeEffects.blackhole>0){activeEffects.blackhole-=dt;
      for(var i=0;i<enemies.length;i++){var e=enemies[i];var dx=W/2-e.x,dy=H/2-e.y,d=Math.sqrt(dx*dx+dy*dy)||1;e.x+=(dx/d)*3*dt;e.y+=(dy/d)*3*dt;e.hp-=0.15*dt;}}
    if(activeEffects.coinboost>0)activeEffects.coinboost-=dt;
    if(activeEffects.doublecoin>0){activeEffects.doublecoin-=dt;if(activeEffects.doublecoin<=0){}}
    for(var k in itemCooldowns){if(itemCooldowns[k]>0)itemCooldowns[k]-=dt;}
    // Damage Aura
    if(powerUps.aura>0){var auraR=50+powerUps.aura*15;
      for(var i=0;i<enemies.length;i++){var e=enemies[i];var dx=e.x-player.x,dy=e.y-player.y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<auraR){e.hp-=powerUps.aura*0.08*dt;if(frameCount%20===0)addParticles(e.x,e.y,'#ff4400',2);}
        if(e.hp<=0&&d<auraR){var pts=e.pts*combo;score+=pts;kills++;combo++;comboTimer=110;addText(e.x,e.y,'+'+pts,'#ffcc00',14);addParticles(e.x,e.y,'#ff6600',8);SFX.explode();spawnCoins(e.x,e.y,2);enemies.splice(i,1);i--;}}}
    // Last Stand check
    if(powerUps.laststand>0&&!player.lastStandUsed){/* handled in playerHit */}
    // Shoot
    shootCD+=dt;var rate=weaponLevel>=3?8:weaponLevel>=2?10:12;rate-=shopUpgrades.rate*0.7;
    if(powerUps.rapidfire>0)rate*=(1-powerUps.rapidfire*0.15);
    rate=Math.max(3,rate);
    if(shootCD>=rate){shootCD=0;shoot();}
    // Stars
    for(var i=0;i<starfield.length;i++){starfield[i].y+=starfield[i].sp*dt;if(starfield[i].y>H){starfield[i].y=0;starfield[i].x=rnd(0,W);}}
    // Bullets
    for(var i=bullets.length-1;i>=0;i--){var b=bullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.y<-30||b.y>H+30||b.x<-30||b.x>W+30)bullets.splice(i,1);}
    // Enemies
    for(var i=enemies.length-1;i>=0;i--){
      var e=enemies[i];
      if(e.type==='boss'){
        var bspd=1+level*0.04;
        var bslow=activeEffects.slow>0?0.3:1;
        if(e.y<100){e.y+=e.sp*1.3*dt*bslow;}
        else{e.phaseT+=dt;e.atkT+=dt;
          var bmove=(2+level*0.15)*bslow;
          if(e.phase===0){e.x+=bmove*dt;if(e.x>W-70)e.phase=1;}
          else if(e.phase===1){e.x-=bmove*dt;if(e.x<70)e.phase=0;}
          else{e.y+=Math.sin(e.phaseT*0.05)*1.5;}
        if(e.phaseT>180){e.phaseT=0;e.phase=(e.phase+1)%3;}
        e.cd+=dt;
        if(e.cd>=e.rate){e.cd=0;
          if(e.atkT>200){e.atkT=0;e.atk=(e.atk+1)%3;}
          if(e.atk===0){var bc=8+Math.floor(level/3);for(var a=0;a<bc;a++){var ang=(a/bc)*6.28;bullets.push({x:e.x,y:e.y,vx:Math.cos(ang)*3.5*bspd,vy:Math.sin(ang)*3.5*bspd,w:6,h:6,dmg:1+Math.floor(level/5),friendly:false});}shakeTimer=6;}
          else if(e.atk===1){var ang=Math.atan2(player.y-e.y,player.x-e.x);var sc=2+Math.min(Math.floor(level/4),3);for(var s=-sc;s<=sc;s++){bullets.push({x:e.x,y:e.y+35,vx:Math.cos(ang+s*0.12)*5*bspd,vy:Math.sin(ang+s*0.12)*5*bspd,w:5,h:5,dmg:1+Math.floor(level/4),friendly:false});}}
          else{var rc=2+Math.min(Math.floor(level/4),3);for(var r=-rc;r<=rc;r++){bullets.push({x:e.x+r*20,y:e.y+45,vx:r*0.3,vy:4.5*bspd,w:5,h:5,dmg:1+Math.floor(level/5),friendly:false});}}
        }}
      }else{
        var espd=activeEffects.slow>0?0.3:1;
        e.y+=e.sp*dt*espd;
        if(e.type==='fast')e.x+=Math.sin(e.y*0.03)*2*dt*espd;
        if(e.type==='sniper'){var d=player.x-e.x;e.x+=(d>0?1:-1)*0.4*dt*espd;}
        e.cd+=dt;
        if(e.cd>=e.rate&&e.y>30){e.cd=0;
          var bsp=1+level*0.06;
          if(e.type==='sniper'){var ang=Math.atan2(player.y-e.y,player.x-e.x);bullets.push({x:e.x,y:e.y+e.h/2,vx:Math.cos(ang)*4.5*bsp,vy:Math.sin(ang)*4.5*bsp,w:4,h:4,dmg:1+Math.floor(level/6),friendly:false});}
          else if(e.type==='tank'){[-0.3,0,0.3].forEach(function(a){bullets.push({x:e.x,y:e.y+e.h/2,vx:Math.sin(a)*1.8*bsp,vy:3.5*bsp,w:6,h:6,dmg:1+Math.floor(level/5),friendly:false});});}
          else if(e.type==='fast'&&level>=4){var ang=Math.atan2(player.y-e.y,player.x-e.x);bullets.push({x:e.x,y:e.y+e.h/2,vx:Math.cos(ang)*3.5*bsp,vy:Math.sin(ang)*3.5*bsp,w:3,h:3,dmg:1,friendly:false});}
          else if(Math.random()<0.3+level*0.03)bullets.push({x:e.x,y:e.y+e.h/2,vx:0,vy:4*bsp,w:4,h:4,dmg:1+Math.floor(level/7),friendly:false});
        }
      }
      if(e.y>H+50)enemies.splice(i,1);
    }
    // Coins
    for(var i=coinsArr.length-1;i>=0;i--){
      var c=coinsArr[i];c.x+=c.vx*dt;c.y+=c.vy*dt;c.vy+=0.05*dt;c.vx*=0.99;c.rot+=0.08*dt;c.life-=dt;
      if(player.magnet||player.speedUp){var dx=player.x-c.x,dy=player.y-c.y,d=Math.sqrt(dx*dx+dy*dy);var magRange=player.magnet?200:100;if(starUps.starmagnet>0)magRange=350;if(starUps.starulti>=5)magRange+=100;else if(starUps.starulti>=3)magRange+=50;if(d<magRange){var pull=player.magnet?6:3;c.x+=((dx)/d)*pull*dt;c.y+=((dy)/d)*pull*dt;}}
      var dx=c.x-player.x,dy=c.y-player.y;
      if(Math.sqrt(dx*dx+dy*dy)<38){
        var coinMult=1;
        if(activeEffects.coinboost>0)coinMult*=2;
        if(activeEffects.doublecoin>0)coinMult*=2;
        if(starUps.starcoins>=3)coinMult*=3;else if(starUps.starcoins>=2)coinMult*=2.5;else if(starUps.starcoins>=1)coinMult*=2;
        if(starUps.starulti>=5)coinMult*=1.5;else if(starUps.starulti>=4)coinMult*=1.4;else if(starUps.starulti>=3)coinMult*=1.3;else if(starUps.starulti>=2)coinMult*=1.2;else if(starUps.starulti>=1)coinMult*=1.1;
        var coinVal=c.val*coinMult;
        score+=coinVal*combo*10;coins+=coinVal;SFX.coin();addText(c.x,c.y-8,'+'+(coinVal*combo*10),c.val>3?'#ffdd00':'#ffaa00',c.val>3?14:11);addParticles(c.x,c.y,'#ffdd00',3);coinsArr.splice(i,1);continue;}
      if(c.y>H+20||c.life<=0)coinsArr.splice(i,1);
    }
    // Gifts
    for(var i=gifts.length-1;i>=0;i--){
      var g=gifts[i];g.x+=g.vx*dt;g.y+=g.vy*dt;g.vy+=0.03*dt;g.vx*=0.99;g.life-=dt;g.bob+=0.05*dt;
      if(player.magnet){var dx=player.x-g.x,dy=player.y-g.y,d=Math.sqrt(dx*dx+dy*dy);if(d<160){g.x+=(dx/d)*4*dt;g.y+=(dy/d)*4*dt;}}
      var dx=g.x-player.x,dy=g.y-player.y;
      if(Math.sqrt(dx*dx+dy*dy)<40){openGift(g);gifts.splice(i,1);continue;}
      if(g.y>H+35||g.life<=0)gifts.splice(i,1);
    }
    // Powerups
    for(var i=powerups.length-1;i>=0;i--){
      var p=powerups[i];p.y+=1.6*dt;p.life-=dt;
      if(player.magnet){var dx=player.x-p.x,dy=player.y-p.y,d=Math.sqrt(dx*dx+dy*dy);if(d<180){p.x+=(dx/d)*4*dt;p.y+=(dy/d)*4*dt;}}
      if(Math.sqrt((p.x-player.x)*(p.x-player.x)+(p.y-player.y)*(p.y-player.y))<34){
        SFX.powerup();
        switch(p.type){case'shield':player.shield=true;player.shieldTime=300;addText(player.x,player.y-35,'SHIELD!','#00ffff',15);break;case'speed':player.speedUp=true;player.speedTime=300;addText(player.x,player.y-35,'SPEED!','#ffff00',15);break;case'multi':player.multi=true;player.multiTime=300;addText(player.x,player.y-35,'MULTI!','#ff00ff',15);break;case'health':player.hp=Math.min(player.hp+2,player.maxHp);addText(player.x,player.y-35,'+2 HP','#00ff00',15);break;case'weapon':weaponLevel=Math.min(weaponLevel+1,3);addText(player.x,player.y-35,'WEAPON!','#ff8800',15);break;case'magnet':player.magnet=true;player.magnetTime=400;addText(player.x,player.y-35,'MAGNET!','#ff44ff',15);break;}
        addParticles(p.x,p.y,'#fff',5);powerups.splice(i,1);continue;
      }
      if(p.y>H+25||p.life<=0)powerups.splice(i,1);
    }
    // Particles
    for(var i=particles.length-1;i>=0;i--){var p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.96;p.vy*=0.96;p.life-=p.dec*dt;if(p.life<=0)particles.splice(i,1);}
    // Trails
    if(frameCount%(isMobile?8:3)===0){trails.push({x:player.x+rnd(-2,2),y:player.y+player.h/2,sz:rnd(2,3),life:1,c:'#ff6600'});}
    for(var i=trails.length-1;i>=0;i--){var t=trails[i];t.y+=2.5*dt;t.life-=0.06*dt;if(t.life<=0)trails.splice(i,1);}
    // Floating texts
    for(var i=texts.length-1;i>=0;i--){var t=texts[i];t.y-=1.2*dt;t.life-=0.025*dt;if(t.life<=0)texts.splice(i,1);}
    // Combo
    if(comboTimer>0){comboTimer-=dt*(starUps.starcombo>0?0.5:1);if(comboTimer<=0){comboTimer=0;combo=1;}}
    // Spawn enemies
    if(enemyCount<enemyTotal&&!bossAlive){spawnCD+=dt;if(spawnCD>=Math.max(12,26-level)){spawnCD=0;spawnEnemy();enemyCount++;}}
    // Wave complete
    if(enemies.length===0&&enemyCount>=enemyTotal&&!bossAlive){waveDelay+=dt;
      var wdel=Math.max(20,45-level*2);
      if(waveDelay>=wdel){earnStars(1);if(shopUpgrades.regen>0&&player.hp<player.maxHp){player.hp=Math.min(player.hp+shopUpgrades.regen,player.maxHp);addText(player.x,player.y-35,'+'+shopUpgrades.regen+' HP','#00ff00',14);}
      if(shopUpgrades.coin>0){player.magnet=true;player.magnetTime=Math.max(player.magnetTime,80+shopUpgrades.coin*40);}
      if(powerUps.shieldgen>0&&!player.shield){player.shield=true;player.shieldTime=powerUps.shieldgen*250;addText(player.x,player.y-35,'SHIELD!','#00ffff',14);}
      if(powerUps.laststand>0)player.lastStandUsed=false;
      if(wave%3===0){spawnBoss();}else{wave++;startWave();}}
    }
    // Ambient coins
    if(frameCount%(isMobile?300:180)===0&&Math.random()<0.3){coinsArr.push({x:rnd(25,W-25),y:-10,vx:rnd(-0.8,0.8),vy:rnd(1.2,2),sz:16,life:450,rot:rnd(0,6),val:Math.random()<0.2?5:1});}
    // Collisions - bullets vs enemies
    for(var i=bullets.length-1;i>=0;i--){var b=bullets[i];if(!b.friendly)continue;
      // Homing
      if(b.homing>0&&enemies.length>0){var closest=null,cd=9999;for(var j=0;j<enemies.length;j++){var dx=enemies[j].x-b.x,dy=enemies[j].y-b.y,d=Math.sqrt(dx*dx+dy*dy);if(d<cd){cd=d;closest=enemies[j];}}
        if(closest){var dx=closest.x-b.x,dy=closest.y-b.y,d=Math.sqrt(dx*dx+dy*dy)||1;var hs=0.3+b.homing*0.15;b.vx+=(dx/d)*hs;b.vy+=(dy/d)*hs;var sp=Math.sqrt(b.vx*b.vx+b.vy*b.vy);if(sp>14){b.vx=(b.vx/sp)*14;b.vy=(b.vy/sp)*14;}}}
      for(var j=enemies.length-1;j>=0;j--){var e=enemies[j];
        if(hitTest(b,e)){
          // Pierce
          if(b.pierce>0){b.pierce--;b.dmg=Math.max(1,b.dmg-1);}
          else{bullets.splice(i,1);}
          e.hp-=b.dmg;addParticles(b.x,b.y,'#fff',2);SFX.hit();
          // Explode
          if(b.explode>0){var er=30+b.explode*20;
            for(var k=enemies.length-1;k>=0;k--){if(k===j)continue;var ex=enemies[k],edx=ex.x-b.x,edy=ex.y-b.y,ed=Math.sqrt(edx*edx+edy*edy);
              if(ed<er){ex.hp-=b.dmg*0.6;addParticles(ex.x,ex.y,'#ff8800',4);if(ex.hp<=0){var pts=ex.pts*combo;score+=pts;kills++;combo++;comboTimer=110;addText(ex.x,ex.y,'+'+pts,'#ffcc00',14);addParticles(ex.x,ex.y,'#ff6600',12);SFX.explode();maybePowerup(ex.x,ex.y);spawnCoins(ex.x,ex.y,3);enemies.splice(k,1);if(j>=k)j--;}}}
            addParticles(b.x,b.y,'#ff8800',8);shakeTimer=4;}
          if(e.hp<=0){var pts=e.pts*combo;
            score+=pts;kills++;combo++;comboTimer=110;
            addText(e.x,e.y,'+'+pts,'#ffcc00',14);addParticles(e.x,e.y,'#ff6600',12);
            if(e.type==='boss'){SFX.bigExplode();shakeTimer=18;}else{SFX.explode();shakeTimer=5;}
            var coinMult=1+powerUps.goldrush*0.5;
            maybePowerup(e.x,e.y);spawnCoins(e.x,e.y,Math.ceil((e.type==='boss'?12:e.type==='tank'?4:3)*coinMult));
            if(e.type==='boss')spawnGift(e.x,e.y);
            if(combo>=10)earnStars(3);else if(combo>=5)earnStars(2);
            if(e.type==='boss'){earnStars(5);bossAlive=false;wave++;level++;SFX.powerup();state='levelup';
              document.getElementById('game-hud').classList.add('hidden');
              document.getElementById('level-complete').classList.remove('hidden');
              var tb=Math.floor(level*100*combo);document.getElementById('level-score').textContent=score;
              document.getElementById('time-bonus').textContent=tb;document.getElementById('total-score').textContent=score+tb;score+=tb;sdkSave();sdkReady();
              enemies.splice(j,1);return;}
            enemies.splice(j,1);}break;}}}
    // Collisions - enemy vs player
    if(player.invTime<=0){
      for(var i=bullets.length-1;i>=0;i--){var b=bullets[i];if(b.friendly)continue;
        if(hitTest(b,{x:player.x,y:player.y,w:player.w*0.7,h:player.h*0.7})){bullets.splice(i,1);
          if(player.shield){player.shield=false;player.shieldTime=0;addParticles(b.x,b.y,'#00ffff',6);addText(player.x,player.y-25,'BREAK','#00ffff',12);}
          else if(powerUps.thorns>0){var ang=Math.atan2(player.y-b.y,player.x-b.x);bullets.push({x:b.x,y:b.y,vx:Math.cos(ang)*8,vy:Math.sin(ang)*8,w:4,h:4,dmg:1+powerUps.thorns,friendly:true,pierce:0,explode:0,homing:0});addParticles(b.x,b.y,'#00ff88',4);addText(b.x,b.y-10,'REFLECT!','#00ff88',11);}
          else{playerHit();if(b.dmg>1)player.hp-=b.dmg-1;if(player.hp<=0){player.hp=0;SFX.gameOver();if(score>bestScore)bestScore=score;sdkSave();sdkScore(score);
            document.getElementById('final-score').textContent=score;document.getElementById('final-best').textContent=bestScore;
            document.getElementById('final-level').textContent=level;document.getElementById('final-kills').textContent=kills;
            document.getElementById('final-coins').textContent=coins;document.getElementById('final-stars').textContent=stars;
            state='gameover';document.getElementById('game-hud').classList.add('hidden');document.getElementById('game-over').classList.remove('hidden');sdkReady();}}break;}}
      for(var j=enemies.length-1;j>=0;j--){var e=enemies[j];
        if(hitTest(e,{x:player.x,y:player.y,w:player.w*0.5,h:player.h*0.5})){
          if(player.shield){player.shield=false;player.shieldTime=0;addParticles(player.x,player.y,'#00ffff',8);if(e.type!=='boss'){e.hp-=3;if(e.hp<=0){enemies.splice(j,1);score+=e.pts;}}}
          else{if(e.type!=='boss'){addParticles(e.x,e.y,'#ff0000',8);enemies.splice(j,1);}playerHit();}break;}}
    }
  }

  // ========== DRAW (Optimized) ==========
  function draw(){
    ctx.save();ctx.translate(shakeX,shakeY);
    // BG
    ctx.fillStyle='#000022';ctx.fillRect(-5,-5,W+10,H+10);
    // Stars
    ctx.fillStyle='#fff';
    for(var i=0;i<starfield.length;i++){ctx.globalAlpha=0.3+starfield[i].sz*0.25;ctx.fillRect(starfield[i].x,starfield[i].y,starfield[i].sz,starfield[i].sz);}
    ctx.globalAlpha=1;
    // Trails
    for(var i=0;i<trails.length;i++){var t=trails[i];ctx.globalAlpha=t.life*0.4;ctx.fillStyle=t.c;ctx.fillRect(t.x-t.sz/2,t.y,t.sz,t.sz);}
    ctx.globalAlpha=1;
    // Coins
    for(var i=0;i<coinsArr.length;i++){
      var c=coinsArr[i];
      ctx.save();ctx.translate(c.x,c.y);
      var sx=Math.max(Math.abs(Math.cos(c.rot)),0.35);ctx.scale(sx,1);
      ctx.fillStyle=c.val>3?'#ffcc00':'#ddaa00';
      ctx.beginPath();ctx.arc(0,0,c.sz/2,0,6.28);ctx.fill();
      ctx.fillStyle=c.val>3?'#ffee55':'#ffcc44';
      ctx.beginPath();ctx.arc(0,0,c.sz/2.8,0,6.28);ctx.fill();
      ctx.fillStyle=c.val>3?'#cc8800':'#aa7700';
      ctx.font='bold '+(c.sz*0.55)+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('$',0,1);
      ctx.restore();
    }
    // Gifts
    for(var i=0;i<gifts.length;i++){
      var g=gifts[i],gy=g.y+Math.sin(g.bob)*3,s=g.sz;
      ctx.fillStyle='#cc2266';ctx.fillRect(g.x-s/2,gy-s/2,s,s);
      ctx.fillStyle='#ee4488';ctx.fillRect(g.x-s/2+3,gy-s/2+3,s-6,s/2-3);
      ctx.fillStyle='#ffcc00';ctx.fillRect(g.x-2,gy-s/2,4,s);ctx.fillRect(g.x-s/2,gy-2,s,4);
    }
    // Powerups
    var puC={shield:'#00ffff',speed:'#ffff00',multi:'#ff00ff',health:'#00ff00',weapon:'#ff8800',magnet:'#ff44ff'};
    var puI={shield:'S',speed:'»',multi:'M',health:'+',weapon:'W',magnet:'U'};
    for(var i=0;i<powerups.length;i++){
      var p=powerups[i],col=puC[p.type]||'#fff';
      ctx.fillStyle=col;ctx.beginPath();ctx.arc(p.x,p.y,p.w/2,0,6.28);ctx.fill();
      ctx.fillStyle='#000';ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(puI[p.type],p.x,p.y+1);
    }
    // Bullets
    for(var i=0;i<bullets.length;i++){var b=bullets[i];
      if(b.friendly){
        ctx.fillStyle=powerUps.pierce>0?'#ff8844':'#00ffff';
        ctx.fillRect(b.x-b.w/2,b.y-b.h/2,b.w,b.h);
        if(powerUps.explode>0){ctx.fillStyle='rgba(255,136,0,0.3)';ctx.beginPath();ctx.arc(b.x,b.y,b.w,0,6.28);ctx.fill();}
        if(powerUps.homing>0){ctx.fillStyle='rgba(68,204,255,0.2)';ctx.beginPath();ctx.arc(b.x,b.y,b.w+2,0,6.28);ctx.fill();}
      }else{
        var bw=b.w;
        var col=b.dmg>3?'#ff0044':b.dmg>2?'#ff4400':'#ff8800';
        ctx.globalAlpha=0.3;ctx.fillStyle=col;ctx.beginPath();ctx.arc(b.x,b.y,bw*0.9,0,6.28);ctx.fill();
        ctx.globalAlpha=0.6;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,bw*0.35,0,6.28);ctx.fill();
        ctx.globalAlpha=1;ctx.fillStyle=col;ctx.beginPath();ctx.arc(b.x,b.y,bw*0.5,0,6.28);ctx.fill();
      }
    }
    // Enemies
    for(var i=0;i<enemies.length;i++){
      var e=enemies[i];
      if(e.hp<e.maxHp){var bw=e.w;ctx.fillStyle='#222';ctx.fillRect(e.x-bw/2,e.y-e.h/2-7,bw,3);ctx.fillStyle=e.hp/e.maxHp>0.5?'#0f0':e.hp/e.maxHp>0.25?'#ff0':'#f00';ctx.fillRect(e.x-bw/2,e.y-e.h/2-7,bw*(e.hp/e.maxHp),3);}
      if(e.type==='boss'){
        ctx.fillStyle='#cc0033';ctx.beginPath();ctx.moveTo(e.x,e.y-e.h/2);ctx.lineTo(e.x-e.w/2,e.y-8);ctx.lineTo(e.x-e.w/2+12,e.y+e.h/2);ctx.lineTo(e.x,e.y+e.h/2);ctx.lineTo(e.x+e.w/2-12,e.y+e.h/2);ctx.lineTo(e.x+e.w/2,e.y-8);ctx.closePath();ctx.fill();
        ctx.fillStyle='#ff6644';ctx.beginPath();ctx.arc(e.x,e.y,13,0,6.28);ctx.fill();
        ctx.fillStyle='#ff0';ctx.beginPath();ctx.arc(e.x,e.y,6+Math.sin(frameCount*0.1)*1.5,0,6.28);ctx.fill();
        ctx.strokeStyle='#cc0033';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(e.x-e.w/2,e.y-8);ctx.lineTo(e.x-e.w/2-8,e.y+12+Math.sin(frameCount*0.05)*5);ctx.stroke();
        ctx.beginPath();ctx.moveTo(e.x+e.w/2,e.y-8);ctx.lineTo(e.x+e.w/2+8,e.y+12+Math.sin(frameCount*0.05+1)*5);ctx.stroke();
      }else if(e.type==='tank'){
        ctx.fillStyle='#775500';ctx.fillRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h);
        ctx.fillStyle='#997722';ctx.fillRect(e.x-e.w/2+2,e.y-e.h/2+2,e.w-4,e.h/2-2);
        ctx.fillStyle='#ff4400';ctx.fillRect(e.x-4,e.y-2,8,4);ctx.fillRect(e.x-2,e.y-6,4,10);
      }else if(e.type==='fast'){
        ctx.fillStyle='#ff8800';ctx.beginPath();ctx.moveTo(e.x,e.y-e.h/2);ctx.lineTo(e.x+e.w/2,e.y+4);ctx.lineTo(e.x+e.w/3,e.y+e.h/2);ctx.lineTo(e.x-e.w/3,e.y+e.h/2);ctx.lineTo(e.x-e.w/2,e.y+4);ctx.closePath();ctx.fill();
        ctx.fillStyle='#ffcc44';ctx.beginPath();ctx.arc(e.x-3,e.y-4,3,0,6.28);ctx.fill();
      }else if(e.type==='sniper'){
        ctx.fillStyle='#9900cc';ctx.beginPath();ctx.moveTo(e.x,e.y-e.h/2);ctx.lineTo(e.x+e.w/2-4,e.y+6);ctx.lineTo(e.x+5,e.y+e.h/2);ctx.lineTo(e.x-5,e.y+e.h/2);ctx.lineTo(e.x-e.w/2+4,e.y+6);ctx.closePath();ctx.fill();
        ctx.fillStyle='rgba(255,0,0,0.2)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(player.x,player.y);ctx.stroke();
        ctx.fillStyle='#334';ctx.fillRect(e.x+e.w/2-8,e.y-1,10,4);ctx.fillRect(e.x+e.w/2-6,e.y-3,4,8);
        ctx.fillStyle='#ff0044';ctx.beginPath();ctx.arc(e.x+4,e.y+5,2,0,6.28);ctx.fill();
      }else{
        ctx.fillStyle='#cc0044';ctx.beginPath();ctx.arc(e.x,e.y,e.w/2,0,6.28);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(e.x-5,e.y-3,3,0,6.28);ctx.fill();ctx.beginPath();ctx.arc(e.x+5,e.y-3,3,0,6.28);ctx.fill();
        ctx.fillStyle='#800';ctx.beginPath();ctx.arc(e.x-5,e.y-3,1.5,0,6.28);ctx.fill();ctx.beginPath();ctx.arc(e.x+5,e.y-3,1.5,0,6.28);ctx.fill();
      }
    }
    // Player effects
    var px=player.x,py=player.y;
    if(player.shield){
      if(isMobile){ctx.strokeStyle='#00ffff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,py,player.w/2+12,0,6.28);ctx.stroke();}
      else{
        ctx.globalAlpha=0.15;ctx.fillStyle='#00ffff';ctx.beginPath();ctx.arc(px,py,player.w/2+16,0,6.28);ctx.fill();
        ctx.globalAlpha=0.4+Math.sin(frameCount*0.15)*0.15;ctx.strokeStyle='#00ffff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(px,py,player.w/2+12+Math.sin(frameCount*0.08)*3,0,6.28);ctx.stroke();
        ctx.strokeStyle='rgba(0,255,255,'+(0.2+Math.sin(frameCount*0.12)*0.1)+')';ctx.lineWidth=1;ctx.beginPath();ctx.arc(px,py,player.w/2+18+Math.sin(frameCount*0.1+1)*4,0,6.28);ctx.stroke();
        ctx.globalAlpha=1;
      }
    }
    if(player.magnet&&!isMobile){
      var mr=75+Math.sin(frameCount*0.06)*10;
      ctx.globalAlpha=0.08;ctx.fillStyle='#ff44ff';ctx.beginPath();ctx.arc(px,py,mr+10,0,6.28);ctx.fill();
      ctx.globalAlpha=0.3+Math.sin(frameCount*0.08)*0.1;ctx.strokeStyle='#ff44ff';ctx.lineWidth=2;ctx.setLineDash([5,8]);ctx.beginPath();ctx.arc(px,py,mr,0,6.28);ctx.stroke();ctx.setLineDash([]);
      ctx.strokeStyle='rgba(255,68,255,'+(0.15+Math.sin(frameCount*0.1)*0.08)+')';ctx.lineWidth=1;ctx.beginPath();ctx.arc(px,py,mr-18,0,6.28);ctx.stroke();
      for(var ri=0;ri<6;ri++){var a=frameCount*0.03+ri*1.047;ctx.fillStyle='rgba(255,68,255,'+(0.3+Math.sin(frameCount*0.12+ri)*0.15)+')';ctx.beginPath();ctx.arc(px+Math.cos(a)*mr,py+Math.sin(a)*mr,3,0,6.28);ctx.fill();}
      ctx.globalAlpha=1;
    }
    if(powerUps.aura>0){
      var ar=50+powerUps.aura*15;
      if(isMobile){ctx.strokeStyle='rgba(255,68,0,0.3)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,py,ar,0,6.28);ctx.stroke();}
      else{
        ctx.globalAlpha=0.1;ctx.fillStyle='#ff4400';ctx.beginPath();ctx.arc(px,py,ar+8,0,6.28);ctx.fill();
        ctx.strokeStyle='rgba(255,68,0,'+(0.3+Math.sin(frameCount*0.1)*0.15)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,py,ar+Math.sin(frameCount*0.06)*6,0,6.28);ctx.stroke();
        ctx.strokeStyle='rgba(255,100,0,'+(0.15+Math.sin(frameCount*0.08+1)*0.1)+')';ctx.lineWidth=1;ctx.beginPath();ctx.arc(px,py,ar+8+Math.sin(frameCount*0.1+2)*4,0,6.28);ctx.stroke();
        if(frameCount%2===0){for(var fi=0;fi<3;fi++){var a=frameCount*0.04+fi*2.094;ctx.fillStyle='rgba(255,100,0,0.6)';ctx.beginPath();ctx.arc(px+Math.cos(a)*(ar-6),py+Math.sin(a)*(ar-6),2,0,6.28);ctx.fill();}}
        ctx.globalAlpha=1;
      }
    }
    if(player.invTime>0&&Math.floor(frameCount/4)%2===0)ctx.globalAlpha=0.3;
    ctx.fillStyle=player.shield?'#00ccff':'#3377dd';
    ctx.beginPath();ctx.moveTo(px,py-player.h/2);ctx.lineTo(px-10,py-7);ctx.lineTo(px-player.w/2,py+player.h/2-4);ctx.lineTo(px-6,py+player.h/2);ctx.lineTo(px-3,py+4);ctx.lineTo(px+3,py+4);ctx.lineTo(px+6,py+player.h/2);ctx.lineTo(px+player.w/2,py+player.h/2-4);ctx.lineTo(px+10,py-7);ctx.closePath();ctx.fill();
    ctx.fillStyle='#88ccff';ctx.beginPath();ctx.arc(px,py-5,4,0,6.28);ctx.fill();
    var ef=6+Math.random()*4;ctx.fillStyle='#ff8800';ctx.beginPath();ctx.moveTo(px-4,py+player.h/2);ctx.lineTo(px,py+player.h/2+ef);ctx.lineTo(px+4,py+player.h/2);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ffcc00';ctx.beginPath();ctx.moveTo(px-2,py+player.h/2);ctx.lineTo(px,py+player.h/2+ef*0.5);ctx.lineTo(px+2,py+player.h/2);ctx.closePath();ctx.fill();
    ctx.globalAlpha=1;
    // Active effect overlays
    if(activeEffects.slow>0){ctx.fillStyle='rgba(0,100,255,0.1)';ctx.fillRect(-5,-5,W+10,H+10);}
    if(activeEffects.dboost>0){ctx.fillStyle='rgba(255,0,255,0.08)';ctx.fillRect(-5,-5,W+10,H+10);}
    if(activeEffects.rage>0){ctx.fillStyle='rgba(255,30,0,0.1)';ctx.fillRect(-5,-5,W+10,H+10);}
    if(activeEffects.coinboost>0){ctx.fillStyle='rgba(255,221,0,0.08)';ctx.fillRect(-5,-5,W+10,H+10);}
    if(activeEffects.doublecoin>0){ctx.fillStyle='rgba(255,170,0,0.08)';ctx.fillRect(-5,-5,W+10,H+10);}
    if(activeEffects.blackhole>0){
      if(isMobile){ctx.strokeStyle='rgba(120,0,255,0.4)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(W/2,H/2,70,0,6.28);ctx.stroke();}
      else{
        ctx.save();ctx.translate(W/2,H/2);ctx.rotate(frameCount*0.02);
        ctx.strokeStyle='rgba(120,0,255,'+(0.3+Math.sin(frameCount*0.1)*0.15)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,60+Math.sin(frameCount*0.08)*20,0,6.28);ctx.stroke();
        ctx.strokeStyle='rgba(200,0,255,'+(0.2+Math.sin(frameCount*0.12)*0.1)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,90+Math.sin(frameCount*0.06)*25,0,6.28);ctx.stroke();
        ctx.restore();
      }
    }
    // Particles
    var pLen=particles.length;
    var pMax=isMobile?15:30;
    for(var i=0;i<pLen;i++){var p=particles[i];if(pMax>i){ctx.globalAlpha=p.life;ctx.fillStyle=p.c;ctx.fillRect(p.x-p.sz*p.life/2,p.y-p.sz*p.life/2,p.sz*p.life,p.sz*p.life);}}
    ctx.globalAlpha=1;
    // Floating texts
    var tMax=isMobile?8:12;
    for(var i=0;i<texts.length&&i<tMax;i++){var t=texts[i];ctx.globalAlpha=t.life;ctx.fillStyle=t.c;ctx.font='bold '+t.s+'px Arial';ctx.textAlign='center';ctx.fillText(t.t,t.x,t.y);}
    ctx.globalAlpha=1;
    ctx.restore();
  }

  // ========== HUD ==========
  function updateHUD(){
    var pct=(player.hp/player.maxHp)*100;
    document.getElementById('health-fill').style.width=pct+'%';
    document.getElementById('health-fill').style.backgroundColor=pct>60?'#0f0':pct>30?'#ff0':'#f00';
    document.getElementById('health-text').textContent='HP: '+player.hp+'/'+player.maxHp;
    document.getElementById('score-display').textContent='Score: '+score;
    document.getElementById('level-display').textContent='Level '+level;
    document.getElementById('wave-display').textContent='Wave: '+wave;
    document.getElementById('coin-display').textContent='🪙 '+coins;
    document.getElementById('star-display').textContent='⭐ '+stars;
    var wvl=((wave-1)%3)+1;
    var prog=(enemyCount/Math.max(enemyTotal,1))*100;
    document.getElementById('wave-progress-fill').style.width=prog+'%';
    document.getElementById('wave-progress-text').textContent='Wave '+wvl+'/3';
    var cd=document.getElementById('combo-display');
    if(combo>1){cd.textContent='Combo x'+combo;cd.style.color=combo>5?'#f0f':combo>3?'#ff0':'#0ff';}else cd.textContent='';
    // Item bar — rebuild every 3 frames to save CPU
    if(frameCount%3!==0)return;
    var slotsContainer=document.getElementById('item-slots');
    slotsContainer.innerHTML='';
    var maxSlots=12;
    var shown=itemKeys.slice(0,maxSlots);
    for(var i=0;i<shown.length;i++){
      var key=shown[i];
      var def=itemDefs[key];
      var slotEl=document.createElement('div');
      slotEl.className='item-slot';
      slotEl.dataset.slot=i;
      slotEl.dataset.key=key;
      if(inventory[key]>0){
        slotEl.classList.add('has-item');
        if(itemCooldowns[key]>0)slotEl.classList.add('on-cooldown');
        slotEl.innerHTML='<span class="item-key">'+(i+1)+'</span><span class="item-buy-top">+</span><span class="item-icon">'+def.icon+'</span><span class="item-count">'+inventory[key]+'</span>';
        slotEl.addEventListener('pointerdown',function(e){
          e.preventDefault();
          if(e.target.closest('.item-buy-top')){
            var k=this.dataset.key;
            if(coins>=itemDefs[k].cost&&state==='playing'){coins-=itemDefs[k].cost;inventory[k]++;SFX.powerup();sdkSave();}
          }else{
            var sl=parseInt(this.dataset.slot);
            var k=itemKeys[sl];
            if(k&&inventory[k]>0&&itemCooldowns[k]<=0)useItem(sl);
          }
        });
      }else{
        slotEl.classList.add('item-buy');
        if(coins<def.cost)slotEl.classList.add('cant-afford');
        slotEl.innerHTML='<span class="item-key">'+(i+1)+'</span><span class="item-icon">'+def.icon+'</span><span class="item-price-buy">+🪙'+def.cost+'</span>';
        slotEl.addEventListener('pointerdown',function(e){
          e.preventDefault();
          var k=this.dataset.key;
          if(coins>=itemDefs[k].cost&&state==='playing'){coins-=itemDefs[k].cost;inventory[k]++;SFX.powerup();sdkSave();}
        });
      }
      slotsContainer.appendChild(slotEl);
    }
    var itemBar=document.getElementById('item-bar');
    itemBar.style.display='';
    document.getElementById('item-scroll-left').style.display=shown.length>4?'':'none';
    document.getElementById('item-scroll-right').style.display=shown.length>4?'':'none';
  }

  // ========== GAME LOOP ==========
  function loop(time){
    if(state!=='playing')return;
    var dt=Math.min((time-lastTime)/16.667,3);lastTime=time;
    update(dt);draw();updateHUD();
    requestAnimationFrame(loop);
  }

  // ========== SCREENS ==========
  function hideAll(){['loading-screen','main-menu','how-to-play','scores-screen','shop-screen','game-canvas','game-hud','pause-overlay','game-over','level-complete'].forEach(function(id){document.getElementById(id).classList.add('hidden');});}
  function showMenu(){hideAll();state='menu';document.getElementById('main-menu').classList.remove('hidden');document.getElementById('best-score').textContent=bestScore;document.getElementById('current-level').textContent=level;document.getElementById('menu-coins').textContent=coins;document.getElementById('menu-stars').textContent=stars;sdkReady();}
  function startGame(){hideAll();state='playing';resize();canvas.classList.remove('hidden');document.getElementById('game-hud').classList.remove('hidden');initAudio();score=0;kills=0;combo=1;comboTimer=0;wave=1;initGame();lastTime=performance.now();requestAnimationFrame(loop);}

  // ========== SHOP ==========
  var shopTab='upgrades';
  function showShop(){hideAll();state='menu';document.getElementById('shop-screen').classList.remove('hidden');shopTab='upgrades';renderShopTabs();renderShop();}
  function renderShopTabs(){
    document.querySelectorAll('.shop-tab').forEach(function(t){
      t.classList.toggle('active',t.dataset.tab===shopTab);
    });
    document.getElementById('shop-upgrades').classList.toggle('hidden',shopTab!=='upgrades');
    document.getElementById('shop-power').classList.toggle('hidden',shopTab!=='power');
    document.getElementById('shop-items').classList.toggle('hidden',shopTab!=='items');
    document.getElementById('shop-stars').classList.toggle('hidden',shopTab!=='stars');
  }
  function renderShop(){
    document.getElementById('shop-coin-count').textContent=coins;
    document.getElementById('shop-star-count').textContent=stars;
    if(shopTab==='upgrades'){
      Object.keys(shopData).forEach(function(key){
        var data=shopData[key],lv=shopUpgrades[key],cost=lv<data.maxLv?data.cost[lv]:null,maxed=lv>=data.maxLv;
        var el=document.querySelector('#shop-upgrades .shop-item[data-item="'+key+'"]');if(!el)return;
        var lvEl=document.getElementById('shop-'+key+'-lv');if(lvEl)lvEl.textContent=lv;
        var costEl=el.querySelector('.shop-cost');
        if(maxed){costEl.innerHTML='<span style="color:#00ff88">MAXED</span>';el.classList.add('maxed');el.classList.remove('cant-afford');}
        else{costEl.innerHTML='<span class="coin-icon">🪙</span> '+cost;el.classList.remove('maxed');el.classList.toggle('cant-afford',coins<cost);}
      });
    }else if(shopTab==='power'){
      Object.keys(powerData).forEach(function(key){
        var data=powerData[key],lv=powerUps[key],cost=lv<data.maxLv?data.cost[lv]:null,maxed=lv>=data.maxLv;
        var el=document.querySelector('#shop-power .shop-item[data-item="'+key+'"]');if(!el)return;
        var lvEl=document.getElementById('shop-'+key+'-lv');if(lvEl)lvEl.textContent=lv;
        var costEl=el.querySelector('.shop-cost');
        if(maxed){costEl.innerHTML='<span style="color:#00ff88">MAXED</span>';el.classList.add('maxed');el.classList.remove('cant-afford');}
        else{costEl.innerHTML='<span class="coin-icon">🪙</span> '+cost;el.classList.remove('maxed');el.classList.toggle('cant-afford',coins<cost);}
      });
    }else if(shopTab==='items'){
      itemKeys.forEach(function(key){
        var def=itemDefs[key],count=inventory[key];
        var el=document.querySelector('#shop-items .shop-item[data-item="'+key+'"]');if(!el)return;
        var countEl=document.getElementById('inv-'+key);if(countEl)countEl.textContent=count;
        var costEl=el.querySelector('.shop-cost');
        costEl.innerHTML='<span class="coin-icon">🪙</span> '+def.cost;
        el.classList.remove('maxed','cant-afford');
        el.classList.toggle('cant-afford',coins<def.cost);
      });
    }else if(shopTab==='stars'){
      Object.keys(starData).forEach(function(key){
        var data=starData[key],lv=starUps[key],cost=lv<data.maxLv?data.cost[lv]:null,maxed=lv>=data.maxLv;
        var el=document.querySelector('#shop-stars .shop-item[data-star="'+key+'"]');if(!el)return;
        var lvEl=document.getElementById('star-'+key+'-lv');if(lvEl)lvEl.textContent=lv;
        var costEl=el.querySelector('.shop-cost');
        if(maxed){costEl.innerHTML='<span style="color:#00ff88">MAXED</span>';el.classList.add('maxed');el.classList.remove('cant-afford');}
        else{costEl.innerHTML='⭐ '+cost;el.classList.remove('maxed');el.classList.toggle('cant-afford',stars<cost);}
      });
    }
  }
  function buyShopItem(key){
    if(shopTab==='items'){
      var def=itemDefs[key];if(!def)return;
      if(coins<def.cost)return;
      coins-=def.cost;inventory[key]++;SFX.powerup();sdkSave();renderShop();
      return;
    }
    if(shopTab==='power'){
      var data=powerData[key],lv=powerUps[key];if(lv>=data.maxLv)return;
      var cost=data.cost[lv];if(coins<cost)return;
      coins-=cost;powerUps[key]=lv+1;SFX.powerup();sdkSave();renderShop();
      return;
    }
    if(shopTab==='stars'){
      var data=starData[key],lv=starUps[key];if(lv>=data.maxLv)return;
      var cost=data.cost[lv];if(stars<cost)return;
      stars-=cost;starUps[key]=lv+1;SFX.powerup();sdkSave();renderShop();
      return;
    }
    var data=shopData[key],lv=shopUpgrades[key];if(lv>=data.maxLv)return;
    var cost=data.cost[lv];if(coins<cost)return;
    coins-=cost;shopUpgrades[key]=lv+1;SFX.powerup();sdkSave();renderShop();
  }

  // ========== SCORES ==========
  function renderScores(){var s;try{s=JSON.parse(localStorage.getItem('cd_hs')||'[]');}catch(e){s=[];}s.push({score:score,level:level});s.sort(function(a,b){return b.score-a.score;});s=s.slice(0,10);try{localStorage.setItem('cd_hs',JSON.stringify(s));}catch(e){}var list=document.getElementById('scores-list');if(!s.length){list.innerHTML='<p class="no-scores">No scores yet!</p>';return;}list.innerHTML=s.map(function(v,i){return '<div class="score-item"><span>#'+(i+1)+'</span><span>'+v.score+'</span><span>Lv.'+v.level+'</span></div>';}).join('');}

  // ========== INIT ==========
  sdkLoad();
  try{if(ytGame)ytGame.firstFrameReady();}catch(e){}

  var pf=document.getElementById('progress-fill');
  var lp=document.getElementById('load-percent');
  var loadPct=0;
  var loadInterval=setInterval(function(){
    loadPct+=Math.random()*25+10;
    if(loadPct>=100){loadPct=100;clearInterval(loadInterval);
      setTimeout(function(){hideAll();state='menu';document.getElementById('main-menu').classList.remove('hidden');document.getElementById('best-score').textContent=bestScore;document.getElementById('current-level').textContent=level;document.getElementById('menu-coins').textContent=coins;document.getElementById('menu-stars').textContent=stars;sdkReady();},300);
    }
    if(pf)pf.style.width=loadPct+'%';
    if(lp)lp.textContent=Math.floor(loadPct)+'%';
  },150);

  // ========== BUTTONS ==========
  document.getElementById('btn-play').addEventListener('click',startGame);
  document.getElementById('btn-shop').addEventListener('click',showShop);
  document.getElementById('btn-how').addEventListener('click',function(){hideAll();document.getElementById('how-to-play').classList.remove('hidden');});
  document.getElementById('btn-scores').addEventListener('click',function(){hideAll();document.getElementById('scores-screen').classList.remove('hidden');renderScores();});
  document.getElementById('btn-back-how').addEventListener('click',showMenu);
  document.getElementById('btn-back-scores').addEventListener('click',showMenu);
  document.getElementById('btn-back-shop').addEventListener('click',showMenu);
  document.getElementById('btn-resume').addEventListener('click',function(){state='playing';document.getElementById('pause-overlay').classList.add('hidden');lastTime=performance.now();requestAnimationFrame(loop);});
  document.getElementById('btn-quit').addEventListener('click',function(){document.getElementById('pause-overlay').classList.add('hidden');if(score>bestScore)bestScore=score;sdkSave();showMenu();});
  document.getElementById('btn-retry').addEventListener('click',startGame);
  document.getElementById('btn-home').addEventListener('click',showMenu);
  document.getElementById('btn-next-level').addEventListener('click',function(){wave=1;startGame();});
  document.querySelectorAll('.shop-item').forEach(function(el){el.addEventListener('click',function(){
    var key=el.dataset.item||el.dataset.star;if(key)buyShopItem(key);
  });});
  document.querySelectorAll('.shop-tab').forEach(function(t){t.addEventListener('click',function(){shopTab=t.dataset.tab;renderShopTabs();renderShop();});});
  // Item bar scroll
  document.getElementById('item-scroll-left').addEventListener('click',function(){document.getElementById('item-slots').scrollBy({left:-150,behavior:'smooth'});});
  document.getElementById('item-scroll-right').addEventListener('click',function(){document.getElementById('item-slots').scrollBy({left:150,behavior:'smooth'});});

})();
