/**
 * Whishess visit stats dashboard
 */
(function () {
  'use strict';

  var API = '/.netlify/functions/visits?mode=stats';
  var PAGE_LABELS = {
    home: 'Homepage (whishess.in)',
    services: 'Services',
    gallery: 'Gallery',
    'how-it-works': 'How it works',
    contact: 'Contact',
    privacy: 'Privacy',
    terms: 'Terms'
  };

  function $(id) { return document.getElementById(id); }

  function formatNum(n) {
    return Number(n || 0).toLocaleString('en-IN');
  }

  function pageLabel(key) {
    return PAGE_LABELS[key] || key.replace(/-/g, ' ');
  }

  function formatDay(iso) {
    if (!iso) return iso;
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function render(data) {
    $('st-total').textContent = formatNum(data.total);
    $('st-homepage').textContent = formatNum(data.homepage);
    $('st-today').textContent = formatNum(data.today);
    $('st-today-label').textContent = 'Visits today (' + formatDay(data.todayDate) + ')';

    var pages = Object.entries(data.pages || {}).sort(function (a, b) { return b[1] - a[1]; });
    $('st-pages').innerHTML = pages.length
      ? pages.map(function (row) {
          return '<tr><td>' + pageLabel(row[0]) + '</td><td><strong>' + formatNum(row[1]) + '</strong></td></tr>';
        }).join('')
      : '<tr><td colspan="2" style="text-align:center;color:rgba(250,247,242,0.5);padding:1.5rem">No page data yet — share your site link!</td></tr>';

    var daily = Object.entries(data.daily || {});
    $('st-daily').innerHTML = daily.length
      ? daily.map(function (row) {
          return '<tr><td>' + formatDay(row[0]) + '</td><td><strong>' + formatNum(row[1]) + '</strong></td></tr>';
        }).join('')
      : '<tr><td colspan="2" style="text-align:center;color:rgba(250,247,242,0.5);padding:1.5rem">Daily stats appear after first visits</td></tr>';

    $('st-loading').hidden = true;
    $('st-content').hidden = false;
    $('st-updated').textContent = 'Last updated: ' + new Date().toLocaleString('en-IN');
  }

  function showError(msg) {
    $('st-loading').innerHTML = '<p class="st-error">' + msg + '</p>';
  }

  function load() {
    fetch(API, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('Counter not available');
        return res.json();
      })
      .then(render)
      .catch(function () {
        showError(
          'Visit counter is active only on the live Netlify site (whishess.in). ' +
          'Open <a href="https://whishess.in/stats.html" style="color:#e7cf9f">whishess.in/stats.html</a> after deploy.'
        );
      });
  }

  $('st-refresh').addEventListener('click', function () {
    $('st-loading').hidden = false;
    $('st-content').hidden = true;
    $('st-loading').innerHTML = '<p>Loading stats…</p>';
    load();
  });

  load();
})();
