/* node tools/test-advanced.js — 命盤和盤、十神、備份的獨立回歸檢查 */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
const ctx = { console, Intl, Date, TextEncoder, TextDecoder }; ctx.window = ctx; vm.createContext(ctx);
function load(f) { vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), ctx, { filename: f }); }
['zodiac-bazi','bazi-advanced'].forEach(load);
const Z = ctx.ZodiacBazi, AdvB = ctx.AdvancedBazi;
const stems = '甲乙丙丁戊己庚辛壬癸'.split('');
// 獨立的十干 × 十干對照表；特別涵蓋以前永遠不會出現的劫財、傷官、偏財、七殺、偏印。
const table = [
  '比肩 劫財 食神 傷官 偏財 正財 七殺 正官 偏印 正印',
  '劫財 比肩 傷官 食神 正財 偏財 正官 七殺 正印 偏印',
  '偏印 正印 比肩 劫財 食神 傷官 偏財 正財 七殺 正官',
  '正印 偏印 劫財 比肩 傷官 食神 正財 偏財 正官 七殺',
  '七殺 正官 偏印 正印 比肩 劫財 食神 傷官 偏財 正財',
  '正官 七殺 正印 偏印 劫財 比肩 傷官 食神 正財 偏財',
  '偏財 正財 七殺 正官 偏印 正印 比肩 劫財 食神 傷官',
  '正財 偏財 正官 七殺 正印 偏印 劫財 比肩 傷官 食神',
  '食神 傷官 偏財 正財 七殺 正官 偏印 正印 比肩 劫財',
  '傷官 食神 正財 偏財 正官 七殺 正印 偏印 劫財 比肩'
].map(r => r.split(' '));
stems.forEach((d, i) => stems.forEach((o, j) => assert.equal(Z.calcShiShen(d, o), table[i][j], d + '/' + o)));
assert.equal(Z.calcShiShen('木', '乙'), '?');
assert.equal(Z.calcShiShen('甲', '?'), '?');
const example = Z.fullBazi(2026, 1, 10, 12, 0, 8);
assert.equal(example.dayMasterTG, '甲'); assert.equal(example.pillars[0].shiShen, '劫財');
assert.equal(example.pillars[2].shiShen, '日主');
assert.equal(Z.fullBazi(2026, 1, 10, null, 0, 8).pillars[3].shiShen, '?');
stems.forEach(s => {
  const annual = Z.getLiuNian(s, 2026);
  assert.equal(annual.shiShen, Z.calcShiShen(s, '丙'));
  assert(annual.tip && annual.tip !== '平穩之年');
});
['male', 'female'].forEach(g => Z.getDaYun(example, g).forEach(d => assert.equal(d.shiShen, Z.calcShiShen('甲', d.tg))));
console.log('✓ 十神 100 組、缺時辰、四柱、大運、流年');
const advFull = AdvB.analyze(example);
assert(advFull && advFull.full && advFull.coverage === 4);
assert.equal(advFull.hidden.length, 4);
assert(advFull.pattern.evidence.length >= 3);
assert(advFull.climate.tempLabel && advFull.climate.dryLabel && advFull.climate.needs.length >= 1);
const advPartial = AdvB.analyze(Z.fullBazi(2026, 1, 10, null, 0, 8));
assert(advPartial && !advPartial.full && advPartial.coverage === 3);
assert.equal(advPartial.pattern.status, 'partial');
assert(advPartial.following.rows.every(r => r.status === 'partial'));
const fakeFollowWealth = {
  dayMaster: '火', dayMasterTG: '丙', hasHour: true,
  pillars: [
    { name:'年柱', tg:'庚', dz:'申', tgEle:'金', dzEle:'金' },
    { name:'月柱', tg:'辛', dz:'酉', tgEle:'金', dzEle:'金' },
    { name:'日柱', tg:'丙', dz:'申', tgEle:'火', dzEle:'金', isDayMaster:true },
    { name:'時柱', tg:'庚', dz:'申', tgEle:'金', dzEle:'金' }
  ]
};
const ffw = AdvB.analyze(fakeFollowWealth);
assert.equal(ffw.following.rows.find(r => r.kind === '從財格').status, 'candidate');
assert(ffw.combinations.rows.some(r => r.target === '水' && r.status === 'blocked'));
const fakeTransform = {
  dayMaster: '火', dayMasterTG: '丙', hasHour: true,
  pillars: [
    { name:'年柱', tg:'癸', dz:'亥', tgEle:'水', dzEle:'水' },
    { name:'月柱', tg:'癸', dz:'子', tgEle:'水', dzEle:'水' },
    { name:'日柱', tg:'丙', dz:'亥', tgEle:'火', dzEle:'水', isDayMaster:true },
    { name:'時柱', tg:'辛', dz:'卯', tgEle:'金', dzEle:'木' }
  ]
};
assert(AdvB.analyze(fakeTransform).combinations.rows.some(r => r.target === '水' && r.status === 'candidate'));
const fakeBlocked = JSON.parse(JSON.stringify(fakeFollowWealth));
fakeBlocked.pillars[3] = { name:'時柱', tg:'丙', dz:'午', tgEle:'火', dzEle:'火' };
assert.equal(AdvB.analyze(fakeBlocked).following.rows.find(r => r.kind === '從財格').status, 'blocked');
console.log('✓ 進階八字判讀：藏干十神、格局依據、調候寒燥、從格門檻與合化條件');
['data/stroke-db','data/s2t-map','data/fortune-81','chinese-numerology','pair-harmony','chart-harmony'].forEach(load);
const H = ctx.ChartHarmony;
assert.equal(H.modeKey('__proto__'), 'general'); assert.equal(H.modeKey('spouses'), 'spouses');
assert.equal(H.branchRelations('子','午')[0].type,'沖');
assert.equal(H.branchRelations('午','子')[0].type,'沖');
assert(H.branchRelations('寅','巳').some(r => r.type === '害'));
assert(H.branchRelations('寅','巳').some(r => r.type === '刑'));
assert(H.branchRelations('亥','寅').some(r => r.type === '六合'));
assert.equal(H.baziPair(null,example), null);
const second = Z.fullBazi(1991, 8, 21, 9, 30, 8);
H.options().forEach(m => {
  const p = H.baziPair(example, second, m.id), rev = H.baziPair(second,example,m.id);
  assert.equal(p.coverage,8); assert.equal(p.score,rev.score);
  assert.equal(p.directionalSupport.aToB,rev.directionalSupport.bToA);
  assert.equal(p.dimensions.reduce((s,d) => s+d.weight,0),100);
  assert(p.dimensions.every(d => Number.isFinite(d.score) && d.score >= 0 && d.score <= d.max));
  assert(!/undefined|NaN/.test(JSON.stringify(p)));
});
assert.equal(H.baziPair(Z.fullBazi(1990,1,1,null),second).coverage,7);
assert(/部分資料/.test(H.baziPair(Z.fullBazi(1990,1,1,null),second).reading.summary));
const c1 = ctx.ChineseNumerology.analyze('王大明'), c2 = ctx.ChineseNumerology.analyze('李美玲');
const original = ctx.PairHarmony.cncnHarmony(c1,c2);
assert.equal(H.namePair(original,'cn-cn','general'),original);
const marital = H.namePair(ctx.PairHarmony.cncnHarmony(c1,c2),'cn-cn','spouses');
assert.equal(marital.dimensions.reduce((s,d) => s+d.weight,0),100);
assert(!marital.reading.summary.includes('【整體評價】'));
console.log('✓ 八字合盤：合沖刑害、雙向互補、缺時辰、六種關係權重與姓名相容');
['birth-place','data-backup'].forEach(load);
const Backup = ctx.DataBackup;
function storage(initial) {
  const m = new Map(Object.entries(initial || {}));
  return { getItem:k => m.has(k) ? m.get(k) : null, setItem:(k,v) => m.set(k,String(v)), removeItem:k => m.delete(k), dump:() => Object.fromEntries(m) };
}
const local = storage({'name-harmony-ai-key':'secret-claude','name-harmony-ai-key-deepseek':'secret-ds','unrelated':'keep'});
const state = { persons:[{cn:'龘小明',en:'Alex',birthday:'1990-05-15 10:30',place:'custom:25.03,121.56,Asia/Taipei',gender:'male',blood:'A',label:'家人'}],
  manualStrokes:{'龘':48},relationship:'spouses',tst:true };
