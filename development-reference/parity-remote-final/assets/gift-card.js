(() => {
  document.querySelectorAll('[data-gift-section]').forEach(section => {
    const form = section.querySelector('[data-product-form]');
    if (!form) return;
    const date = form.querySelector('[data-gift-date]');
    const today = new Date(); const max = new Date(today); max.setDate(max.getDate() + 90);
    const localISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    date.min=localISO(today); date.max=localISO(max);
    form.querySelector('[data-gift-offset]').value=String(today.getTimezoneOffset());
    const update = () => {
      const option=form.querySelector('[data-gift-variant]:checked');
      section.querySelectorAll('[data-gift-value]').forEach(value => { value.textContent=option?.dataset.price || ''; });
      section.querySelector('[data-gift-recipient-preview]').textContent=form.querySelector('[data-gift-name]').value;
      section.querySelector('[data-gift-message-preview]').textContent=form.querySelector('[data-gift-message]').value;
    };
    form.addEventListener('input',update); update();
  });
})();
