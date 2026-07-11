/**
 * Whishess visit counter — tracks page views on whishess.in
 * Sends hits to Netlify function (works after deploy to Netlify).
 */
(function () {
  'use strict';

  var API = '/.netlify/functions/visits';
  var SESSION_KEY = 'whishess_visit_logged';

  function pageId() {
    var path = (window.location.pathname || '/').replace(/^\//, '').toLowerCase();
    if (!path || path === 'index.html') return 'home';
    return path.replace(/\.html$/, '') || 'home';
  }

  function shouldCount() {
    try {
      var key = SESSION_KEY + ':' + pageId();
      if (sessionStorage.getItem(key)) return false;
      sessionStorage.setItem(key, '1');
      return true;
    } catch (e) {
      return true;
    }
  }

  function track() {
    if (!shouldCount()) return;

    var url = API + '?page=' + encodeURIComponent(pageId());

    if (navigator.sendBeacon) {
      try {
        navigator.sendBeacon(url);
        return;
      } catch (e) {}
    }

    fetch(url, { method: 'POST', keepalive: true, mode: 'cors' }).catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', track);
  } else {
    track();
  }
})();
