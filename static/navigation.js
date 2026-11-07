'use strict';

(() => {
  const views = ['experiment', 'learn'];
  const tabs = views.map((view) => document.getElementById(`${view}Tab`));
  const positions = { experiment: 0, learn: 0 };
  let current = null;

  function viewFromHash() {
    return window.location.hash.startsWith('#learn') ? 'learn' : 'experiment';
  }

  function showView(view, { remember = true, scroll = true } = {}) {
    if (!views.includes(view) || current === view) return;
    if (current && remember) positions[current] = window.scrollY;
    current = view;
    for (const name of views) {
      const active = name === view;
      document.getElementById(`${name}View`).hidden = !active;
      const tab = document.getElementById(`${name}Tab`);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    }
    document.getElementById('skipContent').href = view === 'learn' ? '#learnTitle' : '#experiment';
    document.getElementById('skipContent').textContent = view === 'learn' ? 'Skip to learning' : 'Skip to experiment';
    document.title = view === 'learn' ? 'Learn — Terra Incognita' : 'Terra Incognita — a small window into AI';
    document.dispatchEvent(new CustomEvent('terraincognita:viewchange', { detail: { view } }));
    document.dispatchEvent(new CustomEvent('uncharted:viewchange', { detail: { view } }));
    if (scroll) window.scrollTo({ top: positions[view], behavior: 'instant' });
  }

  function navigate(view) {
    if (!views.includes(view)) return;
    if (viewFromHash() !== view || !window.location.hash) history.pushState({ view }, '', `#${view}`);
    showView(view);
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-view-target]');
    if (!trigger || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const view = trigger.dataset.viewTarget;
    if (!views.includes(view)) return;
    event.preventDefault();
    navigate(view);
    if (trigger.getAttribute('role') !== 'tab') {
      document.getElementById(`${view}Tab`).focus({ preventScroll: true });
    }
  });

  document.querySelector('.page-switch').addEventListener('keydown', (event) => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = 1 - index;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 1;
    else return;
    event.preventDefault();
    navigate(views[next]);
    tabs[next].focus({ preventScroll: true });
  });

  window.addEventListener('popstate', () => showView(viewFromHash()));
  window.addEventListener('hashchange', () => showView(viewFromHash(), { scroll: false }));
  showView(viewFromHash(), { remember: false, scroll: false });
})();
