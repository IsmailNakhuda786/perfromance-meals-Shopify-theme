import fs from 'node:fs';
import path from 'node:path';
const root = new URL('../', import.meta.url).pathname;
const localeFile = path.join(root, 'theme/locales/en.default.json');
const locale = JSON.parse(fs.readFileSync(localeFile));
locale.meal_plan = JSON.parse(fs.readFileSync(path.join(root, '../meal-plan-locales.json')));
Object.assign(locale.catalog, {
  choose_bundle: 'Choose your bundle', freezer_stocked: 'Keep your freezer stocked.', ala_carte: 'Single Purchase',
  subscription_term: 'Subscription term', subscription_account_notice: 'Sign in to manage your subscription through your Shopify account.',
  sign_in: 'Sign in', subscription_unavailable: 'Subscription unavailable', meals_per_delivery: '{{ count }} meals per delivery',
  per_meal: 'per meal', subscription_price: 'Subscription price', add_bundle: 'Add bundle to cart', subscribe: 'Subscribe', sign_in_subscribe: 'Sign in to subscribe'
});
fs.writeFileSync(localeFile, JSON.stringify(locale, null, 2) + '\n');
const layout = path.join(root, 'theme/layout/theme.liquid');
fs.writeFileSync(layout, fs.readFileSync(layout, 'utf8').replace('<script src="{{ \'catalog.js\' | asset_url }}" defer="defer">', '<script type="module" src="{{ \'catalog.js\' | asset_url }}">'));
for (const folder of ['sections', 'snippets']) for (const name of fs.readdirSync(path.join(root, 'theme', folder))) {
  if (!name.endsWith('.liquid')) continue;
  const file = path.join(root, 'theme', folder, name);
  let content = fs.readFileSync(file, 'utf8').replaceAll('href="/collections/', 'href="{{ routes.collections_url }}/');
  if (name === 'main-search.liquid') content = content.replace('card_id: section.id', 'instance_id: section.id');
  if (name === 'product-card.liquid') content = content.replace('  assign require_allocation = false\n', '').replace('    assign require_allocation = true\n', '');
  if (name === 'meal-plan-builder.liquid') content = content.replace('<script src="{{ \'meal-plan.js\' | asset_url }}" defer></script>\n', '');
  fs.writeFileSync(file, content);
}
