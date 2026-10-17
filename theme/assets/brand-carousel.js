/* Local section state only: no cart, catalogue or checkout side effects. */
if (!customElements.get('pm-brand-carousel')) {
  customElements.define('pm-brand-carousel', class extends HTMLElement {
    connectedCallback() {
      this.slides = [...this.querySelectorAll('[data-slide]')];
      this.controls = this.querySelector('[data-controls]');
      if (!this.controls || this.slides.length < 2 || this.abort) return;
      this.abort = new AbortController();
      const options = {signal: this.abort.signal};
      this.index = 0;
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.paused = this.dataset.autoplay !== 'true' || this.reducedMotion.matches;
      this.hovered = false;
      this.querySelector('[data-next]').addEventListener('click', () => this.show(this.index + 1, true), options);
      this.querySelector('[data-previous]').addEventListener('click', () => this.show(this.index - 1, true), options);
      this.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => this.show(Number(button.dataset.go), true), options));
      this.querySelector('[data-pause]').addEventListener('click', () => {
        this.paused = !this.paused;
        this.focused = false;
        this.updateRotation();
      }, options);
      this.addEventListener('focusin', event => {
        // Focus stops rotation until the customer explicitly starts it again.
        this.focused = true;
        if (!event.target.closest('[data-pause]')) this.paused = true;
        this.updateRotation();
      }, options);
      this.addEventListener('mouseenter', () => { this.hovered = true; this.updateRotation(); }, options);
      this.addEventListener('mouseleave', () => { this.hovered = false; this.updateRotation(); }, options);
      document.addEventListener('visibilitychange', () => this.updateRotation(), options);
      this.reducedMotion.addEventListener('change', () => {
        if (this.reducedMotion.matches) this.paused = true;
        this.updateRotation();
      }, options);
      document.addEventListener('shopify:block:select', event => {
        const slide = event.target.closest('[data-slide]');
        const index = this.slides.indexOf(slide);
        if (index >= 0) this.show(index, true);
      }, options);
      this.controls.hidden = false;
      this.show(0);
    }
    show(index, manual = false) {
      this.index = (index + this.slides.length) % this.slides.length;
      this.slides.forEach((slide, i) => { slide.hidden = i !== this.index; });
      this.querySelectorAll('[data-go]').forEach((button, i) => button.setAttribute('aria-pressed', String(i === this.index)));
      this.querySelector('[data-counter]').textContent = `${String(this.index + 1).padStart(2, '0')} / ${String(this.slides.length).padStart(2, '0')}`;
      if (manual) {
        this.paused = true;
        this.querySelector('[data-status]').textContent = `Slide ${this.index + 1} of ${this.slides.length}`;
      }
      this.updateRotation();
    }
    updateRotation() {
      clearTimeout(this.timer);
      const button = this.querySelector('[data-pause]');
      button.setAttribute('aria-label', this.paused ? 'Start automatic rotation' : 'Pause automatic rotation');
      button.textContent = this.paused ? '▷' : 'Ⅱ';
      if (!this.paused && !this.hovered && !this.focused && !document.hidden) {
        const interval = Math.max(5000, Math.min(15000, Number(this.dataset.interval) || 8000));
        this.timer = setTimeout(() => this.show(this.index + 1), interval);
      }
    }
    disconnectedCallback() {
      clearTimeout(this.timer);
      this.abort?.abort();
      this.abort = null;
    }
  });
}
