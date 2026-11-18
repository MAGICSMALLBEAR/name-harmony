/** 條件式八字判讀。古籍提供觀察方向；數值門檻為本站保守模型，候選不作確定斷語。 */
window.AdvancedBazi = (function() {
  'use strict';
  function L(z,e) { return window.L10N ? window.L10N.L(z,e) : z; }
  function T(s) { return window.L10N ? window.L10N.t(s) : s; }
  function G(s) { return window.L10N ? window.L10N.ganzhi(s) : s; }
  var STEMS = '甲乙丙丁戊己庚辛壬癸'.split(''), ELS = ['木','火','土','金','水'];
  var HIDDEN = {子:'癸',丑:'己癸辛',寅:'甲丙戊',卯:'乙',辰:'戊乙癸',巳:'丙庚戊',午:'丁己',未:'己丁乙',申:'庚壬戊',酉:'辛',戌:'戊辛丁',亥:'壬甲'};
  var GEN = {木:'火',火:'土',土:'金',金:'水',水:'木'}, CTRL = {木:'土',火:'金',土:'水',金:'木',水:'火'};
  var STEM_COMB = [['甲己','土'],['乙庚','金'],['丙辛','水'],['丁壬','木'],['戊癸','火']];
  var STEM_CLASH = ['甲庚','乙辛','丙壬','丁癸'];
  var CLASH = ['子午','丑未','寅申','卯酉','辰戌','巳亥'];
  var BRANCH_COMB = [['子丑','土'],['寅亥','木'],['卯戌','火'],['辰酉','金'],['巳申','水'],['午未','土']];
  var GROUPS = [['申子辰','水','三合','three-harmony'],['亥卯未','木','三合','three-harmony'],['寅午戌','火','三合','three-harmony'],['巳酉丑','金','三合','three-harmony'],
    ['寅卯辰','木','三會','seasonal'],['巳午未','火','三會','seasonal'],['申酉戌','金','三會','seasonal'],['亥子丑','水','三會','seasonal']];
  var STATUS = {
    candidate:['候選（本站條件通過）','Candidate (model conditions met)'],
    blocked:['條件未足／有反證','Conditions unmet / counterevidence'],
    partial:['缺時辰，暫不定格','Birth time missing; classification withheld'],
    observed:['結構觀察','Structural observation']
  };
  function status(s) { return L.apply(null,STATUS[s] || STATUS.observed); }
  function el(s) { var i=STEMS.indexOf(s); return i<0 ? null : ELS[Math.floor(i/2)]; }
  function generator(e) { return ELS.filter(function(x) { return GEN[x]===e; })[0]; }
  function controller(e) { return ELS.filter(function(x) { return CTRL[x]===e; })[0]; }
  function pair(a,b,list) { return list.indexOf(a+b)>=0 || list.indexOf(b+a)>=0; }
  function check(id,ok,z,e) { return {id:id,pass:!!ok,text:L(z,e)}; }
  function available(b) { return b.pillars.map(function(p,i) { return {p:p,index:i}; }).filter(function(x) {return el(x.p.tg) && HIDDEN[x.p.dz];}); }
  function hiddenRows(b) {
    return available(b).map(function(x) { return {index:x.index,pillar:x.p.name,branch:x.p.dz,stems:HIDDEN[x.p.dz].split('').map(function(s) {
      return {stem:s,element:el(s),role:window.ZodiacBazi.calcShiShen(b.dayMasterTG,s)};
    })}; });
  }
  function pattern(b,full) {
    var month=b.pillars[1], hs=HIDDEN[month.dz].split('');
    var shown=available(b).filter(function(x){return x.index!==2;});
    var candidates=hs.map(function(s,i) {
      return {stem:s,role:window.ZodiacBazi.calcShiShen(b.dayMasterTG,s),principal:i===0,
        exposed:shown.filter(function(x){return x.p.tg===s;}).map(function(x){return x.p.name;})};
    });
    var chosen=candidates.filter(function(c){return c.exposed.length;})[0] || candidates[0];
    var name, en;
    var blade={甲:'卯',丙:'午',戊:'午',庚:'酉',壬:'子'};
    if (blade[b.dayMasterTG]===month.dz) {name='陽刃格';en='Yang Blade pattern';}
    else if (candidates[0].role==='比肩') {name='建祿格';en='Establishing Salary pattern';}
    else if (candidates[0].role==='劫財') {name='月劫格';en='Monthly Rob Wealth pattern';}
    else {name=chosen.role+'格';en=T(chosen.role)+' pattern';}
    var shownRoles=shown.map(function(x){return {pillar:x.p.name,stem:x.p.tg,role:window.ZodiacBazi.calcShiShen(b.dayMasterTG,x.p.tg)};});
    function hasRole(roles){return shownRoles.filter(function(r){return roles.indexOf(r.role)>=0;});}
    function roleNames(hits){return hits.map(function(r){return r.pillar+r.stem+'('+r.role+')';}).join('、');}
    function roleNamesEn(hits){return hits.map(function(r){return T(r.pillar)+' '+G(r.stem)+' ('+T(r.role)+')';}).join(', ');}
    var pKey=name;
    var extraEvidence=[];
    if(pKey==='正官格'){
      var hurters=hasRole(['傷官']), killers=hasRole(['七殺']), helpers=hasRole(['正財','偏財','正印','偏印']);
      extraEvidence.push(check('patternSupport',helpers.length>0,
        helpers.length?'透財印護官：'+roleNames(helpers):'他柱未見財印透干相助，單看正官本身受力',
        helpers.length?'Exposed Wealth/Resource supporting Officer: '+roleNamesEn(helpers):'No exposed Wealth or Resource outside to support Direct Officer'));
      extraEvidence.push(check('patternPure',!hurters.length && !killers.length,
        !hurters.length && !killers.length?'未見傷官見官或官殺混雜透干':'透干見干擾：'+roleNames(hurters.concat(killers)),
        !hurters.length && !killers.length?'No exposed Hurting Officer or mixed Seven Killings':'Exposed interference: '+roleNamesEn(hurters.concat(killers))));
    } else if(pKey==='七殺格'){
      var tamers=hasRole(['食神','正印','偏印']), officers=hasRole(['正官']);
      extraEvidence.push(check('patternSupport',tamers.length>0,
        tamers.length?'透食神制殺或印星化殺：'+roleNames(tamers):'他柱未見食神或印星透干制化，七殺偏重直接壓力',
        tamers.length?'Exposed Eating God / Resource to regulate Killings: '+roleNamesEn(tamers):'No exposed Eating God or Resource to regulate Seven Killings'));
      extraEvidence.push(check('patternPure',!officers.length,
        !officers.length?'未見正官透干混雜':'透出正官形成官殺混雜觀察：'+roleNames(officers),
        !officers.length?'No exposed Direct Officer mixing with Seven Killings':'Exposed Direct Officer creates Officer-Killings mixture: '+roleNamesEn(officers)));
    } else if(pKey==='傷官格'){
      var printOrWealth=hasRole(['正印','偏印','正財','偏財']), off=hasRole(['正官']);
      extraEvidence.push(check('patternSupport',printOrWealth.length>0,
        printOrWealth.length?'透印星佩印或財星流通：'+roleNames(printOrWealth):'他柱未見印財透干引化傷官',
        printOrWealth.length?'Exposed Resource or Wealth channeling Output: '+roleNamesEn(printOrWealth):'No exposed Resource or Wealth to channel Hurting Officer'));
      if(off.length) extraEvidence.push(check('patternPure',false,'透出正官（傷官見官需看印財是否通關）：'+roleNames(off),'Exposed Direct Officer (check Resource/Wealth mediation): '+roleNamesEn(off)));
    } else if(pKey==='食神格'){
      var owl=hasRole(['偏印']), wealth=hasRole(['偏財']);
      extraEvidence.push(check('patternPure',!owl.length || wealth.length>0,
        owl.length?(wealth.length?'見偏印透干但有偏財制衡：'+roleNames(owl.concat(wealth)):'透出偏印（梟印奪食觀察，未見偏財透干）：'+roleNames(owl)):'未見偏印透干奪食',
        owl.length?(wealth.length?'Indirect Resource offset by Indirect Wealth: '+roleNamesEn(owl.concat(wealth)):'Exposed Indirect Resource without Indirect Wealth to counter: '+roleNamesEn(owl)):'No exposed Indirect Resource threatening Eating God'));
    } else if(pKey==='正財格' || pKey==='偏財格'){
      var peers=hasRole(['比肩','劫財']), guard=hasRole(['正官','七殺','食神','傷官']);
      extraEvidence.push(check('patternPure',!peers.length || guard.length>0,
        peers.length?(guard.length?'見比劫透干但有官殺或食傷通關護財：'+roleNames(peers.concat(guard)):'比劫透干分財且未見官殺護財：'+roleNames(peers)):'未見比劫透干直接爭財',
        peers.length?(guard.length?'Exposed Companion/Rob Wealth mediated by Officer or Output: '+roleNamesEn(peers.concat(guard)):'Exposed Companion/Rob Wealth without Officer guard: '+roleNamesEn(peers)):'No exposed Companion/Rob Wealth competing for Wealth'));
    } else if(pKey==='陽刃格' || pKey==='建祿格' || pKey==='月劫格'){
      var outlet=hasRole(['正官','七殺','食神','傷官','正財','偏財']);
      extraEvidence.push(check('patternSupport',outlet.length>0,
        outlet.length?'他柱透出官殺、食傷或財星洩制比劫：'+roleNames(outlet):'他柱未見明顯官殺／食傷／財星透干引導',
        outlet.length?'Exposed Officer, Output or Wealth channeling self-qi: '+roleNamesEn(outlet):'No exposed Officer, Output or Wealth to channel strong self-qi'));
    }
    return {name:L(name,en),selected:chosen,candidates:candidates,status:full?'observed':'partial',
      evidence:[
        check('month',true,'月令 '+month.dz+'，藏干依本氣優先排列：'+hs.join('、'),'Month branch '+G(month.dz)+'; principal-first hidden stems: '+hs.map(G).join(', ')),
        check('exposed',chosen.exposed.length>0,'取 '+chosen.stem+'（'+chosen.role+'）；'+(chosen.exposed.length?'透於 '+chosen.exposed.join('、'):'未透干，僅以月令本氣作候選'),
          'Selected '+G(chosen.stem)+' ('+T(chosen.role)+'); '+(chosen.exposed.length?'exposed in '+chosen.exposed.map(T).join(', '):'not exposed; only a principal month-qi candidate'))
      ].concat(extraEvidence).concat([
        check('full',full,'已填四柱才可完整檢查格局成敗；此處取格不等於已成格','All four pillars are needed to assess formation and disruption; selecting a pattern does not establish it')
      ]),
      note:L('取月令藏干，本氣透干優先，其次取透出的中餘氣；均未透時回到本氣。建祿、月劫及陽干刃月另外標示，尚不以此斷富貴。',
        'Select the exposed principal hidden month stem first, then an exposed secondary stem; otherwise use the principal stem. Salary, Monthly Rob Wealth and yang-stem Blade months are identified separately, without inferring life outcomes.')};
  }
  function climate(b,xy,full) {
    var m=b.pillars[1].dz, total=ELS.reduce(function(s,e){return s+xy.score[e];},0);
    var seasonal = {寅:[-1,0],卯:[0,0],辰:[0,-1],巳:[1,1],午:[2,1],未:[2,2],申:[1,1],酉:[0,1],戌:[0,2],亥:[-1,-1],子:[-2,-1],丑:[-2,-1]}[m];
    var tempLabel = seasonal[0]<=-2?L('寒','Cold'):seasonal[0]<0?L('偏涼','Cool'):seasonal[0]===0?L('平和','Mild'):seasonal[0]===1?L('偏暖','Warm'):L('炎熱','Hot');
    var dryLabel = seasonal[1]<0?L('偏濕','Damp'):seasonal[1]===0?L('平和','Balanced'):seasonal[1]===1?L('偏燥','Dry'):L('燥烈','Very dry');
    var needs=[];
    function add(element,z,e) {
      if(needs.some(function(n){return n.element===element;}))return;
      var roots=available(b).filter(function(x){return HIDDEN[x.p.dz].split('').some(function(s){return el(s)===element;});});
      var exposed=available(b).filter(function(x){return el(x.p.tg)===element;});
      needs.push({element:element,reason:L(z,e),share:total?xy.score[element]/total:0,exposed:exposed.map(function(x){return x.p.name;}),
        rooted:roots.map(function(x){return x.p.name;}),inStrengthFavourable:xy.favorable.indexOf(element)>=0,
        conflict:xy.unfavorable.indexOf(element)>=0});
    }
    if(seasonal[0]<0)add('火','寒月先觀察火的溫暖條件','In a cold month, first inspect warmth from Fire');
    if(seasonal[0]<0 && b.dayMaster==='火')add('木','寒月火弱時並看木生火以助暖氣續存','In a cold month, also check Wood to feed and sustain Fire');
    if(seasonal[0]>0 || seasonal[1]>0)add('水','暖燥月先觀察水的潤澤與降燥條件','In a warm or dry month, inspect moisture and cooling from Water');
    if((seasonal[0]>0 || seasonal[1]>0) && b.dayMaster==='水')add('金','暖燥月水易耗時並看金發水源','In a warm or dry month, also check Metal as a source to replenish Water');
    if(seasonal[1]<0 && b.dayMaster==='土')add('火','濕土觀察火暖燥土，並檢查是否已過量','For damp Earth, inspect warming and drying by Fire, including possible excess');
    if(b.dayMasterTG==='庚' && seasonal[0]>=0 && xy.ratio>=0.5)add('火','庚金偏強時另觀察火煉金，須與季節需求並看','For stronger Geng Metal, also inspect tempering by Fire alongside seasonal needs');
    if(b.dayMasterTG==='辛' && seasonal[0]>=0)add('水','辛金另觀察水洗金；寒月不直接追加水','For Xin Metal, also inspect cleansing by Water; do not automatically add Water in cold months');
    if(!needs.length && b.dayMaster==='木' && xy.ratio<0.5)add('水','春木偏弱時觀察水源，仍需避免寒濕過重','For weaker spring Wood, inspect a Water source while checking for excessive cold and dampness');
    return {month:m,temperature:seasonal[0],dryness:seasonal[1],tempLabel:tempLabel,dryLabel:dryLabel,status:full?'observed':'partial',needs:needs,
      note:L('採節氣月的寒暖燥濕與日干特性作條件觀察，並列透干、根氣及現有權重占比；不是《窮通寶鑑》逐月逐干的完整取用表。調候需求與扶抑喜忌可能不同，衝突時並列，不直接覆寫取名用神。',
        'This model inspects solar-month climate and Day Stem traits, showing exposure, roots and weighted shares. It is not the full stem-by-month Qiong Tong Bao Jian table. Climate and strength requirements may conflict; both are shown without automatically replacing naming elements.')};
  }
  function following(b,xy,full) {
    var ps=available(b), dm=b.dayMaster, total=ELS.reduce(function(s,e){return s+xy.score[e];},0);
    var roots=ps.filter(function(x){return HIDDEN[x.p.dz].split('').some(function(s){return el(s)===dm;});});
    var helpers=ps.filter(function(x){return x.index!==2 && (el(x.p.tg)===dm || el(x.p.tg)===generator(dm));});
    var monthEl=el(HIDDEN[b.pillars[1].dz][0]);
    var defs=[['從財格','Follow Wealth',CTRL[dm]],['從殺格','Follow Officer/Killings',controller(dm)],['從兒格','Follow Output',GEN[dm]]];
    var rows=defs.map(function(def){
      var dominant=def[2], ratio=total?xy.score[dominant]/total:0;
      var checks=[
        check('complete',full,'出生時辰已知','Birth time is known'),
        check('weak',xy.ratio<=0.1,'同黨占比 '+Math.round(xy.ratio*100)+'%，門檻 ≤ 10%','Supporting share '+Math.round(xy.ratio*100)+'%; threshold ≤ 10%'),
        check('noRoot',!roots.length,'日主同五行藏干根氣：'+(roots.length?roots.map(function(x){return x.p.name;}).join('、'):'未見'),
          'Hidden roots of the Day Master element: '+(roots.length?roots.map(function(x){return T(x.p.name);}).join(', '):'none observed')),
        check('noHelper',!helpers.length,'日主以外印比透干：'+(helpers.length?helpers.map(function(x){return x.p.tg;}).join('、'):'未見'),
          'Exposed Resource/Companion stems other than the Day Master: '+(helpers.length?helpers.map(function(x){return G(x.p.tg);}).join(', '):'none observed')),
        check('dominant',ratio>=0.7,'所從 '+dominant+' 占比 '+Math.round(ratio*100)+'%，門檻 ≥ 70%',
          'Followed '+T(dominant)+' share '+Math.round(ratio*100)+'%; threshold ≥ 70%'),
        check('season',monthEl===dominant,'月令本氣須屬所從五行','The principal month qi must match the followed element'),
        check('exposed',ps.some(function(x){return x.index!==2 && el(x.p.tg)===dominant;}),'所從五行須透干','The followed element must be exposed')
      ];
      return {kind:def[0],name:L(def[0],def[1]),element:dominant,status:!full?'partial':checks.every(function(c){return c.pass;})?'candidate':'blocked',checks:checks};
    });
    var strongChecks=[
      check('complete',full,'出生時辰已知','Birth time is known'),
      check('support',xy.ratio>=0.9,'同黨占比須 ≥ 90%（目前 '+Math.round(xy.ratio*100)+'%）','Supporting share must be ≥ 90% (currently '+Math.round(xy.ratio*100)+'%)'),
      check('root',roots.length>0,'日主須有根氣','The Day Master must have a root'),
      check('season',monthEl===dm || monthEl===generator(dm),'月令本氣須為印比','Principal month qi must be Resource or Companion'),
      check('noControl',!ps.some(function(x){return el(x.p.tg)===controller(dm) || HIDDEN[x.p.dz].split('').some(function(s){return el(s)===controller(dm);});}),
        '不得有官殺透干或藏干根氣','No exposed or hidden Officer/Killings element')
    ];
    rows.push({kind:'從強格',name:L('從強格','Follow Strength'),element:dm,status:!full?'partial':strongChecks.every(function(c){return c.pass;})?'candidate':'blocked',checks:strongChecks});
    return {rows:rows,note:L('10%／70%／90% 是本站可稽核的保守篩選門檻，不是古籍定量標準。任何根氣、印比或時柱反證都要保留；通過仍只列候選，不自動反轉原有喜用神。',
      'The 10%/70%/90% thresholds are conservative, auditable app rules, not classical numeric standards. Roots, supporting stems and Hour Pillar counterevidence remain visible. Passing only creates a candidate and does not reverse existing favourable elements.')};
  }
  function combinations(b,full) {
    var ps=available(b), month=b.pillars[1], monthEl=el(HIDDEN[month.dz][0]), rows=[];
    function assess(kind,members,target,checks) {
      checks.unshift(check('complete',full,'四柱完整，才檢查合化條件','All four pillars are required for a transformation assessment'));
      rows.push({kind:kind,members:members,target:target,checks:checks,status:!full?'partial':checks.every(function(c){return c.pass;})?'candidate':'blocked'});
    }
    for(var i=0;i<ps.length;i++)for(var j=i+1;j<ps.length;j++){
      var a=ps[i],d=ps[j],rest=ps.filter(function(x){return x.index!==a.index && x.index!==d.index;});
      STEM_COMB.forEach(function(rule){if(!pair(a.p.tg,d.p.tg,[rule[0]]))return;
        var target=rule[1], competing=rest.some(function(x){return x.p.tg===a.p.tg || x.p.tg===d.p.tg;});
        var rooted=[a,d].some(function(x){return el(x.p.tg)!==target && ps.some(function(y){return el(HIDDEN[y.p.dz][0])===el(x.p.tg);});});
        assess(L('天干五合','Stem combination'),[a.index,d.index],target,[
          check('adjacent',Math.abs(a.index-d.index)===1,'兩干相鄰，遙合不直接取化','The stems are adjacent; remote combinations are not transformed'),
          check('competition',!competing,'未見第三干爭合／妒合','No third stem competes for the combination'),
          check('season',monthEl===target,'化神 '+target+' 須得月令本氣支持','The transformed '+T(target)+' element must match the principal month qi'),
          check('exposed',rest.some(function(x){return el(x.p.tg)===target;}),'合外須另有化神透干','Another transformed-element stem must be exposed outside the pair'),
          check('root',!rooted,'非化神一方不得另有本氣強根','A non-transformed-element partner must not retain a principal-qi root'),
          check('clash',!rest.some(function(x){return pair(x.p.tg,a.p.tg,STEM_CLASH)||pair(x.p.tg,d.p.tg,STEM_CLASH);}),'未見第三干直接沖合干','No third stem directly clashes with either partner'),
          check('control',!rest.some(function(x){return el(x.p.tg)===controller(target);}),'化神不得被另透天干直接剋制','No other exposed stem directly controls the transformed element')
        ]);
      });
      BRANCH_COMB.forEach(function(rule){if(!pair(a.p.dz,d.p.dz,[rule[0]]))return;
        assess(L('地支六合','Branch six harmony'),[a.index,d.index],rule[1],[
          check('adjacent',Math.abs(a.index-d.index)===1,'兩支相鄰','The branches are adjacent'),
          check('season',monthEl===rule[1],'化神須得月令本氣支持','The transformed element must match the principal month qi'),
          check('exposed',ps.some(function(x){return el(x.p.tg)===rule[1];}),'化神須透干','The transformed element must be exposed'),
          check('clash',!rest.some(function(x){return pair(x.p.dz,a.p.dz,CLASH)||pair(x.p.dz,d.p.dz,CLASH);}),'組合支未被局外地支相沖','No outside branch clashes with a member')
        ]);
      });
    }
    GROUPS.forEach(function(rule){
      var chars=rule[0].split(''); if(!chars.every(function(c){return ps.some(function(x){return x.p.dz===c;});}))return;
      var members=chars.map(function(c){return ps.filter(function(x){return x.p.dz===c;})[0].index;});
      var outside=ps.filter(function(x){return members.indexOf(x.index)<0;});
      assess(L(rule[2],rule[3])+' '+G(rule[0]),members,rule[1],[
        check('season',monthEl===rule[1],'化神須得月令本氣支持','The transformed element must match the principal month qi'),
        check('exposed',ps.some(function(x){return el(x.p.tg)===rule[1];}),'化神須透干','The transformed element must be exposed'),
        check('clash',!outside.some(function(x){return chars.some(function(c){return pair(x.p.dz,c,CLASH);});}),'三支未受局外支直接相沖','No outside branch directly clashes with a group member')
      ]);
    });
    return {rows:rows,note:L('列出原局合象，再逐項檢查相鄰、月令、透干、根氣、爭合與沖剋；午未合採土。未通過只能列「有合象、化氣條件未足」。通過亦不改寫原局五行權重，避免循環判斷。',
      'Natal combinations are checked for adjacency, season, exposure, roots, competing stems and clashes. Wu–Wei uses Earth. Failed checks mean a combination is present but transformation is unestablished. Even passing candidates do not rewrite natal element weights, avoiding circular inference.')};
  }
  function analyze(b) {
    if(!b || !Array.isArray(b.pillars) || b.pillars.length!==4 || !el(b.dayMasterTG) || !b.pillars.slice(0,3).every(function(p){return el(p.tg)&&HIDDEN[p.dz];}))return null;
    var full=available(b).length===4, xy=window.ZodiacBazi.xiYongShen(b);
    return {version:1,full:full,coverage:available(b).length,dayMaster:b.dayMasterTG,hidden:hiddenRows(b),strength:xy,
      pattern:pattern(b,full),climate:climate(b,xy,full),following:following(b,xy,full),combinations:combinations(b,full)};
  }
  return {analyze:analyze,status:status};
})();
