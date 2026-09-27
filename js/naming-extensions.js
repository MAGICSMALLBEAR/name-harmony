/** 姓名趨勢、品牌命名與人格對照；所有計算均在瀏覽器本機完成。 */
window.NamingExtensions = (function () {
  var SSA_2025 = {
    male: ['Liam','Noah','Oliver','Theodore','Henry','James','Elijah','Mateo','William','Lucas','Benjamin','Levi','Sebastian','Jack','Ezra','Michael','Daniel','Leo','Owen','Samuel'],
    female: ['Olivia','Charlotte','Emma','Amelia','Sophia','Mia','Isabella','Evelyn','Sofia','Eliana','Luna','Harper','Camila','Gianna','Elizabeth','Eleanor','Ella','Abigail','Avery','Scarlett']
  };
  var FACTORS = [
    ['O','我喜歡探索新觀點與陌生領域。',1], ['O','我偏好熟悉的方法，不喜歡改變。',-1],
    ['C','我做事有計畫，並按時完成。',1], ['C','我常常拖到最後一刻才處理事情。',-1],
    ['E','我會主動和陌生人互動。',1], ['E','長時間社交會讓我很快耗盡能量。',-1],
    ['A','我通常會先理解別人的立場。',1], ['A','我傾向直接挑戰他人的觀點。',-1],
    ['N','我容易因小事感到緊張或擔心。',1], ['N','壓力來時，我通常能保持平穩。',-1]
  ];
  var factorName = {O:'開放性',C:'盡責性',E:'外向性',A:'親和性',N:'情緒敏感度'};
  function esc(v) { return String(v || '').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function slug(v) { return String(v || '').trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g,'').slice(0,32); }
  function renderTrends() {
    var el = document.getElementById('toolTrends'); if (!el) return;
    el.innerHTML = '<p class="tool-desc">輸入英文名，查看美國社會安全署（SSA）2025 年排行的熱門度提示。台灣姓名統計採內政部戶政司 112 年分析報告作為查閱來源；它不是逐年開放排行，因此不以推測數字冒充即時熱門度。</p>'+ 
      '<div class="tool-row"><label class="tool-field" style="flex:2"><span>英文名</span><input id="trendName" class="form-input" placeholder="例如 Olivia"></label><label class="tool-field" style="flex:1"><span>性別</span><select id="trendGender" class="form-input"><option value="female">女</option><option value="male">男</option></select></label></div>'+
      '<button type="button" class="btn-download-img" id="trendGo">📈 查看時代感</button><div id="trendResult"></div><p class="tool-note">資料來源：<a href="https://www.ssa.gov/oact/babynames/" target="_blank" rel="noopener">SSA 美國姓名排行</a>、<a href="https://www.ris.gov.tw/documents/data/5/2/112namestat.pdf" target="_blank" rel="noopener">內政部戶政司全國姓名統計分析（112 年）</a>。台灣逐年名字排行尚無可直接自動匯入的公開資料。</p>';
  }
  function runTrend() {
    var n = document.getElementById('trendName').value.trim().replace(/[^a-z]/ig,''); var g=document.getElementById('trendGender').value;
    var out=document.getElementById('trendResult'); if(!n) { out.innerHTML='<p class="tool-msg">請輸入英文名。</p>'; return; }
    var list=SSA_2025[g], ix=list.map(function(x){return x.toLowerCase();}).indexOf(n.toLowerCase());
    out.innerHTML=ix >= 0 ? '<div class="tool-cand"><strong>'+esc(n)+'</strong> 在 SSA 2025 '+(g==='female'?'女':'男')+'名精選前 20 名中排名第 '+(ix+1)+'。<p class="tool-line">時代感：高度熱門。若希望辨識度更高，可考慮避開前 20 名。</p></div>' : '<div class="tool-cand"><strong>'+esc(n)+'</strong> 未列在本站收錄的 SSA 2025 前 20 名。<p class="tool-line">時代感：不屬於最高熱度；這不代表罕見，請以官方完整排行確認。</p></div>';
  }
  function renderBrand() {
    var el=document.getElementById('toolBrand'); if(!el) return;
    el.innerHTML='<p class="tool-desc">把候選品牌名放進來，依定位與語感做本機初篩；網域與商標仍須到官方資料庫確認。</p><div class="tool-row"><label class="tool-field" style="flex:1"><span>候選品牌名</span><input id="brandName" class="form-input" placeholder="例如 森月 / Luma"></label><label class="tool-field" style="flex:1"><span>品牌調性</span><select id="brandTone" class="form-input"><option value="trust">專業可信</option><option value="warm">溫暖親和</option><option value="bold">創新有力</option><option value="calm">自然療癒</option></select></label></div><label class="tool-field"><span>服務／受眾（選填）</span><input id="brandAudience" class="form-input" placeholder="例如：親子選物、科技新創"></label><button type="button" class="btn-download-img" id="brandGo">✨ 評估品牌名</button><div id="brandResult"></div>';
  }
  function runBrand() {
    var name=document.getElementById('brandName').value.trim(), tone=document.getElementById('brandTone').value, aud=document.getElementById('brandAudience').value.trim(), out=document.getElementById('brandResult');
    if(!name) {out.innerHTML='<p class="tool-msg">請輸入候選品牌名。</p>';return;}
    var score=55, notes=[]; if(name.length>=2&&name.length<=6){score+=15;notes.push('長度適合記憶');} else notes.push('建議控制在 2–6 個中文字或較短的英文拼字');
    if(/^[\u4e00-\u9fff]+$/.test(name)&&window.Phonetics&&window.ChineseNumerology){var r=window.ChineseNumerology.analyze('王'+name);var p=r&&!r.error?window.Phonetics.checkChinese(r.parsed):null;if(p){score+=p.grade==='良好'?15:5;notes.push('音韻：'+p.grade+(p.warns.length?'（'+p.warns[0]+'）':''));}}
    var toneWords={trust:'穩健、清晰、可建立信任',warm:'親切、易讀、具情感溫度',bold:'辨識強、適合創新定位',calm:'柔和、適合自然與療癒定位'}; score=Math.min(100,score);
    var s=slug(name), domain=s?'https://lookup.icann.org/en/lookup?name='+encodeURIComponent(s+'.com'):'https://lookup.icann.org/';
    out.innerHTML='<div class="tool-cand"><div class="tool-cand-head"><span class="tool-cand-name">'+esc(name)+'</span><span class="tool-badge">初篩 '+score+'/100</span></div><p class="tool-line">調性建議：'+toneWords[tone]+'</p><p class="tool-line">'+esc(notes.join('；'))+(aud?'；受眾：'+esc(aud):'')+'</p><div class="tool-actions"><a class="btn-action btn-action-secondary" target="_blank" rel="noopener" href="'+domain+'">🌐 查 .com 網域</a><a class="btn-action btn-action-secondary" target="_blank" rel="noopener" href="https://twtmsearch.tipo.gov.tw/">™ 查台灣商標</a></div><p class="tool-note">初篩不代表網域或商標可用；請以註冊商與智慧財產局結果為準。</p></div>';
  }
  function renderPersonality() {
    var el=document.getElementById('toolPersonality');if(!el)return;
    var rows=FACTORS.map(function(q,i){return '<div class="tool-field"><span>'+q[1]+'</span><select class="form-input bf" data-i="'+i+'"><option value="1">1 很不同意</option><option value="2">2</option><option value="3" selected>3 普通</option><option value="4">4</option><option value="5">5 很同意</option></select></div>';}).join('');
    el.innerHTML='<p class="tool-desc">10 題 Big Five 自我觀察（娛樂／反思用途，非心理診斷）。完成後可與姓名分析中的 MBTI 趣味推估並列閱讀。</p>'+rows+'<button type="button" class="btn-download-img" id="bfGo">🧠 產生人格對照</button><div id="bfResult"></div>';
  }
  function runPersonality(){var sums={O:0,C:0,E:0,A:0,N:0},cnt={O:0,C:0,E:0,A:0,N:0};[].forEach.call(document.querySelectorAll('.bf'),function(x){var q=FACTORS[+x.dataset.i],v=+x.value;sums[q[0]]+=q[2]>0?v:6-v;cnt[q[0]]++;});var rows=Object.keys(sums).map(function(k){var n=Math.round(sums[k]/cnt[k]*20);return '<p class="tool-line"><strong>'+factorName[k]+'</strong> '+n+'/100　'+(n>=70?'偏高':n<=40?'偏低':'中等')+'</p>';}).join('');document.getElementById('bfResult').innerHTML='<div class="tool-cand">'+rows+'<p class="tool-note">把這份自評與主分析中的靈數→MBTI 趣味對照放在一起看，可作為「自我感受與系統敘事」的討論起點，不應用於招聘、醫療或任何高風險判斷。</p></div>';}
  function render(){renderTrends();renderBrand();renderPersonality();}
  document.addEventListener('click',function(e){if(e.target.id==='trendGo')runTrend();if(e.target.id==='brandGo')runBrand();if(e.target.id==='bfGo')runPersonality();});
  return {render:render};
})();