const backup = Backup.capture(local,state), json = JSON.stringify(backup);
assert(!json.includes('secret')); assert(!json.includes('ai-key'));
assert.equal(Backup.parse('\uFEFF'+json).data.manualStrokes['龘'],48);
const invalids = [
  v => v.version = 99,
  v => v.data.currentPersons[0].birthday = '1990-02-30',
  v => v.data.currentPersons[0].place = 'custom:91,0,Asia/Taipei',
  v => v.data.currentPersons[0].label = '<img onerror=alert(1)>',
  v => v.data.currentPersons[0].gender = 'other',
  v => v.data.manualStrokes['龘'] = 65,
  v => v.data.settings.relationship = '__proto__',
  v => v.data.history = new Array(21).fill({})
];
invalids.forEach(change => { const v = JSON.parse(json); change(v); assert.throws(() => Backup.parse(JSON.stringify(v))); });
assert.throws(() => Backup.parse('{'));
assert.throws(() => Backup.parse(' '.repeat(Backup.MAX_BYTES+1)));
const injected = JSON.parse(json); injected.data['name-harmony-ai-key'] = 'attack'; injected.data.settings.aiKey = 'attack';
Backup.restore(local,injected);
assert.equal(local.getItem('name-harmony-ai-key'),'secret-claude'); assert.equal(local.getItem('unrelated'),'keep');
assert.equal(JSON.parse(local.getItem('name-harmony-restored-draft')).persons[0].label,'家人');
const failing = storage({'name-harmony-v3':'[]','name-harmony-ai-key':'stay'}), before = JSON.stringify(failing.dump());
const write = failing.setItem; let calls = 0;
failing.setItem = (k,v) => { if (++calls === 3) throw new Error('quota'); return write(k,v); };
assert.throws(() => Backup.restore(failing,backup)); assert.equal(JSON.stringify(failing.dump()),before);
const sharePayload = {
  persons: [
    { cn:'龘樂明', en:'Alex', birthday:'1990-05-15 10:30', place:'custom:25.03,121.56,Asia/Taipei', gender:'male', blood:'A', label:'甲方' },
    { cn:'林小美', en:'Mary', birthday:'1992-03-20', place:'taipei', gender:'female', blood:'O', label:'乙方' }
  ],
  relationship: 'spouses', tst: true, twMode: 'wen', pro: true,
  manualStrokes: { '龘': 48, '無': 12 },
  customPinyin: { '1:樂': 'yue4', '0:王': 'wang2' },
  customDialects: { tw: { '0:龘': 'tap8', '0:王': 'ong5' }, hhl: { '0:龘': 'dab7' } }
};
const shareToken = Backup.encodeShare(sharePayload);
assert(typeof shareToken === 'string' && /^[A-Za-z0-9\-_]+$/.test(shareToken));
const decodedShare = Backup.decodeShare(shareToken);
assert.equal(decodedShare.persons.length, 2);
assert.equal(decodedShare.relationship, 'spouses');
assert.equal(decodedShare.tst, true);
assert.equal(decodedShare.twMode, 'wen');
assert.equal(decodedShare.pro, true);
assert.equal(decodedShare.manualStrokes['龘'], 48);
assert.equal(decodedShare.manualStrokes['無'], undefined);
assert.equal(decodedShare.customPinyin['1:樂'], 'yue4');
assert.equal(decodedShare.customPinyin['0:王'], undefined);
assert.equal(decodedShare.customDialects.tw['0:龘'], 'tap8');
assert.equal(decodedShare.customDialects.hhl['0:龘'], 'dab7');
assert.throws(() => Backup.decodeShare('not!valid@token'));
assert.throws(() => Backup.decodeShare('A'.repeat(9000)));
// 驗證 JSON 備份包含 customPinyin / customDialects / brandFeedback / twMode，並相容舊版 v1 備份
const richStore = storage({
  'name-harmony-v3': '[]', 'name-harmony-profiles': '[]', 'name-harmony-brand-list': '["森月"]',
  'name-harmony-brand-feedback': JSON.stringify([{ id: 'fb1', time: '2026-11-19T01:00:00.000Z', name: '森月', kind: 'zh', selectedTone: 'calm', predictedTones: ['calm'], verdict: 'match', preferredTone: 'calm', score: 90, note: '自然感好' }]),
  'name-harmony-pinyin': JSON.stringify({ '1:樂': 'yue4' }),
  'name-harmony-dialects': JSON.stringify({ tw: { '1:小': 'siau2' }, hhl: { '0:陳': 'chin2' } }),
  'name-harmony-tw-mode': 'bai',
  'name-harmony-ai-key': 'sk-ant-secret', 'name-harmony-ai-key-deepseek': 'sk-ds-secret', 'name-harmony-sync-token': 'ghp_secret'
});
const richBackup = Backup.capture(richStore, { persons: [{ cn: '陳小明', en: 'Sam', birthday: '1990-05-15', place: 'taipei', gender: 'male', blood: 'A', label: '甲方' }], relationship: 'friends', tst: false, manualStrokes: { '龘': 48 } });
const richJson = JSON.stringify(richBackup);
assert(!richJson.includes('sk-ant-secret') && !richJson.includes('sk-ds-secret') && !richJson.includes('ghp_secret'), 'Backup excludes all API & sync tokens');
assert.equal(richBackup.data.settings.twMode, 'bai');
assert.equal(richBackup.data.customPinyin['1:樂'], 'yue4');
assert.equal(richBackup.data.customDialects.hhl['0:陳'], 'chin2');
assert.equal(richBackup.data.brandFeedback.length, 1);
const targetStore = storage({ 'name-harmony-ai-key': 'keep-ai', 'name-harmony-sync-token': 'keep-gh' });
Backup.restore(targetStore, Backup.parse(richJson));
assert.equal(targetStore.getItem('name-harmony-tw-mode'), 'bai');
assert.equal(JSON.parse(targetStore.getItem('name-harmony-pinyin'))['1:樂'], 'yue4');
assert.equal(JSON.parse(targetStore.getItem('name-harmony-dialects')).hhl['0:陳'], 'chin2');
assert.equal(JSON.parse(targetStore.getItem('name-harmony-brand-feedback')).length, 1);
assert.equal(targetStore.getItem('name-harmony-ai-key'), 'keep-ai');
assert.equal(targetStore.getItem('name-harmony-sync-token'), 'keep-gh');
// 舊版備份（無 twMode / customPinyin / customDialects / brandFeedback）相容檢查
const legacyRaw = JSON.parse(richJson);
delete legacyRaw.data.settings.twMode; delete legacyRaw.data.customPinyin; delete legacyRaw.data.customDialects; delete legacyRaw.data.brandFeedback;
const legacyParsed = Backup.parse(JSON.stringify(legacyRaw));
assert.equal(legacyParsed.data.settings.twMode, 'default');
assert.equal(legacyParsed.data.brandFeedback.length, 0);
console.log('✓ JSON 備份與可還原分享連結編解碼、欄位過濾、金鑰排除與寫入失敗回復');
['vendor/astronomy.browser.min','astrology','lunar','ziwei','ziwei-reading','ziwei-flying'].forEach(load);
const Astro = ctx.Astrology;
assert.equal(H.midpoint(350,10),0); assert.equal(H.midpoint(10,350),0);
assert.equal(H.midpoint(0,180),null); assert.equal(H.midpoint(30,30),30);
const ac = Astro.getChart(1990,6,15,8,30), bc = Astro.getChart(1992,3,20,15,0);
const syn = H.astrologyPair(ac,bc,'romantic'), synRev = H.astrologyPair(bc,ac,'romantic');
assert.equal(syn.score,synRev.score); assert.equal(syn.overlays.length,20);
assert.equal(syn.composite.length,10); assert.equal(syn.aspects.length,synRev.aspects.length);
assert(syn.aspects.every(x => Number.isFinite(x.orb) && x.orb<=8));
assert(syn.overlays.every(x => x.house>=1 && x.house<=12));
const unknownA = Astro.getChart(1990,6,15,null), unknownB = Astro.getChart(1992,3,20,null);
const partial = H.astrologyPair(unknownA,unknownB);
assert(partial.partial); assert.equal(partial.dimensions.length,3); assert.equal(partial.overlays.length,0);
assert.equal(partial.dimensions.reduce((s,d) => s+d.weight,0),100);
assert(partial.aspects.every(x => x.a!=='月亮' && x.b!=='月亮'));
assert(partial.composite.every(x => x.planet!=='月亮'));
const oneKnown = H.astrologyPair(unknownA,bc);
assert(oneKnown.overlays.every(x=>x.side==='A → B'));
assert(oneKnown.aspects.every(x=>x.a!=='月亮'));
const compFull = Astro.getCompositeChart(ac, bc);
assert(compFull && compFull.timeKnown && compFull.ascendant && compFull.midheaven && compFull.houses.length === 12);
assert(Array.isArray(compFull.nodes) && compFull.nodes.length === 2 && Math.abs(((compFull.nodes[0].lon - compFull.nodes[1].lon + 360) % 360) - 180) < 0.01);
assert(Array.isArray(compFull.minorAspects));
assert(ac.midheaven && Array.isArray(ac.nodes) && ac.nodes.length === 2 && Array.isArray(ac.minorAspects));
assert(compFull.validPlanets.every(p => p.houseNum >= 1 && p.houseNum <= 12 && p.house));
assert(Array.isArray(compFull.aspects) && compFull.aspects.length > 0);
const natalWheel = Astro.renderWheelSVG(ac, { title: '本命盤', showMinor: true, showNodes: true });
assert(natalWheel.includes('<svg') && natalWheel.includes('MC') && natalWheel.includes('☊') && !/undefined|NaN/.test(natalWheel));
const compWheel = Astro.renderWheelSVG(compFull, { title: '組合盤', isComposite: true, showMinor: true, showNodes: true });
assert(compWheel.includes('<svg') && !/undefined|NaN/.test(compWheel));
const trFull = Astro.getTransits(ac, 2026, 11, 18);
assert(trFull && trFull.dateStr === '2026-11-18' && Array.isArray(trFull.planets) && trFull.planets.length === 9 && Array.isArray(trFull.aspects) && trFull.aspects.length > 0);
assert(trFull.aspects.every(a => Number.isFinite(a.orb) && a.tPlanet && a.nPoint) && trFull.planets.every(p => p.natalHouse && p.natalHouse.n));
const trPartial = Astro.getTransits(unknownA, 2026, 11, 18);
assert(trPartial && trPartial.aspects.every(a => a.nPoint !== '月亮' && a.nPoint !== '上升點' && a.nPoint !== '中天'));
const compPartial = Astro.getCompositeChart(unknownA, unknownB);
assert(compPartial && compPartial.partial && !compPartial.ascendant && compPartial.validPlanets.every(p => p.name !== '月亮'));
const oppA = JSON.parse(JSON.stringify(ac)), oppB = JSON.parse(JSON.stringify(ac));
oppA.ascendant.lon = 10; oppB.ascendant.lon = 190;
const compOpp = Astro.getCompositeChart(oppA, oppB);
assert(compOpp && compOpp.ascAmbiguous && !compOpp.ascendant);
assert(syn.compositeChart && syn.compositeChart.houses.length === 12);
const zz = ctx.Ziwei;
const za = zz.getZiweiChart(1990,6,15,8,'male'), zb = zz.getZiweiChart(1992,3,20,15,'female');
assert.equal(H.ziweiPair(zz.getZiweiChart(1990,6,15,null),zb),null);
H.options().forEach(m => {
  const p = H.ziweiPair(za,zb,m.id), reverse = H.ziweiPair(zb,za,m.id);
  assert.equal(p.score,reverse.score); assert.equal(p.transfers.length,8);
  assert.equal(p.dimensions.length,5);
  assert.equal(p.dimensions.reduce((s,d)=>s+d.weight,0),100);
  assert(p.flying && p.flying.aToB.length > 0 && p.flying.bToA.length > 0);
  assert(p.focus.every(n=>za.palaces.some(p=>p.name===n)));
  p.transfers.forEach(x => {
    const target=x.side==='A → B'?zb:za, pal=target.palaces.find(p=>p.name===x.palace);
    assert(pal && ((!pal.borrowed && pal.stars.includes(x.star))||pal.minorStars.includes(x.star)));
  });
});
const ZF = ctx.ZiweiFlying;
assert.equal(ZF.analyze(zz.getZiweiChart(1990,6,15,null)), null);
const flyA = ZF.analyze(za);
assert.equal(flyA.palaces.length, 12);
flyA.palaces.forEach(fp => {
  assert.equal(fp.transforms.length, 4);
  fp.transforms.forEach(tr => {
    const pal = za.palaces.find(p => p.name === tr.toName);
    assert(pal && ((!pal.borrowed && pal.stars.includes(tr.star)) || pal.minorStars.includes(tr.star)));
    assert.equal(tr.self, tr.toPos === fp.pos);
    assert.equal(tr.opposite, tr.toPos === (fp.pos + 6) % 12);
  });
});
assert.equal(flyA.centrifugal.length, flyA.palaces.reduce((s, p) => s + p.selfList.length, 0));
const chartSvg = ZF.renderChartSVG(za, flyA, '命宮');
assert(chartSvg.includes('<svg') && (chartSvg.match(/zw-fly-cell/g) || []).length === 12 && !/undefined|NaN/.test(chartSvg));
const pairFly = ZF.pairAnalyze(za, zb, 'spouses');
const pairSvgAB = ZF.renderPairSVG(pairFly, 'AB');
const pairSvgBA = ZF.renderPairSVG(pairFly, 'BA', '命宮');
assert(pairSvgAB.includes('<svg') && pairSvgBA.includes('<svg') && !/undefined|NaN/.test(pairSvgAB + pairSvgBA));
const horoA = zz.getHoroscope(za, 2026);
const horoFly = ZF.horoscopeAnalyze(za, horoA);
assert(horoFly && horoFly.decadalMap && Object.keys(horoFly.decadalMap).length === 12);
assert(horoFly.yearlyMap && Object.keys(horoFly.yearlyMap).length === 12);
assert(horoFly.decadalTransforms.length === 4 && horoFly.yearlyStemTransforms.length === 4 && horoFly.yearlyMingTransforms.length === 4);
const decSvg = ZF.renderChartSVG(za, flyA, '命宮', { scopeNamesByPos: horoFly.decadalMap });
assert(decSvg.includes('<svg') && decSvg.includes('大') && !/undefined|NaN/.test(decSvg));
console.log('✓ 占星交叉相位、落宮、MC/交點/行運與中點；紫微雙向四化、本命與運限飛化自化');
// 所有新解讀的英文檢查，使用正式字典（內部中文鍵值可保留，畫面字串不能漏翻）。
load('l10n'); ctx.I18N = {getLang:()=>'en'};
ctx.L10N.PACKS.forEach(p=>load('l10n/'+p));
[
  H.baziPair(example,second,'spouses'),
  H.baziPair(Z.fullBazi(1990,1,1,null),second,'parentchild'),
  H.astrologyPair(ac,bc,'business'),
  H.astrologyPair(unknownA,unknownB,'friends'),
  H.ziweiPair(zz.getZiweiChart(1990,6,15,8,'male'),zz.getZiweiChart(1992,3,20,15,'female'),'spouses')
].forEach(p => {
  const displayed = [ctx.L10N.t(p.mode),p.tierDesc,p.reading.summary].concat(p.dimensions.flatMap(d=>[d.label,d.detail])).join('\n');
  assert(!/[一-鿿]/.test(displayed),'English leftover: '+displayed.match(/.{0,20}[一-鿿].{0,20}/));
});
const enAdv = AdvB.analyze(fakeFollowWealth);
const enAdvStr = [enAdv.pattern.name, enAdv.pattern.note, enAdv.climate.tempLabel, enAdv.climate.dryLabel, enAdv.climate.note, enAdv.following.note, enAdv.combinations.note]
  .concat(enAdv.pattern.evidence.map(e => e.text))
  .concat(enAdv.climate.needs.map(n => n.reason))
  .concat(enAdv.following.rows.flatMap(r => [r.name].concat(r.checks.map(c => c.text))))
  .concat(enAdv.combinations.rows.flatMap(r => [r.kind].concat(r.checks.map(c => c.text))))
  .join('\n');
