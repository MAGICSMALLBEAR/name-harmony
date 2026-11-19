/* 與 browser-smoke.js 相同的本機伺服器及獨立測試瀏覽器；node tools/browser-advanced.js */
'use strict';
const assert = require('assert/strict');
(async () => {
  const port = process.env.CDP_PORT || '9222';
  const targets = await (await fetch('http://127.0.0.1:'+port+'/json')).json();
  const page = targets.find(t=>t.type==='page' && /^http:\/\/127\.0\.0\.1:8765\//.test(t.url));
  assert(page,'Open http://127.0.0.1:8765/ in the isolated test browser');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let id=0; const pending=new Map(),errors=[];
  ws.onmessage=e=>{
    const d=JSON.parse(e.data);
    if(d.id && pending.has(d.id)){pending.get(d.id)(d);pending.delete(d.id);}
    if(d.method==='Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description||d.params.exceptionDetails.text);
  };
  const send=(method,params={})=>new Promise(resolve=>{const n=++id;pending.set(n,resolve);ws.send(JSON.stringify({id:n,method,params}));});
  async function evaluate(expression){
    const d=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(d.error || d.result.exceptionDetails) throw new Error(JSON.stringify(d.error||d.result.exceptionDetails));
    return d.result.result.value;
  }
  let initialState = null;
  try {
    await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
    await send('Network.setBypassServiceWorker',{bypass:true});
    await send('Network.setCacheDisabled',{cacheDisabled:true});
    await send('Browser.setDownloadBehavior',{behavior:'deny'});
    await send('Page.reload',{ignoreCache:true});
    async function ready(){for(let i=0;i<100;i++){if(await evaluate("document.readyState === 'complete' && !!window.ChartHarmony && !!window.NamingTools"))return;await new Promise(r=>setTimeout(r,100));}throw new Error('Page load timeout');}
    await ready();
    initialState = await evaluate(`JSON.stringify(Object.fromEntries(['name-harmony-v3','name-harmony-profiles','name-harmony-relationship','name-harmony-tst',
      'name-harmony-tw-mode','name-harmony-strokes','name-harmony-pinyin','name-harmony-dialects','name-harmony-restored-draft','name-harmony-naming-prefs',
      'name-harmony-brand-list','name-harmony-brand-feedback','name-harmony-ai-verify','name-harmony-sync-cfg','name-harmony-sync-token','name-harmony-sync-pending','name-harmony-lang'].map(k=>[k,localStorage.getItem(k)])))`);
    const result=await evaluate(`(async()=>{
      const $=id=>document.getElementById(id), check=(v,m)=>{if(!v)throw new Error(m);};
      const change=(el,v)=>{el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));};
      if(I18N.getLang()==='en')$('langToggle').click();
      $('demoBtn').click();
      document.querySelectorAll('.btime-input')[1].value='15:20';
      change($('relationshipMode'),'general'); $('analyzeBtn').click();
      check($('formError').classList.contains('hidden'),'analysis error: '+$('formError').textContent);
      const all=[...document.querySelectorAll('#matrixContent .analysis-mode-badge')].map(x=>x.textContent);
      check(all.includes('八字合盤') && all.includes('占星合盤') && all.includes('紫微合盤'),'three chart pairings');
      for(const system of ['bazi','astrology','ziwei']){
        change($('matrixSystem'),system);
        check(document.querySelectorAll('#matrixContent .analysis-mode-badge').length===1,'system filter '+system);
        document.querySelector('#matrixContent .matrix-pair').click();
        check(!$('pairModal').classList.contains('hidden') && $('modalBody').textContent.includes(system==='bazi'?'有效柱數':system==='astrology'?'組合盤':'四化投射法'),'pair details '+system);
        if (system === 'ziwei') {
          check(!!$('modalBody').querySelector('.zw-pair-svg'), 'pair flying SVG in modal');
          $('modalBody').querySelector('.zw-pair-dir-btn[data-dir="BA"]').click();
          check($('modalBody').querySelector('.zw-pair-dir-btn[data-dir="BA"]').classList.contains('active'), 'pair flying direction toggle');
        }
        if (system === 'astrology') {
          check(!!$('modalBody').querySelector('.astro-wheel-svg'), 'composite wheel SVG in modal');
          check($('modalBody').querySelectorAll('.astro-comp-cell').length === 12, 'composite 12 houses');
          check($('modalBody').textContent.includes('組合上升點') && $('modalBody').textContent.includes('組合盤主要相位'), 'composite ascendant and aspects');
        }
        $('modalClose').click();
      }
      // 檢查成員頁進階八字與紫微飛化路徑圖互動
      document.querySelector('.tab-btn[data-tab="members"]').click();
      const advBaziEls = document.querySelectorAll('.bazi-advanced-detail');
      check(advBaziEls.length === 2, 'advanced bazi rendered for both members');
      check(advBaziEls[0].textContent.includes('格局取用') && advBaziEls[0].textContent.includes('調候觀察') && advBaziEls[0].textContent.includes('從格條件檢核') && advBaziEls[0].textContent.includes('合化條件檢核'), 'advanced bazi sections');
      check(advBaziEls[1].textContent.includes('四柱完整'), 'advanced bazi full 4 pillars');
      const zwFlyBox = document.querySelector('.zw-fly-box');
      check(!!zwFlyBox && zwFlyBox.querySelectorAll('.zw-fly-cell').length === 12, 'ziwei flying 12-palace SVG');
      zwFlyBox.querySelector('.zw-fly-btn[data-palace="夫妻宮"]').click();
      check(zwFlyBox.querySelector('.zw-fly-readout').textContent.includes('夫妻宮'), 'ziwei flying palace switch');
      const decBtn = zwFlyBox.querySelector('.zw-scope-btn[data-scope="decadal"]');
      if (decBtn) {
        decBtn.click();
        check(decBtn.classList.contains('active') && zwFlyBox.querySelector('.zw-fly-svg').textContent.includes('大'), 'ziwei decadal scope overlay');
        zwFlyBox.querySelector('.zw-scope-btn[data-scope="yearly"]').click();
        check(zwFlyBox.querySelector('.zw-fly-svg').textContent.includes('流'), 'ziwei yearly scope overlay');
        zwFlyBox.querySelector('.zw-scope-btn[data-scope="natal"]').click();
      }
      const zwHoro = document.querySelector('.zw-horo-body');
      if (zwHoro) {
        check(zwHoro.textContent.includes('運限飛化疊宮'), 'ziwei horoscope flying convergence');
      }
      const astroDetail = document.querySelector('.astro-detail');
      const astroNatalBox = astroDetail && astroDetail.querySelector('.astro-natal-box');
      check(!!astroNatalBox && !!astroNatalBox.querySelector('.astro-wheel-svg'), 'natal astrology wheel SVG');
      const minorCb = astroNatalBox.querySelector('.astro-minor-toggle');
      minorCb.checked = true; minorCb.dispatchEvent(new Event('change', { bubbles: true }));
      check(!!astroNatalBox.querySelector('.astro-minor-list'), 'natal minor aspects list');
      const trDate = astroDetail.querySelector('.astro-transit-date');
      const trBefore = astroDetail.querySelector('.astro-transit-body').textContent;
      trDate.value = '2028-06-15'; trDate.dispatchEvent(new Event('change', { bubbles: true }));
      const trAfter = astroDetail.querySelector('.astro-transit-body').textContent;
      check(trBefore && trAfter && trBefore !== trAfter, 'natal transit date update');
      const aiCtx = AiReading.collectContext();
      check(aiCtx.includes('格局取用') && aiCtx.includes('運限飛化') && aiCtx.includes('粵語') && !aiCtx.includes('套用讀音'), 'AI context updated and UI controls stripped');
      const phDetail = document.querySelector('.phonetics-detail');
      check(!!phDetail && phDetail.querySelectorAll('.dialect-card').length === 4, 'multi-dialect phonetics cards (4 dialects incl. Hailu)');
      phDetail.open = true;
      // 台語文讀／白話切換與多音候選下拉選單
      const twWenBtn = phDetail.querySelector('.tw-mode-btn[data-tw-mode="wen"]');
      check(!!twWenBtn, 'Taiwanese literary mode button');
      twWenBtn.click();
      check(document.querySelector('.phonetics-detail').textContent.includes('siau2'), 'Taiwanese literary reading applied (小 -> siau2)');
      document.querySelector('.phonetics-detail .tw-mode-btn[data-tw-mode="bai"]').click();
      check(document.querySelector('.phonetics-detail').textContent.includes('mia5'), 'Taiwanese colloquial reading applied (明 -> mia5)');
      document.querySelector('.phonetics-detail .tw-mode-btn[data-tw-mode="default"]').click();
      const diaSel = document.querySelector('.phonetics-detail .dialect-select[data-lang="tw"]');
      check(!!diaSel && diaSel.options.length >= 3, 'dialect variant dropdown rendered');
      const customSel = document.querySelector('.phonetics-detail .pinyin-select');
      customSel.value = '__custom__'; customSel.dispatchEvent(new Event('change', { bubbles: true }));
      const phInput = document.querySelector('.phonetics-detail .pinyin-custom-input');
      phInput.value = 'chen4';
      document.querySelector('.phonetics-detail .pinyin-apply-btn').click();
      check(document.querySelector('.phonetics-detail').open && document.querySelector('.phonetics-detail').textContent.includes('chen 四聲'), 'custom pronunciation applied in place');
      // AI 真實金鑰驗收清單互動
      document.querySelector('.tab-btn[data-tab="ai"]').click();
      const aiVerify = $('aiVerifyDetails');
      check(!!aiVerify && aiVerify.textContent.includes('真實金鑰驗收清單'), 'AI verification checklist rendered');
      aiVerify.open = true;
      $('aiVerifyBill').checked = true; $('aiVerifyBill').dispatchEvent(new Event('change', { bubbles: true }));
      $('aiVerifyCost').value = 'US$0.032'; $('aiVerifyNote').value = 'ok';
      $('aiVerifySave').click();
      check(JSON.parse(localStorage.getItem('name-harmony-ai-verify')).claude.billingChecked === true, 'AI verify saved locally');
      document.querySelector('.tab-btn[data-tab="matrix"]').click();
      change($('matrixSystem'),'bazi'); change($('resultRelationship'),'business');
      check($('relationshipMode').value==='business' && $('matrixSystem').value==='bazi','relationship sync');
      check($('matrixContent').textContent.includes('合夥人'),'relationship explanation');
      $('saveBtn').click();
      check(JSON.parse(localStorage.getItem('name-harmony-v3'))[0].relationship==='business','saved relationship');
      const originalPrompt=window.prompt; window.prompt=()=> '進階測試'; $('profileSaveBtn').click(); window.prompt=originalPrompt;
      check(JSON.parse(localStorage.getItem('name-harmony-profiles'))[0].name==='進階測試','profile saved');
      check(![...document.querySelectorAll('.share-toast')].some(x=>x.textContent==='存檔失敗'),'profile button scope');
      $('langToggle').click(); await new Promise(resolve=>L10N.load(resolve));
      for(const system of ['bazi','astrology','ziwei']){
        change($('matrixSystem'),system);
        check(!/[一-鿿]/.test($('matrixContent').innerText),'English chart UI '+system);
      }
      const advEn = document.querySelector('.bazi-advanced-detail');
      const flyEn = document.querySelector('.zw-flying-detail');
      const astroEn = document.querySelector('.astro-natal-box');
      const aiVerifyEn = $('aiVerifyDetails');
      const cloudEn = $('cloudSyncBox');
      check(advEn && !/[一-鿿]/.test(advEn.textContent), 'English advanced bazi UI');
      check(flyEn && !/[一-鿿]/.test(flyEn.textContent), 'English ziwei flying UI');
      check(astroEn && !/[一-鿿]/.test(astroEn.textContent), 'English natal astrology UI');
      check(aiVerifyEn && !/[一-鿿]/.test(aiVerifyEn.textContent), 'English AI verification checklist UI');
      check(cloudEn && !/[一-鿿]/.test(cloudEn.textContent), 'English cloud sync UI');
      $('langToggle').click();
      $('backBtn').click(); document.querySelectorAll('.btime-input')[1].value=''; $('analyzeBtn').click();
      change($('matrixSystem'),'ziwei'); check(!document.querySelector('#matrixContent .analysis-mode-badge'),'unknown time must not invent Zi Wei');
      change($('matrixSystem'),'astrology'); check($('matrixContent').textContent.includes('缺時辰'),'unknown time note');
      change($('matrixSystem'),'bazi'); check($('matrixContent').textContent.includes('7/8'),'partial pillars');
      check(document.querySelectorAll('.bazi-advanced-detail')[1].textContent.includes('缺時辰'), 'advanced bazi partial hour note');
      $('backBtn').click();
      // 測試品牌調性本機回饋（零未授權上傳）
      $('toolBrand').parentElement.open = true;
      $('brandName').value = 'Luma'; $('brandTone').value = 'calm';
      $('brandGo').click();
      check(!!$('brandFbMatch') && !!$('brandFbOther'), 'brand feedback buttons rendered');
      $('brandFbMatch').click();
      $('brandFbTone').value = 'warm'; $('brandFbNote').value = 'soft sound'; $('brandFbOther').click();
      check(JSON.parse(localStorage.getItem('name-harmony-brand-feedback')).length === 2, 'brand feedback saved locally');
      check($('brandFeedbackBox').textContent.includes('50%'), 'brand feedback hit rate rendered');
      // 測試雲端同步（模擬 GitHub 私密 Gist API，不發真實網路請求）
      const mockGists = {};
      CloudSync._setFetch(async (url, opts = {}) => {
        const mk = (s, b, h = {}) => ({ ok: s >= 200 && s < 300, status: s, headers: { get: k => h[k.toLowerCase()] || '' }, text: async () => typeof b === 'string' ? b : JSON.stringify(b) });
        if (url.endsWith('/user')) return mk(200, { login: 'edge-tester' }, { 'x-oauth-scopes': 'gist' });
        if (url.includes('/gists?per_page=')) return mk(200, Object.values(mockGists));
        if (url.endsWith('/gists') && opts.method === 'POST') {
          const body = JSON.parse(opts.body);
          if (body.public !== false) throw new Error('Gist must be private');
          const id = 'b1c2d3e4f5a60718293b';
          mockGists[id] = { id, public: false, files: body.files };
          return mk(201, mockGists[id]);
        }
        const m = new RegExp('/gists/([a-f0-9]+)$', 'i').exec(url);
        if (m && (!opts.method || opts.method === 'GET')) return mk(200, mockGists[m[1]]);
        if (m && opts.method === 'PATCH') { mockGists[m[1]].files = JSON.parse(opts.body).files; return mk(200, mockGists[m[1]]); }
        return mk(404, { message: 'Not Found' });
      });
      $('cloudSyncDetails').open = true;
      $('cloudSyncToken').value = 'ghp_mock_browser_token';
      $('cloudSyncConnect').click();
      for (let i = 0; i < 60 && !$('cloudSyncDisconnect'); i++) await new Promise(r => setTimeout(r, 30));
      check(!!$('cloudSyncDisconnect') && $('cloudSyncBox').textContent.includes('@edge-tester'), 'cloud sync connected via private Gist');
      $('cloudSyncDisconnect').click();
      check(!!$('cloudSyncToken') && !CloudSync.getToken(), 'cloud sync disconnected and token cleared');
      CloudSync._setFetch(null);
      let exportedBlob;
      const originalURL=URL.createObjectURL;
      URL.createObjectURL=blob=>{exportedBlob=blob;return originalURL(blob);};
      try {
        $('backupExport').click(); check(!!exportedBlob,'export button must create a JSON file');
        const saved=DataBackup.parse(await exportedBlob.text());
        check(saved.data.currentPersons.length===2 && saved.data.settings.relationship==='business','exported form and settings');
        check(!Object.keys(saved.data).some(k=>/ai.key/i.test(k)),'export excludes AI key fields');
      } finally { URL.createObjectURL=originalURL; }
      const data=DataBackup.capture(localStorage,{persons:[{cn:'王大明',en:'Alex',birthday:'1990-05-15 10:30',place:'taipei',gender:'male',blood:'A',label:'家人'}],relationship:'spouses',tst:true,manualStrokes:{'龘':48}});
      const upload=async text=>{
        const dt=new DataTransfer();dt.items.add(new File([text],'test-backup.json',{type:'application/json'}));
        $('backupFile').files=dt.files;$('backupFile').dispatchEvent(new Event('change'));
        for(let i=0;i<100;i++){if(!$('backupPreview').classList.contains('hidden')||$('backupStatus').textContent)return;await new Promise(r=>setTimeout(r,30));}
        throw new Error('Backup preview timeout');
      };
      await upload('{bad'); check($('backupPreview').classList.contains('hidden') && $('backupStatus').textContent.includes('JSON'),'invalid import rejected');
      await upload(JSON.stringify(data)); check(!$('backupPreview').classList.contains('hidden') && $('backupPreviewText').textContent.includes('夫妻'),'import preview');
      $('backupCancel').click(); check($('backupPreview').classList.contains('hidden') && !$('backupFile').value,'cancel import');
      await upload(JSON.stringify(data));
      return {systems:all.length,backupPreview:true,partial:true,english:true};
    })()`);
    // 實際點還原、跨頁重載，再按分析，確認手動筆劃也被還原。
    await evaluate("document.getElementById('backupRestore').click(); true");
    await new Promise(r=>setTimeout(r,500)); await ready();
    const restored=await evaluate(`(()=>{
      const $=id=>document.getElementById(id);
      if($('cnA').value!=='王大明'||$('cnB').value!==''||$('relationshipMode').value!=='spouses'||!$('tstToggle').checked)throw new Error('Restored form mismatch');
      if(document.querySelectorAll('.btime-input')[0].value!=='10:30')throw new Error('Restored birth time mismatch');
      $('cnA').value='龘小明';$('analyzeBtn').click();
      if(!$('formError').classList.contains('hidden')||!$('manualStrokeCard').classList.contains('hidden'))throw new Error('Restored manual strokes not applied');
      // 測試可還原的分享連結（#s=...）
      const token=DataBackup.encodeShare({
        persons:[{cn:'王樂明',en:'Leo',birthday:'1991-07-08 09:15',place:'taipei',gender:'male',blood:'B',label:'共享方'},
                 {cn:'林美玲',en:'Mia',birthday:'1993-02-14',place:'taipei',gender:'female',blood:'A',label:'對照方'}],
        relationship:'business',tst:true,pro:false,customPinyin:{'1:樂':'yue4'}
      });
      location.hash='#s='+token;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      if($('resultsSection').classList.contains('hidden')||$('relationshipMode').value!=='business')throw new Error('Share link restore failed');
      if(!document.querySelector('.phonetics-detail').textContent.includes('yue 四聲'))throw new Error('Share link custom pinyin not applied');
      history.replaceState(null,'',location.pathname);
      return true;
    })()`);
    assert(restored); assert.equal(errors.length,0,errors.join('\n'));
    console.log('✓ 三套合盤、系統篩選、詳情、關係模式、存檔、英文、缺時辰、匯入預覽／取消／還原與手動筆劃');
    console.log('✓ 瀏覽器沒有例外；合盤卡片 '+result.systems+' 張');
  } finally {
    if (initialState) await evaluate(`Object.entries(${initialState}).forEach(([k,v])=>v===null?localStorage.removeItem(k):localStorage.setItem(k,v)); true`);
    ws.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
