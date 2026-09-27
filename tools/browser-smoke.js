/* Local-only browser smoke test. Run after starting Edge with --remote-debugging-port=9222. */
(async function () {
  var port = process.env.CDP_PORT || '9222';
  var targets = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  var page = targets.find(function (x) { return x.type === 'page' && /^http:\/\/127\.0\.0\.1:8765\//.test(x.url); });
  if (!page) throw new Error('No browser page found');
  var ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(function (resolve, reject) { ws.onopen = resolve; ws.onerror = reject; });
  var requestId = 0;
  function evaluate(expression) {
    return new Promise(function (resolve, reject) {
      var id = ++requestId;
      ws.send(JSON.stringify({ id: id, method: 'Runtime.evaluate', params: { expression: expression, returnByValue: true, awaitPromise: true } }));
      ws.onmessage = function (event) {
        var data = JSON.parse(event.data);
        if (data.id !== id) return;
        if (data.error || data.result.exceptionDetails) return reject(new Error(JSON.stringify(data.error || data.result.exceptionDetails)));
        resolve(data.result.result.value);
      };
    });
  }
  var result = await evaluate(`(() => {
    ['toolBaby', 'toolTrends', 'toolBrand', 'toolPersonality'].forEach(id => document.getElementById(id).parentElement.open = true);
    document.getElementById('bbSurname').value = '王';
    document.getElementById('bbGender').value = 'female';
    document.getElementById('bbGo').click();
    document.getElementById('trendName').value = 'Olivia'; document.getElementById('trendGo').click();
    document.getElementById('brandName').value = '森月'; document.getElementById('brandGo').click();
    document.getElementById('bfGo').click();
    return {
      baby: document.getElementById('bbResults').innerText,
      trend: document.getElementById('trendResult').innerText,
      brand: document.getElementById('brandResult').innerText,
      personality: document.getElementById('bfResult').innerText
    };
  })()`);
  Object.keys(result).forEach(function (key) {
    if (!result[key] || /undefined|請輸入|找不到/.test(result[key])) throw new Error(key + ' smoke test failed: ' + result[key]);
  });
  console.log(JSON.stringify(result, null, 2));
  ws.close();
}()).catch(function (err) { console.error(err); process.exit(1); });
