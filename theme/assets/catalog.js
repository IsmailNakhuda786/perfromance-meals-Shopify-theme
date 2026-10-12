import { recurringPlans, resolvePurchase } from './catalog-purchase.js?v=8807ca567342';

(() => {
  if (window.pmCatalogInitialized) return;
  window.pmCatalogInitialized = true;
  const models = new WeakMap();
  const previousFocus = new WeakMap();

  function changePurchase(container, rebuildPlans = false) {
    const model = models.get(container);
    if (!model) return;
    const form = container.querySelector('[data-product-form]');
    const variantSelect = form?.querySelector('[data-variant-select]');
    const variant = model.variants.find((item) => String(item.id) === variantSelect?.value);
    if (!variant) return;
    const planSelect = form.querySelector('[data-selling-plan-select]');
    if (model.purchaseMode !== 'subscription') {
      form.querySelectorAll('[name="selling_plan"]').forEach((element) => element.remove());
    }
    if (planSelect && model.purchaseMode === 'subscription' && rebuildPlans) {
      const previousPlan = planSelect.value;
      planSelect.replaceChildren();
      const plans = model.prepaidTermRequired && model.prepaidTermVerified !== true ? [] : recurringPlans(variant);
      plans.forEach((plan) => planSelect.add(new Option(`${plan.name} — ${plan.price}`, String(plan.id))));
      if (plans.some((plan) => String(plan.id) === previousPlan)) {
        planSelect.value = previousPlan;
      } else {
        planSelect.value = plans.length ? String(plans[0].id) : '';
      }
      planSelect.disabled = plans.length === 0;
      planSelect.required = true;
      const wrapper = container.querySelector('[data-selling-plan-wrapper]');
      if (wrapper) wrapper.hidden = false;
    }
    if (Array.isArray(variant.contents)) {
      const imageFor = (item, className) => { const image = document.createElement('img'); image.src = item.image; image.alt = item.name; image.loading = 'lazy'; image.className = className; return image; };
      container.querySelectorAll('[data-bundle-contents]').forEach(list => {
        list.replaceChildren(...variant.contents.map(item => {
          const row = document.createElement('li'); row.className = 'flex items-center gap-2 text-[11px] text-white/60';
          const name = document.createElement('span'); name.className = 'flex-1'; name.textContent = item.name;
          const quantity = document.createElement('span'); quantity.className = 'font-mono text-white/40'; quantity.textContent = `×${item.quantity}`;
          row.append(name, quantity); return row;
        }));
      });
      container.querySelectorAll('[data-bundle-preview]').forEach(preview => preview.replaceChildren(...variant.contents.slice(0, 3).filter(item => item.image).map(item => {
        const cell = document.createElement('div'); cell.className = 'flex-1 min-w-0'; cell.append(imageFor(item, 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500')); return cell;
      })));
      container.querySelectorAll('[data-bundle-gallery]').forEach(gallery => gallery.replaceChildren(...variant.contents.map(item => {
        const link = document.createElement('a'); link.href = item.url; link.className = 'shrink-0 w-32';
        if (item.image) link.append(imageFor(item, 'w-full h-24 object-cover'));
        const label = document.createElement('p'); label.className = 'text-[11px] text-white/60 mt-2'; label.textContent = `${item.name} ×${item.quantity}`; link.append(label); return link;
      })));
      container.querySelectorAll('[data-variant-highlights]').forEach(list => list.replaceChildren(...(variant.highlights || []).map(value => { const row = document.createElement('li'); row.textContent = `✓ ${value}`; return row; })));
    }
    const lineTotal = container.querySelector('[data-product-line-total]');
    if (lineTotal && model.purchaseMode === 'single' && Number.isFinite(variant.priceAmount)) {
      const quantity = Number(form.querySelector('[name="quantity"]')?.value || 1);
      lineTotal.textContent = new Intl.NumberFormat(model.locale || 'en', {style: 'currency', currency: model.currency}).format(variant.priceAmount * quantity / 100);
    }
    const purchase = resolvePurchase(model, variant, planSelect?.value);
    const plan = purchase.plan;
    const price = purchase;
    container.querySelectorAll('[data-price]').forEach((element) => { element.textContent = price.price; });
    container.querySelectorAll('[data-compare-price]').forEach((element) => {
      element.textContent = price.comparePrice || '';
      element.hidden = !price.comparePrice;
    });
    const description = container.querySelector('[data-plan-description]');
    if (description) description.textContent = plan?.description || '';
    const button = form.querySelector('[data-add-button]');
    if (button) {
      button.disabled = !purchase.canSubmit;
      button.textContent = purchase.available ? button.dataset.addLabel : button.dataset.unavailableLabel;
    }
    container.querySelectorAll('[data-per-meal-price]').forEach((element) => { element.textContent = purchase.perMealPrice || ''; });
    const perMeal = container.querySelector('[data-per-meal-wrapper]');
    if (perMeal) perMeal.hidden = !purchase.perMealPrice;
    const unavailable = container.querySelector('[data-subscription-unavailable]');
    if (unavailable) unavailable.hidden = purchase.available;
    const login = container.querySelector('[data-subscription-login]');
    if (login) {
      login.setAttribute('aria-disabled', String(!purchase.available));
      if (purchase.available) {
        const destination = new URL(model.productUrl, window.location.origin);
        destination.searchParams.set('variant', String(variant.id));
        if (plan) destination.searchParams.set('selling_plan', String(plan.id));
        const url = new URL(model.loginUrl, window.location.origin);
        url.searchParams.set('return_url', destination.pathname + destination.search);
        login.href = url.pathname + url.search;
      } else login.removeAttribute('href');
    }
    const quantity = form.querySelector('[name="quantity"]');
    if (quantity) {
      quantity.min = String(variant.quantityMin || 1);
      quantity.step = String(variant.quantityStep || 1);
      if (variant.quantityMax) quantity.max = String(variant.quantityMax);
      else quantity.removeAttribute('max');
      const minimum = Number(quantity.min);
      const maximum = Number(quantity.max) || Infinity;
      const step = Number(quantity.step);
      const existing = Math.max(minimum, Number(quantity.value) || minimum);
      quantity.value = String(Math.min(maximum, minimum + Math.floor((existing - minimum) / step) * step));
    }
    if (variant.image) {
      const image = container.querySelector('[data-product-image]');
      if (image) {
        image.src = variant.image;
        image.removeAttribute('srcset');
      }
    }
    if (container.hasAttribute('data-update-url')) {
      const url = new URL(window.location.href);
      url.searchParams.set('variant', String(variant.id));
      if (plan) url.searchParams.set('selling_plan', String(plan.id));
      else url.searchParams.delete('selling_plan');
      window.history.replaceState({}, '', url);
    }
  }

  function selectTab(tabset, name, focus = false) {
    const tabs = Array.from(tabset.querySelectorAll('[data-product-tab]'));
    tabs.forEach((tab) => {
      const selected = tab.dataset.productTab === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle('border-[#F5B300]', selected);
      tab.classList.toggle('text-[#F5B300]', selected);
      tab.classList.toggle('border-transparent', !selected);
      tab.classList.toggle('text-white/40', !selected);
      if (focus && selected) tab.focus();
    });
    tabset.querySelectorAll('[data-product-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.productPanel !== name;
    });
  }

  function init(scope = document) {
    scope.querySelectorAll('[data-product-purchase]').forEach((container) => {
      if (models.has(container)) return;
      const json = container.querySelector('[data-variants]');
      if (!json) return;
      try { models.set(container, JSON.parse(json.textContent)); }
      catch { return; }
      changePurchase(container, true);
    });
    scope.querySelectorAll('[data-catalog-plan-name]').forEach((select) => {
      if (select.dataset.bound) return;
      select.dataset.bound = 'true';
      const names = new Set();
      select.closest('[data-purchase-mode="subscription"]')?.querySelectorAll('[data-product-purchase]').forEach((container) => {
        const model = models.get(container);
        if (model?.hasContents && (!model.prepaidTermRequired || model.prepaidTermVerified === true)) model.variants.forEach((variant) => recurringPlans(variant).forEach((plan) => names.add(plan.name)));
      });
      names.forEach((name) => select.add(new Option(name, name)));
      select.closest('[data-subscription-terms]').hidden = names.size === 0;
    });
    scope.querySelectorAll('[data-product-tabs]').forEach((tabset) => {
      if (tabset.classList.contains('pm-tabs-ready')) return;
      tabset.classList.add('pm-tabs-ready');
      const nav = tabset.querySelector('nav');
      nav?.setAttribute('role', 'tablist');
      tabset.querySelectorAll('[data-product-tab]').forEach((tab) => {
        tab.setAttribute('role', 'tab');
        tab.id = `Tab-${tab.dataset.productTab}-${tab.getAttribute('href').slice(1)}`;
        tab.setAttribute('aria-controls', tab.getAttribute('href').slice(1));
        const panel = document.getElementById(tab.getAttribute('href').slice(1));
        if (panel) {
          panel.setAttribute('role', 'tabpanel');
          panel.setAttribute('aria-labelledby', tab.id);
          panel.tabIndex = 0;
        }
      });
      const hashTab = Array.from(tabset.querySelectorAll('[data-product-tab]')).find((tab) => tab.getAttribute('href') === window.location.hash);
      selectTab(tabset, hashTab?.dataset.productTab || 'overview');
    });
    scope.querySelectorAll('[data-quick-dialog]').forEach((dialog) => {
      if (dialog.dataset.bound) return;
      dialog.dataset.bound = 'true';
      dialog.addEventListener('close', () => {
        previousFocus.get(dialog)?.focus();
      });
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
      });
    });
  }

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof Element) || !form.matches('[data-product-form]')) return;
    if (form.dataset.purchaseMode !== 'subscription') {
      form.querySelectorAll('[name="selling_plan"]').forEach((element) => element.remove());
      return;
    }
    const container = form.closest('[data-product-purchase]');
    const model = models.get(container);
    const variant = model?.variants.find((item) => String(item.id) === form.querySelector('[name="id"]').value);
    const purchase = model && resolvePurchase(model, variant, form.querySelector('[name="selling_plan"]')?.value);
    if (!purchase?.canSubmit) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const error = form.querySelector('[data-form-error]');
      if (error) { error.hidden = false; error.textContent = model?.unavailablePrice || ''; }
    }
  }, true);

  document.addEventListener('change', (event) => {
    if (!(event.target instanceof Element)) return;
    const purchase = event.target.closest('[data-product-purchase]');
    if (purchase && event.target.matches('[data-variant-select]')) changePurchase(purchase, true);
    if (purchase && event.target.matches('[data-selling-plan-select], [name="quantity"]')) changePurchase(purchase);
    if (event.target.matches('[data-catalog-plan-name]')) {
      const name = event.target.value;
      event.target.closest('[data-purchase-mode="subscription"]')?.querySelectorAll('[data-product-purchase]').forEach((container) => {
        const model = models.get(container);
        const form = container.querySelector('[data-product-form]');
        const variant = model?.variants.find((item) => String(item.id) === form.querySelector('[data-variant-select]').value);
        const selected = recurringPlans(variant).find((plan) => plan.name === name);
        const select = form.querySelector('[data-selling-plan-select]');
        if (select) select.value = selected ? String(selected.id) : '';
        changePurchase(container);
      });
    }
    if (event.target.matches('[data-catalog-sort]')) event.target.closest('form')?.requestSubmit();
  });

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest('[data-quick-view]');
    if (trigger) {
      const dialog = document.getElementById(trigger.dataset.quickView);
      if (dialog instanceof HTMLDialogElement) {
        event.preventDefault();
        previousFocus.set(dialog, trigger);
        dialog.showModal();
      }
    }
    const close = event.target.closest('[data-dialog-close]');
    if (close) close.closest('dialog')?.close();
    const quantityButton = event.target.closest('[data-quantity-step]');
    if (quantityButton) {
      const input = quantityButton.closest('form')?.querySelector('[name="quantity"]');
      if (input) {
        if (Number(quantityButton.dataset.quantityStep) < 0) input.stepDown();
        else input.stepUp();
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    const thumbnail = event.target.closest('[data-product-thumbnail]');
    if (thumbnail) {
      const image = thumbnail.closest('[data-product-purchase]')?.querySelector('[data-product-image]');
      if (image) {
        image.src = thumbnail.dataset.productThumbnail;
        image.removeAttribute('srcset');
      }
    }
    const tab = event.target.closest('[data-product-tab]');
    if (tab) {
      event.preventDefault();
      selectTab(tab.closest('[data-product-tabs]'), tab.dataset.productTab);
    }
    const reviewLink = event.target.closest('[data-open-product-tab]');
    if (reviewLink) {
      const tabset = reviewLink.closest('[data-product-section]')?.querySelector('[data-product-tabs]');
      if (tabset) selectTab(tabset, reviewLink.dataset.openProductTab);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!(event.target instanceof Element)) return;
    const active = event.target.closest('[data-product-tab]');
    if (!active || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabset = active.closest('[data-product-tabs]');
    const tabs = Array.from(tabset.querySelectorAll('[data-product-tab]'));
    let index = tabs.indexOf(active);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = tabs.length - 1;
    else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectTab(tabset, tabs[index].dataset.productTab, true);
  });

  document.addEventListener('shopify:section:load', (event) => init(event.target));
  document.addEventListener('shopify:block:select', (event) => {
    const panel = event.target.closest('[data-product-panel]');
    if (panel) selectTab(panel.closest('[data-product-tabs]'), panel.dataset.productPanel);
  });
  document.addEventListener('pm:cart-updated', () => {
    document.querySelectorAll('[data-quick-dialog][open]').forEach((dialog) => dialog.close());
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
})();
