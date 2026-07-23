/**
 * 圖片分享卡生成器
 * Canvas 繪製精美分享圖
 */
window.ShareCard = (function() {

  function generate(data) {
    var canvas = document.getElementById('shareCanvas');
    if (!canvas) { canvas = document.createElement('canvas'); document.body.appendChild(canvas); }
    var w = 600, h = 800;
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');

    // 背景漸層
    var bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1A0A0A');
    bg.addColorStop(0.5, '#2D1810');
    bg.addColorStop(1, '#1A0A0A');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // 裝飾圓
    ctx.strokeStyle = 'rgba(212,168,67,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(w/2, 100, 180, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(w/2, 100, 160, 0, Math.PI*2); ctx.stroke();

    // 標題
    ctx.fillStyle = '#D4A843';
    ctx.font = 'bold 42px "Noto Serif TC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('姓名和盤', w/2, 80);

    ctx.fillStyle = '#C4A870';
    ctx.font = '16px "Noto Sans TC", sans-serif';
    ctx.fillText('中英文姓名命理分析', w/2, 112);

    // 分隔線
    var lineY = 140;
    ctx.strokeStyle = '#D4A843';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(120, lineY); ctx.lineTo(w-120, lineY); ctx.stroke();
    ctx.fillText('◆', w/2, lineY + 4);

    // 成員資訊
    var y = 180;
    ctx.textAlign = 'center';
    data.results.forEach(function(r) {
      ctx.fillStyle = '#D4A843';
      ctx.font = 'bold 20px "Noto Sans TC", sans-serif';
      ctx.fillText(r.person.label, w/2, y);
      y += 28;
      ctx.fillStyle = '#F5E6CC';
      ctx.font = '18px "Noto Sans TC", sans-serif';
      var names = [];
      if (r.person.cn) names.push(r.person.cn);
      if (r.person.en) names.push(r.person.en);
      ctx.fillText(names.join(' / ') || '(未輸入)', w/2, y);
      y += 32;

      if (r.result.cn) {
        ctx.fillStyle = '#C4A870';
        ctx.font = '14px "Noto Sans TC", sans-serif';
        ctx.fillText('人格' + r.result.cn.grids.ren.number + '劃 ' + r.result.cn.grids.ren.element + ' ' + (r.result.cn.grids.ren.fortune ? r.result.cn.grids.ren.fortune.glory : ''), w/2, y);
        y += 22;
      }
      if (r.result.en) {
        ctx.fillStyle = '#C4A870';
        ctx.font = '14px "Noto Sans TC", sans-serif';
        ctx.fillText('命運數字 ' + r.result.en.destiny, w/2, y);
        y += 22;
      }
      y += 8;
    });

    // 和盤結果
    if (data.pairs && data.pairs.length) {
      y += 10;
      ctx.strokeStyle = 'rgba(212,168,67,0.2)';
      ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(w-80, y); ctx.stroke();
      y += 30;

      ctx.fillStyle = '#D4A843';
      ctx.font = 'bold 22px "Noto Serif TC", serif';
      ctx.fillText('配對結果', w/2, y);
      y += 35;

      data.pairs.slice(0, 4).forEach(function(p) {
        var sc = p.pair.score;
        var color = sc >= 80 ? '#FFD700' : sc >= 60 ? '#4CAF50' : sc >= 40 ? '#FF9800' : '#9E9E9E';
        ctx.fillStyle = color;
        ctx.font = 'bold 36px Georgia, serif';
        ctx.fillText(sc + '', w/2 - 80, y + 8);

        ctx.fillStyle = '#F5E6CC';
        ctx.font = '16px "Noto Sans TC", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(p.a + ' ↔ ' + p.b, w/2 - 40, y - 2);
        ctx.fillStyle = '#C4A870';
        ctx.font = '13px "Noto Sans TC", sans-serif';
        ctx.fillText(p.pair.mode + ' · ' + p.pair.tier, w/2 - 40, y + 18);
        ctx.textAlign = 'center';
        y += 50;
      });
    }

    // 底部
    ctx.fillStyle = '#8B7355';
    ctx.font = '12px "Noto Sans TC", sans-serif';
    ctx.fillText('姓名和盤 · 僅供娛樂參考', w/2, h - 30);

    // 網址
    ctx.fillStyle = 'rgba(196,168,112,0.4)';
    ctx.fillText('magicsmallbear.github.io/name-harmony', w/2, h - 12);

    return canvas;
  }

  function downloadImage(data) {
    var canvas = generate(data);
    var link = document.createElement('a');
    link.download = '姓名和盤_' + new Date().toISOString().slice(0,10) + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    return true;
  }

  // IG 限動格式 (1080x1920)
  function generateIG(data) {
    var canvas = document.createElement('canvas');
    var w=1080, h=1920;
    canvas.width=w; canvas.height=h;
    var ctx=canvas.getContext('2d');
    // 漸層背景
    var bg=ctx.createLinearGradient(0,0,0,h);
    bg.addColorStop(0,'#1A0A0A');bg.addColorStop(0.5,'#2D1810');bg.addColorStop(1,'#1A0A0A');
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    // 金邊框
    ctx.strokeStyle='rgba(212,168,67,0.4)';ctx.lineWidth=4;
    ctx.strokeRect(60,60,w-120,h-120);
    // 標題
    ctx.fillStyle='#D4A843';ctx.font='bold 72px Noto Serif TC,serif';ctx.textAlign='center';
    ctx.fillText('姓名和盤',w/2,220);
    ctx.fillStyle='#C4A870';ctx.font='36px Noto Sans TC,sans-serif';
    ctx.fillText('中英文姓名命理分析',w/2,300);
    ctx.fillText('◆',w/2,380);

    var y=500;
    data.results.forEach(function(r){
      ctx.fillStyle='#D4A843';ctx.font='bold 48px Noto Sans TC,sans-serif';
      ctx.fillText(r.person.label,w/2,y);y+=70;
      ctx.fillStyle='#F5E6CC';ctx.font='42px Noto Sans TC,sans-serif';
      var n=[];if(r.person.cn)n.push(r.person.cn);if(r.person.en)n.push(r.person.en);
      ctx.fillText(n.join(' / ')||'(未輸入)',w/2,y);y+=80;
      if(r.result.cn){
        ctx.fillStyle='#C4A870';ctx.font='32px Noto Sans TC,sans-serif';
        ctx.fillText('人格'+r.result.cn.grids.ren.number+'劃 '+r.result.cn.grids.ren.element+' '+(r.result.cn.grids.ren.fortune?r.result.cn.grids.ren.fortune.glory:''),w/2,y);
        y+=60;
      }
      if(r.result.en){
        ctx.fillStyle='#C4A870';ctx.font='32px Noto Sans TC,sans-serif';
        ctx.fillText('命運數字 '+r.result.en.destiny,w/2,y);y+=60;
      }
      y+=40;
    });
    // 和盤結果
    if(data.pairs&&data.pairs.length){
      var p=data.pairs[0];
      ctx.fillStyle='#D4A843';ctx.font='bold 52px Noto Serif TC,serif';
      ctx.fillText('和盤配對',w/2,y);y+=80;
      var sc=p.pair.score;
      var c=sc>=80?'#FFD700':sc>=60?'#4CAF50':sc>=40?'#FF9800':'#9E9E9E';
      ctx.fillStyle=c;ctx.font='bold 120px Georgia,serif';
      ctx.fillText(sc+'',w/2,y);y+=30;
      ctx.fillStyle='#C4A870';ctx.font='32px Noto Sans TC,sans-serif';
      ctx.fillText('/100',w/2+100,y);
      ctx.font='48px Noto Sans TC,sans-serif';
      ctx.fillText(p.pair.tier,w/2,y+80);y+=140;
    }
    // 底部
    ctx.fillStyle='rgba(196,168,112,0.4)';ctx.font='24px Noto Sans TC,sans-serif';
    ctx.fillText('姓名和盤 · 僅供娛樂參考',w/2,h-100);
    return canvas;
  }

  function downloadIG(data){
    var canvas=generateIG(data);
    var link=document.createElement('a');
    link.download='姓名和盤_IG分享_'+new Date().toISOString().slice(0,10)+'.png';
    link.href=canvas.toDataURL('image/png');
    link.click();return true;
  }

  return { generate: generate, downloadImage: downloadImage, generateIG: generateIG, downloadIG: downloadIG };
})();
