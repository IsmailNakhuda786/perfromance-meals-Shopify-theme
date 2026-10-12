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
    if (planSelect && rebuildPlans) {
      const previousPlan = planSelect.value;
      planSelect.replaceChildren();
      if (!model.requiresSellingPlan) planSelect.add(new Option(model.oneTimeLabel, ''));
      variant.plans.forEach((plan) => planSelect.add(new Option(`${plan.name} — ${plan.price}`, String(plan.id))));
      if (variant.plans.some((plan) => String(plan.id) === previousPlan)) {
        planSelect.value = previousPlan;
      } else if (model.requiresSellingPlan) {
        planSelect.value = variant.plans.length ? String(variant.plans[0].id) : '';
      } else {
        planSelect.value = '';
      }
      planSelect.disabled = variant.plans.length === 0;
      planSelect.required = model.requiresSellingPlan;
      const wrapper = container.querySelector('[data-selling-plan-wrapper]');
      if (wrapper) wrapper.hidden = variant.plans.length === 0 && !model.requiresSellingPlan;
    }
    const plan = variant.plans.find((item) => String(item.id) === planSelect?.value);
    const price = plan || variant;
    container.querySelectorAll('[data-price]').forEach((element) => { element.textContent = price.price; });
    container.querySelectorAll('[data-compare-price]').forEach((element) => {
      element.textContent = price.comparePrice || '';
      element.hidden = !price.comparePrice;
    });
    const description = container.querySelector('[data-plan-description]');
    if (description) description.textContent = plan?.description || '';
    const button = form.querySelector('[data-add-button]');
    if (button) {
      const available = variant.available && (!model.requiresSellingPlan || Boolean(plan));
      button.disabled = !available;
      button.textContent = available ? button.dataset.addLabel : button.dataset.unavailableLabel;
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

  document.addEventListener('change', (event) => {
    if (!(event.target instanceof Element)) return;
    const purchase = event.target.closest('[data-product-purchase]');
    if (purchase && event.target.matches('[data-variant-select]')) changePurchase(purchase, true);
    if (purchase && event.target.matches('[data-selling-plan-select]')) changePurchase(purchase);
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