assert(!/[一-鿿]/.test(enAdvStr), 'English AdvancedBazi leftover: ' + enAdvStr.match(/.{0,20}[一-鿿].{0,20}/));
const enFly = ZF.analyze(za);
const enHoroFly = ZF.horoscopeAnalyze(za, horoA);
const enFlyStr = [enFly.note, ZF.renderChartSVG(za, enFly, '命宮', { scopeNamesByPos: enHoroFly.decadalMap }).replace(/<[^>]+>/g, ' '), ZF.renderPairSVG(ZF.pairAnalyze(za, zb, 'spouses'), 'AB').replace(/<[^>]+>/g, ' ')]
  .concat(enFly.highlights.flatMap(h => [h.title, h.text]))
  .concat(enFly.palaces.flatMap(p => p.transforms.map(t => t.desc)))
  .concat(enHoroFly.insights.concat(enHoroFly.decadalTransforms.map(t => t.text), enHoroFly.yearlyStemTransforms.map(t => t.text), enHoroFly.yearlyMingTransforms.map(t => t.text)))
  .join('\n');
assert(!/[一-鿿]/.test(enFlyStr), 'English ZiweiFlying leftover: ' + enFlyStr.match(/.{0,20}[一-鿿].{0,20}/));
const enComp = Astro.getCompositeChart(ac, bc);
const enTr = Astro.getTransits(ac, 2026, 11, 18);
const enCompStr = [enComp.houseSystem, ctx.L10N.t(enComp.dominantElement), Astro.renderWheelSVG(enComp, { title: 'Composite', showMinor: true, showNodes: true }).replace(/<[^>]+>/g, ' '), Astro.renderWheelSVG(ac, { title: 'Natal', showMinor: true, showNodes: true }).replace(/<[^>]+>/g, ' ')]
  .concat(enComp.aspects.concat(enComp.minorAspects).map(a => a.desc))
  .concat(enComp.nodes.map(n => ctx.L10N.t(n.name) + ' ' + ctx.L10N.t(n.sign.n)))
  .concat([ctx.L10N.t(enComp.midheaven.sign.n)])
  .concat(enTr.aspects.map(a => a.desc))
  .concat(enComp.houses.map(h => ctx.L10N.t(h.name.split(' ')[0]) + ' ' + ctx.L10N.t(h.sign.n)))
  .join('\n');
