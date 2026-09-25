/**
 * 出生地 + 時區換算
 *
 * 用瀏覽器內建的 IANA 時區資料（Intl）把出生地的「當地時鐘時間」換算成：
 *   - UTC 時刻（占星用）
 *   - 當地標準時間（八字時柱、紫微時辰用；自動扣除夏令時間）
 * 時區資料已包含台灣 1945–1979、中國 1986–1991、香港等歷史夏令時間
 * 也支援自訂出生地（custom:緯度,經度,時區）與真太陽時
 */
window.BirthPlace = (function() {

  var DEFAULT_KEY = 'taipei';

  var GROUPS = [
    { label: '台灣', places: [
      ['taipei','台北',25.03,121.56,'Asia/Taipei'], ['newtaipei','新北',25.01,121.47,'Asia/Taipei'],
      ['keelung','基隆',25.13,121.74,'Asia/Taipei'], ['taoyuan','桃園',24.99,121.30,'Asia/Taipei'],
      ['hsinchu','新竹',24.80,120.97,'Asia/Taipei'], ['miaoli','苗栗',24.56,120.82,'Asia/Taipei'],
      ['taichung','台中',24.15,120.67,'Asia/Taipei'], ['changhua','彰化',24.08,120.54,'Asia/Taipei'],
      ['nantou','南投',23.91,120.68,'Asia/Taipei'], ['yunlin','雲林',23.71,120.43,'Asia/Taipei'],
      ['chiayi','嘉義',23.48,120.45,'Asia/Taipei'], ['tainan','台南',22.99,120.21,'Asia/Taipei'],
      ['kaohsiung','高雄',22.63,120.30,'Asia/Taipei'], ['pingtung','屏東',22.67,120.49,'Asia/Taipei'],
      ['yilan','宜蘭',24.75,121.75,'Asia/Taipei'], ['hualien','花蓮',23.99,121.60,'Asia/Taipei'],
      ['taitung','台東',22.76,121.14,'Asia/Taipei'], ['penghu','澎湖',23.57,119.58,'Asia/Taipei'],
      ['kinmen','金門',24.43,118.32,'Asia/Taipei'], ['matsu','馬祖',26.16,119.95,'Asia/Taipei']
    ]},
    { label: '港澳・中國', places: [
      ['hongkong','香港',22.32,114.17,'Asia/Hong_Kong'], ['macau','澳門',22.20,113.55,'Asia/Macau'],
      ['beijing','北京',39.90,116.40,'Asia/Shanghai'], ['shanghai','上海',31.23,121.47,'Asia/Shanghai'],
      ['guangzhou','廣州',23.13,113.26,'Asia/Shanghai'], ['shenzhen','深圳',22.54,114.06,'Asia/Shanghai'],
      ['xiamen','廈門',24.48,118.09,'Asia/Shanghai'], ['fuzhou','福州',26.07,119.30,'Asia/Shanghai'],
      ['chengdu','成都',30.57,104.07,'Asia/Shanghai']
    ]},
    { label: '亞洲', places: [
      ['singapore','新加坡',1.35,103.82,'Asia/Singapore'], ['kualalumpur','吉隆坡',3.14,101.69,'Asia/Kuala_Lumpur'],
      ['bangkok','曼谷',13.76,100.50,'Asia/Bangkok'], ['manila','馬尼拉',14.60,120.98,'Asia/Manila'],
      ['jakarta','雅加達',-6.21,106.85,'Asia/Jakarta'], ['hochiminh','胡志明市',10.82,106.63,'Asia/Ho_Chi_Minh'],
      ['tokyo','東京',35.68,139.69,'Asia/Tokyo'], ['osaka','大阪',34.69,135.50,'Asia/Tokyo'],
      ['seoul','首爾',37.57,126.98,'Asia/Seoul']
    ]},
    { label: '美洲', places: [
      ['losangeles','洛杉磯',34.05,-118.24,'America/Los_Angeles'], ['sanfrancisco','舊金山',37.77,-122.42,'America/Los_Angeles'],
      ['seattle','西雅圖',47.61,-122.33,'America/Los_Angeles'], ['newyork','紐約',40.71,-74.01,'America/New_York'],
      ['boston','波士頓',42.36,-71.06,'America/New_York'], ['chicago','芝加哥',41.88,-87.63,'America/Chicago'],
      ['houston','休士頓',29.76,-95.37,'America/Chicago'], ['vancouver','溫哥華',49.28,-123.12,'America/Vancouver'],
      ['toronto','多倫多',43.65,-79.38,'America/Toronto']
    ]},
    { label: '歐洲・大洋洲', places: [
      ['london','倫敦',51.51,-0.13,'Europe/London'], ['paris','巴黎',48.86,2.35,'Europe/Paris'],
      ['berlin','柏林',52.52,13.40,'Europe/Berlin'], ['amsterdam','阿姆斯特丹',52.37,4.90,'Europe/Amsterdam'],
      ['sydney','雪梨',-33.87,151.21,'Australia/Sydney'], ['melbourne','墨爾本',-37.81,144.96,'Australia/Melbourne'],
      ['brisbane','布里斯本',-27.47,153.03,'Australia/Brisbane'], ['auckland','奧克蘭',-36.85,174.76,'Pacific/Auckland']
    ]}
  ];

  var PLACES = {};
  GROUPS.forEach(function(g) {
    g.places.forEach(function(p) { PLACES[p[0]] = { key: p[0], name: p[1], lat: p[2], lon: p[3], tz: p[4] }; });
  });

  /**
   * 取得出生地：預設清單的 key，或自訂格式「custom:緯度,經度,IANA時區」
   * 無法解析時回傳台北
   */
  function getPlace(key) {
    if (PLACES[key]) return PLACES[key];
    var c = parseCustom(key);
    return c || PLACES[DEFAULT_KEY];
  }

  function parseCustom(key) {
    var m = /^custom:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(.+)$/.exec(key || '');
    if (!m) return null;
    var lat = parseFloat(m[1]), lon = parseFloat(m[2]), tz = m[3];
    if (!(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180) || !isValidZone(tz)) return null;
    return {
      key: key, lat: lat, lon: lon, tz: tz, custom: true,
      name: '自訂（' + Math.abs(lat).toFixed(2) + '°' + (lat >= 0 ? 'N' : 'S') + ', ' + Math.abs(lon).toFixed(2) + '°' + (lon >= 0 ? 'E' : 'W') + '）'
    };
  }

  function customKey(lat, lon, tz) {
    return 'custom:' + lat + ',' + lon + ',' + tz;
  }

  function isValidZone(tz) {
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch (e) { return false; }
  }

  /** 瀏覽器支援的全部 IANA 時區（舊瀏覽器退回預設清單用到的時區） */
  function allZones() {
    try {
      if (Intl.supportedValuesOf) return Intl.supportedValuesOf('timeZone');
    } catch (e) {}
    var seen = {};
    GROUPS.forEach(function(g) { g.places.forEach(function(p) { seen[p[4]] = true; }); });
    return Object.keys(seen).sort();
  }

  /**
   * 真太陽時：出生地的視太陽時（經度校正 + 均時差）
   * 有 astronomy-engine 時用太陽時角精確計算，否則用 NOAA 均時差近似
   * @return { ms（以 UTC 欄位表示的當地真太陽時）, eotMin 均時差（分）, lonMin 相對 UTC 的經度時差（分） }
   */
  function trueSolarTime(utcMs, lat, lon) {
    var lmt = utcMs + lon / 15 * 3600000;
    var eotMin;
    var A = window.Astronomy;
    if (A && A.HourAngle && A.Observer) {
      try {
        var ha = A.HourAngle('Sun', new Date(utcMs), new A.Observer(lat, lon, 0));
        var ast = (ha + 12) % 24;
        var lmtHours = ((lmt / 3600000) % 24 + 24) % 24;
        var diff = ast - lmtHours;
        if (diff > 12) diff -= 24;
        if (diff < -12) diff += 24;
        eotMin = diff * 60;
      } catch (e) {}
    }
    if (eotMin == null) {
      var start = Date.UTC(new Date(utcMs).getUTCFullYear(), 0, 0);
      var n = (utcMs - start) / 86400000;
      var b = 2 * Math.PI * (n - 81) / 364;
      eotMin = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
    }
    return { ms: Math.round(lmt + eotMin * 60000), eotMin: eotMin, lonMin: lon / 15 * 60 };
  }

  /** 某時刻在該時區的 UTC 偏移（小時） */
  function offsetAt(tz, utcMs) {
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23',
        year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'
      }).formatToParts(new Date(utcMs));
      var o = {};
      parts.forEach(function(p) { o[p.type] = p.value; });
      var wall = Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute);
      return Math.round((wall - Math.floor(utcMs / 60000) * 60000) / 60000) / 60;
    } catch (e) {
      return 8;
    }
  }

  /** 該年的標準時偏移：一月與七月取較小者（夏令時間只會把時鐘撥快） */
  function standardOffset(tz, year) {
    return Math.min(offsetAt(tz, Date.UTC(year, 0, 15, 12)), offsetAt(tz, Date.UTC(year, 6, 15, 12)));
  }

  /**
   * 出生地時鐘時間 → UTC + 當地標準時間
   * @return { utcMs, std:{year,month,day,hour,minute}, offset, stdOffset, dst, place }
   */
  function resolve(year, month, day, hour, minute, key) {
    var place = getPlace(key);
    var wall = Date.UTC(year, month - 1, day, hour, minute || 0);
    // 兩次迭代即可收斂（夏令時間切換當下的不存在/重複時刻取第一個解）
    var offset = offsetAt(place.tz, wall - 8 * 3600000);
    offset = offsetAt(place.tz, wall - offset * 3600000);
    var utcMs = wall - offset * 3600000;
    var stdOffset = standardOffset(place.tz, year);
    var s = new Date(utcMs + stdOffset * 3600000);
    return {
      utcMs: utcMs,
      std: { year: s.getUTCFullYear(), month: s.getUTCMonth() + 1, day: s.getUTCDate(), hour: s.getUTCHours(), minute: s.getUTCMinutes() },
      offset: offset,
      stdOffset: stdOffset,
      dst: offset !== stdOffset,
      place: place
    };
  }

  /** 產生 <option> HTML（依地區分組，最後是「其他」自訂） */
  function optionsHtml(selected) {
    selected = selected || DEFAULT_KEY;
    return GROUPS.map(function(g) {
      return '<optgroup label="' + g.label + '">' + g.places.map(function(p) {
        return '<option value="' + p[0] + '"' + (p[0] === selected ? ' selected' : '') + '>' + p[1] + '</option>';
      }).join('') + '</optgroup>';
    }).join('') + '<option value="custom"' + (selected === 'custom' ? ' selected' : '') + '>其他（自訂經緯度）</option>';
  }

  function zoneOptionsHtml(selected) {
    return allZones().map(function(z) {
      return '<option value="' + z + '"' + (z === selected ? ' selected' : '') + '>' + z + '</option>';
    }).join('');
  }

  return {
    DEFAULT_KEY: DEFAULT_KEY, GROUPS: GROUPS,
    getPlace: getPlace, parseCustom: parseCustom, customKey: customKey,
    offsetAt: offsetAt, standardOffset: standardOffset,
    resolve: resolve, trueSolarTime: trueSolarTime,
    optionsHtml: optionsHtml, zoneOptionsHtml: zoneOptionsHtml
  };
})();
