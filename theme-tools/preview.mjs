import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { Liquid } from 'liquidjs';
import { createFixtures } from './fixtures.mjs';
const dir = path.dirname(fileURLToPath(import.meta.url));
const theme = path.resolve(dir, '../theme');
const scratch = path.resolve(dir, '../work/fixture-liquid');
fs.mkdirSync(scratch, { recursive: true });
const locale = JSON.parse(fs.readFileSync(path.join(theme, 'locales/en.default.json')));
const escape = text => String(text ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function preprocess(source) {
  return source.replace(/\{%[-]?\s*(schema|doc)\s*[-]?%\}[\s\S]*?\{%[-]?\s*end\1\s*[-]?%\}/g, '')
    .replace(/\{%\s*stylesheet\s*%\}([\s\S]*?)\{%\s*endstylesheet\s*%\}/g, '<style>$1</style>')
    .replace(/\{%\s*paginate\s+([^ ]+)\s+by\s+[^%]+%\}/g, '').replace(/\{%\s*endpaginate\s*%\}/g, '')
    .replace(/\{%\s*form\s+([^%]+)%\}/g, (_, args) => {
      const type = args.match(/^\s*'([^']+)'/)?.[1];
      const attrs = [...args.matchAll(/([\w-]+):\s*('[^']*'|"[^"]*"|[\w.]+)/g)].map(([, key, value]) => `${key}="{{ ${value} | escape }}"`).join(' ');
      return `<form method="post" action="${type === 'product' ? '/cart/add' : '/account'}" ${attrs}><input type="hidden" name="form_type" value="${type}">`;
    }).replace(/\{%\s*endform\s*%\}/g, '</form>');
}
for (const name of fs.readdirSync(path.join(theme, 'snippets'))) fs.writeFileSync(path.join(scratch, name), preprocess(fs.readFileSync(path.join(theme, 'snippets', name), 'utf8')));
const engine = new Liquid({ root: scratch, partials: scratch, extname: '.liquid', strictFilters: true, jsTruthy: false });
engine.registerFilter('t', (key, ...args) => {
  let value = key.split('.').reduce((obj, part) => obj?.[part], locale);
  if (typeof value !== 'string') throw new Error(`Missing translation: ${key}`);
  for (const [name, replacement] of args.filter(Array.isArray)) value = value.replaceAll(`{{ ${name} }}`, String(replacement));
  return value;
});
engine.registerFilter('json', value => JSON.stringify(value ?? null));
engine.registerFilter('asset_url', value => `/assets/${value}`);
engine.registerFilter('image_url', image => typeof image === 'string' ? image : image?.src || '');
engine.registerFilter('image_tag', (url, ...args) => {
  const attrs = Object.fromEntries(args.filter(Array.isArray));
  return `<img src="${escape(url)}" alt="${escape(attrs.alt || 'Prepared meal')}" width="${attrs.width || 1600}" height="${attrs.height || 900}" ${Object.entries(attrs).filter(([key]) => !['alt', 'width', 'height', 'widths'].includes(key)).map(([key, value]) => `${key}="${escape(value)}"`).join(' ')}>`;
});
engine.registerFilter('stylesheet_tag', url => `<link rel="stylesheet" href="${escape(url)}">`);
engine.registerFilter('money', value => `S$${(Number(value || 0) / 100).toFixed(2)}`);
engine.registerFilter('money_without_trailing_zeros', value => `S$${Number(value || 0) / 100}`);
engine.registerFilter('money_with_currency', value => `S$${(Number(value || 0) / 100).toFixed(2)} SGD`);
engine.registerFilter('default_pagination', () => '');
engine.registerFilter('default_errors', () => '');
engine.registerFilter('payment_button', () => '');
engine.registerFilter('structured_data', product => JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: product?.title }));
engine.registerFilter('placeholder_svg_tag', (_, className = '') => `<svg class="${escape(className)}" viewBox="0 0 1600 900" aria-hidden="true"><rect width="1600" height="900" fill="#222"/></svg>`);
engine.registerFilter('format_address', value => escape(value?.address1));
engine.registerFilter('format_code', value => String(value).match(/.{1,4}/g)?.join(' '));
engine.registerFilter('metafield_tag', value => escape(value?.value));
const defaults = schema => Object.fromEntries((schema?.settings || []).filter(setting => 'default' in setting).map(setting => [setting.id, setting.default]));
const schemaFor = type => JSON.parse(fs.readFileSync(path.join(theme, 'sections', `${type}.liquid`), 'utf8').match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/)?.[1] || '{}');
function resolveSettings(schema, values, data) {
  const result = { ...defaults(schema), ...values };
  for (const setting of schema.settings || []) {
    if (setting.type === 'product') result[setting.id] = data.products[result[setting.id]] || null;
    if (setting.type === 'collection') result[setting.id] = data.collections[result[setting.id]] || null;
  }
  return result;
}
export async function renderSection(id, definition, context) {
  const schema = schemaFor(definition.type);
  const blocks = (definition.block_order || Object.keys(definition.blocks || {})).map(key => {
    const block = definition.blocks[key];
    return { id: key, type: block.type, settings: resolveSettings((schema.blocks || []).find(item => item.type === block.type) || {}, block.settings, context.fixtures), shopify_attributes: '' };
  });
  if (definition.type === 'meal-plan-builder' && !blocks.length && !context.emptyFixtures) blocks.push(...['recurring', 'fixed'].map(kind => ({ id: kind, type: 'programme', settings: { product: context.fixtures[kind], kind, goal: 'MAINTAIN' } })));
  const section = { id, settings: resolveSettings(schema, definition.settings, context.fixtures), blocks };
  const content = await engine.parseAndRender(preprocess(fs.readFileSync(path.join(theme, 'sections', `${definition.type}.liquid`), 'utf8')), { ...context, section }, { globals: context });
  return `<div id="shopify-section-${id}" class="shopify-section ${schema.class || ''}">${content}</div>`;
}
async function renderGroup(name, context) {
  const group = JSON.parse(fs.readFileSync(path.join(theme, 'sections', `${name}.json`)));
  return (await Promise.all(group.order.map(id => renderSection(id, group.sections[id], context)))).join('');
}
export function emptyCart() { return { items: [], item_count: 0, total_price: 0, 'empty?': true, currency: { iso_code: 'SGD' }, note: '', cart_level_discount_applications: [] }; }
export async function renderPage(url, options = {}) {
  const fixtures = options.fixtures || createFixtures();
  const requestURL = new URL(url, 'http://localhost:4173');
  const pathname = requestURL.pathname;
  let file = 'index', product, collection, page;
  if (pathname.startsWith('/pages/')) { const handle = pathname.split('/')[2]; file = `page.${handle}`; page = { title: handle, content: '' }; }
  if (pathname.startsWith('/collections/')) { collection = fixtures.collections[pathname.split('/')[2]]; file = collection?.handle === 'ready-series-bundles' ? 'collection.bundles' : collection?.handle === 'ready-series-subscriptions' ? 'collection.subscriptions' : 'collection.ready-series'; }
  if (pathname.startsWith('/products/')) { product = fixtures.products[pathname.split('/')[2]]; file = product?.gift_card ? 'product.gift-card' : product?.handle === 'protein-bundle' ? 'product.bundle' : 'product.ready-series'; }
  if (pathname === '/cart') file = 'cart';
  if (product && requestURL.searchParams.has('selling_plan')) {
    product = { ...product, selected_selling_plan: product.variants.flatMap(variant => variant.selling_plan_allocations).find(allocation => String(allocation.selling_plan.id) === requestURL.searchParams.get('selling_plan'))?.selling_plan };
  }
  if (pathname === '/search') file = 'search';
  if (pathname.startsWith('/account') || pathname === '/checkout') return '<!doctype html><html><body><h1>Shopify-hosted surface</h1><p>Local fixture only. Authentication and payment require the merchant store.</p><a href="/">Return home</a></body></html>';
  if (!fs.existsSync(path.join(theme, 'templates', `${file}.json`))) file = '404';
  const parts = file.split('.');
  const context = { fixtures, emptyFixtures: options.emptyFixtures, product, collection, page, products: fixtures.products, collections: fixtures.collections, metaobjects: fixtures.metaobjects,
    customer: options.loggedIn ? fixtures.customer : null, cart: options.cart || emptyCart(), paginate: { pages: 1, current_page: 1 },
    template: { name: parts[0], suffix: parts[1] || '' }, request: { path: pathname, page_type: parts[0], locale: { iso_code: 'en' }, design_mode: true },
    shop: { name: 'Performance Meals', currency: 'SGD', customer_accounts_enabled: true, policies: [], enabled_payment_types: [] },
    routes: { root_url: '/', collections_url: '/collections', search_url: '/search', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change', account_url: '/account', account_login_url: '/account/login', storefront_login_url: '/account/login', account_logout_url: '/account/logout' },
    search: { performed: requestURL.searchParams.has('q'), terms: requestURL.searchParams.get('q') || '', results: fixtures.meals, results_count: fixtures.meals.length },
    settings: { support_label: 'Performance Meals', whatsapp_number: '' }, content_for_header: '', canonical_url: `http://localhost:4173${pathname}`, page_title: product?.title || collection?.title || 'Performance Meals' };
  if (pathname === '/gift_cards/review') {
    context.shop.url = '/';
    context.gift_card = { balance: 10000, code: 'REVIEWNOTVALID', enabled: true, expired: false, recipient: { name: 'Review Recipient' }, message: 'Synthetic gift card preview only.' };
    const source = fs.readFileSync(path.join(theme, 'templates/gift_card.liquid'), 'utf8').replace('{% layout none %}', '');
    return engine.parseAndRender(preprocess(source), context, { globals: context });
  }
  if (options.emptyFixtures) { context.metaobjects = { performance_menu_week: { values: [] } }; }
  const definition = JSON.parse(fs.readFileSync(path.join(theme, 'templates', `${file}.json`)));
  context.content_for_layout = (await Promise.all(definition.order.map(id => renderSection(id, definition.sections[id], context)))).join('');
  let layout = fs.readFileSync(path.join(theme, 'layout/theme.liquid'), 'utf8');
  layout = layout.replace("{% sections 'header-group' %}", await renderGroup('header-group', context)).replace("{% sections 'footer-group' %}", await renderGroup('footer-group', context)).replace("{% section 'cart-drawer' %}", await renderSection('cart-drawer', { type: 'cart-drawer', settings: {} }, context));
  return engine.parseAndRender(preprocess(layout), context, { globals: context });
}
export function startPreview(port = 4173) {
  const fixtures = createFixtures();
  let cart = emptyCart();
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://localhost:${port}`);
      if (url.pathname.startsWith('/assets/')) {
        const file = path.resolve(theme, 'assets', path.basename(url.pathname));
        const type = { '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.ttf': 'font/ttf' }[path.extname(file)] || 'application/octet-stream';
        response.writeHead(fs.existsSync(file) ? 200 : 404, { 'Content-Type': type }); response.end(fs.existsSync(file) ? fs.readFileSync(file) : ''); return;
      }
      if (request.method === 'POST' && url.pathname.endsWith('.js')) {
        const chunks = []; for await (const chunk of request) chunks.push(chunk);
        const raw = Buffer.concat(chunks);
        const body = new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': request.headers['content-type'] }, body: raw });
        const values = request.headers['content-type']?.includes('application/json') ? await body.json() : Object.fromEntries(await body.formData());
        if (url.pathname === '/cart/add.js') {
          const entries = values.items || [values];
          for (const entry of entries) {
            const product = Object.values(fixtures.products).find(item => item.variants.some(variant => String(variant.id) === String(entry.id)));
            const variant = product?.variants.find(variant => String(variant.id) === String(entry.id));
            if (!variant?.available) { response.writeHead(422, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ description: 'Fixture item unavailable' })); return; }
            const allocation = entry.selling_plan ? variant.selling_plan_allocations.find(item => String(item.selling_plan.id) === String(entry.selling_plan)) : null;
            if (entry.selling_plan && !allocation || variant.requires_selling_plan && !allocation) throw new Error('Invalid fixture selling plan');
            const quantity = Number(entry.quantity) || 1;
            const price = allocation?.price || variant.price;
            cart.items.push({ index: cart.items.length + 1, key: `${variant.id}:${entry.selling_plan || 'one-time'}:${cart.items.length}`, product, variant, image: product.featured_image, url: product.url, url_to_remove: '/cart', quantity, selling_plan_allocation: allocation, properties: entry.properties || Object.fromEntries(Object.entries(entry).filter(([key]) => key.startsWith('properties[')).map(([key, value]) => [key.slice(11, -1), value])), line_level_discount_allocations: [], final_line_price: price * quantity, original_line_price: price * quantity, fixturePrice: price });
          }
        } else if (url.pathname === '/cart/change.js') {
          const item = cart.items.find(item => item.key === values.id); if (item) { item.quantity = Number(values.quantity); item.final_line_price = item.original_line_price = item.fixturePrice * item.quantity; }
          cart.items = cart.items.filter(item => item.quantity > 0);
        }
        cart.item_count = cart.items.reduce((sum, item) => sum + item.quantity, 0); cart.total_price = cart.items.reduce((sum, item) => sum + item.final_line_price, 0); cart['empty?'] = !cart.item_count;
        response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(cart)); return;
      }
      if (url.pathname === '/cart.js') { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(cart)); return; }
      const html = await renderPage(url.href, { fixtures, cart, loggedIn: url.searchParams.get('customer') === '1', emptyFixtures: url.searchParams.has('empty') });
      if (url.searchParams.has('sections')) {
        const { load } = await import('cheerio'); const $ = load(html); const sections = Object.fromEntries(url.searchParams.get('sections').split(',').map(id => [id, $.html($(`#shopify-section-${id}`)) || null]));
        response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(sections)); return;
      }
      response.writeHead(200, { 'Content-Type': 'text/html' }); response.end(html);
    } catch (error) { console.error(error.message); response.writeHead(500, { 'Content-Type': 'text/plain' }); response.end(error.stack); }
  });
  server.listen(port, '127.0.0.1', () => console.log(`Liquid fixture preview: http://localhost:${server.address().port}`));
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) startPreview(Number(process.env.PM_PREVIEW_PORT) || 4173);
