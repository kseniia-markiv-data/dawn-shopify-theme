(() => {
  const MAX = 5;
  const SUPPORT_EMAIL = 'mkempiriq.biz@gmail.com';

  // ---------- helpers ----------
  const q  = (root, sel) => (root || document).querySelector(sel);
  const qa = (root, sel) => Array.from((root || document).querySelectorAll(sel));
  const txt = (el) => (el ? el.textContent.trim() : '');
  const QTY_INPUT_SELECTORS = 'input[name="quantity"], input[name="updates[]"], quantity-input input[type="number"]';

  function currentInt(val) {
    return Math.max(1, parseInt(String(val || '1').replace(/[^\d]/g, ''), 10) || 1);
  }

  // Read Dawn's stock (context only). We ENFORCE ONLY our policy cap.
  function getLimitAndStock(input) {
    let themeMax = Infinity;

    const attr = parseInt(input.getAttribute('max') || '', 10);
    if (Number.isFinite(attr)) themeMax = attr;

    if (!Number.isFinite(attr)) {
      const cartItem = input.closest('[id^="CartItem-"], .cart-item, li.cart-item, [data-cart-item]');
      let stock = null;
      if (cartItem) {
        const meta = cartItem.querySelector('.mk-cart-meta');
        if (meta?.dataset.stock) stock = parseInt(meta.dataset.stock, 10);
      } else {
        const pdpMeta = document.getElementById('mk-pdp-variant');
        if (pdpMeta?.dataset.stock) stock = parseInt(pdpMeta.dataset.stock, 10);
      }
      if (Number.isFinite(stock)) themeMax = stock;
    }

    return { enforced: MAX, themeMax }; // we only enforce MAX
  }

  // ---------- PDP / cart context (full details for email) ----------
  function getContextDetails(input) {
    // CART context
    const cartItem = input?.closest?.('[id^="CartItem-"], .cart-item, li.cart-item, [data-cart-item]');
    if (cartItem) {
      const meta = cartItem.querySelector('.mk-cart-meta');

      const productTitle =
        meta?.dataset.title ||
        txt(cartItem.querySelector('.cart-item__name, a.cart-item__name, [data-cart-item-title]')) ||
        'this item';

      const url = meta?.dataset.url || window.location.href;
      const sku = meta?.dataset.sku || '';

      let size = '', color = '';
      try {
        const names  = meta?.dataset.optionNames ? JSON.parse(meta.dataset.optionNames) : [];
        const values = meta?.dataset.options ? JSON.parse(meta.dataset.options) : [];
        names.forEach((n, i) => {
          const k = String(n || '').toLowerCase();
          if (k === 'size') size  = values[i] || size;
          if (k === 'color' || k === 'colour') color = values[i] || color;
        });
      } catch {}

      if (!size || !color) {
        const optEls = cartItem.querySelectorAll('.product-option, .cart-item__options, .product-options span, small');
        for (const el of optEls) {
          const t = txt(el);
          if (!size)  { const m = /size\s*[:\-]?\s*(.+)$/i.exec(t);  if (m) size  = m[1]; }
          if (!color) { const m = /colou?r\s*[:\-]?\s*(.+)$/i.exec(t); if (m) color = m[1]; }
        }
      }

      return { productTitle, size, color, sku, url };
    }

    // PDP context
    const meta = document.getElementById('mk-pdp-variant');
    const productTitle =
      meta?.dataset.title ||
      txt(document.querySelector('h1.product__title, h1.product__title.h2')) ||
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      'this item';

    const url =
      meta?.dataset.url ||
      document.querySelector('link[rel="canonical"]')?.getAttribute('href') ||
      window.location.href;

    const sku = meta?.dataset.sku || '';

    let size = '', color = '';
    try {
      const names  = meta?.dataset.optionNames ? JSON.parse(meta.dataset.optionNames) : [];
      const values = meta?.dataset.options ? JSON.parse(meta.dataset.options) : [];
      names.forEach((n, i) => {
        const k = String(n || '').toLowerCase();
        if (k === 'size') size  = values[i] || size;
        if (k === 'color' || k === 'colour') color = values[i] || color;
      });
    } catch {}

    return { productTitle, size, color, sku, url };
  }

  // ---------- email + chat ----------
  function buildMailto({ productTitle, size, color, sku, url, attemptedQty }) {
    const subject = encodeURIComponent('Bulk order request (>5 per size)');
    const lines = [
      'Hi team,',
      ' ',
      'I tried to add more than 5 items of:',
      ' ',
      `Product: ${productTitle}`,
      sku   ? `SKU: ${sku}`     : null,
      size  ? `Size: ${size}`   : null,
      color ? `Color: ${color}` : null,
      url   ? `Link: ${url}`    : null,
      `Desired quantity: ${attemptedQty}`,
      ' ',
      'Please let me know about bulk pricing/discounts.',
      ' ',
      'Customer message (optional):',
    ].filter(Boolean);
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${encodeURIComponent(lines.join('\n'))}`;
  }

  // ---------- toast (no "Only X left") ----------
  function ensureToast() {
    let css = document.getElementById('mk-limit-toast-css');
    if (!css) {
      css = document.createElement('style');
      css.id = 'mk-limit-toast-css';
      css.textContent = `
        #mk-limit-toast{position:fixed;z-index:99999;left:50%;transform:translateX(-50%);
          bottom:max(1rem, env(safe-area-inset-bottom));width:min(92vw,720px);
          background:#ffe9e9;color:#111;border:1px solid #ff6464;border-radius:12px;
          box-shadow:0 10px 30px rgba(0,0,0,.18);padding:12px 16px;box-sizing:border-box;
          font-size:14px;line-height:1.55;}
        #mk-limit-toast .mk-row{display:flex;flex-wrap:wrap;align-items:flex-start;gap:.5rem 1.25rem;}
        #mk-limit-toast .mk-badge{flex:0 0 auto;font-weight:700;color:#b00020;background:#ffd3d3;
          border:1px solid #ff9ea0;border-radius:8px;padding:.2rem .6rem;line-height:1.2;margin-right:1rem;}
        #mk-limit-toast .mk-copy{flex:1 1 260px;}
        #mk-limit-toast a{color:#111;text-decoration:underline;font-weight:600;}
        #mk-limit-toast .mk-close{flex:0 0 auto;margin-left:auto;background:transparent;border:0;color:#111;font-size:20px;line-height:1;cursor:pointer;}
        @media (min-width:576px){#mk-limit-toast{font-size:15px;padding:14px 18px;}}
        @media (min-width:992px){#mk-limit-toast{font-size:16px;padding:16px 20px;width:min(90vw,840px);}}
        @media (min-width:1280px){#mk-limit-toast{width:min(70vw,900px);}}
      `;
      document.head.appendChild(css);
    }

    let toast = document.getElementById('mk-limit-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'mk-limit-toast';
      toast.setAttribute('role', 'alert');
      toast.setAttribute('aria-live', 'polite');
      toast.innerHTML = `
        <div class="mk-row">
          <strong class="mk-badge" id="mk-badge">Limit: ${MAX} per size</strong>
          <span id="mk-limit-copy" class="mk-copy">
            You’ve reached the limit for this size.
            For bulk orders or a discount, chat with us
            or <a href="#" id="mk-email-link">email support</a>.
          </span>
          <button id="mk-limit-close" class="mk-close" aria-label="Close">×</button>
        </div>`;
      document.body.appendChild(toast);

      toast.querySelector('#mk-limit-close')?.addEventListener('click', () => (toast.style.display = 'none'));
      toast.querySelector('#mk-email-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        const details = getContextDetails(document.activeElement || document.body);
        const href = buildMailto({ ...details, attemptedQty: 6 });
        window.location.href = href;
      });
    }
    return toast;
  }

  function hideLimitToast(){ const t = document.getElementById('mk-limit-toast'); if (t) t.style.display = 'none'; }

  function showLimitToast(attemptedQty) {
    const toast = ensureToast();

    // Update email link only
    const details = getContextDetails(document.activeElement || document.body);
    const href = buildMailto({ ...details, attemptedQty });
    const emailLink = toast.querySelector('#mk-email-link');
    if (emailLink) emailLink.setAttribute('href', href);

    // Update badge text (optional punctuation consistency)
    const badge = toast.querySelector('#mk-badge');
    if (badge) badge.textContent = `Limit: ${MAX} per size.`;

    // Do NOT modify #mk-limit-copy here
    toast.style.display = 'block';
    clearTimeout(showLimitToast._t);
    showLimitToast._t = setTimeout(() => (toast.style.display = 'none'), 7000);
  }


  // ---------- clamp ONLY by policy limit (never by stock) ----------
  function clampInputByLimit(input) {
    const attempted = currentInt(input.value);
    const { enforced } = getLimitAndStock(input); // enforced === MAX
    if (attempted > enforced) {
      input.value = String(enforced);
      showLimitToast(attempted);
      input.dispatchEvent(new Event('change', { bubbles: true })); // let Shopify update UI
      return true;
    }
    return false;
  }

  // ---------- wire a single input ----------
  function wire(input) {
    if (!input || input.dataset._wiredLimit) return;
    input.dataset._wiredLimit = '1';

    // Set max to LIMIT ONLY so Shopify can still reduce on stock and show its own message
    const curAttr = parseInt(input.getAttribute('max') || '', 10);
    if (!Number.isFinite(curAttr) || curAttr !== MAX) input.setAttribute('max', String(MAX));

    input.addEventListener('input', () => clampInputByLimit(input));
    input.addEventListener('change', () => clampInputByLimit(input));

    const container = input.closest(
      'cart-drawer, .cart-drawer, #CartDrawer, .cart-item, li.cart-item, ' +
      'form[action*="/cart"], .cart__items, .cart-items, quantity-input, form'
    );

    if (container) {
      container.addEventListener('click', (e) => {
        const t = e.target;
        const plusBtn = t?.matches?.('button[name="plus"], [data-action="increment"], .quantity__button[name="plus"]')
          ? t
          : t?.closest?.('button[name="plus"], [data-action="increment"], .quantity__button[name="plus"]');
        if (plusBtn) {
          const { enforced } = getLimitAndStock(input);
          const current = currentInt(input.value);
          if (current >= enforced) {
            showLimitToast(current + 1);
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          setTimeout(() => clampInputByLimit(input), 0);
        }
      });
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        const { enforced } = getLimitAndStock(input);
        const current = currentInt(input.value);
        if (current >= enforced) {
          showLimitToast(current + 1);
          e.preventDefault();
          return;
        }
        setTimeout(() => clampInputByLimit(input), 0);
      }
    });
  }

  function wireAll() { qa(document, QTY_INPUT_SELECTORS).forEach(wire); }

  // re-wire after Dawn section/cart re-renders
  const obs = new MutationObserver(wireAll);
  obs.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', wireAll);

  /* ---- VARIANT CHANGE REFRESH ---- */
  async function refreshVariantContext(formEl) {
    try {
      const idInput = formEl?.querySelector('input[name="id"]');
      const meta = document.getElementById('mk-pdp-variant');
      if (!idInput || !meta) return;

      const vid = parseInt(idInput.value || '', 10);
      if (!vid) return;

      const res = await fetch(`/variants/${vid}.js`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('variant fetch failed');
      const v = await res.json();

      const stock = Number.isFinite(v?.inventory_quantity) ? v.inventory_quantity : 0;
      meta.dataset.stock = String(stock); // context only

      const qtyInput =
        formEl.querySelector('input[name="quantity"], quantity-input input[type="number"]') ||
        document.querySelector('form[action*="/cart/add"] input[name="quantity"]');

      if (qtyInput) {
        qtyInput.setAttribute('max', String(MAX)); // keep limit 5
        if (parseInt(qtyInput.value || '1', 10) > MAX) qtyInput.value = String(MAX);
        qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      hideLimitToast();
    } catch (e) {
      console.warn('[mk] refreshVariantContext error', e);
    }
  }

  function watchVariantChanges() {
    const form =
      document.querySelector('product-form form') ||
      document.querySelector('form[action*="/cart/add"]');

    if (!form || watchVariantChanges._wired) return;
    watchVariantChanges._wired = true;

    const idInput = form.querySelector('input[name="id"]');

    document.addEventListener('variant:change', () => refreshVariantContext(form), true);
    idInput?.addEventListener('change', () => refreshVariantContext(form));

    if (idInput) {
      const mo = new MutationObserver((muts) => {
        for (const m of muts) {
          if (m.type === 'attributes' && m.attributeName === 'value') {
            refreshVariantContext(form);
            break;
          }
        }
      });
      mo.observe(idInput, { attributes: true, attributeFilter: ['value'] });
    }
  }

  watchVariantChanges();
  document.addEventListener('shopify:section:load', watchVariantChanges);
  document.addEventListener('DOMContentLoaded', watchVariantChanges);
})();
