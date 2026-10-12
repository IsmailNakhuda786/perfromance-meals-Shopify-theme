(() => {
  const support = document.querySelector('[data-support]');
  if (!support) return;
  const toggle = support.querySelector('summary');
  const close = () => { support.open = false; toggle.focus(); };
  support.addEventListener('toggle', () => {
    toggle.setAttribute('aria-label', support.open ? toggle.dataset.supportCloseLabel : toggle.dataset.supportOpenLabel);
  });
  support.querySelector('[data-support-close]')?.addEventListener('click', close);
  support.addEventListener('keydown', event => { if (event.key === 'Escape' && support.open) close(); });
  document.addEventListener('click', event => { if (support.open && !support.contains(event.target)) support.open = false; });
  support.querySelectorAll('[data-support-topic]').forEach(topic => {
    topic.addEventListener('click', () => support.querySelectorAll('[data-support-topic]').forEach(item => item.classList.toggle('is-selected', item === topic)));
  });
})();
