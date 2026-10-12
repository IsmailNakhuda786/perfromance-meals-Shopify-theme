(() => {
  const initialize = (scope = document) => {
    scope.querySelectorAll('[data-meal-plan-builder]').forEach((root) => {
      if (root.dataset.initialized === 'true') return;
      const json = root.querySelector('[data-meal-plan-config]');
      if (!json) return;
      let config;
      try { config = JSON.parse(json.textContent); } catch { return; }
      root.dataset.initialized = 'true';
      const labels = config.labels;
      const programmes = new Map(config.programmes.map((programme) => [String(programme.id), programme]));
      const goal = new URLSearchParams(window.location.search).get('goal');
      const productHandle = new URLSearchParams(window.location.search).get('product');
      let programmeId = String(config.programmes.find((programme) => productHandle && programme.handle === productHandle)?.id || config.programmes.find((programme) => goal && programme.goal === goal)?.id || config.programmes[0]?.id || '');
      let variantId = '';
      let sellingPlanId = '';
      let step = 1;
      let activeWeekId = '';
      let busy = false;
      let selections = {};
      const openedWindows = new Set();
      const serverStart = Number(config.now) || Date.now();
      const elapsedStart = performance.now();
      const now = () => serverStart + performance.now() - elapsedStart;
      const storageKey = `pm:meal-plan-builder:${root.dataset.sectionId}`;
      const element = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      };
      const text = (selector, value) => root.querySelectorAll(selector).forEach((node) => { node.textContent = value; });
      const interpolate = (value, replacements) => Object.entries(replacements).reduce((string, [key, replacement]) => string.replaceAll(`__${key}__`, String(replacement)), value || '');
      const money = (value) => {
        try { return new Intl.NumberFormat(config.locale, { style: 'currency', currency: config.currency }).format(value / 100); }
        catch { return `${(value / 100).toFixed(2)} ${config.currency}`; }
      };
      const calendarDate = (value) => {
        const date = new Date(`${value}T12:00:00Z`);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(config.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
      };
      const programme = () => programmes.get(programmeId);
      const variant = () => programme()?.variants.find((value) => String(value.id) === variantId);
      const allocation = () => variant()?.plans.find((value) => String(value.id) === sellingPlanId);
      const needsPlan = () => programme()?.kind === 'recurring' || programme()?.requiresSellingPlan;
      const purchasable = (item, product = programme()) => item.available && Number(item.quantityMin) <= 1 && Number(item.quantityIncrement) === 1 && (!(product.kind === 'recurring' || product.requiresSellingPlan) || item.plans.length > 0);
      const initializeVariant = () => {
        const product = programme();
        const chosen = product?.variants.find((value) => purchasable(value, product)) || product?.variants[0];
        variantId = chosen ? String(chosen.id) : '';
        sellingPlanId = needsPlan() && chosen?.plans[0] ? String(chosen.plans[0].id) : '';
      };
      initializeVariant();
      const persist = () => {
        try { sessionStorage.setItem(storageKey, JSON.stringify({ programmeId, variantId, sellingPlanId, selections, step })); } catch {}
      };
      const restore = () => {
        let saved;
        try { saved = JSON.parse(sessionStorage.getItem(storageKey)); } catch { return; }
        if (!saved || !programmes.has(String(saved.programmeId))) return;
        if (productHandle && programmes.get(String(saved.programmeId)).handle !== productHandle) return;
        const savedProgramme = programmes.get(String(saved.programmeId));
        const savedVariant = savedProgramme.variants.find((value) => String(value.id) === String(saved.variantId));
        if (!savedVariant) return;
        programmeId = String(saved.programmeId);
        variantId = String(saved.variantId);
        sellingPlanId = savedVariant.plans.some((value) => String(value.id) === String(saved.sellingPlanId)) ? String(saved.sellingPlanId) : needsPlan() && savedVariant.plans[0] ? String(savedVariant.plans[0].id) : '';
        if (saved.selections && typeof saved.selections === 'object') selections = saved.selections;
        if (config.loggedIn && saved.step >= 4) step = 4;
      };
      restore();
      const planReady = () => {
        const product = programme();
        const item = variant();
        return !!product && !!item && purchasable(item, product) && (!needsPlan() || !!allocation()) && Number.isInteger(Number(item.mealsPerDay)) && Number(item.mealsPerDay) > 0 && Number.isInteger(Number(product.menuWeeks)) && Number(product.menuWeeks) > 0;
      };
      const eligibleWeeks = () => {
        const product = programme();
        if (!product) return [];
        return config.weeks.filter((week) => week.id && week.label && /^\d{4}-\d{2}-\d{2}$/.test(week.startsOn || '') && /^\d{4}-\d{2}-\d{2}$/.test(week.endsOn || '') && Number.isFinite(Date.parse(week.cutoffAt)) && Date.parse(week.cutoffAt) > now() && (!week.programmes.length || week.programmes.some((id) => String(id) === String(product.productId))) && week.windows.length && week.windows.every((window) => window.key && window.label && Number.isInteger(Number(window.days)) && Number(window.days) > 0 && window.meals.length)).sort((left, right) => left.startsOn.localeCompare(right.startsOn)).slice(0, Number(product.menuWeeks));
      };
      const weekSelections = (weekId, windowKey) => selections[weekId]?.[windowKey] || {};
      const entitlement = (window) => Number(window.days) * Number(variant()?.mealsPerDay || 0);
      const selectedCount = (weekId, window) => window.meals.reduce((sum, meal) => sum + Number(weekSelections(weekId, window.key)[String(meal.id)] || 0), 0);
      const validWindow = (week, window) => {
        const values = weekSelections(week.id, window.key);
        return selectedCount(week.id, window) === entitlement(window) && Object.entries(values).every(([id, quantity]) => Number.isInteger(quantity) && quantity > 0 && window.meals.some((meal) => String(meal.id) === id && meal.available));
      };
      const menuReady = () => {
        const weeks = eligibleWeeks();
        return planReady() && weeks.length === Number(programme().menuWeeks) && weeks.every((week) => week.windows.every((window) => validWindow(week, window)));
      };
      const showError = (message = '') => {
        const node = root.querySelector('[data-plan-error]');
        node.textContent = message;
        node.hidden = !message;
      };
      const resetMenu = () => {
        selections = {};
        activeWeekId = '';
        openedWindows.clear();
        text('[data-plan-status]', labels.menuChanged);
      };
      const choice = (label, selected) => {
        const button = element('button', 'pm-plan-choice relative w-full text-left flex items-center gap-4 px-5 py-4 border-2 border-[#E8E4DC] bg-white hover:border-[#C0BAB0] transition-all');
        button.type = 'button';
        button.setAttribute('aria-pressed', String(selected));
        button.append(element('span', 'flex-1 min-w-0 font-bold text-[15px]', label), element('span', 'pm-plan-check shrink-0 w-5 h-5 rounded-full border-2 border-[#D0CCC4] flex items-center justify-center text-white text-[10px]', '✓'));
        return button;
      };
      const renderOptions = () => {
        const wrapper = root.querySelector('[data-plan-options]');
        wrapper.replaceChildren();
        const product = programme();
        const current = variant();
        if (!product || !current) return;
        product.options.forEach((name, index) => {
          if (product.options.length === 1 && name === 'Title' && product.variants.length === 1 && current.name === 'Default Title') return;
          const fieldset = element('fieldset');
          fieldset.append(element('legend', 'text-[10px] font-extrabold tracking-[0.3em] uppercase text-[#888] mb-3', name));
          const values = [...new Set(product.variants.map((item) => item.options[index]))];
          const grid = element('div', index === 1 ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid grid-cols-1 gap-2');
          values.forEach((value) => {
            const button = choice(value, current.options[index] === value);
            button.dataset.planOptionIndex = String(index);
            button.dataset.planOptionValue = value;
            button.disabled = busy || !product.variants.some((item) => item.options[index] === value && purchasable(item, product));
            const matched = product.variants.find((item) => item.options[index] === value && item.options.every((option, optionIndex) => optionIndex === index || option === current.options[optionIndex]));
            if (matched) {
              const price = needsPlan() ? matched.plans.find((plan) => String(plan.id) === sellingPlanId)?.price ?? matched.plans[0]?.price : matched.price;
              if (price !== undefined) button.insertBefore(element('span', 'text-[13px] font-extrabold text-[#E85D04]', money(price)), button.lastElementChild);
            }
            grid.append(button);
          });
          fieldset.append(grid);
          wrapper.append(fieldset);
        });
        const select = root.querySelector('[data-plan-selling-plan]');
        select.replaceChildren();
        root.querySelector('[data-plan-selling-plan-wrapper]').hidden = !needsPlan();
        if (needsPlan()) current.plans.forEach((plan) => {
          const option = element('option', '', `${plan.name} · ${money(plan.price)}`);
          option.value = String(plan.id);
          option.selected = String(plan.id) === sellingPlanId;
          select.append(option);
        });
        select.disabled = busy || !current.plans.length;
        text('[data-plan-billing-description]', allocation()?.description || '');
        const error = root.querySelector('[data-plan-configuration-error]');
        const message = !current.available ? labels.soldOut : needsPlan() && !allocation() ? labels.noAllocation : !planReady() ? labels.configuration : '';
        error.textContent = message;
        error.hidden = !message;
      };
      const changeMeal = (weekId, key, mealId, delta) => {
        if (busy || !planReady()) return;
        const week = eligibleWeeks().find((value) => value.id === weekId);
        const window = week?.windows.find((value) => value.key === key);
        const meal = window?.meals.find((value) => String(value.id) === String(mealId));
        if (!week || !window || !meal || !meal.available) return;
        const quantities = { ...weekSelections(week.id, window.key) };
        const current = Number(quantities[String(meal.id)] || 0);
        if (delta > 0 && selectedCount(week.id, window) >= entitlement(window)) return;
        const quantity = Math.max(0, current + delta);
        if (quantity) quantities[String(meal.id)] = quantity; else delete quantities[String(meal.id)];
        selections = { ...selections, [week.id]: { ...(selections[week.id] || {}), [window.key]: quantities } };
        showError();
        render();
      };
      const mealCard = (week, window, meal) => {
        const count = Number(weekSelections(week.id, window.key)[String(meal.id)] || 0);
        const card = element('article', 'pm-plan-meal relative overflow-hidden border-2 border-[#E8E4DC] bg-white');
        card.dataset.selected = count > 0 ? 'true' : 'false';
        const imageWrapper = element('div', 'relative h-28 overflow-hidden bg-[#F4F2EE]');
        if (meal.image) {
          const image = element('img', 'w-full h-full object-cover');
          image.src = meal.image;
          image.alt = meal.name;
          image.width = 300;
          image.height = 150;
          image.loading = 'lazy';
          imageWrapper.append(image);
        }
        if (count > 0) imageWrapper.append(element('span', 'absolute top-2 right-2 w-7 h-7 bg-[#E85D04] rounded-full flex items-center justify-center font-bold text-white text-[13px]', count));
        card.append(imageWrapper);
        const body = element('div', 'p-2.5');
        body.append(element('h3', 'font-semibold text-[11px] leading-tight', meal.name));
        const facts = [];
        if (meal.calories !== null) facts.push(`${meal.calories} kcal`);
        if (meal.protein !== null) facts.push(`P ${meal.protein}g`);
        if (facts.length) body.append(element('p', 'text-[9px] text-[#888] mt-1', facts.join(' · ')));
        const controls = element('div', 'flex items-center justify-between mt-3');
        [-1, 1].forEach((delta) => {
          const button = element('button', 'w-8 h-8 border border-[#D0CCC4] text-[#E85D04] font-bold disabled:opacity-30', delta < 0 ? '−' : '+');
          button.type = 'button';
          button.dataset.planMeal = String(meal.id);
          button.dataset.planMealWeek = week.id;
          button.dataset.planMealWindow = window.key;
          button.dataset.planMealDelta = String(delta);
          button.setAttribute('aria-label', interpolate(delta < 0 ? labels.removeMeal : labels.addMeal, { name: meal.name }));
          button.disabled = busy || !meal.available || (delta < 0 ? count === 0 : selectedCount(week.id, window) >= entitlement(window));
          controls.append(button);
          if (delta < 0) controls.append(element('span', 'text-[12px] font-mono', count));
        });
        body.append(controls);
        if (!meal.available) body.append(element('p', 'text-[10px] text-[#888] mt-2', labels.soldOut));
        card.append(body);
        return card;
      };
      const renderMenu = () => {
        const weeks = eligibleWeeks();
        const buttons = root.querySelector('[data-plan-weeks]');
        const windows = root.querySelector('[data-plan-windows]');
        const progress = root.querySelector('[data-plan-menu-progress]');
        buttons.replaceChildren();
        windows.replaceChildren();
        progress.replaceChildren();
        const missing = !planReady() || weeks.length !== Number(programme()?.menuWeeks || 0);
        root.querySelector('[data-plan-no-menu]').hidden = !missing;
        if (!weeks.length) return;
        if (!weeks.some((week) => week.id === activeWeekId)) activeWeekId = weeks[0].id;
        weeks.forEach((week) => {
          const button = element('button', 'pm-plan-week flex flex-col items-center gap-0.5 px-4 py-2.5 border-2 border-[#E8E4DC] bg-white text-[#888] shrink-0 font-semibold');
          button.type = 'button';
          button.dataset.planWeek = week.id;
          button.setAttribute('aria-pressed', String(week.id === activeWeekId));
          button.append(element('span', 'text-[13px]', week.label), element('span', 'text-[10px] opacity-70 font-normal', `${calendarDate(week.startsOn)}–${calendarDate(week.endsOn)}`));
          buttons.append(button);
        });
        const week = weeks.find((value) => value.id === activeWeekId);
        const selected = week.windows.reduce((sum, window) => sum + selectedCount(week.id, window), 0);
        const slots = week.windows.reduce((sum, window) => sum + entitlement(window), 0);
        week.windows.forEach((window, index) => {
          const chosen = selectedCount(week.id, window);
          const complete = validWindow(week, window);
          const progressButton = element('button', 'flex flex-col items-center gap-1 px-3 py-2 border-2 border-[#E8E4DC] text-center');
          progressButton.type = 'button';
          progressButton.dataset.planWindowToggle = `${week.id}|${window.key}`;
          progressButton.append(element('span', 'text-[11px] font-extrabold text-[#E85D04]', window.label), element('span', 'text-[9px] font-mono text-[#aaa]', complete ? labels.complete : `${chosen}/${entitlement(window)}`));
          progress.append(progressButton);
          const accordion = element('details', 'pm-plan-window border-2 border-[#E8E4DC] bg-white');
          const openedKey = `${week.id}|${window.key}`;
          accordion.dataset.planWindow = openedKey;
          accordion.open = openedWindows.has(openedKey) || (!openedWindows.size && index === 0);
          const summary = element('summary', 'w-full flex items-center gap-4 px-5 py-4 text-left cursor-pointer');
          summary.append(element('span', complete ? 'w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[11px] font-extrabold bg-[#E85D04] text-white' : 'w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[11px] font-extrabold border-2 border-[#E8E4DC] text-[#C0BAB0]', complete ? '✓' : index + 1));
          const title = element('div', 'flex-1 min-w-0');
          title.append(element('span', 'font-bold text-[15px]', window.label), element('span', 'block text-[11px] text-[#aaa] mt-0.5', interpolate(labels.chosen, { count: chosen, total: entitlement(window) })));
          summary.append(title, element('span', 'text-[10px] font-mono font-bold px-2 py-1 bg-[#F4F2EE] text-[#aaa]', `${chosen}/${entitlement(window)}`), element('span', 'text-[#888]', '⌄'));
          accordion.append(summary);
          const body = element('div', 'px-5 pb-5 border-t border-[#F4F2EE]');
          body.append(element('p', 'text-[10px] font-extrabold tracking-[0.25em] uppercase text-[#888] mt-4 mb-3', interpolate(labels.choose, { count: entitlement(window) })));
          const grid = element('div', 'grid grid-cols-2 gap-3');
          window.meals.forEach((meal) => grid.append(mealCard(week, window, meal)));
          body.append(grid);
          accordion.append(body);
          accordion.addEventListener('toggle', () => { if (accordion.open) openedWindows.add(openedKey); else openedWindows.delete(openedKey); });
          windows.append(accordion);
        });
        progress.append(element('p', 'text-right shrink-0 border-l border-[#E8E4DC] pl-4 font-extrabold', `${selected}/${slots}`));
      };
      const properties = () => {
        const values = { 'Programme': programme().name, 'Meal plan': variant().name === 'Default Title' ? programme().name : variant().name };
        const recipe = [];
        eligibleWeeks().forEach((week) => week.windows.forEach((window) => {
          const meals = window.meals.filter((meal) => weekSelections(week.id, window.key)[String(meal.id)] > 0).map((meal) => ({ productId: meal.id, quantity: Number(weekSelections(week.id, window.key)[String(meal.id)]), name: meal.name }));
          values[`${week.startsOn} · ${week.label} · ${window.label}`.slice(0, 200)] = meals.map((meal) => `${meal.name} ×${meal.quantity}`).join(' · ');
          recipe.push({ week: week.id, startsOn: week.startsOn, endsOn: week.endsOn, window: window.key, meals: meals.map(({ productId, quantity }) => ({ productId, quantity })) });
        }));
        values['_pm_menu_selection'] = JSON.stringify(recipe);
        const note = root.querySelector('[data-plan-delivery-note]').value.trim();
        if (note) values['Delivery notes'] = note;
        return values;
      };
      const renderReview = () => {
        const wrapper = root.querySelector('[data-plan-review]');
        wrapper.replaceChildren();
        if (!programme() || !variant()) return;
        [[labels.programme, programme().name], [labels.mealPlan, variant().name === 'Default Title' ? programme().name : variant().name], [labels.billing, allocation()?.name || labels.oneTime]].forEach(([name, value]) => {
          const row = element('div', 'flex justify-between gap-4 border-b border-[#E8E4DC] pb-3 text-[13px]');
          row.append(element('span', 'text-[#888]', name), element('span', 'font-bold text-right', value));
          wrapper.append(row);
        });
        if (menuReady()) Object.entries(properties()).filter(([key]) => !key.startsWith('_') && key !== 'Programme' && key !== 'Meal plan').forEach(([key, value]) => {
          const row = element('div', 'text-[12px]');
          row.append(element('p', 'font-bold mb-1', key), element('p', 'text-[#888] leading-relaxed', value));
          wrapper.append(row);
        });
      };
      const render = () => {
        const product = programme();
        const item = variant();
        const selectedAllocation = allocation();
        root.querySelector('[data-plan-unavailable]').hidden = programmes.size > 0;
        root.querySelectorAll('[data-plan-programme]').forEach((button) => { button.setAttribute('aria-pressed', String(button.dataset.planProgramme === programmeId)); button.disabled = busy; });
        root.querySelectorAll('[data-plan-panel]').forEach((panel) => { panel.hidden = Number(panel.dataset.planPanel) !== step; });
        text('[data-plan-heading]', labels.steps[step - 1]);
        text('[data-plan-subtitle]', labels.subtitles[step - 1]);
        text('[data-plan-step-count]', `${String(step).padStart(2, '0')} / 05`);
        text('[data-plan-mobile-step]', `${step} / 5 · ${labels.steps[step - 1]}`);
        text('[data-plan-programme-name]', product?.name || '—');
        text('[data-plan-programme-description]', product?.description || '');
        text('[data-plan-variant-name]', item?.name === 'Default Title' ? product.name : item?.name || '—');
        text('[data-plan-billing-name]', selectedAllocation?.name || (needsPlan() ? '—' : labels.oneTime));
        text('[data-plan-price]', item && (!needsPlan() || selectedAllocation) ? money(selectedAllocation?.price ?? item.price) : '—');
        text('[data-plan-checkout-charge]', selectedAllocation ? interpolate(labels.dueToday, { amount: money(selectedAllocation.checkoutCharge ?? selectedAllocation.price) }) : '');
        const inclusions = root.querySelector('[data-plan-inclusions]');
        inclusions.replaceChildren(...(Array.isArray(product?.inclusions) ? product.inclusions.map((value) => element('li', 'border-l-2 border-[#E85D04] pl-3', value)) : []));
        const weeks = eligibleWeeks();
        const slots = weeks.reduce((sum, week) => sum + week.windows.reduce((total, window) => total + entitlement(window), 0), 0);
        const filled = weeks.reduce((sum, week) => sum + week.windows.reduce((total, window) => total + selectedCount(week.id, window), 0), 0);
        const progress = step === 3 ? 40 + Math.min(19, Math.round(slots ? filled / slots * 19 : 0)) : (step - 1) * 20;
        text('[data-plan-percent]', `${progress}%`);
        root.querySelectorAll('[data-plan-progress-fill]').forEach((node) => { node.style.width = `${progress}%`; });
        root.querySelector('[data-plan-progress]').setAttribute('aria-valuenow', progress);
        text('[data-plan-menu-summary]', weeks.length ? `${calendarDate(weeks[0].startsOn)}–${calendarDate(weeks[weeks.length - 1].endsOn)} · ${filled}/${slots}` : labels.noMenu);
        root.querySelectorAll('[data-plan-step]').forEach((button) => {
          const number = Number(button.dataset.planStep);
          if (number === step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
          button.dataset.complete = String(number < step);
          button.disabled = busy || number > step;
        });
        root.querySelectorAll('[data-plan-back]').forEach((button) => { button.disabled = busy; });
        const next = root.querySelector('[data-plan-next]');
        next.hidden = step === 5;
        next.disabled = busy || (step === 1 && !product) || (step === 2 && !planReady()) || (step === 3 && !menuReady());
        root.querySelector('[data-plan-checkout]').disabled = busy || !menuReady() || (config.requireLogin && !config.loggedIn);
        root.dataset.programmeProductId = product ? String(product.productId) : '';
        root.dataset.variantId = variantId;
        root.dataset.sellingPlanId = sellingPlanId;
        renderOptions();
        renderMenu();
        renderReview();
        persist();
      };
      const goToStep = (number) => {
        if (busy || number < 1 || number > 5) return;
        if (number > 1 && !programme()) return;
        if (number > 2 && !planReady()) return;
        if (number > 3 && !menuReady()) return;
        step = number;
        showError();
        render();
        root.querySelector('[data-plan-heading]').focus({ preventScroll: true });
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      const submit = async () => {
        if (busy) return;
        if (!menuReady()) { showError(labels.noMenu); return; }
        if (config.requireLogin && !config.loggedIn) { showError(labels.accountRequired); return; }
        const item = { id: Number(variantId), quantity: 1, properties: properties() };
        if (needsPlan()) item.selling_plan = Number(sellingPlanId);
        busy = true;
        showError();
        text('[data-plan-status]', labels.adding);
        render();
        try {
          const response = await fetch(config.cartAddUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ items: [item] }) });
          const result = await response.json();
          if (!response.ok || result.status) {
            const failure = new Error(typeof result.description === 'string' ? result.description : labels.cartError);
            failure.nativeCartError = true;
            throw failure;
          }
          try { sessionStorage.removeItem(storageKey); } catch {}
          document.dispatchEvent(new CustomEvent('pm:cart-refresh', { detail: { source: 'meal-plan-builder' } }));
          window.location.assign(config.checkoutUrl);
        } catch (failure) {
          text('[data-plan-status]', '');
          showError(failure.nativeCartError ? failure.message : labels.cartError);
          document.dispatchEvent(new CustomEvent('pm:cart-refresh', { detail: { source: 'meal-plan-builder' } }));
          busy = false;
          render();
        }
      };
      root.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button || button.disabled || !root.contains(button)) return;
        if (button.dataset.planProgramme) {
          if (programmeId !== button.dataset.planProgramme) { programmeId = button.dataset.planProgramme; initializeVariant(); resetMenu(); }
          render();
        } else if (button.hasAttribute('data-plan-option-index')) {
          const index = Number(button.dataset.planOptionIndex);
          const value = button.dataset.planOptionValue;
          const current = variant();
          const product = programme();
          const next = product.variants.find((item) => purchasable(item, product) && item.options[index] === value && item.options.every((option, optionIndex) => optionIndex === index || option === current.options[optionIndex])) || product.variants.find((item) => purchasable(item, product) && item.options[index] === value);
          if (!next) return;
          if (variantId !== String(next.id)) { variantId = String(next.id); sellingPlanId = needsPlan() && next.plans.length ? String(next.plans.find((plan) => String(plan.id) === sellingPlanId)?.id || next.plans[0].id) : ''; resetMenu(); }
          render();
        } else if (button.hasAttribute('data-plan-next')) goToStep(step + 1);
        else if (button.hasAttribute('data-plan-back')) { if (step === 1) window.location.assign(config.landingUrl); else goToStep(step - 1); }
        else if (button.dataset.planStep) goToStep(Number(button.dataset.planStep));
        else if (button.dataset.planWeek) { activeWeekId = button.dataset.planWeek; render(); }
        else if (button.dataset.planWindowToggle) {
          const accordion = [...root.querySelectorAll('[data-plan-window]')].find((node) => node.dataset.planWindow === button.dataset.planWindowToggle);
          if (accordion) accordion.open = !accordion.open;
        } else if (button.dataset.planMeal) changeMeal(button.dataset.planMealWeek, button.dataset.planMealWindow, button.dataset.planMeal, Number(button.dataset.planMealDelta));
        else if (button.hasAttribute('data-plan-checkout')) submit();
      });
      root.addEventListener('change', (event) => {
        if (event.target.matches('[data-plan-selling-plan]')) { sellingPlanId = String(event.target.value); render(); }
        else if (event.target.matches('[data-plan-delivery-note]')) renderReview();
      });
      root.querySelectorAll('[data-plan-login]').forEach((link) => link.addEventListener('click', persist));
      if (!planReady() || !menuReady()) step = 1;
      render();
    });
  };
  if (!window.pmMealPlanBuilderInit) {
    window.pmMealPlanBuilderInit = initialize;
    document.addEventListener('shopify:section:load', (event) => initialize(event.target));
  }
  window.pmMealPlanBuilderInit();
})();
