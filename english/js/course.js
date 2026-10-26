(function () {
  'use strict';
  const form = document.getElementById('course-filter');
  if (form) {
    const query = document.getElementById('course-query');
    const stage = document.getElementById('course-stage');
    const grade = document.getElementById('course-grade');
    const cards = Array.from(document.querySelectorAll('[data-course-lesson]'));
    const status = document.getElementById('course-result-count');
    const empty = document.getElementById('course-empty');
    const normalize = value => String(value || '').toLowerCase().normalize('NFKC').trim();
    function apply(updateURL) {
      const words = normalize(query.value).split(/\s+/).filter(Boolean);
      let visible = 0;
      cards.forEach(card => {
        const matches = (!stage.value || card.dataset.stage === stage.value) && (!grade.value || card.dataset.grade === grade.value) && words.every(word => normalize(card.dataset.search).includes(word));
        card.hidden = !matches;
        if (matches) visible += 1;
      });
      document.querySelectorAll('[data-course-group]').forEach(group => { group.hidden = !group.querySelector('[data-course-lesson]:not([hidden])'); });
      status.textContent = `显示 ${visible} / ${cards.length} 课；目录数量不是学习掌握率。`;
      empty.hidden = visible !== 0;
      if (updateURL) {
        const url = new URL(location.href);
        [['q', query.value.trim()], ['stage', stage.value], ['grade', grade.value]].forEach(([key, value]) => value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
        history.replaceState(null, '', url);
      }
    }
    function readURL() {
      const params = new URLSearchParams(location.search);
      query.value = params.get('q') || '';
      stage.value = params.get('stage') || '';
      grade.value = params.get('grade') || '';
      apply(false);
    }
    form.addEventListener('submit', event => { event.preventDefault(); apply(true); });
    query.addEventListener('input', () => apply(true));
    stage.addEventListener('change', () => { grade.value = ''; apply(true); });
    grade.addEventListener('change', () => apply(true));
    form.addEventListener('reset', () => { query.value = ''; stage.value = ''; grade.value = ''; apply(true); });
    window.addEventListener('popstate', readURL);
    readURL();
  }
  function revealAnchor() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    const target = id && document.getElementById(id);
    const details = target && target.closest('details');
    if (details) details.open = true;
  }
  revealAnchor();
  window.addEventListener('hashchange', revealAnchor);
})();
