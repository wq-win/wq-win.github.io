(function() {
    'use strict';
    const E=window.ForestDefense,canvas=document.getElementById('battle'),ctx=canvas.getContext('2d');
    let state=E.create(),selectedType='arrow',selectedSlot=-1,paused=false,speed=1,last=0,accumulator=0,wasState='ready';
    const $=id=>document.getElementById(id);
    const terrain=document.createElement('canvas');
    terrain.width=1000;
    terrain.height=600;
    const g=terrain.getContext('2d');
    let seed=73191;
    function rnd() {
        seed=(seed*1664525+1013904223)>>>0;
        return seed/4294967296;
    }
    function ellipse(c,x,y,rx,ry,color) {
        c.fillStyle=color;
        c.beginPath();
        c.ellipse(x,y,rx,ry,0,0,Math.PI*2);
        c.fill();
    }
    function poly(c,points,color,stroke) {
        c.beginPath();
        points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));
        c.closePath();
        c.fillStyle=color;
        c.fill();
        if(stroke) {
            c.strokeStyle=stroke;
            c.lineWidth=2;
            c.stroke();
        }
    }
    // Layered, irregular silhouettes keep the forest painterly instead of geometric.
    function tree(c,x,y,size,variant) {
        const shadow = c.createRadialGradient(x+10,y+3,2,x+10,y+3,size*.55);
        shadow.addColorStop(0,'#102c29aa');
        shadow.addColorStop(1,'#102c2900');
        ellipse(c,x+10,y+3,size*.62,size*.24,shadow);
        const bark=c.createLinearGradient(x-5,0,x+5,0);
        bark.addColorStop(0,'#423d2c'); bark.addColorStop(.4,'#988054'); bark.addColorStop(1,'#514b31');
        poly(c,[[x-7,y+2],[x-4,y-size*.7],[x+4,y-size*.7],[x+7,y+2]],bark);
        for(let k=0;k<4;k++) {
            const yy=y-size*(.13+k*.19),w=size*(.43-k*.078),tip=yy-size*.43;
            c.save();
            c.shadowColor='#12382b88'; c.shadowBlur=5; c.shadowOffsetY=4;
            c.beginPath(); c.moveTo(x,tip);
            // Small downward boughs break every formerly straight triangular edge.
            for(let j=1;j<=5;j++) {
                const py=tip+(yy-tip)*j/5, pw=w*j/5;
                c.quadraticCurveTo(x-pw*.57,py-4,x-pw,py+2);
                c.lineTo(x-pw*.66,py-1);
            }
            c.quadraticCurveTo(x-w*.4,yy+8,x,yy+5);
            c.quadraticCurveTo(x+w*.55,yy+8,x+w,yy+2);
            for(let j=5;j>0;j--) {
                const py=tip+(yy-tip)*j/5,pw=w*j/5;
                c.lineTo(x+pw*.66,py-1);
                c.quadraticCurveTo(x+pw*.8,py-6,x+w*(j-1)/5,tip+(yy-tip)*(j-1)/5);
            }
            c.closePath();
            const foliage=c.createLinearGradient(x-w,tip,x+w,yy);
            foliage.addColorStop(0,variant?'#8db874':'#8cab62');
            foliage.addColorStop(.32,variant?'#4d896a':'#649252');
            foliage.addColorStop(.7,variant?'#24594d':'#386c43');
            foliage.addColorStop(1,'#173e37');
            c.fillStyle=foliage; c.fill(); c.shadowBlur=0; c.shadowOffsetY=0;
            c.strokeStyle='#bcce7a40'; c.lineWidth=.8;
            for(let j=0;j<28;j++) {
                const t=rnd(),xx=x+(rnd()-.5)*w*1.5*t,py=tip+(yy-tip)*t;
                c.beginPath();c.moveTo(xx,py);c.lineTo(xx-3,py+3);c.stroke();
            }
            c.restore();
        }
        // Mossy roots and light catching the forest floor.
        ellipse(c,x-5,y+3,7,2,'#a8b85d80');
    }
    function rock(c,x,y,s) {
        ellipse(c,x+3,y+4,s,s*.4,'#132f2344');
        const stone=c.createLinearGradient(x-s,y-s,x+s,y+s*.3);
        stone.addColorStop(0,'#c0c4ae'); stone.addColorStop(.4,'#82958a'); stone.addColorStop(1,'#405a56');
        poly(c,[[x-s,y],[x-s*.65,y-s*.8],[x+s*.15,y-s],[x+s*.8,y-s*.45],[x+s,y],[x+s*.3,y+s*.22]],stone);
        poly(c,[[x-s,y],[x-s*.65,y-s*.8],[x+s*.15,y-s],[x,y-s*.15]],'#91a09a');
        poly(c,[[x,y-s*.15],[x+s*.15,y-s],[x+s*.8,y-s*.45],[x+s,y]],'#536865');
        for(let i=0;i<9;i++) {
            const px=x-s*.6+(i%3)*s*.22, py=y-s*.45+Math.floor(i/3)*s*.07;
            ellipse(c,px,py,s*.14,s*.055,i%2?'#acb77488':'#6d874c99');
        }
        c.strokeStyle='#d0d2b86b';c.lineWidth=.8;c.beginPath();c.moveTo(x-s*.62,y-s*.78);c.lineTo(x+s*.1,y-s*.95);c.stroke();
    }
    function distanceToPath(x,y) {
        return Math.min(...E.PATH.slice(1).map((p,i)=> {
            const a=E.PATH[i],dx=p[0]-a[0],dy=p[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
            return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);
        }));
    }
    function drawTerrain() {
        const grad=g.createLinearGradient(0,0,0,600);
        grad.addColorStop(0,'#355f47');
        grad.addColorStop(.5,'#6b8a46');
        grad.addColorStop(1,'#3c6947');
        g.fillStyle=grad;
        g.fillRect(0,0,1000,600);
        for(let i=0; i<5000; i++) {
            let x=rnd()*1000,y=rnd()*600;
            ellipse(g,x,y,1+rnd()*5,1+rnd()*2,['#b3bf5b30','#d1d07928','#193e352b'][i%3]);
        }
        for(let i=0;i<35;i++) {
            const x=rnd()*1000,y=rnd()*600,r=30+rnd()*100;
            const light=g.createRadialGradient(x,y,1,x,y,r);
            light.addColorStop(0,'#d8ce6927');light.addColorStop(1,'#cbd57200');
            ellipse(g,x,y,r,r*.6,light);
        }
        // A cool blue river and bright waterfall frame the upper forest.
        g.beginPath();
        g.moveTo(910,-40);
        g.bezierCurveTo(850,80,1030,120,985,235);
        g.bezierCurveTo(950,305,1050,420,1060,650);
        g.lineWidth=105;
        g.strokeStyle='#354d48';
        g.stroke();
        g.lineWidth=77;
        g.strokeStyle='#3b8f9c';
        g.stroke();
        g.lineWidth=53;
        g.strokeStyle='#62bac2';
        g.stroke();
        for(let i=0; i<80; i++) {
            let x=890+rnd()*110,y=rnd()*270;
            g.strokeStyle='#c5f4dd60';
            g.lineWidth=1;
            g.beginPath();
            g.moveTo(x,y);
            g.lineTo(x+14+rnd()*13,y-4);
            g.stroke();
        }
        // Rounded ochre track, with raised earth and a softly lit center.
        g.lineCap='round';
        g.lineJoin='round';
        for(const [w,color] of [[91,'#354f3280'],[79,'#9c8e54'],[68,'#cfb57a'],[53,'#dec48b']]) {
            g.beginPath();
            E.PATH.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));
            g.strokeStyle=color;
            g.lineWidth=w;
            g.stroke();
        }
        for(let i=0; i<700; i++) {
            let x=rnd()*1000,y=rnd()*600,d=distanceToPath(x,y);
            if(d<29) {
                ellipse(g,x,y,1+rnd()*2.5,.6+rnd(),rnd()>.5?'#f4dda265':'#9b82443d');
            }
            else if(d<53) {
                ellipse(g,x,y,2+rnd()*5,1+rnd()*3,'#89994e');
                g.strokeStyle=i%2?'#cad582':'#a8bf62';g.lineWidth=1;
                for(let blade=0;blade<3;blade++) {g.beginPath();g.moveTo(x+blade*2,y);g.quadraticCurveTo(x+blade*2-2,y-4,x+blade*2-4,y-7-rnd()*4);g.stroke();}
            }
        }
        const decor=[];
        for(let i=0; i<320; i++) {
            let x=rnd()*1000,y=rnd()*620;
            let nearSlot=E.SLOTS.some(p=>Math.hypot(x-p[0],y-p[1])<65);
            if(distanceToPath(x,y)<65||nearSlot||x>890&&y<300)continue;
            decor.push( {
                x,y,s:35+rnd()*65,type:rnd()
            });
        }
        decor.sort((a,b)=>a.y-b.y).forEach(d=>d.type>.19?tree(g,d.x,d.y,d.s,d.type>.65):rock(g,d.x,d.y,d.s*.3));
        for(let i=0; i<180; i++) {
            let x=rnd()*970,y=rnd()*600;
            if(distanceToPath(x,y)<45||E.SLOTS.some(p=>Math.hypot(x-p[0],y-p[1])<30))continue;
            g.strokeStyle='#81a35b';
            g.beginPath();
            g.moveTo(x,y);
            g.lineTo(x+2,y-7);
            g.stroke();
            ellipse(g,x+2,y-8,2.3,2.3,i%3?'#f4df8a':'#e9eee2');
        }
        E.SLOTS.forEach(([x,y])=> {
            ellipse(g,x,y+8,36,19,'#334b2d66');
            ellipse(g,x,y+3,31,17,'#adac7e');
            ellipse(g,x,y,27,14,'#c8c28f');
            for(let i=0; i<7; i++) {
                let a=i/7*Math.PI*2;
                rock(g,x+Math.cos(a)*29,y+Math.sin(a)*13,4);
            }
        });
        // Timber cave mouth and the final stone keep.
        rock(g,24,147,66);
        ellipse(g,15,153,31,41,'#172b28');
        g.fillStyle='#775d39';
        g.fillRect(0,107,52,11);
        g.fillRect(42,108,9,74);
        g.strokeStyle='#b38d4d';
        g.lineWidth=2;
        g.strokeRect(42,108,9,74);
        for(let x=938; x<1000; x+=29) {
            g.fillStyle='#82928b';
            g.fillRect(x,282,27,74);
            g.fillStyle='#a1aca0';
            g.fillRect(x-2,272,31,15);
            g.fillStyle='#546c64';
            g.fillRect(x+4,295,9,20);
        }
        for(let row=0;row<6;row++) {
            const yy=285+row*12;
            g.strokeStyle='#40595088';g.lineWidth=1;g.beginPath();g.moveTo(938,yy);g.lineTo(1000,yy);g.stroke();
            for(let xx=938+(row%2)*9;xx<1000;xx+=18){g.beginPath();g.moveTo(xx,yy);g.lineTo(xx,yy+12);g.stroke();}
            g.strokeStyle='#ccd3bc66';g.beginPath();g.moveTo(939,yy+2);g.lineTo(999,yy+2);g.stroke();
        }
        g.fillStyle='#4c5549';
        g.fillRect(966,318,34,40);
        g.strokeStyle='#2f453c';g.lineWidth=3;for(let xx=972;xx<1000;xx+=7){g.beginPath();g.moveTo(xx,320);g.lineTo(xx,355);g.stroke();}
        g.fillStyle='#9e4440';
        g.fillRect(943,286,13,38);
        poly(g,[[943,324],[949,316],[956,324]],'#9e4440');
    }
    function tower(c,t,x,y) {
        const selected=selectedSlot===E.SLOTS.findIndex(p=>p[0]===x&&p[1]===y);
        if(selected) {
            const st=E.stats(t);
            ellipse(c,x,y,st.range,st.range,'#92d6c21a');
            c.strokeStyle='#d8edb98c';
            c.setLineDash([7,6]);
            c.beginPath();
            c.arc(x,y,st.range,0,Math.PI*2);
            c.stroke();
            c.setLineDash([]);
        }
        ellipse(c,x+4,y+9,31,13,'#142b2766');
        poly(c,[[x-25,y],[x-22,y-38],[x+21,y-38],[x+25,y],[x,y+12]],'#7d9188','#364e46');
        poly(c,[[x-25,y],[x-22,y-38],[x,y-31],[x,y+12]],'#a3b0a0');
        for(let k=0; k<3; k++) {
            c.strokeStyle='#4e665a';
            c.beginPath();
            c.moveTo(x-22,y-k*12);
            c.lineTo(x,y+8-k*12);
            c.lineTo(x+23,y-k*12);
            c.stroke();
        }
        for(let row=0;row<3;row++) {
            for(let col=0;col<3;col++) {
                const bx=x-21+col*14+(row%2)*5,by=y-32+row*12;
                if(bx>x+18)continue;
                c.strokeStyle='#40594c99';c.lineWidth=1;c.beginPath();c.moveTo(bx,by);c.lineTo(bx,by+8);c.stroke();
                c.strokeStyle='#d7dfc46b';c.beginPath();c.moveTo(bx+2,by);c.lineTo(Math.min(x+19,bx+11),by+2);c.stroke();
            }
        }
        ellipse(c,x-12,y+3,8,3,'#7e98586b');
        ellipse(c,x,y-37,27,13,'#826644');
        ellipse(c,x,y-41,26,12,'#d3b77a');
        for(let k=0; k<5; k++) {
            let a=k/5*Math.PI*2;
            c.fillStyle='#d2bb83';
            c.fillRect(x+Math.cos(a)*22-5,y-46+Math.sin(a)*9,10,10);
        }
        poly(c,[[x-7,y-28],[x+7,y-25],[x+7,y-5],[x,y-10],[x-7,y-6]],E.TYPES[t.type].color);
        if(t.type==='magic') {
            let glow=c.createRadialGradient(x,y-68,1,x,y-68,30);
            glow.addColorStop(0,'#72eaff88');
            glow.addColorStop(1,'#39baff00');
            c.fillStyle=glow;
            c.fillRect(x-30,y-98,60,60);
            poly(c,[[x,y-91],[x-12,y-69],[x,y-51],[x+12,y-69]],'#55d7f0','#c7fcff');
            poly(c,[[x,y-91],[x-12,y-69],[x,y-65]],'#a4f4ff');
            poly(c,[[x,y-91],[x+12,y-69],[x,y-65]],'#268aca');
            c.strokeStyle='#ddffff';
            c.beginPath();
            c.moveTo(x,y-91);
            c.lineTo(x,y-51);
            c.stroke();
        }
        if(t.type==='arrow') {
            c.fillStyle='#4b6d38';
            c.fillRect(x-8,y-65,16,20);
            ellipse(c,x,y-72,8,8,'#f2ce91');
            poly(c,[[x-12,y-76],[x+12,y-76],[x+2,y-92]],'#86a74d');
            c.save();
            c.translate(x,y-60);
            c.rotate(t.angle);
            c.strokeStyle='#e6c585';
            c.lineWidth=3;
            c.beginPath();
            c.arc(9,0,14,-Math.PI/2,Math.PI/2);
            c.stroke();
            c.lineWidth=1;
            c.beginPath();
            c.moveTo(9,-14);
            c.lineTo(9,14);
            c.stroke();
            c.restore();
        }
        if(t.type==='cannon') {
            ellipse(c,x,y-49,17,12,'#735b35');
            c.save();
            c.translate(x,y-49);
            c.rotate(t.angle);
            c.fillStyle='#293f49';
            c.fillRect(-8,-11,37,22);
            c.fillStyle='#c39d5a';
            c.fillRect(0,-12,6,24);
            c.fillRect(23,-12,6,24);
            ellipse(c,29,0,5,11,'#172c32');
            c.restore();
        }
        for(let k=0;
        k<t.level;
        k++)ellipse(c,x-((t.level-1)*5)+k*10,y+14,3,3,'#ffdf7f');
    }
    function enemy(c,e) {
        const x=e.x,y=e.y,phase=Math.sin(state.time*11+e.id)*2,large=e.type==='brute'||e.type==='boss',s=e.type==='boss'?1.65:large?1.25:1;
        c.save();
        c.translate(x,y);
        c.scale(s,s);
        ellipse(c,2,6,13,5,'#18332855');
        c.strokeStyle='#463b2d';
        c.lineWidth=5;
        c.beginPath();
        c.moveTo(-5,-1);
        c.lineTo(-7,5+phase);
        c.moveTo(5,-1);
        c.lineTo(8,5-phase);
        c.stroke();
        ellipse(c,0,-8,large?12:8,11,large?'#90624a':'#665338');
        poly(c,[[-8,-19],[-18,-26],[-12,-12]],'#8ca34c');
        poly(c,[[8,-19],[18,-26],[12,-12]],'#8ca34c');
        ellipse(c,0,-20,large?12:10,10,e.slow?'#69b4a3':large?'#ac8c60':'#92ad49');
        ellipse(c,-4,-22,2,2,'#f6e8a1');
        ellipse(c,4,-22,2,2,'#f6e8a1');
        ellipse(c,-4,-22,1,1,'#29281b');
        ellipse(c,4,-22,1,1,'#29281b');
        if(large) {
            poly(c,[[-12,-26],[-8,-37],[-2,-27]],'#ddd1ac');
            poly(c,[[12,-26],[8,-37],[2,-27]],'#ddd1ac');
            c.fillStyle='#586e6b';
            c.fillRect(-13,-12,9,11);
        }
        else if(e.type==='runner') {
            poly(c,[[-9,-27],[0,-35],[11,-27]],'#8d4e3f');
        }
        c.strokeStyle='#6d4930';
        c.lineWidth=3;
        c.beginPath();
        c.moveTo(10,-9);
        c.lineTo(18,-22);
        c.stroke();
        c.fillStyle='#cccfac';
        c.fillRect(15,-24,6,5);
        c.fillStyle='#293d30';
        c.fillRect(-15,-44,30,5);
        c.fillStyle=e.type==='boss'?'#eebc65':'#ed8266';
        c.fillRect(-14,-43,28*Math.max(0,e.hp/e.maxHp),3);
        c.restore();
    }
    function draw() {
        ctx.clearRect(0,0,1000,600);
        ctx.drawImage(terrain,0,0);
        const things=state.enemies.map(e=>( {
            y:e.y,draw:()=>enemy(ctx,e)
        }));
        state.towers.forEach((t,i)=> {
            if(t)things.push( {
                y:E.SLOTS[i][1],draw:()=>tower(ctx,t,...E.SLOTS[i])
            });
        });
        things.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
        state.effects.forEach(e=> {
            let f=1-e.life/e.max;
            ctx.globalAlpha=Math.min(1,e.life*8);
            ctx.strokeStyle=e.type==='magic'?'#99f5ff':e.type==='cannon'?'#ffce73':'#fff4bc';
            ctx.lineWidth=e.type==='magic'?3:2;
            if(e.type==='cannon') {
                ellipse(ctx,e.tx,e.ty,12+f*45,12+f*45,'#ffd36e55');
                ellipse(ctx,e.tx,e.ty,6+f*18,6+f*18,'#fff3ba99');
            }
            else {
                ctx.beginPath();
                ctx.moveTo(e.x,e.y);
                if(e.type==='magic')ctx.lineTo((e.x+e.tx)/2+12,(e.y+e.ty)/2-8);
                ctx.lineTo(e.tx,e.ty);
                ctx.stroke();
            }
            ctx.globalAlpha=1;
        });
    }
    const slotButtons=E.SLOTS.map(([x,y],i)=> {
        const b=document.createElement('button');
        b.className='td-slot';
        b.style.left=x/10+'%';
        b.style.top=y/6+'%';
        b.textContent='+';
        b.addEventListener('click',()=> {
            if(paused||['cleared','won','lost'].includes(state.state))return;
            selectedSlot=i;
            if(!state.towers[i]) {
                if(E.build(state,i,selectedType))announce(`${i+1} 号位建成${E.TYPES[selectedType].name}。`);
                else announce(`金币不足，${E.TYPES[selectedType].name}需要 ${E.TYPES[selectedType].cost} 金币。`);
            }
            sync();
        });
        $('slots').appendChild(b);
        return b;
    });
    function announce(text) {
        $('announcement').textContent=text;
    }
    function select(type) {
        selectedType=type;
        selectedSlot=-1;
        sync();
    }
    function sync() {
        const ended=['cleared','won','lost'].includes(state.state);
        $('level').textContent=state.level;
        $('health').textContent=state.health;
        $('gold').textContent=state.gold;
        $('wave').textContent=state.wave;
        document.querySelectorAll('[data-tower]').forEach(b=> {
            b.classList.toggle('selected',b.dataset.tower===selectedType);
            b.setAttribute('aria-pressed',b.dataset.tower===selectedType);
            b.disabled=ended;
        });
        slotButtons.forEach((b,i)=> {
            const t=state.towers[i];
            b.classList.toggle('built',!!t);
            b.classList.toggle('chosen',selectedSlot===i);
            b.disabled=paused||ended;
            b.setAttribute('aria-label',t?`${i+1} 号位 ${E.TYPES[t.type].name} ${t.level} 级，选择查看升级`:`${i+1} 号空建筑位，建造${E.TYPES[selectedType].name}，${E.TYPES[selectedType].cost} 金币`);
        });
        const t=state.towers[selectedSlot];
        $('selection-title').textContent=t?`${selectedSlot+1} 号 · ${E.TYPES[t.type].name} Lv.${t.level}`:E.TYPES[selectedType].name+' · 选择空地建造';
        $('selection-text').textContent=t?`伤害 ${Math.round(E.stats(t).damage)} · 射程 ${E.stats(t).range} · ${t.level===3?'已达最高等级':E.TYPES[t.type].description}`:E.TYPES[selectedType].description+'，点 + 建造。';
        $('upgrade').hidden=!t;
        $('upgrade').disabled=!t||t.level>=3||state.gold<E.upgradeCost(t)||paused||ended;
        $('upgrade').textContent=t?(t.level>=3?'已满级':`升级 ◈ ${E.upgradeCost(t)} [U]`):'升级';
        $('next-wave').disabled=state.state!=='ready'||paused;
        $('next-wave').textContent=state.state==='running'?`第 ${state.wave} 波 · 防守中`:(ended?'战斗结束':`第 ${state.wave+1} 波 · 开始防守 →`);
        $('wave-hint').textContent=state.state==='running'?`剩余 ${state.queue.length+state.enemies.length} 个敌人`:state.wave===E.WAVES_PER_LEVEL-1?'最终波：首领即将出现':'准备时间不限 · 建好再出发';
        $('pause').disabled=ended;
        $('pause').textContent=paused?'继续':'暂停';
        $('pause').setAttribute('aria-pressed',paused);
        $('speed').textContent=speed+'×';
        $('speed').setAttribute('aria-label',`当前${speed}倍速，切换到${speed===1?2:1}倍速`);
        $('overlay').hidden=!paused&&!ended;
        if(paused||ended) {
            $('result-icon').textContent=ended?(state.state==='lost'?'♜':'✦'):'Ⅱ';
            $('result-title').textContent=paused?'林地暂时宁静':state.state==='won'?'全部关卡通关！':state.state==='cleared'?`第 ${state.level} 关守卫成功！`:'防线失守';
            $('result-text').textContent=paused?'准备好后，继续守护翡翠林地。':state.state==='won'?`你守住了全部 ${E.LEVEL_COUNT} 关！本关剩余 ${state.health} 点生命。`:state.state==='cleared'?`已守住本关 ${E.WAVES_PER_LEVEL} 波，剩余 ${state.health} 点生命。下一关敌人更强；生命、金币和建筑将重置。`:`第 ${state.level} 关 · 守到了第 ${state.wave} 波。试试在弯道集中火力，再搭配魔法塔减速。`;
            $('result-action').textContent=paused?'继续守卫':state.state==='cleared'?`进入第 ${state.level+1} 关 →`:state.state==='won'?'从第 1 关再挑战':'重试本关';
        }
    }
    function togglePause() {
        if(['cleared','won','lost'].includes(state.state))return;
        paused=!paused;
        accumulator=0;
        sync();
    }
    function restart(level=state.level) {
        state=E.create(level);
        paused=false;
        selectedSlot=-1;
        wasState='ready';
        accumulator=0;
        announce(`第 ${state.level} 关已准备好。每关 ${E.WAVES_PER_LEVEL} 波，初始 300 金币，选择空地建造。`);
        sync();
    }
    document.querySelectorAll('[data-tower]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.tower)));
    $('upgrade').addEventListener('click',()=> {
        if(!paused&&E.upgrade(state,selectedSlot)) {
            announce('塔楼升级成功，火力与射程提升。');
            sync();
        }
    });
    $('next-wave').addEventListener('click',()=> {
        if(!paused&&E.startWave(state)) {
            announce(`第 ${state.level} 关 · 第 ${state.wave} 波来袭！战斗中也可以建造和升级。`);
            sync();
        }
    });
    $('pause').addEventListener('click',togglePause);
    $('speed').addEventListener('click',()=> {
        speed=speed===1?2:1;
        sync();
    });
    $('restart').addEventListener('click',()=> {
        if(state.wave===0&&!state.towers.some(Boolean)||window.confirm('重试本关会清除本关进度，确定吗？'))restart();
    });
    $('result-action').addEventListener('click',()=> {
        if(paused)togglePause();
        else if(state.state==='cleared')restart(state.level+1);
        else if(state.state==='won')restart(1);
        else if(state.state==='lost')restart();
    });
    document.addEventListener('visibilitychange',()=> {
        if(document.hidden&&!paused&&state.state==='running')togglePause();
        last=0;
        accumulator=0;
    });
    window.addEventListener('blur',()=> {
        if(!paused&&state.state==='running')togglePause();
    });
    document.addEventListener('keydown',e=> {
        if(e.ctrlKey||e.altKey||e.metaKey||e.repeat)return;
        const k=e.key.toLowerCase();
        if(['1','2','3'].includes(k))select(['arrow','magic','cannon'][Number(k)-1]);
        else if(k==='p')togglePause();
        else if(k==='u')$('upgrade').click();
        else if(k==='n')$('next-wave').click();
        else if(k==='f')document.querySelector('[data-game-fullscreen]').click();
    });
    let syncElapsed=0;
    function frame(now) {
        const elapsed=last?Math.min(.1,(now-last)/1000):0;
        last=now;
        if(!paused) {
            accumulator+=elapsed*speed;
            while(accumulator>=1/60) {
                E.tick(state,1/60);
                accumulator-=1/60;
            }
        }
        if(state.state!==wasState) {
            if(state.state==='ready'&&state.wave>0)announce(`第 ${state.wave} 波守住了！获得补给金币，准备好了再开始下一波。`);
            if(state.state==='cleared')announce(`第 ${state.level} 关的 ${E.WAVES_PER_LEVEL} 波已完成，可以进入下一关。`);
            if(state.state==='won')announce(`守卫成功！全部 ${E.LEVEL_COUNT} 关已完成。`);
            if(state.state==='lost')announce('防线失守。可重试当前关卡。');
            wasState=state.state;
            sync();
        }
        syncElapsed+=elapsed;
        if(syncElapsed>.15) {
            sync();
            syncElapsed=0;
        }
        draw();
        requestAnimationFrame(frame);
    }
    drawTerrain();
    sync();
    requestAnimationFrame(frame);
})();
