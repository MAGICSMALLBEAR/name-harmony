/**
 * 個人吉日與 .ics 行事曆匯出
 *
 * 吉日判斷（依鑑定書的喜用神）：
 *   大吉：日干、日支五行皆為喜神
 *   吉  ：日干或日支其一為喜神
 *   排除：日干或日支為忌神；日支沖生年地支（沖生肖）或沖本命日支
 * 日柱干支以國曆日期推算（1900-01-01 甲戌日）
 */
window.LuckyDays = (function() {

  var TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var ZODIAC = ['鼠','牛','虎','兔','龍','蛇','馬','羊','猴','雞','狗','豬'];
  var TG_ELE = ['木','木','火','火','土','土','金','金','水','水'];
  var DZ_ELE = ['水','土','木','木','土','火','火','土','金','金','土','水'];

  // 喜神五行對應的幸運色與方位
  var ELE_TIPS = {
    '木': { color: '綠色、青色', dir: '東方' },
    '火': { color: '紅色、紫色', dir: '南方' },
    '土': { color: '黃色、咖啡色', dir: '中央、東北、西南' },
    '金': { color: '白色、金色', dir: '西方' },
    '水': { color: '黑色、藍色', dir: '北方' }
  };

  function dayIndex(y, m, d) {
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 1)) / 86400000);
  }

  /** 喜用神／忌神可傳單一五行或五行陣列 */
  function asList(v) { return v == null ? [] : (Array.isArray(v) ? v : [v]); }

  /**
   * 找出從 start 起 days 天內的吉日
   * @param opts { xiShen, jiShen, yearDZ, dayDZ }（地支為「子」「丑」…）
   *             xiShen／jiShen 可為單一五行或五行陣列（用神＋喜神、忌神全列）
   * @param start Date（取本地年月日）
   * @return [{ y, m, d, ganzhi, level, reason }]
   */
  function find(opts, start, days) {
    if (!opts) return [];
    var fav = asList(opts.xiShen), unfav = asList(opts.jiShen);
    if (!fav.length) return [];
    var clash = [opts.yearDZ, opts.dayDZ].filter(Boolean).map(function(z) { return DI_ZHI[(DI_ZHI.indexOf(z) + 6) % 12]; });
    var list = [];
    for (var i = 0; i < days; i++) {
      var dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      var y = dt.getFullYear(), m = dt.getMonth() + 1, d = dt.getDate();
      var n = dayIndex(y, m, d);
      var tg = ((n % 10) + 10) % 10, dz = ((n + 10) % 12 + 12) % 12;
      var tgEle = TG_ELE[tg], dzEle = DZ_ELE[dz];
      if (unfav.indexOf(tgEle) >= 0 || unfav.indexOf(dzEle) >= 0) continue;
      if (clash.indexOf(DI_ZHI[dz]) >= 0) continue;
      var tgHit = fav.indexOf(tgEle) >= 0, dzHit = fav.indexOf(dzEle) >= 0;
      var hits = (tgHit ? 1 : 0) + (dzHit ? 1 : 0);
      if (!hits) continue;
      var ganzhi = TIAN_GAN[tg] + DI_ZHI[dz];
      list.push({
        y: y, m: m, d: d,
        ganzhi: ganzhi,
        level: hits === 2 ? '大吉' : '吉',
        reason: hits === 2
          ? ganzhi + '日天干屬' + tgEle + '、地支屬' + dzEle + '，皆合喜用'
          : ganzhi + '日' + (tgHit ? '天干' + TIAN_GAN[tg] + '屬' + tgEle : '地支' + DI_ZHI[dz] + '屬' + dzEle) + '，合喜用'
      });
    }
    return list;
  }

  /** 生年地支 → 生肖（顯示用） */
  function zodiacOf(dz) { return ZODIAC[DI_ZHI.indexOf(dz)] || ''; }

  // ---------- iCalendar（RFC 5545） ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(y, m, d) { return y + pad(m) + pad(d); }

  function esc(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  /** 每行最多 75 個位元組（UTF-8），超過以 CRLF + 空白續行，不切斷多位元組字元 */
  function fold(line) {
    var out = [], cur = '', bytes = 0;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      var code = line.charCodeAt(i);
      if (code >= 0xD800 && code <= 0xDBFF && i + 1 < line.length) { ch += line.charAt(++i); }
      var b = unescape(encodeURIComponent(ch)).length;
      if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
      cur += ch; bytes += b;
    }
    out.push(cur);
    return out.join('\r\n ');
  }

  /**
   * 產生 .ics 內容
   * @param list find() 的結果
   * @param info { name, xiShen }（xiShen 可為單一五行或五行陣列）
   */
  function toICS(list, info) {
    var now = new Date();
    var stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + 'T'
      + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + 'Z';
    var fav = asList(info.xiShen);
    var tip = ELE_TIPS[fav[0]] || { color: '', dir: '' };
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Name Harmony//Lucky Days//ZH-TW',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:' + esc(info.name + ' 吉日'),
      'X-WR-TIMEZONE:Asia/Taipei'
    ];
    list.forEach(function(e) {
      var next = new Date(e.y, e.m - 1, e.d + 1);
      var desc = e.reason + '。\n喜用' + fav.join('、') + '：幸運色' + tip.color + '，幸運方位' + tip.dir + '。\n適合安排重要會面、簽約、開始新計畫。\n（依姓名和盤鑑定書的喜用神推算，僅供參考）';
      lines.push(
        'BEGIN:VEVENT',
        'UID:' + ymd(e.y, e.m, e.d) + '-' + encodeURIComponent(info.name).replace(/%/g, '') + '@name-harmony',
        'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + ymd(e.y, e.m, e.d),
        'DTEND;VALUE=DATE:' + ymd(next.getFullYear(), next.getMonth() + 1, next.getDate()),
        'SUMMARY:' + esc((e.level === '大吉' ? '🌟 ' : '✨ ') + info.name + ' ' + e.level + '日（' + e.ganzhi + '）'),
        'DESCRIPTION:' + esc(desc),
        'TRANSP:TRANSPARENT',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:' + esc(info.name + '今天是' + e.level + '日'),
        'TRIGGER;RELATED=START:PT8H',
        'END:VALARM',
        'END:VEVENT'
      );
    });
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }

  return { find: find, toICS: toICS, zodiacOf: zodiacOf, ELE_TIPS: ELE_TIPS };
})();
