(function () {
  var catalog = window.MIMI_CATALOG;
  var M = window.MIMI;
  var app = document.getElementById('app');
  if (!catalog || !M || !app) return;

  function qs(name) {
    var m = new URLSearchParams(location.search).get(name);
    return m || '';
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  var id = qs('id');
  var ep = M.findEpisode(catalog, id);
  if (!ep) {
    document.title = '没有找到这一集 · 咪咪色彩英语';
    app.innerHTML = '<div class="missing"><p>没有找到这一集。</p><p><a class="bigbtn" href="index.html">返回目录</a></p></div>';
    return;
  }

  var series = M.findSeries(catalog, ep.series) || { id: ep.series, unit: ep.unit };
  var copy = M.seriesCopy(series);
  var prev = M.prevEpisode(catalog, ep);
  var next = M.nextEpisode(catalog, ep);
  var words = ep.words || [];
  var lyrics = ep.lyrics || [];
  var useWide = false;
  var titleZh = M.zhTitle(ep);
  var titleEn = M.enTitle(ep);
  var color = M.colorName(ep);
  var hex = M.colorHex(ep);
  document.documentElement.style.setProperty('--c', hex);
  document.title = (titleZh || ('第' + ep.no + (ep.unit || copy.unit))) + ' · 咪咪色彩英语';

  var label = '第 ' + pad(ep.no) + ' ' + (ep.unit || copy.unit);
  if (color) label += ' · ' + color;

  var nav = document.getElementById('nav-links');
  if (nav) {
    var links = '';
    if (prev) links += '<a href="play.html?id=' + encodeURIComponent(prev.id) + '">← 上一' + escapeHtml(ep.unit || copy.unit) + '</a>';
    if (next) links += '<a href="play.html?id=' + encodeURIComponent(next.id) + '">下一' + escapeHtml(ep.unit || copy.unit) + ' →</a>';
    nav.innerHTML = links;
  }

  var isLand = !!ep.landscape;

  var mediaPaths = [ep.video, ep.videoWide, ep.poster, ep.cover];
  (words || []).forEach(function (w) { if (w && w.image) mediaPaths.push(w.image); });
  app.innerHTML = '<p class="lead">正在准备视频…</p><div class="media-error" id="media-error" hidden></div>';

  var resolveFailed = false;
  M.resolve(mediaPaths).catch(function (err) {
    console.warn('media resolve failed', err);
    resolveFailed = true;
  }).then(function () {
    renderPage();
  });

  function renderPage() {
  var posterPath = ep.poster || ep.cover || '';
  var poster = posterPath ? M.mediaUrl(posterPath) : '';
  var src = M.videoOf(ep, false);

  var wordsHtml = '';
  if (words.length) {
    wordsHtml += '<h2 class="section-title">本集单词 · 点一下跳过去</h2>';
    wordsHtml += '<div class="now-word wait" id="now-word">播放到单词时，这里会出现单词卡</div>';
    wordsHtml += '<div class="words" id="words">';
    words.forEach(function (w, i) {
      var imgPath = w.image || '';
      var img = imgPath ? M.mediaUrl(imgPath) : '';
      var imgFb = (imgPath && M.fallbackUrl) ? M.fallbackUrl(imgPath) : '';
      wordsHtml +=
        '<button type="button" class="word-card" data-i="' + i + '">' +
          (img ? '<img alt="" src="' + img + '" data-media="' + escapeHtml(imgPath) + '"' +
            (imgFb && imgFb !== img ? ' data-fb="' + imgFb + '"' : '') + '>' : '') +
          '<div class="en">' + escapeHtml(w.en) + '</div>' +
          '<div class="zh">' + escapeHtml(w.zh || '') + '</div>' +
          (w.ipa ? '<div class="ipa">' + escapeHtml(w.ipa) + '</div>' : '<div class="ipa"></div>') +
        '</button>';
    });
    wordsHtml += '</div>';
  }

  var lyricsHtml = '';
  if (lyrics.length) {
    lyricsHtml += '<h2 class="section-title">歌词</h2><div class="lyrics" id="lyrics">';
    lyrics.forEach(function (line, i) {
      lyricsHtml +=
        '<div class="line" data-i="' + i + '" id="line-' + i + '">' +
          '<div class="l-en">' + escapeHtml(line.en) + '</div>' +
          (line.zh ? '<div class="l-zh">' + escapeHtml(line.zh) + '</div>' : '') +
        '</div>';
    });
    lyricsHtml += '</div>';
  }

  var nextHtml = '';
  if (next) {
    var nTitle = M.zhTitle(next) || M.colorName(next);
    var nLabel = '第 ' + pad(next.no) + ' ' + (next.unit || copy.unit);
    if (M.colorName(next)) nLabel += ' · ' + M.colorName(next);
    nextHtml =
      '<div class="upnext">' +
        '<span class="un-dot" style="background:' + M.colorHex(next) + '"></span>' +
        '<div><div class="un-label">下一' + escapeHtml(next.unit || copy.unit) + '</div>' +
        '<div class="un-title">' + escapeHtml(nLabel + (nTitle ? ' · ' + nTitle : '')) + '</div></div>' +
        '<a class="bigbtn" href="play.html?id=' + encodeURIComponent(next.id) + '">接着看</a>' +
      '</div>';
  }

  var wideBtn = (ep.videoWide && !ep.landscape)
    ? '<button type="button" class="wide-toggle" id="wide-btn">换成横屏画面</button>'
    : '';

  app.innerHTML =
    '<header class="play-head">' +
      '<span class="badge">' + escapeHtml(label) + '</span>' +
      '<span style="color:var(--muted);font-size:14px">' + escapeHtml(copy.title) + '</span>' +
      '<h1>' + escapeHtml(titleZh || label) + '</h1>' +
      (titleEn && titleEn !== titleZh ? '<p class="en-sub">' + escapeHtml(titleEn) + '</p>' : '') +
    '</header>' +
    '<div class="player-wrap ' + (isLand ? 'land' : 'portrait') + '" id="player-wrap">' +
      '<video id="player" controls playsinline preload="metadata"' +
        (src ? ' src="' + src + '"' : '') +
      '></video>' +
    '</div>' +
    wideBtn +
    '<div class="media-error" id="media-error" hidden></div>' +
    wordsHtml +
    lyricsHtml +
    nextHtml;

  var video = document.getElementById('player');
  var errBox = document.getElementById('media-error');
  if (!src) showPreviewNote();
  var wrap = document.getElementById('player-wrap');
  var nowEl = document.getElementById('now-word');
  var wideBtnEl = document.getElementById('wide-btn');

  function showPreviewNote() {
    if (!errBox) return;
    if (M.isOffline()) {
      errBox.innerHTML = '<b>预览版：视频暂未接入</b>离线包还没有把视频放到 media/ 里。请按 media/README.md 的路径把文件拷进去。';
    } else if (ep.series === 'wanzhuan-secai') {
      errBox.innerHTML = '<b>预览版：视频暂未接入</b>这一课的备用地址暂时打不开。请稍后再试，或先看其他课。';
    } else {
      errBox.innerHTML = '<b>这一集暂时打不开</b>请稍后再试，或先看其他集。';
    }
    errBox.hidden = false;
  }

  function showError(isFallback) {
    if (isFallback) {
      if (!errBox) return;
      errBox.innerHTML = '<b>正在试试备用地址…</b>';
      errBox.hidden = false;
      return;
    }
    showPreviewNote();
  }

  function hideError() {
    if (errBox) errBox.hidden = true;
  }

  var tried = {};
  var stallTimer = null;

  function clearStall() {
    if (stallTimer) {
      clearTimeout(stallTimer);
      stallTimer = null;
    }
  }

  function armStall() {
    clearStall();
    if (!video) return;
    var ms = (M.stallMs && M.stallMs()) || 6000;
    stallTimer = setTimeout(function () {
      stallTimer = null;
      if (!video) return;
      if (video.readyState >= 2) return;
      tryFallback();
    }, ms);
  }

  function tryFallback() {
    if (!video) return;
    var cur = video.currentSrc || video.getAttribute('src') || '';
    if (cur) tried[cur] = true;
    var list = (M.videoFallbacks && M.videoFallbacks(ep, useWide)) || [];
    var next = '';
    for (var i = 0; i < list.length; i++) {
      if (list[i] && !tried[list[i]]) {
        next = list[i];
        break;
      }
    }
    if (!next) {
      showPreviewNote();
      return;
    }
    showError(true);
    var t = video.currentTime || 0;
    tried[next] = true;
    video.src = next;
    video.load();
    armStall();
    var onMeta = function () {
      video.removeEventListener('loadedmetadata', onMeta);
      if (t) {
        try { video.currentTime = t; } catch (e) {}
      }
      video.play().catch(function () {});
    };
    video.addEventListener('loadedmetadata', onMeta);
  }

  if (posterPath && M.setVideoPoster) M.setVideoPoster(video, posterPath);
  document.querySelectorAll('img[data-media]').forEach(function (img) {
    if (M.watchMedia) M.watchMedia(img, img.getAttribute('data-media'));
  });

  if (video) {
    if (src) tried[src] = true;
    armStall();
    video.addEventListener('error', tryFallback);
    video.addEventListener('waiting', armStall);
    video.addEventListener('stalled', armStall);
    video.addEventListener('canplay', clearStall);
    video.addEventListener('playing', function () {
      clearStall();
      hideError();
    });
  }

  if (wideBtnEl && video) {
    wideBtnEl.addEventListener('click', function () {
      useWide = !useWide;
      wideBtnEl.classList.toggle('on', useWide);
      wideBtnEl.textContent = useWide ? '换回竖屏画面' : '换成横屏画面';
      wrap.classList.toggle('land', useWide || isLand);
      wrap.classList.toggle('portrait', !(useWide || isLand));
      var t = video.currentTime || 0;
      var paused = video.paused;
      tried = {};
      clearStall();
      var nextSrc = M.videoOf(ep, useWide);
      if (nextSrc) tried[nextSrc] = true;
      video.src = nextSrc;
      armStall();
      video.addEventListener('loadedmetadata', function once() {
        video.removeEventListener('loadedmetadata', once);
        video.currentTime = t;
        if (!paused) video.play().catch(function () {});
      });
    });
  }

  function currentIndex(list, t) {
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      var start = Number(list[i].start);
      var end = list[i].end != null ? Number(list[i].end) : NaN;
      if (isNaN(start)) continue;
      if (t >= start && (isNaN(end) || t < end)) return i;
      if (t >= start) idx = i;
    }
    return idx;
  }

  function renderNow(i) {
    if (!nowEl) return;
    if (i < 0 || !words[i]) {
      nowEl.className = 'now-word wait';
      nowEl.innerHTML = '播放到单词时，这里会出现单词卡';
      return;
    }
    var w = words[i];
    var imgPath = w.image || '';
    var img = imgPath ? M.mediaUrl(imgPath) : '';
    var imgFb = (imgPath && M.fallbackUrl) ? M.fallbackUrl(imgPath) : '';
    nowEl.className = 'now-word';
    nowEl.innerHTML =
      (img ? '<img alt="" src="' + img + '" data-media="' + escapeHtml(imgPath) + '"' +
        (imgFb && imgFb !== img ? ' data-fb="' + imgFb + '"' : '') + '>' : '') +
      '<div><div class="nw-en">' + escapeHtml(w.en) + '</div>' +
      '<div class="nw-zh">' + escapeHtml(w.zh || '') + '</div>' +
      (w.ipa ? '<div class="nw-ipa">' + escapeHtml(w.ipa) + '</div>' : '') +
      '</div>';
    var nowImg = nowEl.querySelector('img[data-media]');
    if (nowImg && M.watchMedia) M.watchMedia(nowImg, nowImg.getAttribute('data-media'));
  }

  var lastWord = -2;
  var lastLine = -2;

  if (video) {
    video.addEventListener('timeupdate', function () {
      var t = video.currentTime || 0;
      if (words.length) {
        var wi = currentIndex(words, t);
        if (wi !== lastWord) {
          lastWord = wi;
          renderNow(wi);
          document.querySelectorAll('.word-card').forEach(function (el, i) {
            el.classList.toggle('on', i === wi);
          });
        }
      }
      if (lyrics.length) {
        var li = currentIndex(lyrics, t);
        if (li !== lastLine) {
          lastLine = li;
          document.querySelectorAll('.line').forEach(function (el, i) {
            el.classList.toggle('on', i === li);
          });
          var on = document.getElementById('line-' + li);
          if (on && on.scrollIntoView) {
            on.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
      }
    });
  }

  document.querySelectorAll('.word-card').forEach(function (el) {
    el.addEventListener('click', function () {
      var i = Number(el.getAttribute('data-i'));
      var w = words[i];
      if (!video || !w || w.start == null) return;
      video.currentTime = Number(w.start);
      video.play().catch(function () {});
    });
  });

  document.querySelectorAll('.line').forEach(function (el) {
    el.addEventListener('click', function () {
      var i = Number(el.getAttribute('data-i'));
      var line = lyrics[i];
      if (!video || !line || line.start == null) return;
      video.currentTime = Number(line.start);
      video.play().catch(function () {});
    });
  });
  }
})();
