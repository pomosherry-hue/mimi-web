(function (w) {
  var cache = {}; // path -> { url, exp }
  var loginPromise = null;
  var app = null;

  function cfg() {
    return w.MIMI_CONFIG || {};
  }

  function isOffline() {
    return !!cfg().OFFLINE;
  }

  function isPreviewHost() {
    var loc = w.location || {};
    var proto = loc.protocol || '';
    var host = loc.hostname || '';
    if (proto === 'file:') return true;
    if (/\.github\.io$/i.test(host)) return true;
    return false;
  }

  function cloudAllowed() {
    if (isOffline()) return false;
    if (!cfg().CLOUD_ENV) return false;
    if (isPreviewHost()) return false;
    return true;
  }

  var publicIndex = null;
  function getPublicIndex() {
    if (publicIndex) return publicIndex;
    publicIndex = {};
    var catalog = w.MIMI_CATALOG;
    if (!catalog) return publicIndex;
    (catalog.episodes || []).forEach(function (ep) {
      if (ep.series === 'wanzhuan-secai') {
        var n = String(ep.no).padStart(2, '0');
        var base = 'https://pomosherry-hue.github.io/kids-color/lesson-' + n;
        if (ep.video) publicIndex[ep.video] = base + '.mp4';
        if (ep.cover) publicIndex[ep.cover] = base + '.jpg';
        if (ep.poster) publicIndex[ep.poster] = base + '.jpg';
      }
      if (ep.release && ep.video && !publicIndex[ep.video]) publicIndex[ep.video] = ep.release;
    });
    return publicIndex;
  }

  function publicUrl(path) {
    if (!path) return '';
    var p = String(path).replace(/^\//, '');
    return getPublicIndex()[p] || '';
  }

  function kidsColorVideo(ep) {
    if (!ep || ep.series !== 'wanzhuan-secai') return '';
    var n = String(ep.no).padStart(2, '0');
    return 'https://pomosherry-hue.github.io/kids-color/lesson-' + n + '.mp4';
  }

  function applyPublic(list) {
    var exp = Date.now() + 24 * 3600 * 1000;
    (list || []).forEach(function (p) {
      if (cache[p] && cache[p].url) return;
      var u = publicUrl(p);
      if (u) cache[p] = { url: u, exp: exp };
    });
  }

  function mediaUrl(path) {
    if (!path) return '';
    var p = String(path).replace(/^\//, '');
    if (isOffline()) return 'media/' + p;
    var c = cache[p];
    if (c && c.url && c.exp > Date.now()) return c.url;
    if (c && c.url) return c.url;
    return publicUrl(p);
  }

  function videoOf(ep, wide) {
    if (!ep) return '';
    if (wide && ep.videoWide) {
      var wideUrl = mediaUrl(ep.videoWide);
      if (wideUrl) return wideUrl;
    }
    var u = mediaUrl(ep.video);
    if (u) return u;
    if (ep.release) return ep.release;
    return kidsColorVideo(ep);
  }

  function ensureLogin() {
    if (loginPromise) return loginPromise;
    loginPromise = Promise.resolve().then(function () {
      if (typeof w.cloudbase !== 'function' && typeof w.cloudbase !== 'object') {
        throw new Error('cloudbase-sdk');
      }
      var env = cfg().CLOUD_ENV;
      if (!env) throw new Error('no-env');
      app = w.cloudbase.init({ env: env, region: 'ap-shanghai' });
      var auth = app.auth({ persistence: 'local' });
      if (auth.hasLoginState && auth.hasLoginState()) return app;
      if (typeof auth.signInAnonymously === 'function') {
        return Promise.resolve(auth.signInAnonymously()).then(function () { return app; });
      }
      if (auth.anonymousAuthProvider) {
        return auth.anonymousAuthProvider().signIn().then(function () { return app; });
      }
      throw new Error('anonymous-api');
    }).catch(function (err) {
      loginPromise = null;
      throw err;
    });
    return loginPromise;
  }

  function callWebmedia(paths) {
    return ensureLogin().then(function (sdk) {
      return sdk.callFunction({
        name: cfg().WEBMEDIA_FN || 'webmedia',
        data: { paths: paths }
      });
    }).then(function (res) {
      var result = (res && (res.result || res.data)) || {};
      if (result.body && typeof result.body === 'string') {
        try { result = JSON.parse(result.body); } catch (e) {}
      }
      if (!result.ok) {
        var err = new Error(result.reason || 'webmedia-failed');
        err.reason = result.reason;
        throw err;
      }
      return result;
    });
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error('timeout'));
      }, ms);
      promise.then(function (v) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(v);
      }, function (err) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  function resolve(paths) {
    var list = Array.from(new Set((paths || []).filter(Boolean).map(function (p) {
      return String(p).replace(/^\//, '');
    })));
    if (isOffline()) {
      var off = {};
      list.forEach(function (p) { off[p] = 'media/' + p; });
      return Promise.resolve(off);
    }
    applyPublic(list);
    var now = Date.now();
    var need = list.filter(function (p) { return !(cache[p] && cache[p].url && cache[p].exp > now); });
    var done = Promise.resolve();
    if (need.length && cloudAllowed()) {
      var chunks = [];
      for (var i = 0; i < need.length; i += 50) chunks.push(need.slice(i, i + 50));
      done = withTimeout(Promise.all(chunks.map(callWebmedia)), 3000).then(function (parts) {
        var maxAge = 7200;
        parts.forEach(function (part) {
          if (part.maxAge) maxAge = part.maxAge;
          var exp = Date.now() + Math.max(60, (maxAge - 120)) * 1000;
          Object.keys(part.urls || {}).forEach(function (p) {
            cache[p] = { url: part.urls[p], exp: exp };
          });
        });
      }).catch(function (err) {
        console.warn('webmedia skipped or failed', err && err.message ? err.message : err);
        applyPublic(need);
      });
    }
    return done.then(function () {
      var out = {};
      list.forEach(function (p) { out[p] = mediaUrl(p); });
      return out;
    });
  }

  function seriesCopy(series) {
    var extra = {
      'mimi-songs': {
        title: '咪咪色彩英语',
        desc: '小猫咪咪陪孩子认颜色、学英语。双语动画，配单词卡和色彩练习，适合 2–6 岁。'
      },
      'wanzhuan-secai': {
        title: '玩转色彩',
        desc: '36 个神奇的颜色实验。每天 5 分钟，动手发现颜色的秘密。适合小学 2–4 年级。'
      }
    };
    var over = extra[series && series.id] || {};
    return {
      title: over.title || (series && series.title) || '',
      desc: over.desc || (series && series.desc) || '',
      host: (series && series.host) || '',
      hex: (series && series.hex) || '#E8352E',
      unit: (series && series.unit) || '集'
    };
  }

  function zhTitle(ep) {
    if (!ep || !ep.title) return '';
    return ep.title.zh || ep.title.en || '';
  }

  function enTitle(ep) {
    if (!ep || !ep.title) return '';
    return ep.title.en || '';
  }

  function colorName(ep) {
    if (!ep || !ep.color) return '';
    return ep.color.zh || ep.color.en || '';
  }

  function colorHex(ep) {
    return (ep && ep.color && ep.color.hex) || '#E4D2B0';
  }

  function fmtDuration(sec) {
    sec = Math.round(Number(sec) || 0);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function liveSeries(catalog) {
    return ((catalog && catalog.series) || []).filter(function (s) {
      return s.status === 'live';
    });
  }

  function episodesOf(catalog, seriesId) {
    return ((catalog && catalog.episodes) || []).filter(function (e) {
      return e.series === seriesId;
    });
  }

  function findEpisode(catalog, id) {
    var list = (catalog && catalog.episodes) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function findSeries(catalog, id) {
    var list = (catalog && catalog.series) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function nextEpisode(catalog, ep) {
    if (!ep) return null;
    var list = episodesOf(catalog, ep.series);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === ep.id) return list[i + 1] || null;
    }
    return null;
  }

  function prevEpisode(catalog, ep) {
    if (!ep) return null;
    var list = episodesOf(catalog, ep.series);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === ep.id) return i > 0 ? list[i - 1] : null;
    }
    return null;
  }

  w.MIMI = {
    mediaUrl: mediaUrl,
    videoOf: videoOf,
    resolve: resolve,
    isOffline: isOffline,
    isPreviewHost: isPreviewHost,
    cloudAllowed: cloudAllowed,
    kidsColorVideo: kidsColorVideo,
    publicUrl: publicUrl,
    seriesCopy: seriesCopy,
    zhTitle: zhTitle,
    enTitle: enTitle,
    colorName: colorName,
    hex: colorHex,
    colorHex: colorHex,
    fmtDuration: fmtDuration,
    liveSeries: liveSeries,
    episodesOf: episodesOf,
    findEpisode: findEpisode,
    findSeries: findSeries,
    nextEpisode: nextEpisode,
    prevEpisode: prevEpisode
  };
})(window);
