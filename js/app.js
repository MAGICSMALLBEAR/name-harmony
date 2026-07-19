/**
 * 姓名和盤 v3 — 多人團隊和盤
 */
(function() {
  'use strict';

  // ============ DOM ============
  var formSection = document.getElementById('formSection');
  var resultsSection = document.getElementById('resultsSection');
  var analyzeBtn = document.getElementById('analyzeBtn');
  var formError = document.getElementById('formError');
  var tabNav = document.getElementById('tabNav');
  var extraPersons = document.getElementById('extraPersons');
  var addPersonBtn = document.getElementById('addPersonBtn');
  var personTemplate = document.getElementById('personTemplate');

  // 手動筆劃
  var manualStrokeCard = document.getElementById('manualStrokeCard');
  var manualStrokeFields = document.getElementById('manualStrokeFields');
  var manualStrokeBtn = document.getElementById('manualStrokeBtn');
  var manualStrokeError = document.getElementById('manualStrokeError');

  // 操作按鈕
  var shareBtn = document.getElementById('shareBtn');
  var saveBtn = document.getElementById('saveBtn');
  var backBtn = document.getElementById('backBtn');
  var historyBtn = null;

  // 模態框
  var pairModal = document.getElementById('pairModal');
  var modalTitle = document.getElementById('modalTitle');
  var modalBody = document.getElementById('modalBody');
  var modalClose = document.getElementById('modalClose');
  var historyModal = document.getElementById('historyModal');
  var historyList = document.getElementById('historyList');
  var historyClose = document.getElementById('historyClose');
  var historyClear = document.getElementById('historyClear');

  // 面板
  var membersContent = document.getElementById('membersContent');
  var matrixContent = document.getElementById('matrixContent');
  var teamContent = document.getElementById('teamContent');

  // 狀態
  var currentData = null;
  var extraCount = 0;
  var MAX_PERSONS = 5;

  // ============ 初始化 ============
  function init() {
    analyzeBtn.addEventListener('click', function() { handleAnalyze(); });
    manualStrokeBtn.addEventListener('click', handleManualReanalyze);
    shareBtn.addEventListener('click', handleShare);
    saveBtn.addEventListener('click', handleSave);
    backBtn.addEventListener('click', handleBack);
    addPersonBtn.addEventListener('click', addPerson);

    // 模態框關閉
    modalClose.addEventListener('click', function() { pairModal.classList.add('hidden'); });
    pairModal.addEventListener('click', function(e) { if (e.target === pairModal) pairModal.classList.add('hidden'); });
    historyClose.addEventListener('click', function() { historyModal.classList.add('hidden'); });
    historyModal.addEventListener('click', function(e) { if (e.target === historyModal) historyModal.classList.add('hidden'); });
    historyClear.addEventListener('click', function() {
      if (confirm('確定清除全部歷史記錄？')) {
        localStorage.removeItem('name-harmony-v3');
        renderHistoryList();
        toast('歷史記錄已清除');
      }
    });

    // 動態插入歷史和匯出按鈕
    var actionBar = document.getElementById('actionBar');
    historyBtn = document.createElement('button');
    historyBtn.className = 'btn-action';
    historyBtn.innerHTML = '<span>📋</span> 歷史';
    historyBtn.addEventListener('click', openHistory);
    actionBar.insertBefore(historyBtn, backBtn);

    var exportBtn = document.createElement('button');
    exportBtn.className = 'btn-action';
    exportBtn.innerHTML = '<span>📄</span> 匯出';
    exportBtn.addEventListener('click', exportImage);
    actionBar.insertBefore(exportBtn, backBtn);

    // Enter
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        e.preventDefault();
        handleAnalyze();
      }
    });

    // 分頁
    tabNav.addEventListener('click', function(e) {
      var btn = e.target.closest('.tab-btn');
      if (!btn) return;
      switchTab(btn.dataset.tab);
    });

    showForm();
  }

  // ============ 新增/移除成員 ============
  function addPerson() {
    if (extraCount + 2 >= MAX_PERSONS) { toast('最多 ' + MAX_PERSONS + ' 人'); return; }
    extraCount++;
    var clone = document.importNode(personTemplate.content, true);
    var el = clone.querySelector('.extra-person');
    el.querySelector('.person-badge-extra').textContent = '成員' + (extraCount + 2);
    el.querySelector('.btn-remove-person').addEventListener('click', function() {
      el.remove();
      extraCount--;
      updateAddBtn();
    });
    extraPersons.appendChild(el);
    updateAddBtn();
  }

  function updateAddBtn() {
    if (extraCount + 2 >= MAX_PERSONS) {
      addPersonBtn.disabled = true;
      addPersonBtn.querySelector('span').textContent = '已達上限';
    } else {
      addPersonBtn.disabled = false;
      addPersonBtn.querySelector('span').textContent = '＋';
    }
  }

  // ============ 表單切換 ============
  function showForm() {
    formSection.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    manualStrokeCard.classList.add('hidden');
  }

  function showResults() {
    formSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    manualStrokeCard.classList.add('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ============ 收集全部輸入 ============
  function collectInputs() {
    var persons = [];

    // Person A
    persons.push({
      id: 'A', label: '甲方',
      cn: document.getElementById('cnA').value.trim(),
      en: document.getElementById('enA').value.trim()
    });
    // Person B
    persons.push({
      id: 'B', label: '乙方',
      cn: document.getElementById('cnB').value.trim(),
      en: document.getElementById('enB').value.trim()
    });

    // Extra persons
    var extraDivs = extraPersons.querySelectorAll('.extra-person');
    var labels = ['C','D','E'];
    extraDivs.forEach(function(div, i) {
      persons.push({
        id: labels[i],
        label: '成員' + (i + 3),
        cn: div.querySelector('.cn-input').value.trim(),
        en: div.querySelector('.en-input').value.trim()
      });
    });

    return persons;
  }

  // ============ 分析 ============
  function handleAnalyze() {
    formError.classList.add('hidden');
    var persons = collectInputs();
    var hasAny = persons.some(function(p) { return p.cn || p.en; });
    if (!hasAny) { showError('請至少輸入一組姓名'); return; }

    // 過濾有輸入的成員
    persons = persons.filter(function(p) { return p.cn || p.en; });

    // 分析每人
    var results = [];
    for (var i = 0; i < persons.length; i++) {
      var r = analyzeOne(persons[i]);
      if (r.error) { showError(persons[i].label + ': ' + r.error); return; }
      if (r.needsManual) {
        showManualInput(r.unknownChars);
        return;
      }
      results.push({ person: persons[i], result: r });
    }

    // 生成所有配對
    var pairs = [];
    for (var i = 0; i < results.length; i++) {
      for (var j = i + 1; j < results.length; j++) {
        var a = results[i].result;
        var b = results[j].result;
        var labelA = results[i].person.label;
        var labelB = results[j].person.label;

        // 中中和盤
        if (a.cn && b.cn) {
          var p = window.PairHarmony.cncnHarmony(a.cn, b.cn);
          if (p) pairs.push({ a: labelA, b: labelB, pair: p, type: 'cn-cn' });
        }
        // 英英和盤
        if (a.en && b.en) {
          var p = window.PairHarmony.enenHarmony(a.en, b.en);
          if (p) pairs.push({ a: labelA, b: labelB, pair: p, type: 'en-en' });
        }
        // 中英跨文化
        if (a.cn && b.en) {
          var p = window.PairHarmony.cnenCrossHarmony(a.cn, b.en);
          if (p) pairs.push({ a: labelA, b: labelB, pair: p, type: 'cn-en' });
        }
        if (a.en && b.cn) {
          var p = window.PairHarmony.cnenCrossHarmony(b.cn, a.en);
          if (p) pairs.push({ a: labelA, b: labelB, pair: p, type: 'cn-en' });
        }
      }
    }

    currentData = { results: results, pairs: pairs };
    renderAll();
    switchTab(results.length >= 3 ? 'matrix' : 'members');
    showResults();
  }

  function analyzeOne(person) {
    var r = { cn: null, en: null, enReport: null };
    if (person.cn) {
      r.cn = window.ChineseNumerology.analyze(person.cn);
      if (r.cn.error) return { error: r.cn.error };
      if (r.cn.hasUnknown && r.cn.unknownChars.length > 0) {
        return { needsManual: true, unknownChars: r.cn.unknownChars };
      }
    }
    if (person.en) {
      r.en = window.EnglishNumerology.analyze(person.en);
      if (!r.en) return { error: '無法分析英文' };
      r.enReport = window.EnglishNumerology.getFullReport(r.en);
    }
    return r;
  }

  function showError(msg) {
    formError.textContent = msg;
    formError.classList.remove('hidden');
  }

  // ============ 手動筆劃 ============
  function showManualInput(unknownChars) {
    var unique = [];
    unknownChars.forEach(function(c) { if (unique.indexOf(c) < 0) unique.push(c); });
    var html = '';
    unique.forEach(function(c) {
      html += '<div class="manual-stroke-item"><span class="manual-stroke-char">'+c+'</span>';
      html += '<input type="number" class="manual-stroke-input" data-char="'+c+'" placeholder="筆劃" min="1" max="64" inputmode="numeric">';
      html += '<span class="manual-stroke-hint">請輸入「'+c+'」康熙筆劃</span></div>';
    });
    manualStrokeFields.innerHTML = html;
    manualStrokeError.classList.add('hidden');
    manualStrokeCard.classList.remove('hidden');
  }

  function handleManualReanalyze() {
    var inputs = manualStrokeFields.querySelectorAll('.manual-stroke-input');
    var hasErr = false;
    inputs.forEach(function(inp) {
      var v = parseInt(inp.value);
      if (isNaN(v) || v < 1 || v > 64) { hasErr = true; inp.style.borderColor = '#F44336'; }
      else inp.style.borderColor = 'var(--color-gold-primary)';
    });
    if (hasErr) { manualStrokeError.textContent = '請輸入有效筆劃(1-64)'; manualStrokeError.classList.remove('hidden'); return; }
    // 簡單重置重試（目前只支援一組手動筆劃，複雜情境需改進）
    toast('手動筆劃已設定，請重新點擊分析按鈕');
  }

  // ============ 分頁 ============
  function switchTab(tab) {
    tabNav.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.tab === tab); });
    document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
    var m = { members: 'panelMembers', matrix: 'panelMatrix', team: 'panelTeam' };
    var panel = document.getElementById(m[tab] || 'panelMembers');
    if (panel) panel.classList.add('active');
  }

  // ============ 渲染 ============
  function renderAll() {
    if (!currentData) return;
    renderMembers();
    renderMatrix();
    renderTeam();
  }

  // ============ 成員分析（摺疊） ============
  function renderMembers() {
    var html = '';
    currentData.results.forEach(function(item, i) {
      var p = item.person;
      var r = item.result;
      var isOpen = i === 0;
      html += '<div class="member-accordion"><div class="member-accordion-header" onclick="this.nextElementSibling.classList.toggle(\'open\')">';
      html += '<span class="person-badge" style="background:var(--color-gold-dark);color:var(--color-bg-deep);">' + p.label + '</span>';
      html += '<span style="flex:1;color:var(--color-gold-light);font-weight:600;">' + (p.cn||'') + (p.cn&&p.en?' / ':'') + (p.en||'') + '</span>';
      html += '<span style="font-size:0.75rem;color:var(--color-text-secondary);">▼</span>';
      html += '</div><div class="member-accordion-body' + (isOpen ? ' open' : '') + '">';
      html += renderPersonDetail(r);
      html += '</div></div>';
    });
    membersContent.innerHTML = html;
  }

  function renderPersonDetail(r) {
    var html = '';
    if (r.cn) {
      html += '<div class="letter-grid">';
      var allS = r.cn.wuge.strokeDetails.surname.concat(r.cn.wuge.strokeDetails.givenName);
      allS.forEach(function(s) { html += '<div class="letter-chip"><span class="letter">'+s.char+'</span><span class="number">'+(s.strokes<0?'?':s.strokes)+'劃</span></div>'; });
      html += '</div>';
      html += '<div class="wuge-grid">';
      ['tian','ren','di','wai','zong'].forEach(function(k) {
        var g = r.cn.grids[k];
        var fc = g.fortune?'fortune-'+(g.fortune.glory==='大吉'?'great':g.fortune.glory==='吉'?'good':g.fortune.glory==='中吉'||g.fortune.glory==='半吉'?'neutral':g.fortune.glory==='凶'?'bad':'terrible'):'';
        html += '<div class="wuge-row'+(g.isMain?' is-main':'')+'"><span class="wuge-name">'+g.name+'</span><span class="wuge-number">'+g.number+'</span><span class="wuge-element element-'+g.element+'">'+g.element+'</span><span class="wuge-fortune '+fc+'">'+(g.fortune?g.fortune.glory:'?')+'</span></div>';
      });
      html += '</div>';
      html += '<p style="font-size:0.85rem;color:var(--color-text-secondary);">三才：'+r.cn.sancai.level+' | 整體：'+r.cn.overall+'</p>';
    }
    if (r.enReport) {
      html += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(212,168,67,0.1);"><strong style="color:var(--color-gold-primary);">英文靈數</strong></div>';
      html += '<div class="numerology-grid">';
      r.enReport.coreNumbers.forEach(function(n) {
        var isM = (n.number===11||n.number===22||n.number===33);
        html += '<div class="number-card"><div class="'+(isM?'number-circle master-number':'number-circle')+'">'+n.number+'</div><div class="number-info"><div class="number-name">'+n.name+'</div><div class="number-desc">'+ (n.meaning.title||'') +'</div></div></div>';
      });
      html += '</div>';
    }
    return html;
  }

  // ============ 配對矩陣 ============
  function renderMatrix() {
    if (!currentData || !currentData.pairs.length) {
      matrixContent.innerHTML = '<p class="text-center" style="color:var(--color-text-secondary);padding:2rem;">需要至少兩位成員有姓名才能產出配對矩陣</p>';
      return;
    }

    var labels = currentData.results.map(function(r) { return r.person.label; });
    var n = labels.length;

    // 建立查表
    var pairMap = {};
    currentData.pairs.forEach(function(p) {
      var key = p.a + '|' + p.b;
      if (!pairMap[key] || pairMap[key].pair.score < p.pair.score) pairMap[key] = p;
    });

    // 表格
    var html = '<div style="overflow-x:auto;"><table class="matrix-table"><thead><tr><th></th>';
    labels.forEach(function(l) { html += '<th>' + l + '</th>'; });
    html += '</tr></thead><tbody>';

    for (var i = 0; i < n; i++) {
      html += '<tr><th>' + labels[i] + '</th>';
      for (var j = 0; j < n; j++) {
        if (i === j) {
          html += '<td class="matrix-self">—</td>';
        } else {
          var a = labels[Math.min(i,j)], b = labels[Math.max(i,j)];
          var key = a + '|' + b;
          var entry = pairMap[key];
          if (entry) {
            var sc = entry.pair.score;
            var color = sc>=80?'var(--color-fortune-great)':sc>=60?'var(--color-fortune-good)':sc>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
            html += '<td class="matrix-pair" title="'+entry.pair.mode+'">';
            html += '<span class="matrix-score-big" style="color:'+color+';">'+sc+'</span>';
            html += '<span class="matrix-tier-sm" style="color:'+color+';">'+entry.pair.tier+'</span>';
            html += '<span class="matrix-mode-sm">'+entry.pair.mode+'</span>';
            html += '</td>';
          } else {
            html += '<td class="matrix-self">N/A</td>';
          }
        }
      }
      html += '</tr>';
    }
    html += '</tbody></table></div>';

    // 每組配對的詳細解讀（直接顯示）
    html += '<div style="margin-top:var(--space-xl);">';
    html += '<h3 style="color:var(--color-gold-primary);margin-bottom:var(--space-md);">📖 各組配對詳細解讀</h3>';

    currentData.pairs.forEach(function(entry) {
      scColor = entry.pair.score>=80?'var(--color-fortune-great)':entry.pair.score>=60?'var(--color-fortune-good)':entry.pair.score>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
      html += '<div class="fortune-detail" style="margin-bottom:var(--space-lg);cursor:pointer;" onclick="var e=arguments[0]||window.event;e.stopPropagation();">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);">';
      html += '<strong style="color:var(--color-gold-light);">' + entry.a + ' ↔ ' + entry.b + '</strong>';
      html += '<span class="analysis-mode-badge ' + entry.pair.modeClass + '">' + entry.pair.mode + '</span>';
      html += '</div>';

      // 分數摘要
      html += '<div style="display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-sm);">';
      html += '<span style="font-family:var(--font-en);font-size:2rem;font-weight:900;color:' + scColor + ';">' + entry.pair.score + '</span>';
      html += '<span style="font-size:0.8rem;color:var(--color-text-secondary);">/100</span>';
      html += '<span style="font-family:var(--font-heading);color:' + scColor + ';">' + entry.pair.tier + '</span>';
      html += '</div>';

      // 各維度分數條
      if (entry.pair.dimensions) {
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:var(--space-sm);">';
        entry.pair.dimensions.forEach(function(d) {
          var pct = Math.round(d.score/d.max*100);
          var fc = pct>=80?'var(--color-fortune-great)':pct>=60?'var(--color-fortune-good)':pct>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
          html += '<div style="font-size:0.8rem;"><span style="color:var(--color-text-secondary);">' + d.label + '</span>';
          html += '<div class="pair-dim-bar" style="margin-top:2px;"><div class="pair-dim-fill" style="width:' + pct + '%;background:' + fc + ';"></div></div>';
          html += '<span style="float:right;color:var(--color-text-secondary);font-size:0.7rem;">' + d.score + '/' + d.max + '</span></div>';
        });
        html += '</div>';
      }

      // 每個維度的詳細說明
      if (entry.pair.dimensions) {
        entry.pair.dimensions.forEach(function(d) {
          html += '<details style="margin:4px 0;font-size:0.85rem;"><summary style="color:var(--color-gold-primary);cursor:pointer;">' + d.label + '：' + d.score + '/' + d.max + '</summary>';
          html += '<p style="color:var(--color-text-secondary);margin:4px 0 8px 16px;line-height:1.8;">' + d.detail + '</p></details>';
        });
      }

      // 綜合解讀
      if (entry.pair.reading && entry.pair.reading.summary) {
        html += '<div style="margin-top:var(--space-sm);padding-top:var(--space-sm);border-top:1px solid rgba(212,168,67,0.15);">';
        html += '<p style="font-size:0.85rem;color:var(--color-text-secondary);line-height:2;white-space:pre-line;">' + entry.pair.reading.summary + '</p>';
        html += '</div>';
      }

      html += '</div>';
    });
    html += '</div>';

    matrixContent.innerHTML = html;

    // 點擊矩陣儲存格查看詳情
    matrixContent.querySelectorAll('.matrix-pair').forEach(function(td) {
      td.addEventListener('click', function() {
        var row = this.closest('tr');
        var rowLabel = row ? row.querySelector('th').textContent : '';
        var colIdx = Array.from(this.parentElement.children).indexOf(this);
        var table = this.closest('table');
        var colLabel = table ? table.querySelector('thead tr').children[colIdx].textContent : '';
        openPairDetail(rowLabel, colLabel);
      });
    });
  }

  // ============ 團隊報告 ============
  function renderTeam() {
    if (!currentData || !currentData.pairs.length) {
      teamContent.innerHTML = '<p class="text-center" style="color:var(--color-text-secondary);padding:2rem;">需要至少兩位成員才能產出團隊報告</p>';
      return;
    }

    var pairs = currentData.pairs;
    var scores = pairs.map(function(p) { return p.pair.score; });
    var avg = Math.round(scores.reduce(function(a,b){return a+b;},0) / scores.length);
    var maxScore = Math.max.apply(null, scores);
    var minScore = Math.min.apply(null, scores);
    var sorted = pairs.slice().sort(function(a,b) { return b.pair.score - a.pair.score; });
    var best = sorted.slice(0, 3);
    var worst = sorted.slice(-3).reverse();

    var avgColor = avg>=80?'var(--color-fortune-great)':avg>=60?'var(--color-fortune-good)':avg>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
    var tier = window.PairHarmony.getTier(avg);

    var html = '';

    // 統計卡片
    html += '<div class="team-stats">';
    html += '<div class="team-stat-card"><div class="team-stat-value" style="color:'+avgColor+';">'+avg+'</div><div class="team-stat-label">團隊均分</div></div>';
    html += '<div class="team-stat-card"><div class="team-stat-value" style="color:var(--color-fortune-great);">'+maxScore+'</div><div class="team-stat-label">最佳配對</div></div>';
    html += '<div class="team-stat-card"><div class="team-stat-value" style="color:var(--color-fortune-bad);">'+minScore+'</div><div class="team-stat-label">最低配對</div></div>';
    html += '</div>';

    // 團隊評級
    html += '<div class="pair-summary" style="padding:var(--space-md);">';
    html += '<div class="pair-tier" style="color:'+avgColor+';">團隊命理評級：' + tier + '</div>';
    html += '<p style="color:var(--color-text-secondary);font-size:0.9rem;">共 ' + currentData.results.length + ' 位成員，' + pairs.length + ' 組配對分析</p>';
    html += '</div>';

    // 五行分佈
    var elements = {};
    currentData.results.forEach(function(item) {
      if (item.result.cn) {
        var el = item.result.cn.grids.ren.element;
        elements[el] = (elements[el] || 0) + 1;
      }
    });
    if (Object.keys(elements).length > 0) {
      html += '<div class="wuxing-chart" style="margin-bottom:var(--space-md);">';
      var elInfo = { '木':'🌳','火':'🔥','土':'⛰️','金':'⚔️','水':'💧' };
      var elKeys = ['木','火','土','金','水'];
      var maxC = Math.max.apply(null, elKeys.map(function(k){return elements[k]||0;}));
      elKeys.forEach(function(el) {
        var c = elements[el] || 0;
        var h = maxC > 0 ? Math.max(8, c/maxC*80) : 0;
        html += '<div class="wuxing-bar-group"><span class="wuxing-bar-label">'+(elInfo[el]||el)+'</span><div class="wuxing-bar-track"><div class="wuxing-bar-fill '+el+'" style="height:'+h+'%;"></div></div><span class="wuxing-bar-value element-'+el+'">'+el+' ×'+c+'</span></div>';
      });
      html += '</div>';
    }

    // 最佳/最差配對
    html += '<div class="team-best-worst">';
    html += '<h3 style="color:var(--color-gold-primary);margin-bottom:var(--space-sm);">🏆 最佳配對</h3>';
    best.forEach(function(p) {
      var sc = p.pair.score>=80?'var(--color-fortune-great)':p.pair.score>=60?'var(--color-fortune-good)':p.pair.score>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
      html += '<div class="team-pair-card" style="border-left-color:'+sc+';">';
      html += '<div class="team-pair-info"><div class="team-pair-names">'+p.a+' ↔ '+p.b+'</div><div class="team-pair-detail">'+p.pair.mode+' — '+p.pair.tier+'</div></div>';
      html += '<div class="team-pair-score" style="color:'+sc+';">'+p.pair.score+'</div></div>';
    });
    html += '<h3 style="color:var(--color-text-secondary);margin:var(--space-md) 0 var(--space-sm);">⚠️ 需關注配對</h3>';
    worst.forEach(function(p) {
      var sc = p.pair.score>=80?'var(--color-fortune-great)':p.pair.score>=60?'var(--color-fortune-good)':p.pair.score>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
      html += '<div class="team-pair-card" style="border-left-color:'+sc+';">';
      html += '<div class="team-pair-info"><div class="team-pair-names">'+p.a+' ↔ '+p.b+'</div><div class="team-pair-detail">'+p.pair.mode+' — '+p.pair.tier+'</div></div>';
      html += '<div class="team-pair-score" style="color:'+sc+';">'+p.pair.score+'</div></div>';
    });
    html += '</div>';

    teamContent.innerHTML = html;

    // 點擊配對卡片
    teamContent.querySelectorAll('.team-pair-card').forEach(function(card) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', function() {
        var names = this.querySelector('.team-pair-names').textContent.split('↔');
        if (names.length === 2) openPairDetail(names[0].trim(), names[1].trim());
      });
    });
  }

  // ============ 分享 ============
  function handleShare() {
    if (!currentData) return;
    var lines = ['🔮 姓名和盤團隊分析'];
    currentData.results.forEach(function(item) {
      lines.push(item.person.label + ': ' + (item.person.cn||'') + (item.person.cn&&item.person.en?' / ':'') + (item.person.en||''));
    });
    lines.push('');
    var scores = currentData.pairs.map(function(p){return p.pair.score;});
    if (scores.length) {
      var avg = Math.round(scores.reduce(function(a,b){return a+b;},0)/scores.length);
      lines.push('團隊均分: ' + avg + '/100 [' + window.PairHarmony.getTier(avg) + ']');
      lines.push('共 ' + currentData.results.length + ' 人，' + currentData.pairs.length + ' 組配對');
    }
    lines.push('— 姓名和盤');
    var text = lines.join('\n');
    if (navigator.share) navigator.share({title:'姓名和盤',text:text}).catch(function(){});
    else copyText(text);
  }

  function copyText(text) {
    if (navigator.clipboard) { navigator.clipboard.writeText(text).then(function(){toast('已複製！');}); return; }
    var ta = document.createElement('textarea'); ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); toast('已複製！');
  }

  function toast(msg) {
    var t = document.querySelector('.share-toast'); if(t) t.remove();
    t = document.createElement('div'); t.className = 'share-toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(function(){t.remove();}, 3000);
  }

  // ============ 儲存 ============
  function handleSave() {
    if (!currentData) return;
    var entry = {
      persons: currentData.results.map(function(r){ return {cn:r.person.cn,en:r.person.en}; }),
      pairs: currentData.pairs.map(function(p){ return {a:p.a,b:p.b,mode:p.pair.mode,score:p.pair.score,tier:p.pair.tier}; }),
      time: new Date().toISOString()
    };
    var hist = loadHistory();
    hist.unshift(entry); if (hist.length > 20) hist = hist.slice(0, 20);
    try { localStorage.setItem('name-harmony-v3', JSON.stringify(hist)); toast('已儲存！'); }
    catch(e) { toast('儲存失敗'); }
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem('name-harmony-v3') || '[]'); } catch(e) { return []; }
  }

  function handleBack() {
    showForm();
    currentData = null;
    extraPersons.innerHTML = '';
    extraCount = 0;
    updateAddBtn();
  }

  // ============ 配對詳情彈窗 ============
  function openPairDetail(aLabel, bLabel) {
    if (!currentData) return;
    var key = aLabel + '|' + bLabel;
    var rev = bLabel + '|' + aLabel;
    var entry = null;
    currentData.pairs.forEach(function(p) {
      var k = p.a + '|' + p.b;
      if (k === key || k === rev) entry = p;
    });
    if (!entry) return;

    var p = entry.pair;
    var sc = p.score >= 80 ? 'var(--color-fortune-great)' : p.score >= 60 ? 'var(--color-fortune-good)' : p.score >= 40 ? 'var(--color-fortune-neutral)' : 'var(--color-fortune-bad)';

    modalTitle.innerHTML = '<span class="title-icon">💫</span>' + entry.a + ' ↔ ' + entry.b;

    var html = '<span class="analysis-mode-badge '+p.modeClass+'" style="margin-bottom:1rem;">'+p.mode+'</span>';
    html += '<div style="text-align:center;margin:1rem 0;">';
    html += '<div class="pair-score-ring" style="border-color:'+sc+';box-shadow:0 0 30px '+sc+'33;margin:0 auto;"><span class="pair-score-value" style="color:'+sc+';">'+p.score+'</span><span class="pair-score-label">/100</span></div>';
    html += '<div class="pair-tier" style="color:'+sc+';">'+p.tier+'</div>';
    html += '<p style="color:var(--color-text-secondary);font-size:0.9rem;">'+p.tierDesc+'</p></div>';

    if (p.dimensions && p.dimensions.length) {
      html += '<div class="pair-dimensions">';
      p.dimensions.forEach(function(d) {
        var pct = Math.round(d.score/d.max*100);
        var fc = pct>=80?'var(--color-fortune-great)':pct>=60?'var(--color-fortune-good)':pct>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
        html += '<div class="pair-dim-item"><div class="pair-dim-label">'+d.label+'</div>';
        html += '<div class="pair-dim-score">'+d.score+'<span style="font-size:0.75rem;opacity:0.5;">/'+d.max+'</span></div>';
        html += '<div class="pair-dim-bar"><div class="pair-dim-fill" style="width:'+pct+'%;background:'+fc+';"></div></div>';
        html += '<p style="font-size:0.75rem;color:var(--color-text-secondary);margin-top:4px;">'+d.detail+'</p></div>';
      });
      html += '</div>';
    }

    // 豐富解讀
    if (p.reading && p.reading.summary) {
      html += '<div class="harmony-advice" style="margin-top:var(--space-lg);">';
      html += '<h3>📖 詳細解讀</h3>';
      html += '<p style="font-size:0.9rem;line-height:2;white-space:pre-line;">' + p.reading.summary + '</p>';
      html += '</div>';
    }

    if (p.isSelf && p.selfResult) {
      var h = p.selfResult;
      html += '<div class="harmony-details">';
      var ds = [{l:'🌿 五行互補',s:h.details.elementComplement.score,m:h.details.elementComplement.max,d:h.details.elementComplement.detail},{l:'🔢 數字共振',s:h.details.numberResonance.score,m:h.details.numberResonance.max,d:h.details.numberResonance.detail},{l:'☯ 陰陽平衡',s:h.details.yinYang.score,m:h.details.yinYang.max,d:h.details.yinYang.detail},{l:'📊 完整度',s:h.details.completeness.score,m:h.details.completeness.max,d:h.details.completeness.detail}];
      ds.forEach(function(dd) {
        html+='<div class="harmony-item"><div><span class="harmony-item-label">'+dd.l+'</span><p style="font-size:0.8rem;">'+dd.d+'</p></div><span class="harmony-item-score">'+dd.s+'/'+dd.m+'</span></div>';
      });
      html += '</div>';
    }

    modalBody.innerHTML = html;
    pairModal.classList.remove('hidden');
  }

  // ============ 歷史記錄檢視 ============
  function openHistory() {
    renderHistoryList();
    historyModal.classList.remove('hidden');
  }

  function renderHistoryList() {
    var hist = loadHistory();
    if (!hist.length) {
      historyList.innerHTML = '<div class="history-empty">尚無歷史記錄<br><span style="font-size:0.8rem;">分析和盤後點擊「💾 儲存記錄」即可儲存</span></div>';
      return;
    }
    var html = '';
    hist.forEach(function(entry, idx) {
      var members = entry.persons.map(function(p) { return (p.cn||'') + (p.cn&&p.en?' / ':'') + (p.en||''); }).filter(function(s){return s;}).join('、');
      var avg = entry.pairs.length ? Math.round(entry.pairs.reduce(function(a,b){return a+b.score;},0)/entry.pairs.length) : 0;
      var sc = avg>=80?'var(--color-fortune-great)':avg>=60?'var(--color-fortune-good)':avg>=40?'var(--color-fortune-neutral)':'var(--color-fortune-bad)';
      var time = entry.time ? new Date(entry.time).toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
      html += '<div class="history-entry" data-idx="'+idx+'">';
      html += '<div class="history-entry-names"><div class="history-entry-members">'+members+'</div><div style="font-size:0.7rem;color:var(--color-text-muted);">'+entry.pairs.length+' 組配對</div></div>';
      html += '<div class="history-entry-meta"><div class="history-entry-score" style="color:'+sc+';">'+avg+'</div><div class="history-entry-time">'+time+'</div></div>';
      html += '</div>';
    });
    historyList.innerHTML = html;

    // 點擊恢復
    historyList.querySelectorAll('.history-entry').forEach(function(el) {
      el.addEventListener('click', function() {
        var idx = parseInt(this.dataset.idx);
        var entry = loadHistory()[idx];
        if (!entry) return;
        // 填入表單
        var personInputs = [
          { cn: document.getElementById('cnA'), en: document.getElementById('enA') },
          { cn: document.getElementById('cnB'), en: document.getElementById('enB') }
        ];
        entry.persons.forEach(function(p, i) {
          if (i < 2) {
            if (personInputs[i].cn) personInputs[i].cn.value = p.cn || '';
            if (personInputs[i].en) personInputs[i].en.value = p.en || '';
          } else {
            // 動態新增
            while (extraCount + 2 <= i) addPerson();
            var extras = extraPersons.querySelectorAll('.extra-person');
            var div = extras[i - 2];
            if (div) {
              div.querySelector('.cn-input').value = p.cn || '';
              div.querySelector('.en-input').value = p.en || '';
            }
          }
        });
        historyModal.classList.add('hidden');
        toast('已載入記錄，點擊「開始團隊和盤分析」重新分析');
      });
    });
  }

  // ============ 匯出圖片 ============
  function exportImage() {
    if (!currentData) return;
    // 簡單文字匯出（較可靠）
    var lines = ['🔮 姓名和盤團隊報告', '═'.repeat(30), ''];
    currentData.results.forEach(function(r) {
      lines.push('【' + r.person.label + '】' + (r.person.cn||'') + (r.person.cn&&r.person.en?' / ':'') + (r.person.en||''));
      if (r.result.cn) {
        lines.push('  人格：' + r.result.cn.grids.ren.number + '劃(' + r.result.cn.grids.ren.element + ', ' + (r.result.cn.grids.ren.fortune?r.result.cn.grids.ren.fortune.glory:'?') + ')');
        lines.push('  三才：' + r.result.cn.sancai.level + ' | 整體：' + r.result.cn.overall);
      }
      if (r.result.en) lines.push('  命運數字：' + r.result.en.destiny);
    });
    lines.push(''); lines.push('─'.repeat(30));
    currentData.pairs.forEach(function(p) {
      lines.push(p.a + ' ↔ ' + p.b + ' [' + p.pair.mode + ']: ' + p.pair.score + '分 ' + p.pair.tier);
    });
    lines.push(''); lines.push('姓名和盤 — 中英文姓名命理分析');

    var text = lines.join('\n');
    copyText(text);
    toast('報告已複製到剪貼簿！可貼到記事本或訊息中');
  }

  // ============ 啟動 ============
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