assert(!/[一-鿿]/.test(enCompStr), 'English Composite leftover: ' + enCompStr.match(/.{0,20}[一-鿿].{0,20}/));
['data/pinyin-db','data/dialect-db','phonetics'].forEach(load);
const Ph = ctx.Phonetics;
const DB = ctx.DialectDB;
assert(Object.keys(DB.TAIWANESE).length > 2500, 'Expanded Taiwanese lexicon > 2500');
assert(Object.keys(DB.HAKKA).length > 3400, 'Expanded Hakka Sixian lexicon > 3400');
assert(Object.keys(DB.HAKKA_HAILU).length > 3400, 'Expanded Hakka Hailu lexicon > 3400');
assert(Object.values(DB.TAIWANESE).every(v => !!Ph.splitDialectPy(v)), 'Every Taiwanese syllable valid');
assert(Object.values(DB.HAKKA).every(v => !!Ph.splitDialectPy(v)), 'Every Hakka Sixian syllable valid');
assert(Object.values(DB.HAKKA_HAILU).every(v => !!Ph.splitDialectPy(v)), 'Every Hakka Hailu syllable valid');
assert('陳林黃蔡賴謝蘇郭'.split('').every(c => DB.JYUTPING[c] && DB.TAIWANESE[c] && DB.HAKKA[c] && DB.HAKKA_HAILU[c]), 'Major surnames in all 4 dialects');
assert(DB.getVariants('tw', '小').some(v => v.tag === 'w' && v.py === 'siau2') && DB.getVariants('tw', '小').some(v => v.tag === 'b' && v.py === 'sio2'), 'TW wen/bai variants for 小');
assert(DB.getVariants('yue', '樂').some(v => v.py === 'lok6') && DB.getVariants('yue', '樂').some(v => v.py === 'ngok6'), 'Cantonese polyphone variants for 樂');
assert(DB.getVariants('hhl', '長').length >= 2, 'Hailu Hakka multi-readings for 長');
const parsedLe = ctx.ChineseNumerology.analyze('王樂明').parsed;
const phDefault = Ph.checkChinese(parsedLe);
const phCustom = Ph.checkChinese(parsedLe, { '1:樂': 'yue4' });
assert.equal(phDefault.sylls[1].py, 'le4');
assert.equal(phCustom.sylls[1].py, 'yue4');
assert.equal(phCustom.customApplied[1], true);
assert.equal(Object.keys(Ph.sanitizePinyinMap({ '0:樂': 'yue4', 'bad': '123', '樂': 'bad9' })).length, 1);
const parsedChen = ctx.ChineseNumerology.analyze('陳小明').parsed;
const diaDef = Ph.checkDialects(parsedChen);
assert.equal(diaDef.length, 4);
assert(diaDef.every(d => d.covered === 3));
assert.equal(diaDef[1].sylls[0].py, 'tan5');
assert.equal(diaDef[1].sylls[1].py, 'sio2');
assert.equal(diaDef[1].sylls[2].py, 'bing5');
const diaWen = Ph.checkDialects(parsedChen, null, { twMode: 'wen' });
assert.equal(diaWen[1].sylls[0].py, 'tin5');
assert.equal(diaWen[1].sylls[1].py, 'siau2');
const diaBai = Ph.checkDialects(parsedChen, null, { twMode: 'bai' });
assert.equal(diaBai[1].sylls[0].py, 'tan5');
assert.equal(diaBai[1].sylls[2].py, 'mia5');
assert(diaDef[3].key === 'hhl' && diaDef[3].sylls[0].py === 'chin2', 'Hailu Hakka check works');
const diaRare = Ph.checkDialects(ctx.ChineseNumerology.analyze('陳龘明', { '龘': 48 }).parsed);
assert.equal(diaRare[1].covered, 2);
const diaTrap = Ph.checkDialects(ctx.ChineseNumerology.analyze('陳阿婆').parsed);
assert(diaTrap[1].homophones.some(h => h.word === '阿婆'));
const diaHailuTrap = Ph.checkDialects(ctx.ChineseNumerology.analyze('陳死明').parsed);
assert(diaHailuTrap[3].homophones.some(h => h.word === '死'));
const diaOverride = Ph.checkDialects(ctx.ChineseNumerology.analyze('陳龘明', { '龘': 48 }).parsed, { tw: { '1:龘': 'tap8' }, hhl: { '1:龘': 'dab7' } });
assert.equal(diaOverride[1].covered, 3);
assert.equal(diaOverride[1].sylls[1].py, 'tap8');
assert.equal(diaOverride[3].sylls[1].py, 'dab7');
// 英文模式四方言無殘留中文（排除姓名漢字與諧音參考詞本身）
const enDiaStr = diaWen.map(d => d.label + ' ' + ctx.L10N.t(d.grade) + ' ' + d.notes.join(' ')).join('\n');
assert(!/[一-鿿]/.test(enDiaStr), 'English dialect labels/notes leftover: ' + enDiaStr.match(/.{0,20}[一-鿿].{0,20}/));
console.log('✓ 組合盤深化、多音字指定、粵台文白／客語四縣海陸字庫與中英文無殘留檢查');

