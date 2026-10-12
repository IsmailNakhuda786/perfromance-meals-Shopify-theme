(() => {
  const cleanup = new WeakMap();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const initialize = (scope = document) => {
    scope.querySelectorAll('[data-home-hero]').forEach(hero => {
      if (cleanup.has(hero)) return;
      const slides = [...hero.querySelectorAll('[data-hero-slide]')];
      const sources = [...hero.querySelectorAll('[data-hero-source]')];
      const tileContainer = hero.querySelector('[data-hero-tiles]');
      if (!slides.length || slides.length !== sources.length) return;
      const timers = new Set();
      const controller = new AbortController();
      const listen = (el, event, fn) => el?.addEventListener(event, fn, { signal: controller.signal });
      let current = 0;
      let busy = false;
      let userPaused = reduced.matches || hero.dataset.autoplay !== 'true';
      let hovering = false;
      let focused = false;
      let interval;
      const later = (fn, duration) => {
        const id = setTimeout(() => { timers.delete(id); fn(); }, duration);
        timers.add(id);
      };
      const tiles = Array.from({ length: 20 }, (_, i) => {
        const col = i % 5, row = Math.floor(i / 5);
        const cell = document.createElement('div');
        const image = document.createElement('div');
        cell.style.cssText = 'overflow:hidden;position:relative';
        image.style.cssText = `position:absolute;width:500%;height:400%;left:-${col * 100}%;top:-${row * 100}%;background-size:cover;background-position:center`;
        cell.append(image);
        tileContainer.append(cell);
        return { cell, image, col, row, dx: (col - 2) * 100 + (i % 3 === 0 ? 40 : -30), dy: (row - 1.5) * 90 + (i % 2 === 0 ? 25 : -30), rot: ((i * 37) % 40) - 20 };
      });
      const show = index => {
        slides.forEach((slide, i) => { slide.hidden = i !== index; });
        sources.forEach((source, i) => { source.hidden = i !== index; });
        current = index;
        hero.querySelector('[data-hero-progress]').style.width = `${((index + 1) / slides.length) * 100}%`;
        hero.querySelector('[data-hero-count]').textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      };
      const change = index => {
        if (busy || index === current) return;
        if (reduced.matches) { show(index); return; }
        busy = true;
        hero.dataset.phase = 'exit';
        tileContainer.style.display = 'grid';
        sources[current].style.visibility = 'hidden';
        const exiting = sources[current].src;
        tiles.forEach(({ cell, image }) => {
          image.style.backgroundImage = `url("${exiting.replaceAll('"', '%22')}")`;
          cell.style.transition = 'none';
          cell.style.opacity = '1';
          cell.style.transform = 'translate(0,0) rotate(0) scale(1)';
        });
        requestAnimationFrame(() => tiles.forEach(({ cell, col, row, dx, dy, rot }) => {
          const delay = (col + row) * 28;
          cell.style.transition = `transform 480ms ease-in ${delay}ms,opacity 360ms ease-in ${delay}ms`;
          cell.style.transform = `translate(${dx}px,${dy}px) rotate(${rot}deg) scale(.5)`;
          cell.style.opacity = '0';
        }));
        later(() => {
          sources[current].style.visibility = '';
          show(index);
          hero.dataset.phase = 'enter-init';
          sources[current].style.visibility = 'hidden';
          tiles.forEach(({ cell, image, dx, dy, rot }) => {
            image.style.backgroundImage = `url("${sources[current].src.replaceAll('"', '%22')}")`;
            cell.style.transition = 'none';
            cell.style.opacity = '0';
            cell.style.transform = `translate(${-dx * .8}px,${-dy * .8}px) rotate(${-rot * .5}deg) scale(.7)`;
          });
          requestAnimationFrame(() => requestAnimationFrame(() => {
            hero.dataset.phase = 'enter';
            tiles.forEach(({ cell, col, row }) => {
              const delay = ((4 - col) + (3 - row)) * 24;
              cell.style.transition = `transform 500ms cubic-bezier(.16,1,.3,1) ${delay}ms,opacity 350ms ease-out ${delay}ms`;
              cell.style.transform = 'translate(0,0) rotate(0) scale(1)';
              cell.style.opacity = '1';
            });
            later(() => {
              tileContainer.style.display = 'none';
              sources[current].style.visibility = '';
              hero.dataset.phase = 'idle';
              busy = false;
            }, 700);
          }));
        }, 500);
      };
      const cycle = () => {
        clearInterval(interval);
        if (!userPaused && !hovering && !focused && !document.hidden && slides.length > 1) interval = setInterval(() => change((current + 1) % slides.length), 5000);
      };
      const pause = hero.querySelector('[data-hero-pause]');
      const updatePause = () => {
        if (!pause) return;
        pause.setAttribute('aria-label', userPaused ? pause.dataset.playLabel : pause.dataset.pauseLabel);
        pause.setAttribute('aria-pressed', String(userPaused));
        pause.textContent = userPaused ? '▶' : pause.dataset.autoLabel;
      };
      listen(hero.querySelector('[data-hero-prev]'), 'click', () => change((current - 1 + slides.length) % slides.length));
      listen(hero.querySelector('[data-hero-next]'), 'click', () => change((current + 1) % slides.length));
      listen(pause, 'click', () => { userPaused = !userPaused; updatePause(); cycle(); });
      listen(hero, 'pm:hero-select', event => { userPaused = true; updatePause(); cycle(); change(Number(event.detail)); });
      listen(hero, 'mouseenter', () => { hovering = true; cycle(); });
      listen(hero, 'mouseleave', () => { hovering = false; cycle(); });
      listen(hero, 'focusin', () => { focused = true; cycle(); });
      listen(hero, 'focusout', event => { if (!hero.contains(event.relatedTarget)) { focused = false; cycle(); } });
      listen(document, 'visibilitychange', cycle);
      updatePause();
      cycle();
      sources.forEach(source => { const preload = new Image(); preload.src = source.src; });
      cleanup.set(hero, () => { clearInterval(interval); timers.forEach(clearTimeout); controller.abort(); });
    });

    scope.querySelectorAll('[data-home-stats]').forEach(stats => {
      if (cleanup.has(stats)) return;
      let frame;
      const animate = () => {
        if (reduced.matches) return;
        const start = performance.now();
        const values = [...stats.querySelectorAll('[data-count-up]')];
        const tick = now => {
          const fraction = Math.min((now - start) / 1800, 1);
          const ease = 1 - Math.pow(1 - fraction, 3);
          values.forEach(value => { value.textContent = Math.round(Number(value.dataset.countUp) * ease).toLocaleString(document.documentElement.lang); });
          if (fraction < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      };
      const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { animate(); observer.disconnect(); } }, { threshold: .1 });
      observer.observe(stats);
      cleanup.set(stats, () => { observer.disconnect(); cancelAnimationFrame(frame); });
    });

    scope.querySelectorAll('[data-home-brands]').forEach(brands => {
      if (cleanup.has(brands)) return;
      const panels = [...brands.querySelectorAll('[data-brand-panel]')];
      const controller = new AbortController();
      const activate = active => panels.forEach(panel => {
        panel.classList.toggle('is-active', panel === active);
        panel.classList.toggle('is-inactive', Boolean(active) && panel !== active);
        panel.querySelector('[data-brand-toggle]').setAttribute('aria-expanded', String(panel === active));
      });
      brands.classList.add('pm-brands-enhanced');
      panels.forEach(panel => {
        const options = { signal: controller.signal };
        panel.addEventListener('mouseenter', () => { if (window.matchMedia('(hover:hover)').matches) activate(panel); }, options);
        panel.addEventListener('mouseleave', () => { if (window.matchMedia('(hover:hover)').matches && !panel.contains(document.activeElement)) activate(null); }, options);
        panel.addEventListener('focusin', () => { if (panel.querySelector(':focus-visible')) activate(panel); }, options);
        panel.addEventListener('focusout', event => { if (!panel.contains(event.relatedTarget)) activate(null); }, options);
        panel.querySelector('[data-brand-toggle]').addEventListener('click', () => activate(panel.classList.contains('is-active') ? null : panel), options);
      });
      cleanup.set(brands, () => controller.abort());
    });

    scope.querySelectorAll('[data-pm-header]').forEach(header => {
      if (cleanup.has(header)) return;
      const controller = new AbortController();
      const toggle = header.querySelector('[data-mobile-toggle]');
      const menu = header.querySelector('[data-mobile-menu]');
      const brands = header.querySelector('[data-brand-switcher]');
      const setOpen = open => {
        toggle.setAttribute('aria-expanded', String(open));
        menu.hidden = !open;
        toggle.querySelector('[data-menu-icon]').hidden = open;
        toggle.querySelector('[data-close-icon]').hidden = !open;
      };
      toggle.addEventListener('click', () => setOpen(menu.hidden), { signal: controller.signal });
      header.addEventListener('keydown', event => { if (event.key === 'Escape') { if (!menu.hidden) { setOpen(false); toggle.focus(); } else if (brands.open) { brands.open = false; brands.querySelector('summary').focus(); } } }, { signal: controller.signal });
      document.addEventListener('click', event => { if (!brands.contains(event.target)) brands.open = false; }, { signal: controller.signal });
      cleanup.set(header, () => controller.abort());
    });

    scope.querySelectorAll('[data-promo-popup]').forEach(popup => {
      if (cleanup.has(popup)) return;
      const controller = new AbortController();
      const key = `pm-promo-${popup.dataset.sectionId}`;
      const tabs = [...popup.querySelectorAll('[data-promo-tab]')];
      const switchTab = tab => {
        tabs.forEach(item => { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; });
        popup.querySelectorAll('[data-promo-panel]').forEach(panel => { panel.hidden = panel.dataset.promoPanel !== tab.dataset.promoTab; });
      };
      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => switchTab(tab), { signal: controller.signal });
        tab.addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; switchTab(next); next.focus(); } }, { signal: controller.signal });
      });
      popup.querySelector('[data-promo-close]').addEventListener('click', () => popup.close(), { signal: controller.signal });
      popup.addEventListener('click', event => { if (event.target === popup) popup.close(); }, { signal: controller.signal });
      popup.addEventListener('close', () => { try { sessionStorage.setItem(key, 'seen'); } catch {} }, { signal: controller.signal });
      popup.querySelectorAll('[data-copy-code]').forEach(button => button.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(button.dataset.copyCode); button.textContent = `${button.dataset.copiedLabel} →`; setTimeout(() => { button.textContent = `${button.dataset.copyLabel} →`; }, 2000); } catch { button.textContent = button.dataset.copyCode; }
      }, { signal: controller.signal }));
      let seen = false;
      try { seen = sessionStorage.getItem(key) === 'seen'; } catch {}
      const timer = popup.dataset.enabled === 'true' && !seen ? setTimeout(() => { if (!document.querySelector('dialog[open]')) popup.showModal(); }, Number(popup.dataset.delay) * 1000) : null;
      cleanup.set(popup, () => { clearTimeout(timer); controller.abort(); popup.close(); });
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initialize()); else initialize();
  document.addEventListener('shopify:section:load', event => initialize(event.target));
  document.addEventListener('shopify:section:unload', event => event.target.querySelectorAll('[data-home-hero],[data-home-stats],[data-home-brands],[data-pm-header],[data-promo-popup]').forEach(element => { cleanup.get(element)?.(); cleanup.delete(element); }));
  document.addEventListener('shopify:block:select', event => {
    const panel = event.target.closest('[data-brand-panel]');
    if (panel && !panel.classList.contains('is-active')) panel.querySelector('[data-brand-toggle]').click();
    const slide = event.target.closest('[data-hero-slide]');
    if (slide) slide.closest('[data-home-hero]').dispatchEvent(new CustomEvent('pm:hero-select', { detail: slide.dataset.index }));
  });
})();
