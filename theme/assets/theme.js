(() => {
  if (window.pmThemeInitialized) return;
  window.pmThemeInitialized = true;
  const routesNode = document.getElementById('ThemeRoutes');
  if (!routesNode) return;
  const routes = JSON.parse(routesNode.textContent);
  const announcement = document.querySelector('[data-pm-announcement]');
  if (announcement) {
    const headerSection = announcement.closest('.pm-header-section');
    const updateAnnouncementHeight = () => headerSection?.style.setProperty('--pm-announcement-height', `${announcement.getBoundingClientRect().height}px`);
    updateAnnouncementHeight();
    new ResizeObserver(updateAnnouncementHeight).observe(announcement);
  }
  let previousFocus;
  let queue = Promise.resolve();
  let bundleModule;
  let cartChangeFailed = false;
  const reviewData = scope => scope?.querySelector('[data-bundle-review-data]');
  async function reviewBundle(node, variantId, quantity) {
    bundleModule ||= import(routes.bundleReviewAsset);
    const {prepareBundleCartReview} = await bundleModule;
    let context;
    try { context = JSON.parse(node.textContent); }
    catch { throw new Error(routes.bundleReviewUnavailable); }
    return prepareBundleCartReview({context, variantId, quantity,
      endpoint: routes.bundleReviewPath, origin: window.location.origin,
      unavailableMessage: routes.bundleReviewUnavailable, changedMessage: routes.bundleReviewChanged});
  }
  const drawer = () => document.getElementById('CartDrawer');
  function announce() {
    const region = document.getElementById('CartLiveRegion');
    if (region) region.textContent = routes.cartUpdated;
  }
  function errorMessage(data) {
    if (typeof data?.description === 'string') return data.description;
    if (typeof data?.message === 'string') return data.message;
    if (data?.errors && typeof data.errors === 'object') return Object.values(data.errors).flat().filter(x => typeof x === 'string').join(' ');
    return routes.error;
  }
  function setError(scope, message = '') {
    const target = scope?.querySelector('[data-form-error], [data-cart-error]');
    if (!target) return;
    target.textContent = message;
    target.hidden = !message;
  }
  async function fetchJSON(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok || (data.status && Number(data.status) >= 400)) throw new Error(errorMessage(data));
    return data;
  }
  function openCart() {
    const dialog = drawer();
    if (!dialog || !dialog.showModal) { window.location.assign(routes.cart); return; }
    if (!dialog.open) {
      previousFocus = document.activeElement;
      dialog.showModal();
      document.documentElement.classList.add('pm-dialog-open');
    }
  }
  function closeCart() { drawer()?.close(); }
  function bindDrawer() {
    const dialog = drawer();
    if (!dialog || dialog.dataset.bound) return;
    dialog.dataset.bound = 'true';
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('pm-dialog-open');
      previousFocus?.focus?.();
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeCart();
    });
  }
  async function refreshCart() {
    const sectionIds = Array.from(document.querySelectorAll('[data-cart-content]')).map(node => node.closest('[id^="shopify-section-"]')?.id.replace('shopify-section-', '')).filter(Boolean);
    const ids = [...new Set(sectionIds)];
    const url = new URL(routes.cart, window.location.origin);
    url.searchParams.set('sections', ids.join(','));
    const [sections, cart] = await Promise.all([fetchJSON(url), fetchJSON(`${routes.cart}.js`)]);
    let missing = false;
    ids.forEach(id => {
      if (typeof sections[id] !== 'string') { missing = true; return; }
      const documentHTML = new DOMParser().parseFromString(sections[id], 'text/html');
      const incoming = documentHTML.querySelector('[data-cart-content]');
      const current = document.getElementById(`shopify-section-${id}`)?.querySelector('[data-cart-content]');
      if (incoming && current) current.replaceWith(incoming);
      else missing = true;
    });
    document.querySelectorAll('[data-cart-count]').forEach(node => { node.textContent = String(cart.item_count); node.hidden = cart.item_count === 0; });
    if (missing) throw new Error(routes.error);
    announce();
    document.dispatchEvent(new CustomEvent('pm:cart-updated', { detail: cart }));
    return cart;
  }
  function enqueue(task) {
    queue = queue.then(task, task);
    return queue;
  }
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-product-form]')) return;
    event.preventDefault();
    const button = event.submitter || form.querySelector('[type="submit"]');
    const body = new FormData(form);
    setError(form);
    if (button) button.disabled = true;
    enqueue(async () => {
      try {
        const node = reviewData(form);
        if (routes.bundleReviewEnabled && node) {
          const review = await reviewBundle(node, body.get('id'), Number(body.get('quantity') || 1));
          for (const [key, value] of Object.entries(review.properties)) body.set(`properties[${key}]`, value);
        }
        await fetchJSON(routes.add, { method: 'POST', body, headers: { Accept: 'application/json' } });
        try { await refreshCart(); }
        catch { window.location.assign(routes.cart); return; }
        openCart();
      } catch (error) {
        setError(form, error.message || routes.error);
        try { await refreshCart(); } catch {}
      } finally {
        if (button) button.disabled = false;
      }
    });
  });
  async function changeLine(input, quantity) {
    const form = input.closest('[data-cart-form]');
    const key = input.dataset.key;
    const focusId = input.id;
    setError(form);
    input.disabled = true;
    try {
      const payload = {id: key, quantity};
      const node = reviewData(input.closest('[data-cart-line]'));
      if (routes.bundleReviewEnabled && node && quantity > 0) {
        const cart = await fetchJSON(`${routes.cart}.js`);
        const line = cart.items.find(item => item.key === key);
        if (!line || line.selling_plan_allocation) throw new Error(routes.bundleReviewUnavailable);
        const review = await reviewBundle(node, line.variant_id, quantity);
        // Shopify replaces the entire properties object on change.js.
        payload.properties = {...line.properties, ...review.properties};
      }
      await fetchJSON(routes.change, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
      cartChangeFailed = false;
      try { await refreshCart(); }
      catch { window.location.assign(routes.cart); return; }
      if (focusId) document.getElementById(focusId)?.focus();
    } catch (error) {
      cartChangeFailed = true;
      input.disabled = false;
      setError(form, error.message || routes.error);
    }
  }
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!routes.bundleReviewEnabled || !(form instanceof HTMLFormElement) || !form.matches('[data-cart-form]')) return;
    event.preventDefault();
    for (const input of form.querySelectorAll('[data-cart-quantity]')) {
      if (input.disabled || input.value === input.defaultValue) continue;
      const quantity = Number(input.value);
      if (!input.checkValidity() || !Number.isSafeInteger(quantity) || quantity < 0) { input.reportValidity(); return; }
      input.disabled = true;
      enqueue(() => changeLine(input, quantity));
    }
    const checkout = event.submitter?.name === 'checkout';
    const formId = form.id;
    const note = form.querySelector('[name="note"]')?.value;
    enqueue(async () => {
      const current = document.getElementById(formId) || form;
      try {
        if (cartChangeFailed) throw new Error(routes.bundleReviewUnavailable);
        for (const line of current.querySelectorAll('[data-cart-line]')) {
          if (!reviewData(line)) continue;
          if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(line.dataset.bundleReviewId || '') || !/^[a-f0-9]{64}$/.test(line.dataset.bundleReviewHash || '')) throw new Error(routes.bundleReviewUnavailable);
        }
        // Only submit the note/action. Quantities were already saved atomically
        // with their reviews; a native updates[] POST could detach that proof.
        const post = document.createElement('form');
        post.method = 'post'; post.action = routes.cart;
        for (const [name, value] of [['note', note], [checkout ? 'checkout' : 'update', '']]) {
          if (value === undefined) continue;
          const field = document.createElement('input'); field.type = 'hidden'; field.name = name; field.value = value; post.append(field);
        }
        document.body.append(post);
        HTMLFormElement.prototype.submit.call(post);
      } catch (error) { setError(current, error.message || routes.error); }
    });
  });
  document.addEventListener('change', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.disabled || !input.matches('[data-cart-quantity]')) return;
    if (!input.checkValidity()) { input.reportValidity(); return; }
    const quantity = Number(input.value);
    if (!Number.isInteger(quantity) || quantity < 0) return;
    input.disabled = true;
    enqueue(() => changeLine(input, quantity));
  });
  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const open = target.closest('[data-cart-open]');
    if (open) { event.preventDefault(); enqueue(async () => { try { await refreshCart(); openCart(); } catch { window.location.assign(routes.cart); } }); }
    if (target.closest('[data-cart-close]')) closeCart();
    const step = target.closest('[data-cart-step]');
    if (step) {
      const input = step.closest('[data-cart-line]')?.querySelector('[data-cart-quantity]');
      if (!input || input.disabled) return;
      const quantity = Number(input.value) + Number(step.dataset.cartStep) * Number(input.step || 1);
      if (!Number.isSafeInteger(quantity) || quantity < 0 || (input.max && quantity > Number(input.max))) return;
      input.disabled = true;
      enqueue(() => changeLine(input, quantity));
    }
    const remove = target.closest('[data-cart-remove]');
    if (remove) { event.preventDefault(); enqueue(() => changeLine(remove, 0)); }

  });
  document.addEventListener('pm:cart-open', openCart);
  document.addEventListener('pm:cart-refresh', () => { enqueue(() => refreshCart().catch(() => window.location.assign(routes.cart))); });
  document.addEventListener('shopify:section:load', bindDrawer);
  bindDrawer();
})();
