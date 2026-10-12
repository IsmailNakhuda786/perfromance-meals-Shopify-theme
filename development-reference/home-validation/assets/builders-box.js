(() => {
  const init = (scope = document) => {
    scope.querySelectorAll('[data-box-builder]').forEach((root) => {
      if (root.dataset.initialized === 'true') return;
      const configElement = root.querySelector('[data-box-config]');
      if (!configElement) return;
      let config;
      try { config = JSON.parse(configElement.textContent); } catch { return; }
      root.dataset.initialized = 'true';
      const labels = config.labels;
      const sizes = [...root.querySelectorAll('[data-box-size]')];
      const products = new Map(config.products.map((product) => [String(product.id), product]));
      const variants = new Map();
      products.forEach((product) => product.variants.forEach((variant) => variants.set(String(variant.id), { ...variant, product })));
      const activeVariants = new Map(config.products.map((product) => [String(product.id), String(product.variantId)]));
      const selections = new Map();
      let boxSize = Number(sizes[0].dataset.boxSize);
      let boxLabel = sizes[0].dataset.boxSizeLabel;
      let mode = 'one-time';
      let step = 'size';
      let busy = false;
      let detailProduct = null;
      const dialog = root.querySelector('[data-box-dialog]');
      const count = () => [...selections.values()].reduce((sum, qty) => sum + qty, 0);
      const total = () => [...selections].reduce((sum, [id, qty]) => sum + variants.get(id).price * qty, 0);
      const amount = (value) => {
        try { return new Intl.NumberFormat(config.locale, { style: 'currency', currency: config.currency }).format(value / 100); }
        catch { return `${(value / 100).toFixed(2)} ${config.currency}`; }
      };
      const node = (tag, className, text) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
      };
      const label = (value, replacements = {}) => Object.entries(replacements).reduce((text, [key, replacement]) => text.replaceAll(`__${key}__`, String(replacement)), value || '');
      const setText = (selector, value) => root.querySelectorAll(selector).forEach((element) => { element.textContent = value; });
      const status = (value) => setText('[data-box-status]', value);
      const error = (value = '') => {
        const element = root.querySelector('[data-box-error]');
        element.textContent = value;
        element.hidden = !value;
      };
      const currentVariant = (productId) => variants.get(activeVariants.get(String(productId)));
      const cap = (variant) => Math.min(boxSize, variant.max ?? Infinity, variant.inventoryCap ?? Infinity);
      const nextQty = (variant, delta) => {
        const current = selections.get(String(variant.id)) || 0;
        const increment = Math.max(1, Number(variant.increment) || 1);
        const minimum = Math.max(1, Number(variant.min) || 1);
        if (delta < 0) return current <= minimum ? 0 : Math.max(minimum, current - increment);
        return current === 0 ? minimum : current + increment;
      };
      const canAdd = (variant) => {
        if (!variant || !variant.available || variant.product.requiresSellingPlan || busy) return false;
        const current = selections.get(String(variant.id)) || 0;
        const next = nextQty(variant, 1);
        return next <= cap(variant) && count() - current + next <= boxSize;
      };
      const changeQty = (variantId, delta) => {
        const variant = variants.get(String(variantId));
        if (!variant || busy || mode !== 'one-time') return;
        if (delta > 0 && !canAdd(variant)) return;
        const next = nextQty(variant, delta);
        if (next > 0) selections.set(String(variantId), next);
        else selections.delete(String(variantId));
        error();
        update();
      };
      const selectionName = (variant) => variant.name === 'Default Title' ? variant.product.name : `${variant.product.name} · ${variant.name}`;
      const quantityButton = (variant, delta) => {
        const button = node('button', 'w-7 h-7 border border-white/15 text-white/40 hover:border-[#F5B300] hover:text-[#F5B300] disabled:opacity-20', delta < 0 ? '−' : '+');
        button.type = 'button';
        button.dataset.boxVariantAdjust = String(variant.id);
        button.dataset.boxAdjust = String(delta);
        button.setAttribute('aria-label', label(delta < 0 ? labels.remove : labels.add, { name: selectionName(variant) }));
        button.disabled = busy || (delta > 0 && !canAdd(variant));
        return button;
      };
      const selectionLine = (variant, quantity, review) => {
        const line = node('div', 'flex items-center gap-4 px-6 py-4 border-b border-white/5');
        const imageUrl = variant.image || variant.product.image;
        if (imageUrl) {
          const image = node('img', review ? 'w-16 h-16 object-cover shrink-0 bg-[#222]' : 'w-14 h-14 object-cover shrink-0 bg-[#222]');
          image.src = imageUrl;
          image.alt = variant.product.name;
          image.width = review ? 64 : 56;
          image.height = review ? 64 : 56;
          image.loading = 'lazy';
          line.append(image);
        }
        const text = node('div', 'flex-1 min-w-0');
        text.append(node(review ? 'h3' : 'p', 'text-[13px] font-medium leading-snug mb-1', selectionName(variant)));
        text.append(node('p', 'text-[11px] text-white/35', amount(variant.price)));
        line.append(text);
        const controls = node('div', 'flex items-center gap-2 shrink-0');
        controls.append(quantityButton(variant, -1), node('span', 'font-mono text-[13px] w-5 text-center text-[#F5B300] font-bold', quantity), quantityButton(variant, 1));
        line.append(controls);
        return line;
      };
      const updateDetail = () => {
        if (!detailProduct) return;
        const product = products.get(detailProduct);
        const variant = currentVariant(detailProduct);
        setText('[data-box-dialog-name]', selectionName(variant));
        setText('[data-box-dialog-category]', product.category);
        setText('[data-box-dialog-description]', product.description);
        setText('[data-box-dialog-price]', amount(variant.price));
        const image = root.querySelector('[data-box-dialog-image]');
        const imageUrl = variant.image || product.image;
        image.hidden = !imageUrl;
        if (imageUrl) image.src = imageUrl;
        image.alt = product.name;
        root.querySelector('[data-box-dialog-link]').href = `${product.url}?variant=${variant.id}`;
        root.querySelector('[data-box-dialog-add]').disabled = !canAdd(variant);
      };
      const update = () => {
        const selectedCount = count();
        const selectedTotal = total();
        root.dataset.boxSize = String(boxSize);
        root.dataset.boxSizeLabel = boxLabel;
        setText('[data-box-count]', selectedCount);
        setText('[data-box-size-display]', boxSize);
        setText('[data-box-total]', amount(selectedTotal));
        setText('[data-box-average]', selectedCount ? amount(Math.round(selectedTotal / selectedCount)) : '—');
        setText('[data-box-remaining]', selectedCount === boxSize ? labels.complete : label(labels.remaining, { count: boxSize - selectedCount }));
        root.querySelector('[data-box-progress]').setAttribute('aria-valuenow', selectedCount);
        root.querySelector('[data-box-progress]').setAttribute('aria-valuemax', boxSize);
        root.querySelector('[data-box-progress-fill]').style.width = `${Math.min(100, selectedCount / boxSize * 100)}%`;
        const pips = root.querySelector('[data-box-pips]');
        pips.replaceChildren(...Array.from({ length: boxSize }, (_, index) => node('span', index < selectedCount ? 'flex-1 h-0.5 bg-[#F5B300]' : 'flex-1 h-0.5 bg-white/8')));
        root.querySelectorAll('[data-box-step]').forEach((button) => {
          const key = button.dataset.boxStep;
          if (key === step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
          button.disabled = busy || (key === 'select' && mode !== 'one-time') || (key === 'review' && (selectedCount !== boxSize || mode !== 'one-time'));
        });
        root.querySelector('[data-box-review]').disabled = selectedCount !== boxSize || busy;
        root.querySelector('[data-box-add]').disabled = selectedCount !== boxSize || busy;
        root.querySelectorAll('[data-box-card]').forEach((card) => {
          const productId = card.dataset.boxCard;
          const variant = currentVariant(productId);
          const quantity = selections.get(String(variant.id)) || 0;
          card.dataset.selected = quantity > 0 ? 'true' : 'false';
          card.querySelector('[data-box-quantity]').textContent = quantity;
          const badge = card.querySelector('[data-box-badge]');
          badge.textContent = quantity;
          badge.hidden = quantity === 0;
          card.querySelector('[data-box-meal-price]').textContent = amount(variant.price);
          card.querySelector('[data-box-adjust="-1"]').disabled = quantity === 0 || busy;
          card.querySelector('[data-box-adjust="1"]').disabled = !canAdd(variant);
          card.querySelector('[data-box-meal-status]').textContent = variant.product.requiresSellingPlan ? labels.planRequired : !variant.available ? labels.soldOut : quantity >= cap(variant) ? labels.limit : '';
        });
        const summary = root.querySelector('[data-box-summary]');
        const review = root.querySelector('[data-box-review-lines]');
        if (!selections.size) summary.replaceChildren(node('p', 'text-center text-white/25 text-[13px] px-6 py-16 whitespace-pre-line', labels.empty));
        else summary.replaceChildren(...[...selections].map(([id, qty]) => selectionLine(variants.get(id), qty, false)));
        review.replaceChildren(...[...selections].map(([id, qty]) => selectionLine(variants.get(id), qty, true)));
        const macroPanel = root.querySelector('[data-box-macros]');
        macroPanel.replaceChildren(node('p', 'text-[10px] text-white/30 uppercase tracking-[0.2em] mb-3', labels.macros));
        const macroKeys = ['protein', 'carbs', 'fat', 'calories'];
        const completeNutrition = selections.size > 0 && [...selections.keys()].every((id) => macroKeys.every((key) => variants.get(id).product.nutrition[key] !== null));
        if (completeNutrition) {
          const grid = node('div', 'grid grid-cols-2 gap-2');
          macroKeys.forEach((key) => {
            const sum = [...selections].reduce((value, [id, qty]) => value + Number(variants.get(id).product.nutrition[key]) * qty, 0);
            const cell = node('div');
            cell.append(node('p', 'font-mono text-[12px] text-[#F5B300]', `${Math.round(sum * 10) / 10}${key === 'calories' ? '' : 'g'}`), node('p', 'text-[10px] text-white/25 mt-0.5', labels[key]));
            grid.append(cell);
          });
          macroPanel.append(grid);
        } else macroPanel.append(node('p', 'text-white/40 text-[12px]', labels.nutritionMissing));
        updateDetail();
      };
      const showStep = (next) => {
        if (busy || (next !== 'size' && mode !== 'one-time') || (next === 'review' && count() !== boxSize)) return;
        step = next;
        root.querySelectorAll('[data-box-panel]').forEach((panel) => { panel.hidden = panel.dataset.boxPanel !== next; });
        update();
        const heading = root.querySelector(`[data-box-panel="${next}"] [data-box-panel-heading]`);
        heading?.focus({ preventScroll: true });
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      const setMode = (next) => {
        mode = next;
        root.querySelectorAll('[data-box-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.boxMode === next)));
        root.querySelector('[data-box-subscription]').hidden = next !== 'subscription';
        root.querySelectorAll('[data-box-one-time]').forEach((element) => { element.hidden = next !== 'one-time'; });
        root.dataset.purchaseMode = next;
        update();
      };
      const submit = async () => {
        if (busy || mode !== 'one-time') return;
        if (count() !== boxSize) { error(label(labels.choose, { count: boxSize })); return; }
        if ([...selections].some(([id, qty]) => { const variant = variants.get(id); return !variant.available || variant.product.requiresSellingPlan || qty > cap(variant); })) { error(labels.error); return; }
        busy = true;
        error();
        status(labels.adding);
        update();
        const group = globalThis.crypto?.randomUUID?.() || `box-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const items = [...selections].map(([id, quantity]) => ({ id: Number(id), quantity, properties: { 'Box': boxLabel, 'Box size': String(boxSize), 'Order type': 'One-time', '_pm_box_group': group } }));
        try {
          const response = await fetch(config.cartAddUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ items }) });
          const data = await response.json();
          if (!response.ok || data.status) {
            const failure = new Error(typeof data.description === 'string' ? data.description : typeof data.message === 'string' ? data.message : labels.error);
            failure.nativeCartError = true;
            throw failure;
          }
          selections.clear();
          busy = false;
          showStep('size');
          status(labels.added);
          document.dispatchEvent(new CustomEvent('pm:cart-refresh', { detail: { source: 'box-builder' } }));
          document.dispatchEvent(new CustomEvent('pm:cart-open', { detail: { source: 'box-builder' } }));
        } catch (failure) {
          status('');
          error(failure.nativeCartError ? failure.message : labels.error);
          document.dispatchEvent(new CustomEvent('pm:cart-refresh', { detail: { source: 'box-builder' } }));
        } finally { busy = false; update(); }
      };
      const filters = root.querySelector('[data-box-filters]');
      const categories = [...new Set(config.products.map((product) => product.category).filter(Boolean))];
      categories.forEach((category) => {
        const button = node('button', 'pm-box-filter px-4 py-2.5 text-[11px] tracking-[0.18em] uppercase font-medium whitespace-nowrap border border-white/12', category);
        button.type = 'button';
        button.dataset.boxFilter = category;
        button.setAttribute('aria-pressed', 'false');
        filters.append(button);
      });
      root.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button || button.disabled || !root.contains(button)) return;
        if (button.dataset.boxSize) {
          const newSize = Number(button.dataset.boxSize);
          if (count() > newSize) { selections.clear(); status(labels.sizeReset); }
          boxSize = newSize;
          boxLabel = button.dataset.boxSizeLabel;
          sizes.forEach((size) => { const active = size === button; size.setAttribute('aria-pressed', String(active)); size.querySelector('[data-box-size-check]').hidden = !active; });
          update();
        } else if (button.dataset.boxMode) setMode(button.dataset.boxMode);
        else if (button.dataset.boxFrequency) {
          root.dataset.deliveryFrequency = button.dataset.boxFrequency;
          root.querySelectorAll('[data-box-frequency]').forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
        } else if (button.dataset.boxFilter) {
          const filter = button.dataset.boxFilter;
          root.querySelectorAll('[data-box-filter]').forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
          root.querySelectorAll('[data-box-card]').forEach((card) => { card.hidden = filter !== 'all' && products.get(card.dataset.boxCard).category !== filter; });
        } else if (button.hasAttribute('data-box-next')) showStep('select');
        else if (button.hasAttribute('data-box-review')) showStep('review');
        else if (button.dataset.boxBack) showStep(button.dataset.boxBack);
        else if (button.dataset.boxStep) showStep(button.dataset.boxStep);
        else if (button.dataset.boxAdjust) changeQty(button.dataset.boxVariantAdjust || activeVariants.get(button.dataset.boxProduct), Number(button.dataset.boxAdjust));
        else if (button.dataset.boxDetail) { detailProduct = button.dataset.boxDetail; updateDetail(); dialog.showModal(); }
        else if (button.hasAttribute('data-box-close')) dialog.close();
        else if (button.hasAttribute('data-box-dialog-add')) changeQty(activeVariants.get(detailProduct), 1);
        else if (button.hasAttribute('data-box-add')) submit();
      });
      root.addEventListener('change', (event) => {
        const select = event.target.closest('[data-box-variant]');
        if (!select || busy) return;
        activeVariants.set(select.dataset.boxVariant, String(select.value));
        update();
      });
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
      });
      root.dataset.purchaseMode = 'one-time';
      root.dataset.deliveryFrequency = 'weekly';
      update();
    });
  };
  if (!window.pmBoxBuilderInit) {
    window.pmBoxBuilderInit = init;
    document.addEventListener('shopify:section:load', (event) => init(event.target));
  }
  window.pmBoxBuilderInit();
})();