// 品牌調性本機回饋 + AI 驗收清單 + GitHub 私密 Gist 雲端同步（非同步測試）
['data/english-phonetics','data/english-translit','data/name-chars','data/char-element','foreign-name','baby-name','naming-extensions','ai-reading','cloud-sync'].forEach(load);
const NE = ctx.NamingExtensions;
const fbClean = NE.sanitizeBrandFeedback([
  { id: 'a1', time: '2026-11-19T01:00:00.000Z', name: '森月', kind: 'zh', selectedTone: 'calm', predictedTones: ['calm'], verdict: 'match', preferredTone: 'calm', score: 92, note: 'OK' },
  { id: 'a2', time: '2026-11-19T02:00:00.000Z', name: 'Luma', kind: 'en', selectedTone: 'trust', predictedTones: ['warm'], verdict: 'other', preferredTone: 'calm', score: 78, note: '<bad>' },
  { id: 'a2', time: '2026-11-19T02:00:00.000Z', name: 'Luma', kind: 'en', selectedTone: 'trust', predictedTones: ['warm'], verdict: 'other', preferredTone: 'calm', score: 78, note: 'dup' }
]);
assert.equal(fbClean.length, 2);
assert.equal(fbClean[0].note, 'bad');
const fbSum = NE.summarizeBrandFeedback(fbClean);
assert.equal(fbSum.total, 2); assert.equal(fbSum.matched, 1); assert.equal(fbSum.rate, 50); assert.equal(fbSum.byPreferred.calm, 2);
const fbJson = JSON.parse(NE.brandFeedbackReport(fbClean, '2026-11-19', 'json'));
assert.equal(fbJson.entries.length, 2);
const fbMd = NE.brandFeedbackReport(fbClean, '2026-11-19', 'md');
assert(fbMd.includes('Luma') && fbMd.includes('50%'));
const AI = ctx.AiReading;
const chk0 = AI.evaluateChecklist([], {});
assert.equal(chk0.passed, 0);
const chkFull = AI.evaluateChecklist([
  { kind: 'analysis', stop: 'end_turn', input: 1000, cacheWrite: 500, cacheRead: 0, output: 300, ttft: 500, ms: 2000, cost: 0.02 },
  { kind: 'follow-up', stop: 'end_turn', input: 50, cacheWrite: 0, cacheRead: 1200, output: 200, ttft: 400, ms: 1500, cost: 0.01 },
  { kind: 'follow-up', stop: 'aborted', input: 0, cacheWrite: 0, cacheRead: 0, output: 0, ttft: 300, ms: 600, cost: null },
  { kind: 'follow-up', stop: 'end_turn', input: 60, cacheWrite: 0, cacheRead: 1400, output: 180, ttft: 350, ms: 1400, cost: 0.01 }
], { billingChecked: true, actualCost: 'US$0.041', note: 'Matches console' });
assert.equal(chkFull.passed, 4);
const aiRep = AI.usageReport([
  { kind: 'analysis', model: 'claude-opus-5', stop: 'end_turn', input: 1000, cacheWrite: 0, cacheRead: 0, output: 200, ttft: 500, ms: 2000, cost: 0.01 }
], '2026-11-19', { billingChecked: true, actualCost: 'US$0.010', note: 'OK' });
assert(aiRep.includes('US$0.010') && aiRep.includes('[x]'));

(async () => {
  const CS = ctx.CloudSync;
  // 1. 雙向合併測試
  const mkBackup = (exportedAt, patch) => Backup.validate({
    format: 'name-harmony-backup', version: 1, exportedAt,
    data: Object.assign({
      history: [], profiles: [], namingPrefs: null, brandList: [], brandFeedback: [],
      settings: { relationship: 'general', tst: false, twMode: 'default' },
      manualStrokes: {}, customPinyin: {}, customDialects: {}, currentPersons: []
    }, patch)
  });
  const locB = mkBackup('2026-11-19T10:00:00.000Z', {
    history: [{ time: '2026-11-19T09:00:00.000Z', persons: [{ cn: '陳小明', en: '', birthday: '', place: '', gender: '', blood: '', label: '甲' }], pairs: [] }],
    profiles: [{ name: '王家', time: '2026-11-19T09:30:00.000Z', persons: [{ cn: '王大明', en: '', birthday: '', place: '', gender: '', blood: '', label: '甲' }], pairs: [] }],
    brandList: ['森月', 'Luma'],
    brandFeedback: [{ id: 'f1', time: '2026-11-19T09:00:00.000Z', name: '森月', kind: 'zh', selectedTone: 'calm', predictedTones: ['calm'], verdict: 'match', preferredTone: 'calm', score: 90, note: '' }],
    manualStrokes: { '龘': 48 }, customPinyin: { '1:樂': 'yue4' }, customDialects: { hhl: { '0:陳': 'chin2' } }
  });
  const remB = mkBackup('2026-11-19T08:00:00.000Z', {
    history: [{ time: '2026-11-18T09:00:00.000Z', persons: [{ cn: '林大維', en: '', birthday: '', place: '', gender: '', blood: '', label: '甲' }], pairs: [] }],
    profiles: [
      { name: '王家', time: '2026-11-18T08:00:00.000Z', persons: [{ cn: '王舊名', en: '', birthday: '', place: '', gender: '', blood: '', label: '甲' }], pairs: [] },
      { name: '林家', time: '2026-11-18T08:00:00.000Z', persons: [{ cn: '林小美', en: '', birthday: '', place: '', gender: '', blood: '', label: '甲' }], pairs: [] }
    ],
    brandList: ['luma', '青禾'],
    brandFeedback: [{ id: 'f2', time: '2026-11-18T08:00:00.000Z', name: '青禾', kind: 'zh', selectedTone: 'calm', predictedTones: ['calm'], verdict: 'match', preferredTone: 'calm', score: 88, note: '' }],
    manualStrokes: { '靐': 39 }, customDialects: { tw: { '0:陳': 'tin5' } }
  });
  const merged = CS.mergeBackups(locB, remB).backup;
  assert.equal(merged.data.history.length, 2);
  assert.equal(merged.data.profiles.length, 2);
  assert.equal(merged.data.profiles.find(p => p.name === '王家').persons[0].cn, '王大明');
  assert.equal(JSON.stringify(merged.data.brandList), JSON.stringify(['森月', 'Luma', '青禾']));
  assert.equal(merged.data.brandFeedback.length, 2);
  assert.equal(merged.data.manualStrokes['龘'], 48);
  assert.equal(merged.data.manualStrokes['靐'], 39);
  assert.equal(merged.data.customDialects.hhl['0:陳'], 'chin2');
  assert.equal(merged.data.customDialects.tw['0:陳'], 'tin5');
  // 全新空裝置連線時取雲端設定與表單
  const emptyLoc = mkBackup('2026-11-19T12:00:00.000Z', {});
  const remoteWithPrefs = mkBackup('2026-11-18T12:00:00.000Z', {
    settings: { relationship: 'spouses', tst: true, twMode: 'wen' },
    currentPersons: [{ cn: '林小美', en: 'Mia', birthday: '', place: '', gender: '', blood: '', label: '甲' }]
  });
  const freshMerged = CS.mergeBackups(emptyLoc, remoteWithPrefs).backup;
  assert.equal(freshMerged.data.settings.relationship, 'spouses');
  assert.equal(freshMerged.data.currentPersons[0].cn, '林小美');

  // 2. GitHub 私密 Gist API 模擬：未設定零請求、自動建立、次裝置自動尋找合併、排除金鑰、401 清除、離線佇列
  let fetchCalls = 0;
  const fakeGists = {};
  const mockFetch = async (url, opts = {}) => {
    fetchCalls++;
    const auth = opts.headers && opts.headers.Authorization;
    const mkRes = (status, body, headersMap = {}) => ({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: k => headersMap[k.toLowerCase()] || '' },
      text: async () => typeof body === 'string' ? body : JSON.stringify(body)
    });
    if (auth === 'Bearer bad-token') return mkRes(401, { message: 'Bad credentials' });
    if (auth === 'Bearer no-scope') return mkRes(200, { login: 'demo' }, { 'x-oauth-scopes': 'repo' });
    if (url.endsWith('/user')) return mkRes(200, { login: 'sync-tester' }, { 'x-oauth-scopes': 'gist' });
    if (url.includes('/gists?per_page=')) return mkRes(200, Object.values(fakeGists));
    if (url.endsWith('/gists') && opts.method === 'POST') {
      const payload = JSON.parse(opts.body);
      assert.equal(payload.public, false, 'Must always create private Gist');
      const content = payload.files[CS.SYNC_FILE].content;
      assert(!content.includes('sk-ant-topsecret') && !content.includes('ghp_valid'), 'Synced Gist excludes AI keys and GitHub token');
      const id = 'a1b2c3d4e5f60718293a';
      fakeGists[id] = { id, public: false, files: { [CS.SYNC_FILE]: { content } } };
      return mkRes(201, fakeGists[id]);
    }
    const m = /\/gists\/([a-f0-9]+)$/i.exec(url);
    if (m && (!opts.method || opts.method === 'GET')) {
      return fakeGists[m[1]] ? mkRes(200, fakeGists[m[1]]) : mkRes(404, { message: 'Not Found' });
    }
    if (m && opts.method === 'PATCH') {
      const payload = JSON.parse(opts.body);
      fakeGists[m[1]].files[CS.SYNC_FILE].content = payload.files[CS.SYNC_FILE].content;
      return mkRes(200, fakeGists[m[1]]);
    }
    return mkRes(404, { message: 'Not Found' });
  };
  CS._setFetch(mockFetch);
  CS._clearMem();
  const dev1 = storage({
    'name-harmony-v3': JSON.stringify(locB.data.history),
    'name-harmony-ai-key': 'sk-ant-topsecret'
  });
  assert.equal(CS.markDirty('history', dev1), false, 'No sync when disconnected');
  assert.equal(fetchCalls, 0, 'Zero network requests when disconnected');
  await assert.rejects(() => CS.connect({ token: 'no-scope', storage: dev1 }), /gist/i);
  await assert.rejects(() => CS.connect({ token: 'bad-token', storage: dev1 }));
  assert.equal(CS.getToken(dev1), '', '401 clears token');
  const conn1 = await CS.connect({ token: 'ghp_valid', remember: true, autoSync: true, storage: dev1, state: { persons: [], relationship: 'general', tst: false } });
  assert.equal(conn1.created, true);
  assert.equal(CS.loadConfig(dev1).gistId, 'a1b2c3d4e5f60718293a');
  // 第二台裝置連線自動找到同一個私密 Gist 並雙向合併
  CS._clearMem();
  const dev2 = storage({ 'name-harmony-brand-list': JSON.stringify(['青禾']) });
  const conn2 = await CS.connect({ token: 'ghp_valid', remember: true, autoSync: true, storage: dev2, state: { persons: [], relationship: 'general', tst: false } });
  assert.equal(conn2.restored, true);
  assert.equal(JSON.parse(dev2.getItem('name-harmony-v3')).length, 1);
  assert.equal(JSON.stringify(JSON.parse(dev2.getItem('name-harmony-brand-list'))), JSON.stringify(['青禾']));
  // 離線佇列測試
  ctx.navigator = { onLine: false };
  const callsBeforeOffline = fetchCalls;
  assert.equal(CS.markDirty('brandList', dev2), true);
  assert(CS.getPending(dev2) && CS.getPending(dev2).pending);
  assert.equal(fetchCalls, callsBeforeOffline, 'Offline markDirty makes zero network calls');
  ctx.navigator = { onLine: true };
  await CS.flushPending(dev2);
  assert.equal(CS.getPending(dev2), null, 'Online flush clears pending queue');
  CS.disconnect(dev2);
  assert.equal(CS.getToken(dev2), '');
  assert.equal(JSON.parse(dev2.getItem('name-harmony-v3')).length, 1, 'Disconnect preserves local data');
  console.log('✓ 品牌調性本機回饋、AI 驗收清單與 GitHub 私密 Gist 雙向合併／離線佇列／金鑰排除');
})().catch(e => { console.error(e); process.exitCode = 1; });
